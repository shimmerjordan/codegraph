<!-- Language: **English** · [简体中文](./README.zh.md) -->

# CodeGraph Dashboard — Web UI

The React frontend for `codegraph dashboard`. It's a small, dependency-light
Vite + React 18 single-page app that renders the read-only monitoring UI over
the dashboard's JSON API.

> **Not a standalone package.** This app is `private` and never published to
> npm. It builds into `../../../dist/dashboard/public`, and the dashboard's
> `node:http` server ([`src/dashboard/server.ts`](../server.ts)) serves it from
> there. For the product story — what the dashboard shows, privacy switches,
> intranet deploy, the PostToolUse read-tracking hook, the roadmap — see the
> top-level [**`DASHBOARD.md`**](../../../DASHBOARD.md). This file is the
> **frontend developer** guide: how to build it, run it in dev mode, and how the
> code is laid out.

---

## How it fits together

```
your agent ──MCP calls──▶ codegraph daemon ──writes──▶ ~/.codegraph/metrics.db
                                                              │ reads
                                                              ▼
                                       dashboard server (src/dashboard/server.ts)
                                       ├─ JSON API  →  /api/*
                                       └─ static SPA →  dist/dashboard/public/*
                                                              ▲
                                                              │ this app builds to here
                                       src/dashboard/web  (Vite + React)
```

- The **server** is dependency-free `node:http`. It exposes a read-only JSON
  API over the shared local metrics DB and serves this built SPA. It binds
  `127.0.0.1` by default and never opens an outbound connection.
- This **frontend** is a pure client: it makes `fetch` calls to `/api/*` and
  renders the result. It holds no secrets and talks to nothing but the local
  API on the same origin.

---

## Build

From the **repo root** (the usual path — this is what ships):

```bash
npm run build:all        # build the CLI AND this web UI
#   ├─ npm run build            → compiles the CLI into dist/
#   └─ npm run build:dashboard  → (cd src/dashboard/web && npm ci && npm run build)
```

`build:dashboard` runs `tsc -b && vite build`, emitting the bundled SPA into
[`dist/dashboard/public`](../../../dist/dashboard/public) (see
[`vite.config.ts`](./vite.config.ts) — `outDir` + `emptyOutDir`). `base: './'`
keeps every asset URL relative, so the page works no matter which host/port the
server binds.

> **If you only run `npm run build`** (CLI only), `dist/dashboard/public` is
> missing and the server returns a plain-text *"UI is not built"* page — the API
> still works. The release build **must** run `build:all`.

Or build just the frontend, from **this directory**:

```bash
npm ci        # first time (installs Vite + React devDeps)
npm run build # tsc -b && vite build
```

---

## Dev mode (hot reload)

The frontend is a separate Vite app, so you can iterate on it with **HMR** — no
CLI rebuild, no server restart — while a live API server backs it.

**One command** (recommended) — starts the API *and* the Vite dev server, wiring
the `/api` proxy to the right port automatically:

```bash
# from the repo root
npm run build                              # build the CLI once
node dist/bin/codegraph.js dashboard --dev
```

It prints the API URL, then Vite prints its own (default
`http://localhost:5173`, auto-opened unless `--no-open`) — open the Vite one.
Edits to `src/*` apply live. You only rebuild+rerun when you change **CLI/server**
code. `--dev` needs a source checkout (a published npm install ships only the
built `public/`).

<details><summary>Prefer two terminals?</summary>

```bash
# Terminal 1 — the API/server (repo root)
node dist/bin/codegraph.js dashboard --no-open      # API at http://127.0.0.1:4319
# Terminal 2 — the Vite dev server (this dir)
npm install && npm run dev                          # proxies /api → :4319
```
</details>

### How the `/api` proxy finds the server

[`vite.config.ts`](./vite.config.ts) proxies `/api` to
`process.env.CODEGRAPH_DASHBOARD_API || 'http://127.0.0.1:4319'`. `codegraph
dashboard --dev` injects `CODEGRAPH_DASHBOARD_API` so the proxy follows a
non-default `--port`; a standalone `npm run dev` falls back to the default 4319.

---

## Code layout

Everything lives in [`src/`](./src). It's deliberately small and
dependency-light — the only runtime deps are `react` + `react-dom`; **the charts
are hand-rolled SVG**, not a charting library, matching the repo's zero-extra-dep
posture.

| File | What it holds |
|---|---|
| [`main.tsx`](./src/main.tsx) | Entry point — mounts `<App/>` into `#root` under `<StrictMode>`. |
| [`App.tsx`](./src/App.tsx) | Root component. Owns all state: the time window (`7` / `30` / `all`), the optional per-workspace scope, and the fetched `Summary`. Polls the API every **15s** — or every **2.5s** while a project job is running — and wires the action callbacks (run init/index/sync, scan, remove, enable hook). |
| [`api.ts`](./src/api.ts) | The typed API client. TS interfaces mirror the server's read shapes (`Overview`, `ToolStat`, `Workspace`, `Resources`, …) and the `/api/summary` payload, plus the `fetch` helpers: `fetchSummary`, `runProject`, `scanProjects`, `deleteProject`, `installReadHook`. |
| [`components.tsx`](./src/components.tsx) | The panels: `StatCard` (the top overview tiles), `ReadsComparisonPanel` (CodeGraph-vs-raw-reads + the hook-not-installed warning & one-click enable), `ResourcesPanel` (live CPU/mem/disk per daemon), `ToolsTable`, `WorkspacesTable` (per-project rows with View/Sync/Re-index/Remove), and `ProjectsPanel` (the Init & index input + recent-jobs log). |
| [`charts.tsx`](./src/charts.tsx) | Dependency-free SVG charts: `PieChart` (donut with a share legend) and `LineChart` (dual-series calls + estimated tokens/day). Shared `PALETTE`. |
| [`format.ts`](./src/format.ts) | Pure display formatters: `fmtInt`, `fmtTokens` (K/M), `fmtBytes`, `fmtPct`, `fmtDuration`. |
| [`styles.css`](./src/styles.css) | All styling — one hand-written stylesheet, dark theme. |
| [`index.html`](./index.html) | Vite HTML entry; mounts `main.tsx` into `#root`. |

---

## The API it consumes

The app boots with **one round-trip** to `GET /api/summary`, which bundles every
read panel (overview, tools, host-tools, daily series, workspaces, jobs,
resources, read-hook status, and the active window). It accepts query params:

- `days=<n>` or `all=1` — the time window (the `7` / `30` / `All` toggle).
- `workspace=<root>` — scope every stats panel to one project (the **View**
  button); the workspace list, jobs, and resources stay machine-wide.

Actions POST to the server and then re-fetch the summary:

| Call | Endpoint | Effect |
|---|---|---|
| `runProject('init'\|'index'\|'sync', path)` | `POST /api/projects/run` | Runs the CLI command as a tracked background **job** (streamed into the Recent jobs log). |
| `scanProjects()` | `POST /api/projects/scan` | Discovers already-configured projects (agent configs + daemon registry) and registers them. |
| `deleteProject(path)` | `POST /api/projects/delete` | Removes a project's rows from the metrics DB. Does **not** touch its `.codegraph/` index. |
| `installReadHook()` | `POST /api/hook/install` | Writes the PostToolUse read-tracking hook into Claude's global `settings.json` (recovery path for the reads-panel warning). |

Individual read endpoints (`/api/overview`, `/api/tools`, `/api/daily`,
`/api/workspaces`, `/api/resources`, `/api/health`, …) also exist and return the
same shapes — handy when driving the API directly without this UI. See
[`src/dashboard/server.ts`](../server.ts) for the full route table.

---

## Conventions & gotchas

- **Read-only frontend.** It renders measured data; it never invents a
  "tokens saved" figure (that's a counterfactual you can't measure from one
  machine — see the notes in `DASHBOARD.md`). It shows the real call split and
  the average context per lookup instead.
- **Estimated tokens.** Every token figure is `≈ chars / 4` — a proxy for
  context *delivered*, not a measured bill. Labeled as such in the UI.
- **Add a panel:** write a component in `components.tsx` (or a chart in
  `charts.tsx`), pull the data off the `Summary` type in `api.ts`, and render it
  from `App.tsx`. If it needs new data, add a field to the server's
  `/api/summary` payload and mirror it in the `Summary` interface.
- **No new runtime dependency** without good reason — prefer another
  hand-rolled SVG chart over pulling in a charting library, to keep the built
  bundle small and the supply chain minimal.

---

## Related docs

- [**`DASHBOARD.md`**](../../../DASHBOARD.md) — the full dashboard guide (what it
  shows, privacy, the read-tracking hook, intranet deploy, roadmap).
- [Root **`README.md`**](../../../README.md) — CodeGraph overview and the
  `codegraph dashboard` command.
