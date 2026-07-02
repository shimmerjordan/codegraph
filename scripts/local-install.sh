#!/usr/bin/env bash
# Build the current branch and link it as the global `codegraph` for
# hands-on testing. Replaces any existing global install for as long
# as the symlink is in place.
#
# Usage:
#   ./scripts/local-install.sh             # build + link
#   ./scripts/local-install.sh --restart   # build + link, then restart the
#                                           # web dashboard + MCP daemons onto
#                                           # the fresh build
#   ./scripts/local-install.sh --undo      # unlink + restore the published version
#
# Restart details (--restart only; the plain run leaves running services alone):
#   • MCP daemons — every `codegraph serve --mcp` daemon is stopped via the
#     registry's stopAllDaemons (SIGTERM→SIGKILL, cleans up its socket + pid
#     file). Daemons are spawned on demand by agents, so the next MCP call
#     respawns a fresh one on the new build — nothing to relaunch by hand.
#     (This also kills the daemon serving any agent session attached right now;
#     it just reconnects on its next call.)
#   • Web dashboard — the running dashboard is stopped and a fresh one is
#     launched detached on the new build (default 127.0.0.1:4319).
#
# Env switches (honored by --restart):
#   CODEGRAPH_DASHBOARD=0            skip restarting the web dashboard
#   CODEGRAPH_DASHBOARD_PORT=<port>  dashboard port (default 4319)

set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

PKG=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# --- arg parse -------------------------------------------------------------
UNDO=0
RESTART=0
for arg in "$@"; do
  case "$arg" in
    --undo)    UNDO=1 ;;
    --restart) RESTART=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [ "$UNDO" = "1" ]; then
  echo "→ unlinking ${PKG}"
  npm unlink -g "${PKG}" >/dev/null 2>&1 || true
  echo "→ reinstalling published ${PKG}"
  npm install -g "${PKG}"
  echo "done: global codegraph -> $(command -v codegraph)"
  exit 0
fi

# --- restart helpers -------------------------------------------------------
DASH_PORT="${CODEGRAPH_DASHBOARD_PORT:-4319}"

# 0 if something is listening on 127.0.0.1:$1 (bash /dev/tcp — no lsof/ss needed).
port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&-; return 0; } || return 1
}

# Wait until port $1 reaches the desired state ("free"|"up"), up to ~5s.
wait_port() {
  local port="$1" want="$2" i=0
  while [ "$i" -lt 25 ]; do
    if [ "$want" = "free" ]; then port_in_use "$port" || return 0; fi
    if [ "$want" = "up" ];   then port_in_use "$port" && return 0; fi
    sleep 0.2; i=$((i + 1))
  done
  return 1
}

restart_daemons() {
  echo "→ stopping MCP daemons (they respawn on the new build on next agent call)"
  # Reuse the built registry's stopAllDaemons so sockets + pid files are
  # cleaned up exactly like `codegraph daemon` does — not a blind pkill.
  CG_REG="file://${REPO_ROOT}/dist/mcp/daemon-registry.js" \
    node -e 'import(process.env.CG_REG)
      .then(async (m) => { const r = await m.stopAllDaemons(); console.log(`  stopped ${r.length} daemon(s)`); })
      .catch((e) => { console.error(`  daemon stop skipped: ${e.message}`); })' \
    || echo "  daemon stop skipped (node failed to run)"
}

restart_dashboard() {
  if [ "${CODEGRAPH_DASHBOARD:-1}" = "0" ]; then
    echo "→ dashboard restart skipped (CODEGRAPH_DASHBOARD=0)"
    return 0
  fi

  echo "→ restarting web dashboard on port ${DASH_PORT}"
  # Kill any running dashboard (parent + its --liftoff-only re-exec child).
  # Tight pattern: "codegraph[.js] dashboard" — a space right before
  # `dashboard` so it matches the actual `… codegraph.js dashboard …` /
  # `codegraph dashboard …` invocations, NOT arbitrary paths that merely
  # contain both tokens (e.g. src/dashboard/… or a codegraph-dashboard.log
  # tail), and NOT this script (whose own arg list has no ` dashboard`).
  pkill -f "codegraph[^ ]* dashboard" 2>/dev/null || true
  if ! wait_port "$DASH_PORT" free; then
    echo "  ⚠ port ${DASH_PORT} still busy after stopping the old dashboard — is another process using it?" >&2
  fi

  local log="${TMPDIR:-/tmp}/codegraph-dashboard.log"
  # Detached so it outlives this script; new global `codegraph` = new build.
  nohup codegraph dashboard --no-open --port "$DASH_PORT" >"$log" 2>&1 &
  disown || true

  if wait_port "$DASH_PORT" up; then
    echo "  ✓ dashboard up at http://127.0.0.1:${DASH_PORT}  (log: ${log})"
  else
    echo "  ⚠ dashboard did not come up within 5s — last log lines:" >&2
    tail -n 15 "$log" >&2 || true
  fi
}

# --- build + link ----------------------------------------------------------
echo "→ building ${PKG} ${VERSION} (${BRANCH})"
# build:all also builds the dashboard web UI into dist/dashboard/public so a
# linked branch build serves the real dashboard page, not the "UI not built" one.
npm run build:all

echo "→ linking globally"
npm link

LINKED=$(command -v codegraph || echo "(not on PATH)")

# --- restart (opt-in) ------------------------------------------------------
if [ "$RESTART" = "1" ]; then
  echo
  restart_daemons
  restart_dashboard
fi

echo
echo "✓ global codegraph now points to this branch"
echo "  binary:  ${LINKED}"
echo "  branch:  ${BRANCH}"
echo "  version: ${VERSION}"
echo
if [ "$RESTART" = "1" ]; then
  echo "Services were restarted onto this build."
  echo "  Dashboard: http://127.0.0.1:${DASH_PORT}"
else
  echo "Restart the dashboard + MCP daemons onto this build:"
  echo "  ./scripts/local-install.sh --restart"
  echo
  echo "Or just open the monitoring dashboard (does NOT auto-start on a plain run):"
  echo "  codegraph dashboard"
fi
echo
echo "To restore the published version:"
echo "  ./scripts/local-install.sh --undo"
