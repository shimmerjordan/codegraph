// Types mirror src/metrics/store.ts read shapes + the server's /api/summary.

export interface Overview {
  totalCalls: number;
  totalErrors: number;
  totalOutTokens: number;
  cacheHits: number;
  cacheMisses: number;
  workspaceCount: number;
  hostCalls: number;
  hostTokens: number;
}
export interface ToolStat {
  tool: string;
  calls: number;
  errors: number;
  avgMs: number;
  outTokens: number;
}
export interface HostToolStat {
  tool: string;
  calls: number;
  outTokens: number;
}
export interface DayStat {
  day: string;
  calls: number;
  errors: number;
  outTokens: number;
}
export interface Workspace {
  root: string;
  files: number;
  nodes: number;
  edges: number;
  languages: Record<string, number>;
  dbSizeBytes: number;
  version: string;
  pid: number;
  startedAt: number;
  initializedAt: number;
  calls: number;
  errors: number;
  outTokens: number;
  live: boolean;
  configured: boolean;
}
export interface Job {
  id: number;
  action: 'init' | 'index' | 'sync';
  path: string;
  status: 'running' | 'done' | 'error';
  output: string;
  startedAt: number;
  endedAt: number;
}
export interface ProcResource {
  root: string;
  pid: number;
  version: string;
  startedAt: number;
  cpuPercent: number | null;
  memBytes: number | null;
}
export interface Resources {
  ts: number;
  cpuCount: number;
  processes: ProcResource[];
  totals: { count: number; cpuPercent: number | null; memBytes: number };
  disk: {
    indexBytes: number;
    metricsDbBytes: number;
    totalBytes: number;
    perWorkspace: Array<{ root: string; dbSizeBytes: number; live: boolean }>;
  };
}
export interface ReadHookStatus {
  installed: boolean;
  settingsPath: string;
}
export interface Summary {
  overview: Overview;
  tools: ToolStat[];
  hostTools: HostToolStat[];
  daily: DayStat[];
  workspaces: Workspace[];
  jobs: Job[];
  resources: Resources;
  /** Whether the PostToolUse read-tracking hook is wired in Claude settings. */
  readHook?: ReadHookStatus;
  window: { days: number; all: boolean; workspace: string | null };
}

export async function fetchSummary(windowDays: number | 'all', workspace?: string): Promise<Summary> {
  const params = new URLSearchParams();
  if (windowDays === 'all') params.set('all', '1');
  else params.set('days', String(windowDays));
  if (workspace) params.set('workspace', workspace);
  const res = await fetch(`/api/summary?${params.toString()}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as Summary;
}

/** Kick off a codegraph init / index / sync on a project path. */
export async function runProject(action: 'init' | 'index' | 'sync', path: string): Promise<{ jobId?: number; error?: string }> {
  const res = await fetch('/api/projects/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, path }),
  });
  return (await res.json()) as { jobId?: number; error?: string };
}

/** Discover already-configured projects (agent configs + daemon registry) and register them. */
export async function scanProjects(): Promise<{ registered: number; scanned: number }> {
  const res = await fetch('/api/projects/scan', { method: 'POST' });
  return (await res.json()) as { registered: number; scanned: number };
}

/** Remove a project from the dashboard (deletes its metrics rows; does NOT touch its .codegraph/ index). */
export async function deleteProject(path: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch('/api/projects/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return (await res.json()) as { ok?: boolean; error?: string };
}

/**
 * Install the PostToolUse read-tracking hook into Claude's global settings.json
 * (the recovery path when `codegraph install` didn't auto-configure it).
 */
export async function installReadHook(): Promise<{ ok?: boolean; action?: string; path?: string; error?: string }> {
  const res = await fetch('/api/hook/install', { method: 'POST' });
  return (await res.json()) as { ok?: boolean; action?: string; path?: string; error?: string };
}
