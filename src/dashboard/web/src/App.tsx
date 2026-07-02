import { useCallback, useEffect, useState } from 'react';
import { deleteProject, fetchSummary, installReadHook, runProject, scanProjects, type Summary } from './api';
import { ProjectsPanel, ReadsComparisonPanel, ResourcesPanel, StatCard, ToolsTable, WorkspacesTable } from './components';
import { LineChart, PieChart, type Slice } from './charts';
import { fmtInt, fmtPct, fmtTokens } from './format';

type Window = 7 | 30 | 'all';
const REFRESH_MS = 15_000;
/** Poll faster while a project job is running so its output/status updates live. */
const FAST_REFRESH_MS = 2_500;

function shortPath(p: string): string {
  const parts = p.replace(/\/+$/, '').split(/[/\\]/);
  return parts.slice(-2).join('/') || p;
}

export function App() {
  const [win, setWin] = useState<Window>(30);
  const [scope, setScope] = useState<string | null>(null); // selected workspace root
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [enablingHook, setEnablingHook] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await fetchSummary(win, scope ?? undefined);
      setData(s);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [win, scope]);

  const anyJobRunning = data?.jobs.some((j) => j.status === 'running') ?? false;

  useEffect(() => {
    load();
    const t = setInterval(load, anyJobRunning ? FAST_REFRESH_MS : REFRESH_MS);
    return () => clearInterval(t);
  }, [load, anyJobRunning]);

  const onRun = useCallback(async (action: 'init' | 'index' | 'sync', path: string) => {
    const res = await runProject(action, path);
    setNotice(res.error ? `Error: ${res.error}` : `Started ${action} on ${path}`);
    setTimeout(() => setNotice(null), 4000);
    load();
  }, [load]);

  const onScan = useCallback(async () => {
    setNotice('Scanning for configured projects…');
    const res = await scanProjects();
    setNotice(`Discovered ${res.registered} configured project(s) (scanned ${res.scanned} candidate path(s)).`);
    setTimeout(() => setNotice(null), 5000);
    load();
  }, [load]);

  const onRemove = useCallback(async (path: string) => {
    if (!window.confirm(`Remove "${path}" from the dashboard?\n\nThis only clears its stats here — it does NOT delete the project's .codegraph index. (A still-configured project may reappear on the next scan.)`)) return;
    await deleteProject(path);
    if (scope === path) setScope(null);
    setNotice(`Removed ${path} from the dashboard.`);
    setTimeout(() => setNotice(null), 4000);
    load();
  }, [load, scope]);

  const onEnableHook = useCallback(async () => {
    setEnablingHook(true);
    try {
      const res = await installReadHook();
      setNotice(res.ok
        ? `Read-tracking hook ${res.action === 'unchanged' ? 'already installed' : 'installed'} in ${res.path}. Restart your agent to activate it.`
        : `Could not install the hook: ${res.error ?? 'unknown error'}`);
    } catch (e) {
      setNotice(`Could not install the hook: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnablingHook(false);
      setTimeout(() => setNotice(null), 6000);
      load();
    }
  }, [load]);

  const ov = data?.overview;
  const cacheTotal = ov ? ov.cacheHits + ov.cacheMisses : 0;

  const toolSlices: Slice[] = (data?.tools ?? []).map((t) => ({ label: t.tool.replace(/^codegraph_/, ''), value: t.calls }));
  const wsSlices: Slice[] = (data?.workspaces ?? []).map((w) => ({ label: shortPath(w.root), value: w.calls })).filter((s) => s.value > 0);

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">◆</span>
          <div>
            <h1>CodeGraph Dashboard</h1>
            <p className="muted">Local usage &amp; token intelligence · all data stays on this machine</p>
          </div>
        </div>
        <div className="controls">
          <div className="window-toggle">
            {([7, 30, 'all'] as Window[]).map((w) => (
              <button key={w} className={win === w ? 'active' : ''} onClick={() => setWin(w)}>
                {w === 'all' ? 'All' : `${w}d`}
              </button>
            ))}
          </div>
          <button className="refresh" onClick={load}>Refresh</button>
        </div>
      </header>

      {scope && (
        <div className="banner scope">
          Scoped to workspace: <span className="mono">{scope}</span>
          <button className="chip clear" onClick={() => setScope(null)}>Show all ✕</button>
        </div>
      )}
      {notice && <div className="banner info">{notice}</div>}
      {error && <div className="banner error">Could not reach the dashboard API: {error}</div>}

      {ov && (
        <section className="stat-grid">
          <StatCard
            label="CodeGraph calls" value={fmtInt(ov.totalCalls)} sub={`${fmtInt(ov.totalErrors)} errors`}
            help="Calls to CodeGraph's own MCP tools (explore / node / status). Your agent's Read & Grep don't go through CodeGraph, so they are NOT counted here — CodeGraph can't see them."
          />
          <StatCard
            label="Answered rate"
            value={fmtPct(ov.totalCalls - ov.totalErrors - (ov.totalGuidance ?? 0), ov.totalCalls)}
            sub={`${fmtInt(ov.totalErrors)} errors · ${fmtInt(ov.totalGuidance ?? 0)} guidance`}
            accent="#3fb950"
            help="Share of calls answered from a real index. 'Guidance' counts the success-shaped replies CodeGraph returns when a project isn't indexed (deliberately not errors, so agents don't abandon the tools) — the old Success rate counted those as successes, which pinned it at ~100% and made it meaningless."
          />
          <StatCard
            label="Context served" value={fmtTokens(ov.totalOutTokens)} sub="delivered to the agent · ≈ chars/4" accent="#58a6ff"
            help="Estimated size of the context CodeGraph RETURNED to your agent — a proxy for how much it delivered, NOT tokens saved. Real savings can only be measured by comparing against not using CodeGraph at all."
          />
          <StatCard
            label="Cache hit rate" value={fmtPct(ov.cacheHits, cacheTotal)} sub={`${fmtInt(ov.cacheHits)} / ${fmtInt(cacheTotal)}`} accent="#d29922"
            help="Hits when the SAME CodeGraph call (same project, tool, args) repeats within a session. Exploratory queries differ each time, so a low rate is expected — this is not an 'avoided a Read' rate."
          />
          <StatCard
            label="Raw file reads" value={fmtInt(ov.hostCalls)}
            sub={ov.hostCalls > 0
              ? `${fmtTokens(ov.hostTokens)} pulled in`
              : (data.readHook && !data.readHook.installed ? '⚠ hook not installed' : 'none recorded yet')}
            accent="#ff7b72"
            help="Your agent's own Read / Grep / Glob calls, captured by the optional PostToolUse hook — the reading CodeGraph is meant to displace. If the hook isn't installed the panel below has a one-click enable."
          />
          <StatCard label="Workspaces" value={fmtInt(ov.workspaceCount)} sub={`${data.workspaces.filter((w) => w.live).length} online`} />
        </section>
      )}

      {data?.resources && <ResourcesPanel resources={data.resources} />}
      {data && <ReadsComparisonPanel overview={data.overview} hostTools={data.hostTools ?? []} readHook={data.readHook} onEnableHook={onEnableHook} enabling={enablingHook} />}

      {data && (
        <>
          <LineChart data={data.daily} />
          <div className="two-col">
            <PieChart title={`Tool-call share${scope ? ' (this project)' : ''}`} data={toolSlices} />
            <PieChart title="Calls by project" data={wsSlices} />
          </div>
          <ToolsTable tools={data.tools} />
          <WorkspacesTable workspaces={data.workspaces} selected={scope} onScope={setScope} onRun={onRun} onScan={onScan} onRemove={onRemove} />
          <ProjectsPanel jobs={data.jobs} onInit={(p) => onRun('init', p)} />
        </>
      )}

      <footer className="muted">
        {updatedAt > 0 && `Updated ${new Date(updatedAt).toLocaleTimeString()} · auto-refresh ${(anyJobRunning ? FAST_REFRESH_MS : REFRESH_MS) / 1000}s`}
        {data && ` · window: ${data.window.all ? 'all time' : `last ${data.window.days} days`}`}
      </footer>
    </div>
  );
}
