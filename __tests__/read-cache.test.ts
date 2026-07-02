import { describe, it, expect } from 'vitest';
import { ReadCache } from '../src/mcp/read-cache';
import type { ToolResult } from '../src/mcp/tools';

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });
const err: ToolResult = { content: [{ type: 'text', text: 'boom' }], isError: true };

describe('read cache', () => {
  it('returns a hit for the same (root, tool, args) and a miss otherwise', () => {
    const c = new ReadCache({} as NodeJS.ProcessEnv);
    c.set('/r', 'explore', { query: 'a' }, ok('res'));
    expect(c.get('/r', 'explore', { query: 'a' })?.content[0].text).toBe('res');
    expect(c.get('/r', 'explore', { query: 'b' })).toBeUndefined();
    expect(c.get('/other', 'explore', { query: 'a' })).toBeUndefined();
  });

  it('is order-independent in the args key', () => {
    const c = new ReadCache({} as NodeJS.ProcessEnv);
    c.set('/r', 'node', { a: 1, b: 2 }, ok('res'));
    expect(c.get('/r', 'node', { b: 2, a: 1 })?.content[0].text).toBe('res');
  });

  it('never caches error results', () => {
    const c = new ReadCache({} as NodeJS.ProcessEnv);
    c.set('/r', 'explore', { query: 'a' }, err);
    expect(c.get('/r', 'explore', { query: 'a' })).toBeUndefined();
  });

  it('expires entries past the TTL', () => {
    let now = 1000;
    const c = new ReadCache({ CODEGRAPH_QUERY_CACHE_TTL_MS: '500' } as unknown as NodeJS.ProcessEnv, () => now);
    c.set('/r', 'explore', { query: 'a' }, ok('res'));
    now = 1400;
    expect(c.get('/r', 'explore', { query: 'a' })?.content[0].text).toBe('res');
    now = 1600;
    expect(c.get('/r', 'explore', { query: 'a' })).toBeUndefined();
  });

  it('invalidates only the given root', () => {
    const c = new ReadCache({} as NodeJS.ProcessEnv);
    c.set('/r1', 'explore', { q: 1 }, ok('a'));
    c.set('/r2', 'explore', { q: 1 }, ok('b'));
    c.invalidateRoot('/r1');
    expect(c.get('/r1', 'explore', { q: 1 })).toBeUndefined();
    expect(c.get('/r2', 'explore', { q: 1 })?.content[0].text).toBe('b');
  });

  it('is disabled with CODEGRAPH_QUERY_CACHE=0', () => {
    const c = new ReadCache({ CODEGRAPH_QUERY_CACHE: '0' } as unknown as NodeJS.ProcessEnv);
    expect(c.isEnabled).toBe(false);
    c.set('/r', 'explore', { q: 1 }, ok('a'));
    expect(c.get('/r', 'explore', { q: 1 })).toBeUndefined();
  });
});
