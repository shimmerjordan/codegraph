import { useState } from 'react';
import type { DayStat, HostToolStat, Job, Overview, ReadHookStatus, Resources, ToolStat, Workspace } from './api';
import { fmtBytes, fmtDuration, fmtInt, fmtPct, fmtTokens } from './format';

const HOOK_SNIPPET = `{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Read|Grep|Glob",
        "hooks": [
          { "type": "command", "command": "codegraph hook post-tool-use" }
        ]
      }
    ]
  }
}`;

/**
 * CodeGraph vs raw file reads — the one comparison CodeGraph can't make from
 * inside its own MCP server. `overview.hostCalls` comes from the optional
 * PostToolUse read-tracking hook. We use the server-reported `readHook.installed`
 * to tell three states apart:
 *   - hook NOT installed → a prominent warning + one-click enable (the reads
 *     panel is blind until it's wired), regardless of the raw count;
 *   - installed but no raw reads yet → a benign "on, nothing recorded" note;
 *   - raw reads recorded → the real comparison.
 */
export function ReadsComparisonPanel(props: {
  overview: Overview;
  hostTools: HostToolStat[];
  readHook?: ReadHookStatus;
  onEnableHook: () => void;
  enabling?: boolean;
}) {
  const { overview: ov, hostTools, readHook, onEnableHook, enabling } = props;
  const cg = ov.totalCalls;
  const raw = ov.hostCalls;
  // Treat an older server that doesn't report readHook as "installed if we've
  // seen raw reads" so we don't nag when the panel already has real data.
  const hookInstalled = readHook ? readHook.installed : raw > 0;

  if (!hookInstalled) {
    return (
      <div className="card warn">
        <h3>⚠ Raw file reads are NOT being tracked</h3>
        <p className="small">
          CodeGraph only sees calls to its own tools — it can't observe the files your agent reads directly with
          <code> Read</code>/<code>Grep</code>/<code>Glob</code>. Until the <strong>PostToolUse</strong> hook is installed, this panel
          can't show how much file-reading CodeGraph actually displaces.
        </p>
        <div className="warn-actions">
          <button className="primary" onClick={onEnableHook} disabled={enabling}>
            {enabling ? 'Enabling…' : 'Enable read tracking'}
          </button>
          <span className="muted small">
            Writes the hook into Claude Code's{' '}
            <code>{readHook?.settingsPath ?? '~/.claude/settings.json'}</code>. Restart your agent afterward.
          </span>
        </div>
        <details className="warn-manual">
          <summary className="muted small">Prefer to add it manually? (or for a non-Claude agent)</summary>
          <pre className="job-output">{HOOK_SNIPPET}</pre>
          <p className="muted small">Nothing leaves your machine — the hook only increments a local counter in <code>~/.codegraph/metrics.db</code>, always exits 0, and never blocks a tool call.</p>
        </details>
      </div>
    );
  }

  if (raw === 0) {
    return (
      <div className="card">
        <h3>CodeGraph vs raw file reads <span className="muted small">read tracking is on</span></h3>
        <p className="muted small">
          ✓ The read-tracking hook is installed. No raw <code>Read</code>/<code>Grep</code>/<code>Glob</code> calls recorded yet —
          use your agent on an indexed project and this panel will fill in with the CodeGraph-vs-raw split.
        </p>
      </div>
    );
  }

  const total = cg + raw;
  const cgShare = total > 0 ? cg / total : 0;
  const avgCg = cg > 0 ? ov.totalOutTokens / cg : 0;
  const avgRaw = raw > 0 ? ov.hostTokens / raw : 0;
  return (
    <div className="card">
      <h3>CodeGraph vs raw file reads <span className="muted small">how often the agent asked CodeGraph instead of reading files itself</span></h3>
      <div className="split-bar" title={`${fmtInt(cg)} CodeGraph calls · ${fmtInt(raw)} raw reads`}>
        <div className="split cg" style={{ width: `${cgShare * 100}%` }}>{cgShare >= 0.12 ? `${Math.round(cgShare * 100)}%` : ''}</div>
        <div className="split raw" style={{ width: `${(1 - cgShare) * 100}%` }}>{1 - cgShare >= 0.12 ? `${Math.round((1 - cgShare) * 100)}%` : ''}</div>
      </div>
      <div className="split-legend">
        <span><i className="swatch cg" /> CodeGraph calls: <strong>{fmtInt(cg)}</strong> · {fmtTokens(ov.totalOutTokens)} served</span>
        <span><i className="swatch raw" /> Raw file reads: <strong>{fmtInt(raw)}</strong> · {fmtTokens(ov.hostTokens)} pulled in</span>
      </div>
      <div className="per-lookup" title="Real measured averages from your own usage. CodeGraph often delivers more per call because one call replaces several raw reads — the win is in FEWER calls (the split above), not smaller ones. A local 'tokens saved' figure isn't shown because it can't be measured without a no-CodeGraph baseline.">
        Avg context per lookup — <span className="mono">CodeGraph ≈ {fmtTokens(Math.round(avgCg))} tok</span> · <span className="mono">raw read ≈ {fmtTokens(Math.round(avgRaw))} tok</span>
      </div>
      {hostTools.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Raw tool</th><th className="num">Calls</th><th className="num">Est. tokens read</th></tr>
            </thead>
            <tbody>
              {hostTools.map((h) => (
                <tr key={h.tool}>
                  <td className="mono">{h.tool}</td>
                  <td className="num">{fmtInt(h.calls)}</td>
                  <td className="num">{fmtTokens(h.outTokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function shortRoot(p: string): string {
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/);
  return parts.slice(-2).join('/') || p;
}

/**
 * Live resource usage of the running CodeGraph daemons: per-process CPU% (of a
 * single core) and resident memory, plus the on-disk footprint of the indexes
 * and the shared metrics DB. CPU shows "—" until the second poll (it's a rate).
 */
export function ResourcesPanel(props: { resources: Resources }) {
  const { resources: r } = props;
  const now = Date.now();
  const cpu = r.totals.cpuPercent;
  const running = r.processes.filter((p) => p.pid > 0);
  return (
    <div className="card">
      <h3>Resource usage <span className="muted small">live · {running.length} daemon{running.length === 1 ? '' : 's'} running</span></h3>
      <div className="stat-grid inner">
        <StatCard
          label="CPU"
          value={cpu === null ? '—' : `${cpu.toFixed(1)}%`}
          sub={`of 1 core · ${r.cpuCount} cores total`}
          accent="#3fb950"
        />
        <StatCard label="Memory (RSS)" value={fmtBytes(r.totals.memBytes)} sub="resident, all daemons" accent="#58a6ff" />
        <StatCard label="Disk — indexes" value={fmtBytes(r.disk.indexBytes)} sub={`${r.disk.perWorkspace.length} project(s)`} accent="#d29922" />
        <StatCard label="Disk — metrics DB" value={fmtBytes(r.disk.metricsDbBytes)} sub="~/.codegraph/metrics.db" accent="#bc8cff" />
      </div>
      {running.length === 0 ? (
        <p className="muted small">No daemon is running right now — CodeGraph only uses CPU/memory while an agent (or <code>codegraph serve</code>) has a project open. Disk usage above is always current.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Project</th><th className="num">PID</th><th>Version</th><th className="num">CPU</th><th className="num">Memory</th><th className="num">Uptime</th></tr>
            </thead>
            <tbody>
              {running.map((p) => (
                <tr key={p.pid}>
                  <td className="mono path" title={p.root}>{shortRoot(p.root)}</td>
                  <td className="num mono">{p.pid}</td>
                  <td className="mono">{p.version || '—'}</td>
                  <td className="num">{p.cpuPercent === null ? '—' : `${p.cpuPercent.toFixed(1)}%`}</td>
                  <td className="num">{p.memBytes === null ? '—' : fmtBytes(p.memBytes)}</td>
                  <td className="num">{p.startedAt > 0 ? fmtDuration(now - p.startedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function StatCard(props: { label: string; value: string; sub?: string; accent?: string; help?: string }) {
  return (
    <div className="card stat" title={props.help}>
      <div className="stat-label">{props.label}{props.help && <span className="help-dot" aria-label={props.help}>?</span>}</div>
      <div className="stat-value" style={props.accent ? { color: props.accent } : undefined}>{props.value}</div>
      {props.sub && <div className="stat-sub">{props.sub}</div>}
    </div>
  );
}

/** Dependency-free SVG bar chart of a daily series. */
export function TrendChart(props: { data: DayStat[] }) {
  const { data } = props;
  const W = 720, H = 180, pad = 28;
  if (data.length === 0) return <div className="card"><h3>Daily activity</h3><p className="muted">No data yet.</p></div>;
  const max = Math.max(1, ...data.map((d) => d.calls));
  const bw = (W - pad * 2) / data.length;
  return (
    <div className="card">
      <h3>Daily tool calls</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Daily tool calls">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="axis" />
        {data.map((d, i) => {
          const h = ((H - pad * 2) * d.calls) / max;
          const x = pad + i * bw;
          const y = H - pad - h;
          const errH = d.calls > 0 ? (h * d.errors) / d.calls : 0;
          return (
            <g key={d.day}>
              <rect x={x + 1} y={y} width={Math.max(1, bw - 2)} height={h} className="bar">
                <title>{`${d.day}: ${d.calls} calls, ${d.errors} errors`}</title>
              </rect>
              {errH > 0 && <rect x={x + 1} y={H - pad - errH} width={Math.max(1, bw - 2)} height={errH} className="bar-err" />}
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span><i className="swatch bar" /> calls</span>
        <span><i className="swatch bar-err" /> errors</span>
        <span className="muted">{data[0].day} → {data[data.length - 1].day}</span>
      </div>
    </div>
  );
}

export function ToolsTable(props: { tools: ToolStat[] }) {
  if (props.tools.length === 0) return <div className="card"><h3>Tools</h3><p className="muted">No tool calls recorded.</p></div>;
  return (
    <div className="card">
      <h3>Tool usage</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Tool</th><th className="num">Calls</th><th className="num">Answered</th><th className="num">Error rate</th><th className="num">Avg latency</th><th className="num">Est. tokens</th></tr>
          </thead>
          <tbody>
            {props.tools.map((t) => (
              <tr key={t.tool}>
                <td className="mono">{t.tool}</td>
                <td className="num">{fmtInt(t.calls)}</td>
                <td className="num" title="Answered from a real index — excludes errors and not-indexed guidance replies">{fmtPct(t.calls - t.errors - (t.guidance ?? 0), t.calls)}</td>
                <td className="num">{fmtPct(t.errors, t.calls)}</td>
                <td className="num">{t.avgMs.toFixed(0)} ms</td>
                <td className="num">{fmtTokens(t.outTokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function topLanguages(langs: Record<string, number>, n = 3): string {
  const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, n);
  if (entries.length === 0) return '—';
  return entries.map(([k]) => k).join(', ');
}

export function WorkspacesTable(props: {
  workspaces: Workspace[];
  selected: string | null;
  onScope: (root: string | null) => void;
  onRun: (action: 'index' | 'sync', path: string) => void;
  onScan: () => void;
  onRemove: (path: string) => void;
}) {
  const header = (
    <h3>
      Configured projects
      <button className="chip clear" onClick={props.onScan} title="Find already-configured projects from your agent config + running daemons and add them">Scan configured projects</button>
      {props.selected && (
        <button className="chip clear" onClick={() => props.onScope(null)}>viewing: {props.selected} ✕</button>
      )}
    </h3>
  );
  if (props.workspaces.length === 0) {
    return <div className="card">{header}<p className="muted">No projects configured yet. Click <strong>Scan configured projects</strong>, or add one in "Manage projects" below.</p></div>;
  }
  const now = Date.now();
  return (
    <div className="card">
      {header}
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Status</th><th>Project</th><th>Configured</th><th>Languages</th><th className="num">Files</th><th className="num">Nodes</th><th className="num">Edges</th><th className="num">DB</th><th className="num">Calls</th><th className="num">Uptime</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {props.workspaces.map((w) => (
              <tr key={w.root} className={props.selected === w.root ? 'row-selected' : ''}>
                <td title={w.live
                  ? 'A daemon is serving this project to an agent right now.'
                  : 'Idle — no daemon is running. The index IS built and ready; it goes live when an agent (or `codegraph serve`) uses this project. This does not mean init failed.'}>
                  <span className={`dot ${w.live ? 'live' : 'off'}`} /> {w.live ? 'serving' : 'idle'}
                </td>
                <td className="mono path" title={w.root}>{w.root}</td>
                <td>{w.configured
                  ? <span title={`codegraph init/index on ${new Date(w.initializedAt).toLocaleString()}`}>{new Date(w.initializedAt).toLocaleDateString()}</span>
                  : <span className="muted" title="Seen via agent usage, not via codegraph init on this machine">usage only</span>}</td>
                <td>{topLanguages(w.languages)}</td>
                <td className="num">{fmtInt(w.files)}</td>
                <td className="num">{fmtInt(w.nodes)}</td>
                <td className="num">{fmtInt(w.edges)}</td>
                <td className="num">{fmtBytes(w.dbSizeBytes)}</td>
                <td className="num">{fmtInt(w.calls)}</td>
                <td className="num">{w.live && w.startedAt > 0 ? fmtDuration(now - w.startedAt) : '—'}</td>
                <td className="actions">
                  <button onClick={() => props.onScope(w.root)} title="Show only this project's stats">View</button>
                  <button onClick={() => props.onRun('sync', w.root)} title="codegraph sync">Sync</button>
                  <button onClick={() => props.onRun('index', w.root)} title="codegraph index --force">Re-index</button>
                  <button className="danger" onClick={() => props.onRemove(w.root)} title="Remove from the dashboard (does NOT delete the .codegraph index)">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProjectsPanel(props: {
  jobs: Job[];
  onInit: (path: string) => void;
}) {
  const [path, setPath] = useState('');
  const submit = () => {
    if (path.trim()) { props.onInit(path.trim()); setPath(''); }
  };
  return (
    <div className="card">
      <h3>Manage projects</h3>
      <p className="muted small">
        Index a new project below (runs <code>codegraph init &lt;path&gt;</code> on this machine), or re-sync / re-index an existing one from the Configured projects table above. Projects you've already <code>codegraph init</code>'d are discovered automatically (or via <strong>Scan configured projects</strong>).
      </p>
      <div className="init-row">
        <input
          type="text"
          placeholder="/absolute/path/to/project"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <button className="primary" onClick={submit} disabled={!path.trim()}>Init &amp; index</button>
      </div>
      {props.jobs.length > 0 && (
        <div className="jobs">
          <h4>Recent jobs</h4>
          {props.jobs.slice(0, 6).map((j) => (
            <details key={j.id} className={`job ${j.status}`}>
              <summary>
                <span className={`job-dot ${j.status}`} />
                <span className="mono">{j.action}</span>
                <span className="mono path" title={j.path}>{j.path}</span>
                <span className="job-status">{j.status}</span>
              </summary>
              <pre className="job-output">{j.output || '(no output yet)'}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
