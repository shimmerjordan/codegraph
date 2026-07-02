/**
 * Discover already-configured CodeGraph projects on this machine and register
 * them into the local metrics store, so the dashboard lists projects you
 * `codegraph init`'d earlier — even before any agent has driven a tool call and
 * without you re-running init on each.
 *
 * There is no global registry of configured projects, so we gather CANDIDATE
 * roots from cheap, local hint sources and keep only those that are actually
 * initialized (have a `.codegraph/` index):
 *   - agent configs that list opened projects (Claude Code's `~/.claude.json`)
 *   - the daemon registry (`~/.codegraph/daemons/`)
 *
 * Each match is opened read-only for its index size and recorded. Best-effort
 * throughout: a bad path or unreadable index is skipped, never fatal.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isInitialized } from '../directory';
import { listDaemons } from '../mcp/daemon-registry';
import { getMetrics } from '../metrics';
import { CodeGraphPackageVersion } from '../mcp/version';

/** Candidate project roots from agent configs + the daemon registry. */
export function candidateRoots(): string[] {
  const roots = new Set<string>();

  // Claude Code records every project it has opened under `projects` in
  // ~/.claude.json (keyed by absolute path). Most are not codegraph projects —
  // the isInitialized filter below keeps only the ones that are.
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8')) as {
      projects?: Record<string, unknown>;
    };
    if (cfg.projects && typeof cfg.projects === 'object') {
      for (const k of Object.keys(cfg.projects)) roots.add(k);
    }
  } catch {
    /* no Claude config, or unreadable — fine */
  }

  // Currently-running daemons (each serves an initialized project).
  try {
    for (const d of listDaemons({ prune: false })) roots.add(d.root);
  } catch {
    /* registry hiccup — skip */
  }

  return [...roots];
}

interface OpenableCodeGraph {
  getStats(): { fileCount: number; nodeCount: number; edgeCount: number; filesByLanguage: Record<string, number>; dbSizeBytes: number };
  close(): void;
}

/**
 * Register every configured project discovered from the hint sources. Returns
 * the number registered. Synchronous per project (a fast SQLite stat read),
 * bounded by the small candidate set.
 */
export function discoverConfiguredProjects(): { registered: number; scanned: number } {
  const metrics = getMetrics();
  const candidates = candidateRoots();
  let registered = 0;

  // Lazy-load the heavy CodeGraph chain only if there's something to open.
  let CodeGraph: { openSync(root: string): OpenableCodeGraph } | null = null;

  for (const root of candidates) {
    try {
      if (!isInitialized(root)) continue;
      if (!CodeGraph) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        CodeGraph = require('../index').default as { openSync(root: string): OpenableCodeGraph };
      }
      let real = root;
      try { real = fs.realpathSync(root); } catch { /* use as-is */ }
      const cg = CodeGraph.openSync(root);
      try {
        const stats = cg.getStats();
        metrics.recordProject({
          root: real,
          files: stats.fileCount, nodes: stats.nodeCount, edges: stats.edgeCount,
          languages: stats.filesByLanguage, dbSizeBytes: stats.dbSizeBytes,
          version: CodeGraphPackageVersion, pid: 0, startedAt: 0,
        });
        registered++;
      } finally {
        try { cg.close(); } catch { /* ignore */ }
      }
    } catch {
      /* skip this candidate */
    }
  }

  metrics.flush();
  return { registered, scanned: candidates.length };
}
