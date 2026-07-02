import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MetricsStore, estimateTokens, estimateResultTokens } from '../src/metrics/store';

describe('metrics store', () => {
  let dir: string;
  let store: MetricsStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-metrics-'));
    store = new MetricsStore({ dir: path.join(dir, '.codegraph') });
  });
  afterEach(() => {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('estimates tokens from text and result blocks', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(
      estimateResultTokens({ content: [{ type: 'text', text: 'abcd' }, { type: 'text', text: 'abcd' }] }),
    ).toBe(2);
    expect(estimateResultTokens(null)).toBe(0);
  });

  it('aggregates tool calls into per-workspace/day/tool totals', () => {
    for (let i = 0; i < 5; i++) {
      store.recordToolCall({ workspace: '/a', tool: 'codegraph_explore', agent: 'Claude Code', ok: i !== 0, durationMs: 10, outTokens: 100 });
    }
    store.recordToolCall({ workspace: '/b', tool: 'codegraph_node', ok: true, durationMs: 20, outTokens: 50 });
    store.flush();

    const ov = store.getOverview();
    expect(ov.totalCalls).toBe(6);
    expect(ov.totalErrors).toBe(1);
    expect(ov.totalOutTokens).toBe(550);
    expect(ov.workspaceCount).toBe(0); // no snapshots recorded yet

    const tools = store.getToolStats();
    const explore = tools.find((t) => t.tool === 'codegraph_explore')!;
    expect(explore.calls).toBe(5);
    expect(explore.errors).toBe(1);
    expect(explore.avgMs).toBe(10);
  });

  it('tracks cache hits and misses', () => {
    store.recordCache('/a', true);
    store.recordCache('/a', true);
    store.recordCache('/a', false);
    store.flush();
    const ov = store.getOverview();
    expect(ov.cacheHits).toBe(2);
    expect(ov.cacheMisses).toBe(1);
  });

  it('records the agent\'s native Read/Grep/Glob (host tool calls) separately', () => {
    store.recordHostToolCall({ workspace: '/a', tool: 'Read', outTokens: 400 });
    store.recordHostToolCall({ workspace: '/a', tool: 'Read', outTokens: 600 });
    store.recordHostToolCall({ workspace: '/a', tool: 'Grep', outTokens: 100 });
    store.recordHostToolCall({ workspace: '/b', tool: 'Read', outTokens: 50 });
    store.flush();

    const ov = store.getOverview();
    expect(ov.hostCalls).toBe(4);
    expect(ov.hostTokens).toBe(1150);
    // Host reads do NOT leak into the codegraph tool-call counters.
    expect(ov.totalCalls).toBe(0);

    const host = store.getHostToolStats();
    expect(host.find((h) => h.tool === 'Read')!.calls).toBe(3);
    expect(host.find((h) => h.tool === 'Read')!.outTokens).toBe(1050);
    expect(host.find((h) => h.tool === 'Grep')!.calls).toBe(1);

    // Scopes to one workspace like the other read methods.
    expect(store.getOverview(undefined, '/b').hostCalls).toBe(1);
    expect(store.getHostToolStats(undefined, '/a').reduce((s, h) => s + h.calls, 0)).toBe(3);
  });

  it('deleteProject also clears host tool-call rows', () => {
    store.recordProject({ root: '/proj/gone', files: 1, nodes: 1, edges: 1, languages: {}, dbSizeBytes: 1, version: 'v', pid: 0, startedAt: 0 });
    store.recordHostToolCall({ workspace: '/proj/gone', tool: 'Read', outTokens: 10 });
    store.flush();
    store.deleteProject('/proj/gone');
    expect(store.getOverview().hostCalls).toBe(0);
  });

  it('stores configured projects and joins call totals + live flag', () => {
    store.recordProject({
      root: '/a', files: 100, nodes: 3000, edges: 8000, languages: { typescript: 100 },
      dbSizeBytes: 1024, version: '1.1.6', pid: 1234, startedAt: 5,
    });
    store.recordToolCall({ workspace: '/a', tool: 'codegraph_explore', ok: true, durationMs: 5, outTokens: 42 });
    store.flush();

    const ws = store.getWorkspaces(new Set(['/a']));
    expect(ws).toHaveLength(1);
    expect(ws[0].root).toBe('/a');
    expect(ws[0].files).toBe(100);
    expect(ws[0].languages).toEqual({ typescript: 100 });
    expect(ws[0].calls).toBe(1);
    expect(ws[0].outTokens).toBe(42);
    expect(ws[0].live).toBe(true);

    expect(store.getWorkspaces(new Set()).at(0)?.live).toBe(false);
    expect(store.getOverview().workspaceCount).toBe(1);
  });

  it('records a configured project (init) that shows with zero calls', () => {
    store.recordProject({
      root: '/proj/idle', files: 10, nodes: 30, edges: 40, languages: { javascript: 10 },
      dbSizeBytes: 2048, version: '1.1.6', pid: 0, startedAt: 0,
    });
    store.flush();
    const ws = store.getWorkspaces();
    const p = ws.find((w) => w.root === '/proj/idle')!;
    expect(p.configured).toBe(true);
    expect(p.initializedAt).toBeGreaterThan(0);
    expect(p.calls).toBe(0);
    expect(p.files).toBe(10);
  });

  it('hides usage-only workspaces, shows them once configured, never clears the init time', () => {
    // Pure usage snapshot (no init) → NOT listed as a configured project.
    store.recordSnapshot({ root: '/proj/x', files: 1, nodes: 1, edges: 1, languages: {}, dbSizeBytes: 1, version: 'v', pid: 5, startedAt: 999 });
    store.flush();
    expect(store.getWorkspaces().find((w) => w.root === '/proj/x')).toBeUndefined();

    // Now it gets configured (init) → appears; a later daemon snapshot must NOT clear it.
    store.recordProject({ root: '/proj/x', files: 2, nodes: 2, edges: 2, languages: {}, dbSizeBytes: 2, version: 'v', pid: 0, startedAt: 0 });
    store.flush();
    store.recordSnapshot({ root: '/proj/x', files: 3, nodes: 3, edges: 3, languages: {}, dbSizeBytes: 3, version: 'v', pid: 6, startedAt: 1000 });
    store.flush();
    const p = store.getWorkspaces().find((w) => w.root === '/proj/x')!;
    expect(p.configured).toBe(true);
    expect(p.startedAt).toBe(1000); // MAX kept the daemon uptime anchor
    expect(p.files).toBe(3);        // size refreshed by the snapshot
  });

  it('shows a daemon-opened (already-configured) project and stamps its init time set-once', () => {
    // Daemon snapshot of an already-configured project (has .codegraph) carries
    // initializedAt, so it's a configured project and shows up.
    store.recordSnapshot({ root: '/proj/d', files: 5, nodes: 5, edges: 5, languages: {}, dbSizeBytes: 5, version: 'v', pid: 7, startedAt: 500, initializedAt: 500 });
    store.flush();
    const p = store.getWorkspaces().find((w) => w.root === '/proj/d')!;
    expect(p).toBeDefined();
    expect(p.configured).toBe(true);
    expect(p.initializedAt).toBe(500);

    // A later snapshot (daemon restart) must NOT change the set-once init time.
    store.recordSnapshot({ root: '/proj/d', files: 6, nodes: 6, edges: 6, languages: {}, dbSizeBytes: 6, version: 'v', pid: 7, startedAt: 700, initializedAt: 700 });
    store.flush();
    expect(store.getWorkspaces().find((w) => w.root === '/proj/d')!.initializedAt).toBe(500);
  });

  it('deleteProject removes a project and its stats across all tables', () => {
    store.recordProject({ root: '/proj/keep', files: 1, nodes: 1, edges: 1, languages: {}, dbSizeBytes: 1, version: 'v', pid: 0, startedAt: 0 });
    store.recordProject({ root: '/proj/gone', files: 1, nodes: 1, edges: 1, languages: {}, dbSizeBytes: 1, version: 'v', pid: 0, startedAt: 0 });
    store.recordToolCall({ workspace: '/proj/gone', tool: 't', ok: true, durationMs: 1, outTokens: 9 });
    store.recordCache('/proj/gone', true);
    store.flush();

    store.deleteProject('/proj/gone');

    const roots = store.getWorkspaces().map((w) => w.root);
    expect(roots).toContain('/proj/keep');
    expect(roots).not.toContain('/proj/gone');
    // Its tool + cache rows are gone too (keep contributed none).
    const ov = store.getOverview();
    expect(ov.totalCalls).toBe(0);
    expect(ov.cacheHits).toBe(0);
  });

  it('scopes overview/tools/daily to one workspace when asked', () => {
    for (let i = 0; i < 4; i++) store.recordToolCall({ workspace: '/a', tool: 'codegraph_explore', ok: true, durationMs: 5, outTokens: 100 });
    store.recordToolCall({ workspace: '/b', tool: 'codegraph_node', ok: true, durationMs: 5, outTokens: 50 });
    store.flush();

    expect(store.getOverview().totalCalls).toBe(5);
    expect(store.getOverview(undefined, '/a').totalCalls).toBe(4);
    expect(store.getOverview(undefined, '/b').totalOutTokens).toBe(50);

    const toolsA = store.getToolStats(undefined, '/a');
    expect(toolsA).toHaveLength(1);
    expect(toolsA[0].tool).toBe('codegraph_explore');

    expect(store.getDailyStats(30, '/b').reduce((s, d) => s + d.calls, 0)).toBe(1);
  });

  it('a fresh flush persists across a re-opened store (shared DB, many writers)', () => {
    store.recordToolCall({ workspace: '/a', tool: 't', ok: true, durationMs: 1, outTokens: 1 });
    store.flush();
    const reader = new MetricsStore({ dir: path.join(dir, '.codegraph') });
    expect(reader.getOverview().totalCalls).toBe(1);
    reader.close();
  });
});
