/**
 * Resource monitor — samples CPU + memory of the live CodeGraph daemon
 * processes for the dashboard's "Resource usage" panel.
 *
 * It answers a plain question: "how much of my machine is CodeGraph using
 * right now?" — the CPU% and resident memory of every running daemon, plus
 * the on-disk footprint of every index + the metrics DB.
 *
 * Design, matching the metrics store's discipline:
 *  1. Fail silent — a missing /proc entry, a dead pid, a spawn that fails is
 *     just an absent number. Sampling must never throw into a request handler.
 *  2. Dependency-free — Linux reads /proc directly; other POSIX shells out to
 *     `ps`; Windows to PowerShell. No new npm dependency.
 *  3. Stateful CPU% — per-process CPU is a *rate*, so we remember the last
 *     cumulative CPU-seconds per pid and divide the delta by wall-clock
 *     elapsed. The figure is "% of ONE core" (can exceed 100 on a busy
 *     multi-threaded process); `cpuCount` lets the UI show it against total.
 *  4. Short-TTL cache — two endpoints (`/api/resources` + `/api/summary`) can
 *     ask within the same tick; a cached result inside `MIN_INTERVAL_MS` keeps
 *     the CPU delta anchored to the real poll interval instead of ~0ms.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

/** Linux clock ticks per second (USER_HZ). Effectively always 100. */
const USER_HZ = 100;
/** Linux page size in bytes for statm's page counts. Effectively always 4096. */
const PAGE_SIZE = 4096;
/** Reuse a cached sample taken within this window (ms). */
const MIN_INTERVAL_MS = 1_500;

/** One running daemon the caller wants sampled. */
export interface DaemonProc {
  root: string;
  pid: number;
  version: string;
  startedAt: number;
}

/** Per-process resource reading returned to the dashboard. */
export interface ProcResource {
  root: string;
  pid: number;
  version: string;
  startedAt: number;
  /** % of a single core over the last poll interval; null until a 2nd sample. */
  cpuPercent: number | null;
  /** Resident set size in bytes, or null if it couldn't be read. */
  memBytes: number | null;
}

export interface ResourceSample {
  processes: ProcResource[];
  totals: {
    count: number;
    cpuPercent: number | null;
    memBytes: number;
  };
}

/** Raw cumulative reading for one pid. */
interface RawSample {
  cpuSeconds: number | null;
  memBytes: number | null;
}

export class ResourceMonitor {
  /** pid → last cumulative CPU-seconds + the epoch-ms it was read. */
  private prevCpu = new Map<number, { cpuSeconds: number; atMs: number }>();
  private cache: { at: number; result: ResourceSample } | null = null;
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  /** Sample the given daemons. Returns per-process CPU%/RSS + machine totals. */
  sample(daemons: DaemonProc[]): ResourceSample {
    const t = this.now();
    if (this.cache && t - this.cache.at < MIN_INTERVAL_MS) return this.cache.result;

    const pids = daemons.map((d) => d.pid).filter((p) => Number.isInteger(p) && p > 0);
    const raw = readRawSamples(pids);

    const alivePids = new Set(pids);
    for (const pid of this.prevCpu.keys()) {
      if (!alivePids.has(pid)) this.prevCpu.delete(pid); // forget dead daemons
    }

    const processes: ProcResource[] = daemons.map((d) => {
      const r = raw.get(d.pid) ?? { cpuSeconds: null, memBytes: null };
      const cpuPercent = this.computeCpuPercent(d.pid, r.cpuSeconds, t);
      return {
        root: d.root,
        pid: d.pid,
        version: d.version,
        startedAt: d.startedAt,
        cpuPercent,
        memBytes: r.memBytes,
      };
    });

    let cpuKnown = false;
    let cpuSum = 0;
    let memSum = 0;
    for (const p of processes) {
      if (p.cpuPercent !== null) { cpuKnown = true; cpuSum += p.cpuPercent; }
      if (p.memBytes !== null) memSum += p.memBytes;
    }

    const result: ResourceSample = {
      processes,
      totals: { count: processes.length, cpuPercent: cpuKnown ? cpuSum : null, memBytes: memSum },
    };
    this.cache = { at: t, result };
    return result;
  }

  /** Delta of cumulative CPU-seconds over wall-clock elapsed → % of one core. */
  private computeCpuPercent(pid: number, cpuSeconds: number | null, atMs: number): number | null {
    if (cpuSeconds === null) { this.prevCpu.delete(pid); return null; }
    const prev = this.prevCpu.get(pid);
    this.prevCpu.set(pid, { cpuSeconds, atMs });
    if (!prev) return null; // first sighting — need a second sample for a rate
    const elapsedMs = atMs - prev.atMs;
    if (elapsedMs <= 0) return null;
    const cpuDelta = cpuSeconds - prev.cpuSeconds;
    if (cpuDelta < 0) return null; // pid reused / counter reset
    const pct = (cpuDelta / (elapsedMs / 1000)) * 100;
    return Math.round(pct * 10) / 10;
  }
}

// -------------------------------------------------------- platform sampling

/** Read cumulative CPU-seconds + RSS for each pid, best-effort per platform. */
function readRawSamples(pids: number[]): Map<number, RawSample> {
  if (pids.length === 0) return new Map();
  if (process.platform === 'linux') return readProcSamples(pids);
  if (process.platform === 'win32') return readWindowsSamples(pids);
  return readPsSamples(pids); // darwin + other POSIX
}

/** Linux: read /proc/<pid>/stat (CPU) and /proc/<pid>/statm (RSS) directly. */
function readProcSamples(pids: number[]): Map<number, RawSample> {
  const out = new Map<number, RawSample>();
  for (const pid of pids) {
    let cpuSeconds: number | null = null;
    let memBytes: number | null = null;
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      // comm (field 2) is parenthesized and may contain spaces/parens — split
      // after the final ')' so positional fields line up regardless.
      const rparen = stat.lastIndexOf(')');
      const rest = stat.slice(rparen + 2).split(' ');
      // After comm, fields are 1-indexed from 'state' (field 3). utime is
      // field 14 and stime field 15 → indexes 11 and 12 in `rest`.
      const utime = Number(rest[11]);
      const stime = Number(rest[12]);
      if (Number.isFinite(utime) && Number.isFinite(stime)) {
        cpuSeconds = (utime + stime) / USER_HZ;
      }
    } catch { /* pid gone or unreadable */ }
    try {
      const statm = fs.readFileSync(`/proc/${pid}/statm`, 'utf8').split(' ');
      const residentPages = Number(statm[1]); // field 2 = resident set size in pages
      if (Number.isFinite(residentPages)) memBytes = residentPages * PAGE_SIZE;
    } catch { /* pid gone */ }
    if (cpuSeconds !== null || memBytes !== null) out.set(pid, { cpuSeconds, memBytes });
  }
  return out;
}

/** POSIX fallback (macOS): one `ps` call for RSS (KB) + cumulative CPU time. */
function readPsSamples(pids: number[]): Map<number, RawSample> {
  const out = new Map<number, RawSample>();
  try {
    const stdout = execFileSync(
      'ps',
      ['-o', 'pid=,rss=,time=', '-p', pids.join(',')],
      { encoding: 'utf8', timeout: 4000 },
    );
    for (const line of stdout.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;
      const pid = Number(parts[0]);
      const rssKb = Number(parts[1]);
      const cpuSeconds = parseCpuTime(parts[2]);
      if (!Number.isInteger(pid)) continue;
      out.set(pid, {
        cpuSeconds,
        memBytes: Number.isFinite(rssKb) ? rssKb * 1024 : null,
      });
    }
  } catch { /* ps missing / errored — no data this tick */ }
  return out;
}

/** Windows: PowerShell Get-Process for WorkingSet64 (bytes) + CPU (seconds). */
function readWindowsSamples(pids: number[]): Map<number, RawSample> {
  const out = new Map<number, RawSample>();
  const idList = pids.join(',');
  const script =
    `Get-Process -Id ${idList} -ErrorAction SilentlyContinue | ` +
    `ForEach-Object { "$($_.Id),$($_.WorkingSet64),$($_.CPU)" }`;
  try {
    const stdout = execFileSync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { encoding: 'utf8', timeout: 6000 },
    );
    for (const line of stdout.split('\n')) {
      const parts = line.trim().split(',');
      if (parts.length < 3) continue;
      const pid = Number(parts[0]);
      const memBytes = Number(parts[1]);
      const cpuSeconds = Number(parts[2]);
      if (!Number.isInteger(pid)) continue;
      out.set(pid, {
        cpuSeconds: Number.isFinite(cpuSeconds) ? cpuSeconds : null,
        memBytes: Number.isFinite(memBytes) ? memBytes : null,
      });
    }
  } catch { /* powershell missing / errored */ }
  return out;
}

/** Parse `ps` cumulative CPU time (`[[dd-]hh:]mm:ss[.ff]`) into seconds. */
function parseCpuTime(raw: string | undefined): number | null {
  if (!raw) return null;
  let days = 0;
  let rest = raw;
  const dash = rest.indexOf('-');
  if (dash >= 0) { days = Number(rest.slice(0, dash)); rest = rest.slice(dash + 1); }
  const parts = rest.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  return days * 86_400 + seconds;
}

let singleton: ResourceMonitor | null = null;
export function getResourceMonitor(): ResourceMonitor {
  if (!singleton) singleton = new ResourceMonitor();
  return singleton;
}

/** Number of logical CPUs, for expressing cpuPercent against total capacity. */
export function cpuCount(): number {
  try { return os.cpus().length || 1; } catch { return 1; }
}
