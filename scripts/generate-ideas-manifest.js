#!/usr/bin/env node
import { readdir, readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const MODULES_DIR = join(ROOT, 'docs/suggested_modules');
const EXPLORATIONS_DIR = join(ROOT, 'js/explorations');
const DATA_DIR = join(ROOT, 'data');
const OUTPUT_FILE = join(DATA_DIR, 'ideas.json');

const TOPIC_KEYWORDS = [
  ['fractals',               ['fractal', 'mandelbrot', 'julia', 'sierpinski', 'self-similar', 'cantor', 'dla', 'diffusion-limited', 'dendrite', 'branching fractal']],
  ['dynamical-systems',      ['chaos', 'lorenz', 'attractor', 'bifurcation', 'dynamical', 'strange attractor', 'lyapunov', 'predator', 'prey', 'population']],
  ['parametric-curves',      ['parametric', 'cycloid', 'spiral', 'rose curve', 'lissajous', 'epitrochoid', 'moire', 'moiré', 'interference pattern', 'trochoid']],
  ['complex-analysis',       ['complex', 'analytic', 'holomorphic', 'conformal', 'möbius', 'mobius', 'riemann', 'power mapping', 'poles', 'zeros']],
  ['physics',                ['pendulum', 'oscillat', 'wave', 'resonance', 'spring', 'mechanical', 'doppler', 'acoustic', 'sound', 'gravity', 'orbit']],
  ['series-transforms',      ['fourier', 'transform', 'series', 'harmonic', 'convolution', 'spectrum', 'frequency domain', 'laplace', 'z-transform']],
  ['signal-processing',      ['signal', 'audio', 'filter', 'sampling', 'aliasing', 'modulation', 'am radio', 'fm radio', 'feedback', 'spectrogram', 'phasor']],
  ['pde-simulation',         ['pde', 'diffusion', 'heat equation', 'reaction-diffusion', 'laplacian growth', 'percolation', 'sandpile', 'cellular automata', 'wave equation', 'fluid']],
  ['probability-statistics', ['probability', 'random', 'distribution', 'markov', 'stochastic', 'monte carlo', 'bayes', 'gaussian', 'normal distribution', 'random walk']],
  ['information-theory',     ['entropy', 'information', 'coding', 'channel', 'shannon', 'compression', 'kolmogorov']],
  ['combinatorics',          ['combinatorics', 'pascal', 'permutation', 'combination', 'graph', 'network', 'tree']],
  ['calculus',               ['calculus', 'derivative', 'integral', 'limit', 'taylor', 'epsilon-delta', 'riemann']],
  ['number-theory',          ['prime', 'number theory', 'modular', 'ulam', 'euler', 'divisibility', 'congruence', 'matthew', 'conjecture']],
];

function guessTopicFromContent(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [topic, keywords] of TOPIC_KEYWORDS) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return best || 'physics';
}

function extractTitle(text) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractDescription(text) {
  const lines = text.split('\n');
  let inParagraph = false;
  const paraLines = [];
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    if (line.trim() === '') {
      if (inParagraph && paraLines.length > 0) break;
      continue;
    }
    inParagraph = true;
    paraLines.push(line.trim());
  }
  return paraLines.join(' ').replace(/\s+/g, ' ').trim();
}

async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}

/**
 * Extract backtick-quoted or plain comma-separated exploration IDs from a text chunk.
 * Filters out words that aren't valid kebab-case IDs.
 */
function extractIds(text) {
  // Prefer backtick-quoted form: `some-id`
  const backticks = [...text.matchAll(/`([a-z][a-z0-9-]+)`/g)].map(m => m[1]);
  if (backticks.length > 0) return backticks;
  // Fall back: comma-separated tokens before any parenthesis or long word
  return text.split(',')
    .map(p => p.trim().match(/^([a-z][a-z0-9-]+)/)?.[1])
    .filter(id => id && id.length > 2 && id !== 'none' && id !== 'the' && id !== 'and');
}

/**
 * Parse the ## Connections section for foundations and extensions lists.
 * Returns { foundations: string[], extensions: string[] } — only IDs that
 * exist as built explorations are included (checked by the caller).
 */
function extractConnections(text) {
  const foundations = [];
  const extensions = [];
  const sectionMatch = text.match(/##\s+Connections[\s\S]*?\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return { foundations, extensions };
  const section = sectionMatch[1];

  const foundMatch = section.match(/\*\*Foundations:\*\*\s*([\s\S]*?)(?=\n-\s+\*\*|\n##|$)/);
  if (foundMatch) foundations.push(...extractIds(foundMatch[1]));

  const extMatch = section.match(/\*\*Extensions:\*\*\s*([\s\S]*?)(?=\n-\s+\*\*|\n##|$)/);
  if (extMatch) extensions.push(...extractIds(extMatch[1]));

  return { foundations, extensions };
}

export async function generateIdeasManifest() {
  const mdFiles = (await readdir(MODULES_DIR)).filter(f => f.endsWith('.md'));
  const ideas = [];

  for (const mdFile of mdFiles) {
    // snake_case.md → kebab-case id
    const id = basename(mdFile, '.md').replace(/_/g, '-');

    // Skip if already built
    const jsPath = join(EXPLORATIONS_DIR, `${id}.js`);
    if (await fileExists(jsPath)) continue;

    const mdPath = join(MODULES_DIR, mdFile);
    const text = await readFile(mdPath, 'utf-8');

    const title = extractTitle(text) || id;
    const topic = guessTopicFromContent(text);
    const description = extractDescription(text);

    // Extract connections — filter to only IDs that are actually built
    const raw = extractConnections(text);
    const foundations = [];
    const extensions = [];
    for (const foundId of raw.foundations) {
      if (await fileExists(join(EXPLORATIONS_DIR, `${foundId}.js`))) foundations.push(foundId);
    }
    for (const extId of raw.extensions) {
      if (await fileExists(join(EXPLORATIONS_DIR, `${extId}.js`))) extensions.push(extId);
    }

    ideas.push({
      id,
      title,
      topic,
      description,
      foundations,
      extensions,
      markdownPath: `docs/suggested_modules/${mdFile}`,
    });
  }

  return ideas;
}

export async function main() {
  const ideas = await generateIdeasManifest();
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(ideas, null, 2) + '\n', 'utf-8');
  console.log(`Generated data/ideas.json with ${ideas.length} idea(s).`);
  return ideas;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1); });
}
