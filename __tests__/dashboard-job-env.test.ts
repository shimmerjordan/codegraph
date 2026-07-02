/**
 * Regression: the dashboard's "run project command" jobs (init/index/sync) must
 * NOT inherit the server's own supervision env.
 *
 * The dashboard server almost always comes up through the `--liftoff-only`
 * re-exec (and the installer launches it detached via nohup), so its own
 * process env carries `CODEGRAPH_WASM_RELAUNCHED=1` and a `CODEGRAPH_HOST_PPID`
 * pointing at the dashboard's original — and, once detached, long-dead —
 * launcher. If a spawned `index` job inherited those, its PPID watchdog
 * (installCommandSupervision) would latch onto that stale host pid and abort the
 * index the instant it polled: "Parent process exited (host pid N exited)".
 *
 * `jobChildEnv` scrubs both so the child re-execs cleanly and stamps a fresh,
 * live host pid (the dashboard itself). See src/dashboard/server.ts.
 */
import { describe, it, expect } from 'vitest';
import { jobChildEnv } from '../src/dashboard/server';
import { HOST_PPID_ENV, RELAUNCH_GUARD_ENV } from '../src/extraction/wasm-runtime-flags';

describe('dashboard job child env', () => {
  it('scrubs the inherited supervision/relaunch vars', () => {
    const poisoned = {
      [HOST_PPID_ENV]: '3930843', // a now-dead detached launcher pid
      [RELAUNCH_GUARD_ENV]: '1',
      PATH: '/usr/bin',
      HOME: '/home/user',
    };
    const env = jobChildEnv(poisoned);
    expect(env[HOST_PPID_ENV]).toBeUndefined();
    expect(env[RELAUNCH_GUARD_ENV]).toBeUndefined();
  });

  it('preserves every other env var untouched', () => {
    const poisoned = {
      [HOST_PPID_ENV]: '3930843',
      [RELAUNCH_GUARD_ENV]: '1',
      PATH: '/usr/bin',
      HOME: '/home/user',
      CODEGRAPH_DASHBOARD_PORT: '4319',
    };
    const env = jobChildEnv(poisoned);
    expect(env.PATH).toBe('/usr/bin');
    expect(env.HOME).toBe('/home/user');
    expect(env.CODEGRAPH_DASHBOARD_PORT).toBe('4319');
  });

  it('does not mutate the source env object', () => {
    const source = { [HOST_PPID_ENV]: '3930843', [RELAUNCH_GUARD_ENV]: '1' };
    jobChildEnv(source);
    expect(source[HOST_PPID_ENV]).toBe('3930843');
    expect(source[RELAUNCH_GUARD_ENV]).toBe('1');
  });
});
