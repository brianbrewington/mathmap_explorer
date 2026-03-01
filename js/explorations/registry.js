const explorations = [];
const REQUIRED_FIELDS = ['id', 'title', 'category'];
const VALID_CATEGORIES = ['fractal', 'attractor', 'map', 'custom'];

export function register(ExplorationClass) {
  for (const field of REQUIRED_FIELDS) {
    if (!ExplorationClass[field]) {
      console.warn(`[IFS Registry] Exploration missing required field "${field}":`, ExplorationClass);
    }
  }
  if (ExplorationClass.category && !VALID_CATEGORIES.includes(ExplorationClass.category)) {
    console.warn(`[IFS Registry] Unknown category "${ExplorationClass.category}" for ${ExplorationClass.id}. Valid: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (explorations.some(e => e.id === ExplorationClass.id)) {
    console.warn(`[IFS Registry] Duplicate exploration id "${ExplorationClass.id}"`);
    return;
  }
  explorations.push(ExplorationClass);
}

export function getAll() { return [...explorations]; }
export function getById(id) { return explorations.find(e => e.id === id); }
export function _resetForTesting() { explorations.length = 0; }
export { VALID_CATEGORIES };
