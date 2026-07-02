/**
 * The dashboard reports whether the PostToolUse read-tracking hook
 * (`codegraph hook post-tool-use`) is wired in Claude's global settings.json,
 * so the UI can tell "no raw reads happened" apart from "we're not counting raw
 * reads at all" and show a prominent enable-it warning in the latter case.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readHookStatus } from '../src/dashboard/server';

describe('dashboard readHookStatus', () => {
  let tmpHome: string;
  let origHome: string | undefined;

  const writeSettings = (settings: unknown) => {
    const dir = path.join(tmpHome, '.claude');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(settings, null, 2));
  };

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-readhook-'));
    origHome = process.env.HOME;
    process.env.HOME = tmpHome;
  });

  afterEach(() => {
    if (origHome === undefined) delete process.env.HOME;
    else process.env.HOME = origHome;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('reports not-installed when there is no settings.json', () => {
    expect(readHookStatus().installed).toBe(false);
  });

  it('reports not-installed when settings.json has no matching hook', () => {
    writeSettings({ hooks: { PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'other-hook' }] }] } });
    expect(readHookStatus().installed).toBe(false);
  });

  it('reports installed when the read-tracking hook is present', () => {
    writeSettings({
      hooks: { PostToolUse: [{ matcher: 'Read|Grep|Glob', hooks: [{ type: 'command', command: 'codegraph hook post-tool-use' }] }] },
    });
    expect(readHookStatus().installed).toBe(true);
  });

  it('matches the npx form of the command too', () => {
    writeSettings({
      hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'npx @colbymchenry/codegraph hook post-tool-use' }] }] },
    });
    expect(readHookStatus().installed).toBe(true);
  });

  it('does not throw on malformed settings.json (reads as not-installed)', () => {
    const dir = path.join(tmpHome, '.claude');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'settings.json'), '{ this is not valid json');
    expect(() => readHookStatus()).not.toThrow();
    expect(readHookStatus().installed).toBe(false);
  });
});
