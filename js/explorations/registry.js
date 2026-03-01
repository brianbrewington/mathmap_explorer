const explorations = [];
export function register(ExplorationClass) { explorations.push(ExplorationClass); }
export function getAll() { return [...explorations]; }
export function getById(id) { return explorations.find(e => e.id === id); }
