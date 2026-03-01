import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { spawn } from 'node:child_process';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = resolve(import.meta.dirname, '..');
const HEROES_DIR = resolve(ROOT, 'heroes');
const PORT = 19876;
let server;

// 1x1 white webp as a minimal base64 data URL
const TINY_WEBP_B64 = 'UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoBAAEAAkA4JZQCdAEO/hepgAAA/v5kMaLhofCH/6GHv/4RQT9BQl//+OEAAAA=';
const TINY_DATA_URL = `data:image/webp;base64,${TINY_WEBP_B64}`;

beforeAll(async () => {
  await mkdir(HEROES_DIR, { recursive: true });
  server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`http://localhost:${PORT}/api/heroes-status`);
      if (resp.ok) break;
    } catch { /* not ready yet */ }
    await sleep(200);
  }
});

afterAll(async () => {
  server?.kill();
  // Clean up test artifacts
  const testDir = resolve(HEROES_DIR, 'test-expl');
  if (existsSync(testDir)) await rm(testDir, { recursive: true });
});

describe('Hero API: /api/heroes-status', () => {
  it('returns complete: false initially', async () => {
    const resp = await fetch(`http://localhost:${PORT}/api/heroes-status`);
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.complete).toBe(false);
  });
});

describe('Hero API: /api/save-hero', () => {
  it('saves hero.webp inside heroes/{id}/', async () => {
    const resp = await fetch(`http://localhost:${PORT}/api/save-hero`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-expl', dataUrl: TINY_DATA_URL })
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.ok).toBe(true);

    const filePath = resolve(HEROES_DIR, 'test-expl', 'hero.webp');
    expect(existsSync(filePath)).toBe(true);

    const contents = await readFile(filePath);
    expect(contents.length).toBeGreaterThan(0);
    expect(contents.toString('ascii', 0, 4)).toBe('RIFF');
  });

  it('rejects malformed JSON with 500', async () => {
    const resp = await fetch(`http://localhost:${PORT}/api/save-hero`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json'
    });
    expect(resp.status).toBe(500);
  });
});

describe('Hero API: /api/save-snapshot-image', () => {
  it('saves a named snapshot to heroes/{id}/saved/{slug}.webp', async () => {
    const resp = await fetch(`http://localhost:${PORT}/api/save-snapshot-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-expl', name: 'Deep Zoom Spiral', dataUrl: TINY_DATA_URL })
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.ok).toBe(true);
    expect(data.path).toBe('/heroes/test-expl/saved/deep-zoom-spiral.webp');

    const filePath = resolve(HEROES_DIR, 'test-expl', 'saved', 'deep-zoom-spiral.webp');
    expect(existsSync(filePath)).toBe(true);
  });

  it('slugifies special characters in names', async () => {
    const resp = await fetch(`http://localhost:${PORT}/api/save-snapshot-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-expl', name: '  My Cool View!! (v2)  ', dataUrl: TINY_DATA_URL })
    });
    const data = await resp.json();
    expect(data.path).toBe('/heroes/test-expl/saved/my-cool-view-v2.webp');
  });
});

describe('Hero API: /api/heroes-complete', () => {
  it('sets completion flag', async () => {
    const resp = await fetch(`http://localhost:${PORT}/api/heroes-complete`, {
      method: 'POST'
    });
    expect(resp.status).toBe(200);

    const statusResp = await fetch(`http://localhost:${PORT}/api/heroes-status`);
    const data = await statusResp.json();
    expect(data.complete).toBe(true);
  });
});

describe('Hero API: static serving', () => {
  it('serves hero image at heroes/{id}/hero.webp', async () => {
    const resp = await fetch(`http://localhost:${PORT}/heroes/test-expl/hero.webp`);
    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type')).toBe('image/webp');
  });

  it('serves saved snapshot at heroes/{id}/saved/{slug}.webp', async () => {
    const resp = await fetch(`http://localhost:${PORT}/heroes/test-expl/saved/deep-zoom-spiral.webp`);
    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type')).toBe('image/webp');
  });

  it('returns 404 for nonexistent hero', async () => {
    const resp = await fetch(`http://localhost:${PORT}/heroes/nonexistent/hero.webp`);
    expect(resp.status).toBe(404);
  });
});
