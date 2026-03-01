import { validateTags } from './taxonomy.js';

const explorations = [];
const REQUIRED_FIELDS = ['id', 'title'];

/** @deprecated Use taxonomy topic tags instead. Kept for backward compat. */
const VALID_CATEGORIES = ['fractal', 'attractor', 'map', 'pde', 'custom'];

export function register(ExplorationClass) {
  for (const field of REQUIRED_FIELDS) {
    if (!ExplorationClass[field]) {
      console.warn(`[Registry] Exploration missing required field "${field}":`, ExplorationClass);
    }
  }
  const tagWarnings = validateTags(ExplorationClass);
  for (const w of tagWarnings) console.warn(`[Registry] ${w}`);

  if (explorations.some(e => e.id === ExplorationClass.id)) {
    console.warn(`[Registry] Duplicate exploration id "${ExplorationClass.id}"`);
    return;
  }
  explorations.push(ExplorationClass);
}

export function getAll() { return [...explorations]; }
export function getById(id) { return explorations.find(e => e.id === id); }
export function _resetForTesting() { explorations.length = 0; }
export { VALID_CATEGORIES };
