/**
 * `codegraph hook <event>` — the record-only side of the dashboard's
 * "CodeGraph vs raw file reads" comparison.
 *
 * CodeGraph's MCP server can measure its OWN tool calls, but it is blind to the
 * agent reading files directly with Read/Grep/Glob — those never touch the MCP
 * server. This hook closes that gap: wired as a Claude Code **PostToolUse** hook
 * (matcher `Read|Grep|Glob`), it receives the tool name + cwd + result on stdin
 * after each such call and bumps a per-project counter in the shared metrics DB.
 *
 * Contract (mirrors the metrics store's discipline):
 *  - **Invisible & non-blocking**: prints NOTHING to stdout and always exits 0,
 *    so it can never annotate, block, or perturb the agent's tool result.
 *  - **Fail silent**: a malformed payload, an unwritable DB, a missing field —
 *    every failure is a clean exit 0.
 *  - **Near-zero latency**: reached before the CLI's WASM re-exec / heavy setup
 *    (see the fast-path in codegraph.ts); it only opens sqlite and increments.
 *  - **Honors the opt-out**: writes through `getMetrics()`, so CODEGRAPH_METRICS=0
 *    / CODEGRAPH_DASHBOARD=0 / DO_NOT_TRACK=1 disable it like every other metric.
 */

import * as path from 'path';
import { findNearestCodeGraphRoot } from '../directory';
import { getMetrics, estimateTokens } from '../metrics';

/** The agent's native file-reading tools we attribute to "raw reads". */
const HOST_TOOLS = new Set(['Read', 'Grep', 'Glob']);

/** Read all of stdin (the hook payload) with a hard cap; never rejects. */
function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => {
      data += c;
      if (data.length > 8 * 1024 * 1024) process.stdin.destroy(); // 8MB cap
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
    // Safety valve: if stdin never closes, don't hang the agent's tool call.
    setTimeout(() => resolve(data), 2000).unref?.();
  });
}

/** Pull the readable text out of a tool result, whatever shape it arrived in. */
function extractText(resp: unknown): string {
  if (resp == null) return '';
  if (typeof resp === 'string') return resp;
  if (typeof resp === 'object') {
    const r = resp as Record<string, unknown>;
    if (typeof r.text === 'string') return r.text;
    if (typeof r.content === 'string') return r.content;
    try { return JSON.stringify(resp); } catch { return ''; }
  }
  return String(resp);
}

/**
 * Handle one hook invocation. `args[0]` is the event (e.g. `post-tool-use`).
 * Always resolves; the caller exits 0 regardless.
 */
export async function runHook(args: string[]): Promise<void> {
  try {
    // Only the post-tool-use event records; anything else is a clean no-op so
    // the same binary can grow more hook events later without side effects.
    if (args[0] !== 'post-tool-use') { process.exit(0); }

    const payload = await readStdin();
    if (!payload.trim()) process.exit(0);

    let input: Record<string, unknown>;
    try { input = JSON.parse(payload) as Record<string, unknown>; } catch { process.exit(0); return; }

    const tool = typeof input.tool_name === 'string' ? input.tool_name : '';
    if (!HOST_TOOLS.has(tool)) process.exit(0);

    // Attribute the read to the same key CodeGraph uses for its own calls: the
    // nearest .codegraph project root, so the dashboard can compare per project.
    const cwdRaw = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
    const workspace = findNearestCodeGraphRoot(cwdRaw) ?? path.resolve(cwdRaw);

    // Estimate the context this read pulled in. The result field name has
    // differed across Claude Code versions (`tool_response` / `tool_result` /
    // `tool_output`) — accept any, then estimate ≈ chars/4 like every other
    // token figure in the dashboard.
    const resp = input.tool_response ?? input.tool_result ?? input.tool_output;
    const outTokens = estimateTokens(extractText(resp));

    const metrics = getMetrics();
    metrics.recordHostToolCall({ workspace, tool, outTokens });
    metrics.flush(); // short-lived process — flush now rather than waiting on exit
  } catch {
    /* a hook must never break the agent's tool call */
  }
  process.exit(0);
}
