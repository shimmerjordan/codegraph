/**
 * Local metrics — process-wide singleton + the on/off gate.
 *
 * Collection is DEFAULT ON and purely local (writes only to
 * `~/.codegraph/metrics.db`, nothing leaves the box). It is disabled by:
 *   - CODEGRAPH_METRICS=0 / false      (explicit opt-out)
 *   - CODEGRAPH_DASHBOARD=0 / false    (the umbrella dashboard switch)
 *   - DO_NOT_TRACK=1                    (cross-tool standard, honored like telemetry)
 *
 * Recording through the singleton is a no-op when disabled, so callers on the
 * hot path never branch — they just call `getMetrics().recordToolCall(...)`.
 */

import { MetricsStore } from './store';

export { MetricsStore, estimateTokens, estimateResultTokens } from './store';
export type {
  WorkspaceSnapshot, OverviewRow, ToolStatRow, HostToolStatRow, DayStatRow, WorkspaceRow,
} from './store';

function envDisabled(env: NodeJS.ProcessEnv): boolean {
  const off = (v: string | undefined): boolean =>
    v !== undefined && v !== '' && v !== '0' && v.toLowerCase() !== 'false';
  // Never write to the real ~/.codegraph/metrics.db from a test run — the suite
  // spins up real daemons/engines with temp project dirs, which would otherwise
  // pollute the developer's global dashboard with ephemeral /tmp workspaces.
  if (env.VITEST || env.NODE_ENV === 'test') return true;
  if (off(env.DO_NOT_TRACK)) return true;
  const explicit = (v: string | undefined): boolean | undefined =>
    v === undefined || v === '' ? undefined : v !== '0' && v.toLowerCase() !== 'false';
  const metrics = explicit(env.CODEGRAPH_METRICS);
  if (metrics !== undefined) return !metrics;
  const dashboard = explicit(env.CODEGRAPH_DASHBOARD);
  if (dashboard !== undefined) return !dashboard;
  return false; // default ON
}

export function isMetricsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !envDisabled(env);
}

/**
 * A metrics store that no-ops every record when disabled but still supports
 * reads (the dashboard reads regardless of whether THIS process records).
 */
class GatedMetrics extends MetricsStore {
  private readonly enabled = isMetricsEnabled();
  override recordToolCall(input: Parameters<MetricsStore['recordToolCall']>[0]): void {
    if (this.enabled) super.recordToolCall(input);
  }
  override recordCache(workspace: string | null, hit: boolean): void {
    if (this.enabled) super.recordCache(workspace, hit);
  }
  override recordHostToolCall(input: Parameters<MetricsStore['recordHostToolCall']>[0]): void {
    if (this.enabled) super.recordHostToolCall(input);
  }
  override recordSnapshot(snap: Parameters<MetricsStore['recordSnapshot']>[0]): void {
    if (this.enabled) super.recordSnapshot(snap);
  }
  override startInterval(everyMs?: number): void {
    if (this.enabled) super.startInterval(everyMs);
  }
}

let singleton: MetricsStore | null = null;

export function getMetrics(): MetricsStore {
  if (!singleton) singleton = new GatedMetrics();
  return singleton;
}
