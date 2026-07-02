import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { addLocalGitExclude } from '../src/directory';

/**
 * `addLocalGitExclude` hides `.codegraph/` from the enclosing repo via
 * `.git/info/exclude` (local, uncommitted) instead of the tracked `.gitignore`.
 * Uses a fake `.git/` dir — it only needs `.git` to exist; no git binary.
 */
describe('addLocalGitExclude', () => {
  let root: string;
  const excludeOf = (repo: string) => path.join(repo, '.git', 'info', 'exclude');
  const read = (repo: string) => { try { return fs.readFileSync(excludeOf(repo), 'utf8'); } catch { return ''; } };

  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-gitx-')); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it('adds an anchored pattern at the repo root', () => {
    fs.mkdirSync(path.join(root, '.git'));
    addLocalGitExclude(root);
    expect(read(root)).toContain('/.codegraph/');
  });

  it('anchors the pattern relative to the repo root for a nested project', () => {
    fs.mkdirSync(path.join(root, '.git'));
    const nested = path.join(root, 'packages', 'app');
    fs.mkdirSync(nested, { recursive: true });
    addLocalGitExclude(nested);
    expect(read(root)).toContain('/packages/app/.codegraph/');
  });

  it('is idempotent — never duplicates the entry', () => {
    fs.mkdirSync(path.join(root, '.git'));
    addLocalGitExclude(root);
    addLocalGitExclude(root);
    addLocalGitExclude(root);
    const occurrences = read(root).split('\n').filter((l) => l.trim() === '/.codegraph/').length;
    expect(occurrences).toBe(1);
  });

  it('does not duplicate when an equivalent bare pattern is already present', () => {
    fs.mkdirSync(path.join(root, '.git', 'info'), { recursive: true });
    fs.writeFileSync(excludeOf(root), '.codegraph/\n');
    addLocalGitExclude(root);
    const text = read(root);
    expect(text.split('\n').filter((l) => l.trim().includes('.codegraph')).length).toBe(1);
  });

  it('preserves existing exclude content and appends on a new line', () => {
    fs.mkdirSync(path.join(root, '.git', 'info'), { recursive: true });
    fs.writeFileSync(excludeOf(root), 'node_modules/\n*.log'); // no trailing newline
    addLocalGitExclude(root);
    const text = read(root);
    expect(text).toContain('node_modules/');
    expect(text).toContain('*.log');
    expect(text).toContain('/.codegraph/');
    expect(text).not.toContain('*.log/.codegraph/'); // must not glue onto the last line
  });

  it('is a no-op (no throw, no file) outside a git repo', () => {
    expect(() => addLocalGitExclude(root)).not.toThrow();
    expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
  });

  it('resolves a `.git` FILE (worktree) to its gitdir', () => {
    // Simulate a linked worktree: .git is a file pointing at a gitdir that
    // carries a commondir back to the main repo's .git.
    const mainGit = path.join(root, 'main', '.git');
    const wtGitdir = path.join(mainGit, 'worktrees', 'wt');
    fs.mkdirSync(wtGitdir, { recursive: true });
    fs.writeFileSync(path.join(wtGitdir, 'commondir'), '../..\n'); // -> main/.git
    const wt = path.join(root, 'wt');
    fs.mkdirSync(wt);
    fs.writeFileSync(path.join(wt, '.git'), `gitdir: ${wtGitdir}\n`);

    addLocalGitExclude(wt);
    // info/exclude must land in the COMMON dir (main/.git/info/exclude).
    expect(fs.readFileSync(path.join(mainGit, 'info', 'exclude'), 'utf8')).toContain('/.codegraph/');
  });
});
