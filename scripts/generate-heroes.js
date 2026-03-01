#!/usr/bin/env node

/**
 * Self-contained hero image generator.
 * Starts a temporary server, opens the browser to ?generate-heroes,
 * waits for the browser to POST all captures back, then exits.
 *
 * Usage:  node scripts/generate-heroes.js [--force]
 */

import { spawn, execSync } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HEROES_DIR = resolve(ROOT, 'heroes');
const PORT = 18764;
const TIMEOUT_MS = 180_000;
const force = process.argv.includes('--force');

function countHeroes() {
  if (!existsSync(HEROES_DIR)) return 0;
  return readdirSync(HEROES_DIR)
    .filter(d => statSync(join(HEROES_DIR, d)).isDirectory())
    .filter(d => existsSync(join(HEROES_DIR, d, 'hero.webp')))
    .length;
}

// Skip if heroes already exist (unless --force)
if (!force) {
  const count = countHeroes();
  if (count > 0) {
    console.log(`  heroes/ has ${count} exploration(s). Use --force to regenerate.`);
    process.exit(0);
  }
}

mkdirSync(HEROES_DIR, { recursive: true });

console.log('\n  Generating hero thumbnails...');
console.log(`  Starting temporary server on port ${PORT}...\n`);

const server = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'pipe'
});

server.on('error', (err) => {
  console.error('  Failed to start server:', err.message);
  process.exit(1);
});

await sleep(1500);

const url = `http://localhost:${PORT}?generate-heroes`;
console.log(`  Opening browser: ${url}\n`);

try {
  if (process.platform === 'darwin') execSync(`open "${url}"`, { stdio: 'pipe' });
  else execSync(`xdg-open "${url}"`, { stdio: 'pipe' });
} catch {
  console.log(`  Could not open browser. Visit manually: ${url}`);
}

// Poll for completion
const start = Date.now();

while (Date.now() - start < TIMEOUT_MS) {
  try {
    const resp = await fetch(`http://localhost:${PORT}/api/heroes-status`);
    const data = await resp.json();
    if (data.complete) {
      const count = countHeroes();
      console.log(`\n  Done — ${count} hero images saved to heroes/\n`);
      server.kill();
      process.exit(0);
    }
  } catch { /* server not ready yet */ }
  await sleep(2000);
}

console.error('\n  Timed out waiting for hero generation. Try again.\n');
server.kill();
process.exit(1);
