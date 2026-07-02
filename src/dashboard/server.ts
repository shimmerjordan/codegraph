/**
 * Local dashboard server — the backend behind `codegraph dashboard`.
 *
 * A dependency-free `node:http` server (matching the repo's zero-http-dep
 * posture) that:
 *   - exposes a small read-only JSON API over the shared local metrics DB
 *     (`~/.codegraph/metrics.db`, written by every daemon on this machine), and
 *   - serves the built React SPA from `dist/dashboard/public`.
 *
 * It is LOCAL and READ-ONLY: binds 127.0.0.1 by default, opens no outbound
 * connection, and never mutates the index or the metrics. Phase 3's central
 * reporter is a separate, opt-in layer — nothing here shares anything off-box.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { getMetrics } from '../metrics';
import { listDaemons } from '../mcp/daemon-registry';
import { discoverConfiguredProjects } from './discover';
import { getResourceMonitor, cpuCount, type ResourceSample } from './resources';
import { HOST_PPID_ENV, RELAUNCH_GUARD_ENV } from '../extraction/wasm-runtime-flags';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

export interface DashboardServerOptions {
  port?: number;
  host?: string;
  /** Root of the built SPA; defaults to `<dist>/dashboard/public`. */
  publicDir?: string;
}

/** Set of realpath'd roots that currently have a LIVE daemon. */
function liveRoots(): Set<string> {
  const set = new Set<string>();
  try {
    for (const d of listDaemons({ prune: false })) set.add(path.resolve(d.root));
  } catch {
    /* registry hiccup — everything just shows as offline */
  }
  return set;
}

interface ResourcesPayload extends ResourceSample {
  ts: number;
  cpuCount: number;
  disk: {
    /** Sum of every configured project's index DB size. */
    indexBytes: number;
    /** Size of the shared metrics DB (`~/.codegraph/metrics.db`). */
    metricsDbBytes: number;
    totalBytes: number;
    perWorkspace: Array<{ root: string; dbSizeBytes: number; live: boolean }>;
  };
}

/**
 * Live CPU/memory of every running daemon + the on-disk footprint of the
 * indexes and the metrics DB. Best-effort — a process that can't be sampled
 * just contributes null CPU/mem, never an error.
 */
function buildResources(): ResourcesPayload {
  const daemons = listDaemons({ prune: false }).map((d) => ({
    root: path.resolve(d.root),
    pid: d.pid,
    version: d.version,
    startedAt: d.startedAt,
  }));
  const sample = getResourceMonitor().sample(daemons);

  const live = liveRoots();
  const workspaces = getMetrics().getWorkspaces(live);
  let indexBytes = 0;
  const perWorkspace = workspaces.map((w) => {
    indexBytes += w.dbSizeBytes;
    return { root: w.root, dbSizeBytes: w.dbSizeBytes, live: w.live };
  });
  let metricsDbBytes = 0;
  try { metricsDbBytes = fs.statSync(getMetrics().dbPath).size; } catch { /* not created yet */ }

  return {
    ...sample,
    ts: Date.now(),
    cpuCount: cpuCount(),
    disk: { indexBytes, metricsDbBytes, totalBytes: indexBytes + metricsDbBytes, perWorkspace },
  };
}

export interface ReadHookStatus {
  /** True when the PostToolUse read-tracking hook is wired in Claude settings. */
  installed: boolean;
  /** The settings.json we inspect (`~/.claude/settings.json`). */
  settingsPath: string;
}

/** Command substring the read-tracking PostToolUse hook runs (see installer/targets/claude). */
const READ_HOOK_COMMAND = 'codegraph hook post-tool-use';

/**
 * Whether the read-tracking PostToolUse hook (`codegraph hook post-tool-use`)
 * is present in Claude Code's global `settings.json`. This is what the installer
 * auto-writes; the dashboard reads it back so it can tell "the agent made no
 * raw reads" apart from "we're not counting raw reads at all" — and surface a
 * prominent enable-it warning in the latter case. Best-effort: a missing or
 * malformed settings file reads as "not installed", never an error.
 */
export function readHookStatus(): ReadHookStatus {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  let installed = false;
  try {
    const cfg = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      hooks?: { PostToolUse?: Array<{ hooks?: Array<{ command?: unknown }> }> };
    };
    const groups = cfg.hooks?.PostToolUse;
    if (Array.isArray(groups)) {
      installed = groups.some(
        (g) => Array.isArray(g?.hooks) &&
          g.hooks.some((h) => typeof h?.command === 'string' && h.command.includes(READ_HOOK_COMMAND)),
      );
    }
  } catch {
    /* no settings / bad JSON → treat as not installed */
  }
  return { installed, settingsPath };
}

/** `since` = N-days-ago UTC day string, for the time-window filters. */
function sinceDay(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function handleApi(pathname: string, query: URLSearchParams, res: http.ServerResponse): boolean {
  const metrics = getMetrics();
  const daysParam = Number(query.get('days'));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 30;
  const since = query.get('all') === '1' ? undefined : sinceDay(days);
  // Optional per-workspace scope — when set, the stats panels show one project.
  const workspace = query.get('workspace') || undefined;

  switch (pathname) {
    case '/api/health':
      sendJson(res, 200, { ok: true, ts: Date.now() });
      return true;
    case '/api/overview':
      sendJson(res, 200, metrics.getOverview(since, workspace));
      return true;
    case '/api/tools':
      sendJson(res, 200, metrics.getToolStats(since, workspace));
      return true;
    case '/api/host-tools':
      sendJson(res, 200, metrics.getHostToolStats(since, workspace));
      return true;
    case '/api/daily':
      sendJson(res, 200, metrics.getDailyStats(days, workspace));
      return true;
    case '/api/workspaces':
      sendJson(res, 200, metrics.getWorkspaces(liveRoots()));
      return true;
    case '/api/jobs':
      sendJson(res, 200, listJobs());
      return true;
    case '/api/resources':
      sendJson(res, 200, buildResources());
      return true;
    case '/api/summary':
      // One round-trip for the whole dashboard boot. The stats panels honor the
      // workspace scope; the workspace list + jobs + resources are machine-wide.
      sendJson(res, 200, {
        overview: metrics.getOverview(since, workspace),
        tools: metrics.getToolStats(since, workspace),
        hostTools: metrics.getHostToolStats(since, workspace),
        daily: metrics.getDailyStats(days, workspace),
        workspaces: metrics.getWorkspaces(liveRoots()),
        jobs: listJobs(),
        resources: buildResources(),
        readHook: readHookStatus(),
        window: { days, all: since === undefined, workspace: workspace ?? null },
      });
      return true;
    default:
      return false;
  }
}

// --- project management (init / index / sync from the UI) -------------------

type JobAction = 'init' | 'index' | 'sync';
interface Job {
  id: number;
  action: JobAction;
  path: string;
  status: 'running' | 'done' | 'error';
  output: string;
  startedAt: number;
  endedAt: number;
}

const jobs = new Map<number, Job>();
let nextJobId = 1;
const MAX_JOBS = 50;
const MAX_JOB_OUTPUT = 16 * 1024;

function listJobs(): Job[] {
  return [...jobs.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, MAX_JOBS);
}

/** Resolve the codegraph CLI entry next to this compiled server (dist/bin). */
function resolveCliBin(): string {
  return path.resolve(__dirname, '..', 'bin', 'codegraph.js');
}

/**
 * Env for a spawned CLI job. The dashboard server itself almost always came up
 * through the `--liftoff-only` re-exec (and the installer launches it detached
 * via nohup), so its OWN environment carries `CODEGRAPH_WASM_RELAUNCHED=1` and a
 * `CODEGRAPH_HOST_PPID` pointing at the dashboard's original launcher. If a
 * child `index`/`sync` job inherited those, its PPID watchdog would latch onto
 * that stale host pid — long dead once the detached launcher exited — and abort
 * the index the instant it polls ("Parent process exited (host pid N exited)").
 * Scrub both so the child re-execs cleanly and stamps a FRESH host pid: its live
 * parent, this server. See ../extraction/wasm-runtime-flags + ../bin/command-supervision.
 */
export function jobChildEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...baseEnv };
  delete env[HOST_PPID_ENV];
  delete env[RELAUNCH_GUARD_ENV];
  return env;
}

/**
 * Run a codegraph project command as a tracked background job. argv is passed
 * to the CLI directly (no shell), so the path can't be used for injection. The
 * path is validated to be an existing directory before we spawn.
 */
function startJob(action: JobAction, targetPath: string): { jobId?: number; error?: string } {
  let resolved: string;
  try {
    resolved = path.resolve(targetPath);
  } catch {
    return { error: 'invalid path' };
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return { error: `not a directory: ${resolved}` };
  }
  const id = nextJobId++;
  const job: Job = { id, action, path: resolved, status: 'running', output: '', startedAt: Date.now(), endedAt: 0 };
  jobs.set(id, job);
  // Trim the registry so it can't grow unbounded.
  if (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.values()].sort((a, b) => a.startedAt - b.startedAt)[0];
    if (oldest) jobs.delete(oldest.id);
  }

  const args = action === 'index' ? [resolveCliBin(), 'index', resolved, '--force'] : [resolveCliBin(), action, resolved];
  const append = (chunk: Buffer | string) => {
    job.output = (job.output + chunk.toString()).slice(-MAX_JOB_OUTPUT);
  };
  try {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: jobChildEnv(process.env) });
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);
    child.on('error', (err) => { job.status = 'error'; append(`\n[spawn error] ${err.message}`); job.endedAt = Date.now(); });
    child.on('close', (code) => {
      job.status = code === 0 ? 'done' : 'error';
      job.endedAt = Date.now();
      if (code !== 0) append(`\n[exited with code ${code}]`);
    });
  } catch (err) {
    job.status = 'error';
    append(`[failed to start] ${err instanceof Error ? err.message : String(err)}`);
    job.endedAt = Date.now();
  }
  return { jobId: id };
}

/** POST body reader with a small cap. */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 64 * 1024) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

async function handlePost(pathname: string, req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  if (pathname === '/api/projects/scan') {
    let result = { registered: 0, scanned: 0 };
    try { result = discoverConfiguredProjects(); } catch { /* best-effort */ }
    sendJson(res, 200, result);
    return true;
  }
  if (pathname === '/api/hook/install') {
    // Recovery path for the dashboard's "raw reads" warning: write the
    // PostToolUse read-tracking hook into Claude's global settings.json (the
    // same entry `codegraph install` auto-writes) when auto-config didn't take.
    // Reuses the installer's surgical, idempotent writer — sibling hooks are
    // preserved and a re-run is a no-op.
    try {
      const { writeReadTrackingHookEntry } = await import('../installer/targets/claude');
      const result = writeReadTrackingHookEntry('global');
      sendJson(res, 200, { ok: true, action: result.action, path: result.path });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return true;
  }
  if (pathname === '/api/projects/delete') {
    const body = await readBody(req);
    let parsed: { path?: string };
    try { parsed = JSON.parse(body || '{}'); } catch { sendJson(res, 400, { error: 'invalid JSON' }); return true; }
    if (typeof parsed.path !== 'string' || parsed.path.trim() === '') {
      sendJson(res, 400, { error: 'path is required' });
      return true;
    }
    // Match the stored key (realpath'd) so we hit the right row.
    let root = parsed.path.trim();
    try { root = fs.realpathSync(root); } catch { /* use as-is */ }
    getMetrics().deleteProject(root);
    getMetrics().deleteProject(parsed.path.trim()); // also try the raw path, in case the row was keyed un-realpath'd
    sendJson(res, 200, { ok: true });
    return true;
  }
  if (pathname !== '/api/projects/run') return false;
  const body = await readBody(req);
  let parsed: { action?: string; path?: string };
  try { parsed = JSON.parse(body || '{}'); } catch { sendJson(res, 400, { error: 'invalid JSON' }); return true; }
  const action = parsed.action;
  if (action !== 'init' && action !== 'index' && action !== 'sync') {
    sendJson(res, 400, { error: 'action must be init | index | sync' });
    return true;
  }
  if (typeof parsed.path !== 'string' || parsed.path.trim() === '') {
    sendJson(res, 400, { error: 'path is required' });
    return true;
  }
  const result = startJob(action, parsed.path.trim());
  if (result.error) { sendJson(res, 400, result); return true; }
  sendJson(res, 202, { jobId: result.jobId });
  return true;
}

/** Serve a static file from publicDir; SPA-fallback to index.html. Path-safe. */
function serveStatic(publicDir: string, urlPath: string, res: http.ServerResponse): void {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, rel);
  // Directory traversal guard: the resolved path must stay under publicDir.
  if (resolved !== publicDir && !resolved.startsWith(publicDir + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  let filePath = resolved;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback (client-side routing) — serve index.html for unknown paths.
    filePath = path.join(publicDir, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(
      'CodeGraph dashboard UI is not built.\n\n' +
      'Run the frontend build (src/dashboard/web) so dist/dashboard/public exists, ' +
      'or use the JSON API directly at /api/summary.\n',
    );
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'content-type': CONTENT_TYPES[ext] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

export interface RunningDashboard {
  url: string;
  close: () => Promise<void>;
}

/** Start the server; resolves once it is listening. */
export function startDashboardServer(opts: DashboardServerOptions = {}): Promise<RunningDashboard> {
  const host = opts.host ?? '127.0.0.1';
  const port = opts.port ?? 4319;
  const publicDir = path.resolve(opts.publicDir ?? path.join(__dirname, 'public'));

  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        if (url.pathname.startsWith('/api/')) {
          if (req.method === 'POST') {
            if (!(await handlePost(url.pathname, req, res))) sendJson(res, 404, { error: 'not found' });
            return;
          }
          if (!handleApi(url.pathname, url.searchParams, res)) sendJson(res, 404, { error: 'not found' });
          return;
        }
        serveStatic(publicDir, url.pathname, res);
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    })();
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const shownHost = host === '0.0.0.0' ? 'localhost' : host;
      // Auto-discover already-configured projects (from agent configs + the
      // daemon registry) so they appear without re-running init. Off the
      // listen path, best-effort — a slow/failed scan never blocks serving.
      setImmediate(() => { try { discoverConfiguredProjects(); } catch { /* best-effort */ } });
      resolve({
        url: `http://${shownHost}:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/** Locate the dashboard web source dir — only present in a source checkout. */
function findWebDir(): string | null {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'src', 'dashboard', 'web'), // from dist/dashboard/
    path.resolve(__dirname, 'web'),                                 // from src/dashboard/ (tsx)
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'vite.config.ts'))) return c;
  }
  return null;
}

export interface ViteDevOptions {
  /** The running API server's URL — Vite proxies `/api` here. */
  apiUrl: string;
  host?: string;
  open?: boolean;
}

/**
 * Start the Vite dev server (HMR) for the dashboard frontend, proxying `/api`
 * to the already-running API server so edits to `src/dashboard/web/src/*`
 * hot-reload with NO rebuild and NO restart.
 *
 * Dev-only and best-effort: returns the child process, or `null` (with a
 * printed hint) when the web source or Vite isn't present — e.g. a published
 * npm install, which ships only the built `public/`. Inherits stdio so Vite
 * prints its own URL and reports errors directly.
 */
export function startViteDevServer(opts: ViteDevOptions): ChildProcess | null {
  const webDir = findWebDir();
  if (!webDir) {
    console.error('Dev mode needs the dashboard web source (src/dashboard/web), which is not in this install. Run from a source checkout.');
    return null;
  }
  if (!fs.existsSync(path.join(webDir, 'node_modules'))) {
    console.error(`Vite is not installed for the dashboard UI. Run:\n  (cd ${webDir} && npm install)`);
    return null;
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = ['run', 'dev', '--'];
  // Expose on the LAN too if the API is; Vite defaults to localhost otherwise.
  if (opts.host && opts.host !== '127.0.0.1' && opts.host !== 'localhost') args.push('--host', opts.host);
  if (opts.open) args.push('--open');
  const child = spawn(npm, args, {
    cwd: webDir,
    stdio: 'inherit',
    // vite.config.ts reads this to point its /api proxy at the live API port.
    env: { ...process.env, CODEGRAPH_DASHBOARD_API: opts.apiUrl },
  });
  child.on('error', (err) => console.error(`Failed to start the Vite dev server: ${err.message}`));
  // Don't outlive the parent: kill Vite when this process exits.
  const kill = () => { try { child.kill(); } catch { /* already gone */ } };
  process.on('exit', kill);
  process.on('SIGINT', kill);
  process.on('SIGTERM', kill);
  return child;
}

/** Best-effort open the URL in the default browser (skipped with --no-open). */
export function openBrowser(url: string): void {
  try {
    const cmd = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => { /* no browser — the URL is printed anyway */ });
    child.unref();
  } catch {
    /* ignore */
  }
}
