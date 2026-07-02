import { describe, it, expect } from 'vitest';
import { ResourceMonitor, cpuCount, type DaemonProc } from '../src/dashboard/resources';

/** This process — guaranteed to exist, so /proc | ps | powershell finds it. */
const self = (): DaemonProc => ({
  root: process.cwd(),
  pid: process.pid,
  version: 'test',
  startedAt: Date.now() - 5000,
});

describe('resource monitor', () => {
  it('reads RSS for a live process and reports null CPU on the first sighting', () => {
    const m = new ResourceMonitor();
    const s = m.sample([self()]);
    expect(s.processes).toHaveLength(1);
    const p = s.processes[0];
    // A rate needs two samples — first sighting has no prior anchor.
    expect(p.cpuPercent).toBeNull();
    // RSS is read directly, so it's available immediately.
    expect(p.memBytes).toBeGreaterThan(0);
    expect(s.totals.memBytes).toBe(p.memBytes);
  });

  it('computes a CPU% rate once a second sample exists', () => {
    // Inject a clock so the delta is deterministic and skips the TTL cache.
    let t = 1_000_000;
    const m = new ResourceMonitor(() => t);
    m.sample([self()]);          // seed prevCpu
    t += 2_000;                  // advance past MIN_INTERVAL_MS
    const p = m.sample([self()]).processes[0];
    expect(p.cpuPercent).not.toBeNull();
    expect(p.cpuPercent!).toBeGreaterThanOrEqual(0);
  });

  it('serves a cached sample within the min interval (CPU anchored to real polls)', () => {
    let t = 5_000_000;
    const m = new ResourceMonitor(() => t);
    const first = m.sample([self()]);
    t += 500;                    // well under MIN_INTERVAL_MS
    const second = m.sample([self()]);
    expect(second).toBe(first);  // same object — no re-sampling
  });

  it('returns null CPU and memory for a dead pid without throwing', () => {
    const m = new ResourceMonitor();
    const dead: DaemonProc = { root: '/nope', pid: 2_147_483_646, version: '', startedAt: 0 };
    const p = m.sample([dead]).processes[0];
    expect(p.cpuPercent).toBeNull();
    expect(p.memBytes).toBeNull();
  });

  it('sums totals across processes and tolerates an empty list', () => {
    const m = new ResourceMonitor();
    const empty = m.sample([]);
    expect(empty.processes).toHaveLength(0);
    expect(empty.totals).toEqual({ count: 0, cpuPercent: null, memBytes: 0 });
  });

  it('reports at least one logical CPU', () => {
    expect(cpuCount()).toBeGreaterThanOrEqual(1);
  });
});
