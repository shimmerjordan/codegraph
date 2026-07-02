# CodeGraph Dashboard

A local, read-only web UI for **monitoring how CodeGraph is used on your
machine** — tool-call volume and success rate, the LLM context tokens CodeGraph
served (estimated), read-cache hit rate, and the size/status of every indexed
workspace.

Everything it shows is read from a single local file
(`~/.codegraph/metrics.db`) that every CodeGraph daemon on the machine writes
to. **Nothing leaves your machine.** The dashboard opens no outbound
connection and never mutates your index.

> **Scope.** This page covers the **local dashboard** (`codegraph dashboard`).
> The multi-user *central aggregation server* (a self-hosted intranet service
> that collects metrics from many machines into one team view) is a separate,
> planned component — see [Roadmap](#roadmap) at the bottom.

---

## What you'll see

| Panel | Metric | Source |
|---|---|---|
| **Resource usage** | Live CPU % and resident memory of every running daemon, plus the on-disk size of every index and the metrics DB | sampled from the OS per daemon PID + index/DB file sizes |
| **CodeGraph vs raw file reads** | How often the agent asked CodeGraph vs read files directly, and the avg context each pulled in | the optional PostToolUse hook (see below) |
| **Tool calls / Success rate** | Calls, errors, error rate, avg latency, per-tool breakdown | recorded on every MCP tool call |
| **Est. context tokens served** | Approximate tokens of the context CodeGraph returned (`≈ chars / 4`) | estimated from each tool result |
| **Cache hit rate** | Hits / misses of the in-process read-result cache | the read cache |
| **Configured projects** | Every project `codegraph init`'d on this machine — configured date, files / nodes / edges, languages, DB size, online status, uptime, and its call count | the CLI init/index/sync + the daemon registry |
| **Daily activity** | A **line chart** of calls & estimated tokens per day | daily rollups |
| **Distribution** | **Pie/donut charts** of tool-call share and calls-by-workspace | tool + workspace rollups |
| **Per-workspace view** | Click **View** on any workspace to scope every panel to that project | filtered rollups |
| **Manage projects** | Run `init` / `index` / `sync` on a project path straight from the page | see [Managing projects](#managing-projects-from-the-ui) |

> **On "tokens":** CodeGraph can only see the size of the context *it* returns —
> it cannot see the agent's real token accounting. The token figure is an
> **estimate** of context served, labeled as such in the UI. It is a proxy for
> "how much context CodeGraph delivered," not a measured bill.

> **Why there's no "tokens saved" number.** Savings are a *counterfactual* —
> how much the agent would have read *without* CodeGraph — which can only be
> measured by an A/B comparison, not from one machine's live usage. The
> dashboard therefore shows only real measured quantities: the **call split**
> (CodeGraph vs raw reads) and the **average context per lookup** for each. It
> never invents a "saved X tokens" headline.

### Tracking raw file reads (PostToolUse hook)

CodeGraph's MCP server can count its **own** calls, but it can't see the agent
reading files directly with `Read` / `Grep` / `Glob` — those never touch the
server. The **CodeGraph vs raw file reads** panel is powered by a small
`PostToolUse` hook that counts those reads.

**You usually don't set this up by hand.** `codegraph install` **auto-wires**
the hook into Claude Code's `~/.claude/settings.json` whenever metrics
collection is on (it's skipped when you've opted out via `CODEGRAPH_METRICS=0` /
`CODEGRAPH_DASHBOARD=0` / `DO_NOT_TRACK=1`, and a later opt-out removes it). If
it isn't wired up, the dashboard shows a **prominent warning** on the reads
panel with a one-click **Enable read tracking** button (it writes the same entry
into `~/.claude/settings.json`; restart your agent afterward).

The entry it writes (also what you'd add by hand — e.g. for a non-Claude agent):

```json
{
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
}
```

The hook reads the tool name + cwd on stdin, bumps a per-project counter in
`~/.codegraph/metrics.db`, and **always exits 0 with no output** — it can never
block, annotate, or slow the agent's tool result. It honors the same opt-outs
as every other metric (`CODEGRAPH_METRICS=0`, `CODEGRAPH_DASHBOARD=0`,
`DO_NOT_TRACK=1`).

---

## Prerequisites

- **Node.js ≥ 20** to run the shipped CLI. Running **from source** needs
  **Node ≥ 22.5** (the dashboard + index use Node's built-in `node:sqlite`).
- CodeGraph installed and wired into at least one agent, and at least one
  project indexed (`codegraph init`) — otherwise the dashboard has no data yet.
  See the main [README → Get Started](README.md#get-started).

---

## Quick start (from source)

If you're working from a clone of this repository:

```bash
# 1. Install dependencies
npm ci

# 2. Build the CLI *and* the dashboard web UI in one step
npm run build:all
#   ├─ npm run build            → compiles the CLI into dist/
#   └─ npm run build:dashboard  → builds the React app into dist/dashboard/public

# 3. Launch the dashboard
node dist/bin/codegraph.js dashboard
```

It prints a URL (default `http://127.0.0.1:4319`) and opens your browser.

> **Why `build:all`?** `npm run build` only compiles the CLI. The web UI is a
> separate Vite/React app under [`src/dashboard/web/`](src/dashboard/web); it's
> built into `dist/dashboard/public` by `build:dashboard`. If you launch the
> dashboard without building the UI, the API still works but the page shows a
> "UI not built" notice.

### Dev mode (live-reloading UI)

Iterating on the frontend? Use `--dev` — **one command** starts the API *and* a
hot-reloading (Vite HMR) frontend, so edits to `src/dashboard/web/src/*` apply
live in the browser with **no rebuild and no restart**:

```bash
# Build the CLI once, then run in dev mode
npm run build
node dist/bin/codegraph.js dashboard --dev
```

It prints the API URL and then Vite prints its own URL (default
`http://localhost:5173`, auto-opened unless `--no-open`) — open that one. Vite
proxies `/api` back to the API server, following `--port` if you change it. You
only need to restart when you change **CLI/server** code (rebuild + rerun); pure
UI edits never need it. `--dev` requires a source checkout (a published npm
install ships only the built UI).

<details><summary>Prefer two terminals?</summary>

```bash
# Terminal 1 — the API/server
node dist/bin/codegraph.js dashboard --no-open
# Terminal 2 — the Vite dev server (proxies /api to :4319)
cd src/dashboard/web && npm install && npm run dev
```
</details>

---

## Quick start (installed CLI)

Once the dashboard ships in a released build, any installed CodeGraph exposes it:

```bash
codegraph dashboard          # aliases: codegraph web, codegraph monitor
```

Install the CLI itself with the one-liner from the main
[README](README.md#1-install-the-cli):

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```

---

## Command options

```bash
codegraph dashboard [options]
```

| Option | Description | Default |
|---|---|---|
| `-p, --port <port>` | Port to listen on | `4319` |
| `-H, --host <host>` | Host to bind. Use `0.0.0.0` to expose on your LAN | `127.0.0.1` |
| `--no-open` | Don't open a browser automatically | opens by default |

The server runs until you press **Ctrl+C**.

---

## Running it as a service

The dashboard does **not** auto-start — run `codegraph dashboard` when you want
it. To keep it up in the background:

- **Quick / ad-hoc:** `nohup codegraph dashboard --no-open >/dev/null 2>&1 &`
  (macOS / Linux), or `Start-Process -WindowStyle Hidden codegraph -ArgumentList
  'dashboard','--no-open'` (Windows PowerShell).
- **Managed** (survives reboot, auto-restarts): use the systemd unit in
  [Exposing it on your intranet](#exposing-it-on-your-intranet).

> **Note for maintainers:** the shipped build must include the web UI, so the
> release build runs **`npm run build:all`** (not `npm run build`) — otherwise
> `dist/dashboard/public` is missing and the dashboard serves the "UI not built"
> page.

## Where the data comes from

```
your agent (Claude Code / Cursor / …)
        │  MCP tool calls
        ▼
codegraph daemon  ──writes──▶  ~/.codegraph/metrics.db   ◀──reads──  codegraph dashboard
   (per workspace)              (one shared file/machine)             (this server)
```

- **Collection is default-ON** and happens inside every CodeGraph daemon and
  CLI command. You don't start anything extra — just use your agent as usual and
  the numbers accumulate.
- The dashboard is a **separate reader process**. It can run whether or not any
  daemon is currently up; a project shows **idle** when no daemon is running
  (cross-checked against `~/.codegraph/daemons/`) — the index is still built and
  ready, it just isn't being served to an agent at this moment. It shows
  **serving** while a daemon is up.

**A fresh dashboard is empty until an agent actually uses CodeGraph.** If you
just installed it, open your agent and ask a question that triggers
`codegraph_explore`, then refresh.

---

## Managing projects from the UI

The **Manage projects** panel (and the per-row buttons in the Workspaces table)
let you run CodeGraph project commands without leaving the page:

- **Init & index** — enter an absolute path and the server runs
  `codegraph init <path>` on this machine (indexes the project and makes it
  show up in the dashboard).
- **Sync** / **Re-index** — per workspace, run `codegraph sync <path>` or
  `codegraph index <path> --force`.

Each command runs as a tracked background **job**; expand it to watch its live
output and final status. The UI polls faster while a job is running.

> ⚠️ **This is a write capability.** The dashboard shells out to the CodeGraph
> CLI with the path you give it (passed as a plain argument — no shell, so it
> can't be used for command injection, and the path must be an existing
> directory). But anyone who can reach the dashboard can trigger an index on any
> directory the server's user can read. That's fine on a loopback-only bind; if
> you expose it on a LAN (`--host 0.0.0.0`), put it behind an authenticating
> reverse proxy (see below).

## Configured projects vs. per-project stats

The **Configured projects** table lists every project you've `codegraph init`'d
on this machine — it appears **as soon as you init/index it**, with a
*Configured* date, even before any agent has driven a single tool call (its call
count just shows 0). A project the dashboard only ever saw through agent usage
(never init'd on this box) is tagged **usage only**.

By default every stats panel aggregates across all projects. Click **View** on a
row (or use it as a filter) to **scope** the overview, tool table, pies, and
trend line to that single project. Click **Show all ✕** to return to the
machine-wide view. The project list itself always stays machine-wide.

## Configuration & privacy switches

All optional. Collection is on by default; disable it anywhere:

| Env var | Effect | Default |
|---|---|---|
| `CODEGRAPH_METRICS=0` | Turn OFF all local metrics collection | on |
| `CODEGRAPH_DASHBOARD=0` | Umbrella off-switch (also disables collection) | on |
| `DO_NOT_TRACK=1` | Honored like the cross-tool standard — disables collection | — |
| `CODEGRAPH_QUERY_CACHE=0` | Disable the read-result cache (cache-hit rate then reads 0) | on |
| `CODEGRAPH_QUERY_CACHE_TTL_MS=<ms>` | Read-cache entry TTL | `120000` |

> Disabling collection does **not** delete `~/.codegraph/metrics.db`; remove that
> file yourself if you want to clear history.

---

## Exposing it on your intranet

By default the dashboard binds **loopback only** (`127.0.0.1`) — reachable just
from the machine it runs on. To view it from other machines on a trusted
internal network:

```bash
codegraph dashboard --host 0.0.0.0 --port 4319
```

> ⚠️ **Security.** The dashboard has **no authentication**. Binding `0.0.0.0`
> makes it reachable by anyone who can route to the host, and it reveals your
> workspace paths, languages, and usage. Only do this on a trusted intranet,
> ideally behind a reverse proxy that adds auth (see below), and never expose it
> to the public internet.

### Run it as a background service (systemd, Linux intranet host)

Create `/etc/systemd/system/codegraph-dashboard.service`:

```ini
[Unit]
Description=CodeGraph Dashboard
After=network.target

[Service]
Type=simple
User=youruser
# Point HOME at the account whose ~/.codegraph/metrics.db you want to serve
Environment=HOME=/home/youruser
ExecStart=/usr/bin/env codegraph dashboard --host 0.0.0.0 --port 4319 --no-open
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now codegraph-dashboard
sudo systemctl status codegraph-dashboard
```

(If you run from source instead of an installed CLI, set
`ExecStart=/usr/bin/node /path/to/codegraph/dist/bin/codegraph.js dashboard --host 0.0.0.0 --no-open`.)

### Optional: put auth in front (nginx)

```nginx
server {
  listen 8080;
  location / {
    auth_basic "CodeGraph";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:4319;
  }
}
```

Then run the dashboard on loopback (`--host 127.0.0.1`) and let nginx handle
external access + basic auth.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Page says "UI is not built" | Run `npm run build:all` (or `npm run build:dashboard`) so `dist/dashboard/public` exists. |
| No projects listed | You haven't `codegraph init`'d anything yet (init one, or add it in "Manage projects"), **or** collection is disabled (`CODEGRAPH_METRICS`/`DO_NOT_TRACK`), **or** you're serving a different `HOME` than the one your CLI/daemons write to. |
| Projects listed but all stats are 0 | Projects show as soon as they're indexed; the call/token/cache numbers only fill in once an agent actually uses CodeGraph on them. |
| Projects all show **idle** (not "serving") | Normal. Status reflects whether a **daemon is running** for the project right now, not whether it's configured. `codegraph init` builds the index but does not start a daemon — a project goes **serving** only when an agent (or `codegraph serve`) actively uses it. A built index shows a *Configured* date + file/node counts even while idle. |
| `Port 4319 is already in use` | `codegraph dashboard --port <other>`. |
| Cache hit rate is 0% | Expected early on (few repeated queries) or `CODEGRAPH_QUERY_CACHE=0`. |

---

## Roadmap

The local dashboard is **Phase 1**. Planned next, for teams on an intranet:

- **Phase 2 — central server:** a self-hosted service (Hono + SQLite, no cloud
  dependency) with accounts, per-machine/workspace records, an ingest API, and
  aggregation across many users.
- **Phase 3 — reporter + team view:** an opt-in reporter integrated into the
  CodeGraph startup flow that pushes each machine's metrics to the central
  server (nothing is sent until you configure an account token), plus a
  multi-user team dashboard.

Until those land, each machine views its own data with `codegraph dashboard`.
