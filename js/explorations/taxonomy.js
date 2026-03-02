/**
 * Faceted tag taxonomy for multi-dimensional exploration organization.
 *
 * Every tag an exploration carries is either a "facet tag" (belonging to a
 * named dimension like topic/technique/level) or a free-form descriptive tag
 * used for search and badge display.  The sidebar groups explorations by
 * whichever facet the user selects; explorations with multiple tags in the
 * active facet appear in every matching group.
 */

export const FACETS = {
  topic: {
    label: 'Topic',
    order: [
      'fractals', 'dynamical-systems', 'parametric-curves',
      'complex-analysis', 'physics', 'series-transforms', 'signal-processing',
      'pde-simulation',
      'probability-statistics',
      'combinatorics',
      'calculus',
    ],
    values: {
      'fractals':           { label: 'Fractals' },
      'dynamical-systems':  { label: 'Dynamical Systems' },
      'parametric-curves':  { label: 'Parametric Curves' },
      'complex-analysis':   { label: 'Complex Analysis' },
      'physics':            { label: 'Physics' },
      'series-transforms':  { label: 'Series & Transforms' },
      'signal-processing':  { label: 'Signal Processing' },
      'pde-simulation':     { label: 'PDEs & Simulation' },
      'probability-statistics': { label: 'Probability & Statistics' },
      'combinatorics':      { label: 'Combinatorics' },
      'calculus':             { label: 'Calculus' },
    },
  },
  technique: {
    label: 'Technique',
    order: [
      'escape-time', 'iteration', 'chaos-game', 'affine-transform',
      'parametric', 'ode-integration', 'fourier-transform',
      'string-rewriting', 'numerical-methods',
      'convolution',
      'simulation',
    ],
    values: {
      'escape-time':        { label: 'Escape-Time' },
      'iteration':          { label: 'Iteration' },
      'chaos-game':         { label: 'Chaos Game' },
      'affine-transform':   { label: 'Affine Transforms' },
      'parametric':         { label: 'Parametric' },
      'ode-integration':    { label: 'ODE Integration' },
      'fourier-transform':  { label: 'Fourier Transform' },
      'string-rewriting':   { label: 'String Rewriting' },
      'numerical-methods':  { label: 'Numerical Methods' },
      'convolution':        { label: 'Convolution' },
      'simulation':         { label: 'Simulation' },
    },
  },
  level: {
    label: 'Level',
    order: ['beginner', 'intermediate', 'advanced'],
    values: {
      'beginner':     { label: 'Beginner' },
      'intermediate': { label: 'Intermediate' },
      'advanced':     { label: 'Advanced' },
    },
  },
};

const _tagToFacet = new Map();
for (const [facetName, facet] of Object.entries(FACETS)) {
  for (const tagKey of Object.keys(facet.values)) {
    _tagToFacet.set(tagKey, facetName);
  }
}

/**
 * Return the facet a tag belongs to, or null for free-form tags.
 * @param {string} tag
 * @returns {{ facet: string, label: string } | null}
 */
export function getFacet(tag) {
  const facetName = _tagToFacet.get(tag);
  if (!facetName) return null;
  return { facet: facetName, label: FACETS[facetName].values[tag].label };
}

/**
 * True if `tag` is a recognized facet tag.
 */
export function isFacetTag(tag) {
  return _tagToFacet.has(tag);
}

/**
 * Get the human-readable label for any tag (facet or free-form fallback).
 */
export function getTagLabel(tag) {
  const facetName = _tagToFacet.get(tag);
  if (facetName) return FACETS[facetName].values[tag].label;
  return tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Group explorations by a facet dimension.
 * Returns a Map<tagValue, ExplorationClass[]> in the facet's display order.
 * Explorations with multiple tags in the facet appear in every matching group.
 *
 * @param {Array} explorations - array of ExplorationClass (static fields)
 * @param {string} facetName  - 'topic' | 'technique' | 'level'
 * @returns {Map<string, Array>}
 */
export function groupByFacet(explorations, facetName) {
  const facet = FACETS[facetName];
  if (!facet) return new Map();

  const groups = new Map();
  for (const key of facet.order) groups.set(key, []);

  for (const E of explorations) {
    const tags = E.tags || [];
    let placed = false;
    for (const tag of tags) {
      if (_tagToFacet.get(tag) === facetName && groups.has(tag)) {
        groups.get(tag).push(E);
        placed = true;
      }
    }
    if (!placed && facetName === 'topic') {
      const fallback = _legacyCategoryToTopic(E.category);
      if (fallback && groups.has(fallback)) {
        groups.get(fallback).push(E);
      }
    }
  }

  // Remove empty groups
  for (const [key, items] of groups) {
    if (items.length === 0) groups.delete(key);
  }
  return groups;
}

function _legacyCategoryToTopic(cat) {
  const map = {
    fractal: 'fractals',
    attractor: 'dynamical-systems',
    map: 'dynamical-systems',
    pde: 'pde-simulation',
    custom: 'dynamical-systems',
  };
  return map[cat] || null;
}

/**
 * Return true if an exploration matches ALL active filters.
 * `filters` is an object like { topic: 'fractals', level: 'beginner' }.
 */
export function matchesFilters(exploration, filters) {
  const tags = exploration.tags || [];
  for (const [, value] of Object.entries(filters)) {
    if (!value) continue;
    if (!tags.includes(value)) return false;
  }
  return true;
}

/**
 * Get the display label for a facet group key.
 */
export function getFacetValueLabel(facetName, tagValue) {
  return FACETS[facetName]?.values[tagValue]?.label || tagValue;
}

/**
 * Validate that an exploration has at least one topic tag.
 * Returns an array of warning strings (empty = OK).
 */
export function validateTags(ExplorationClass) {
  const warnings = [];
  const tags = ExplorationClass.tags || [];
  const hasTopicTag = tags.some(t => _tagToFacet.get(t) === 'topic');
  if (!hasTopicTag) {
    warnings.push(`No topic tag found for "${ExplorationClass.id}". Add at least one topic from: ${FACETS.topic.order.join(', ')}`);
  }
  return warnings;
}
