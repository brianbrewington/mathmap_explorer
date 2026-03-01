import { getAll } from '../explorations/registry.js';
import { FACETS, groupByFacet, matchesFilters, getFacetValueLabel, getTagLabel, isFacetTag, getFacet } from '../explorations/taxonomy.js';
import { getHeroImage, getAllHeroImages } from './hero-images.js';
import { hasVisited, getSnapshots } from './user-state.js';
import { openImageModal } from './image-modal.js';

const STORAGE_KEY = 'ifs-sidebar-state';
const PLACEHOLDER_EMOJI = '\u221E'; // ∞
let heroImages = {};
let onSelectCallback = null;
let onCaptureHeroCallback = null;
let onSnapshotLoadCallback = null;
let listElRef = null;

let activeFacet = 'topic';
let activeFilters = {};
let allExplorations = [];
let onFilterChangeCallback = null;

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return raw || { expanded: {}, facet: 'topic', filters: {} };
  } catch { return { expanded: {}, facet: 'topic', filters: {} }; }
}

function saveState(patch) {
  const state = loadState();
  Object.assign(state, patch);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createExplorationBtn(E) {
  const btn = document.createElement('button');
  btn.className = 'exploration-btn';
  btn.dataset.id = E.id;

  const thumb = document.createElement('div');
  thumb.className = 'exploration-thumb';
  const heroUrl = heroImages[E.id];
  if (heroUrl) {
    thumb.style.backgroundImage = `url(${heroUrl})`;
  } else {
    thumb.classList.add('placeholder');
    thumb.textContent = PLACEHOLDER_EMOJI;
  }
  btn.appendChild(thumb);

  const info = document.createElement('div');
  info.className = 'exploration-btn-info';

  const titleSpan = document.createElement('span');
  titleSpan.className = 'exploration-title';
  titleSpan.textContent = E.title;
  info.appendChild(titleSpan);

  if (E.formulaShort) {
    const formulaSpan = document.createElement('span');
    formulaSpan.className = 'exploration-formula';
    formulaSpan.innerHTML = E.formulaShort;
    info.appendChild(formulaSpan);
  }

  btn.appendChild(info);
  if (hasVisited(E.id)) btn.classList.add('visited');
  btn.addEventListener('click', () => onSelectCallback?.(E.id));
  return btn;
}

// ── Facet pill bar ──────────────────────────────────────────────────────

function buildFacetBar(listEl) {
  let bar = listEl.querySelector('.facet-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'facet-bar';
    const searchEl = listEl.querySelector('.sidebar-search');
    if (searchEl) {
      searchEl.after(bar);
    } else {
      listEl.prepend(bar);
    }
  }
  bar.innerHTML = '';

  for (const [key, facet] of Object.entries(FACETS)) {
    const pill = document.createElement('button');
    pill.className = 'facet-pill' + (key === activeFacet ? ' active' : '');
    pill.textContent = facet.label;
    pill.addEventListener('click', () => {
      activeFacet = key;
      saveState({ facet: key });
      buildFacetBar(listEl);
      buildGroups(listEl, allExplorations, listEl.querySelector('.sidebar-search-input')?.value || '');
    });
    bar.appendChild(pill);
  }

  buildFilterChips(listEl);
}

// ── Filter chips ────────────────────────────────────────────────────────

function buildFilterChips(listEl) {
  let chipArea = listEl.querySelector('.filter-chips');
  const hasFilters = Object.values(activeFilters).some(v => v);

  if (!hasFilters) {
    if (chipArea) chipArea.remove();
    return;
  }

  if (!chipArea) {
    chipArea = document.createElement('div');
    chipArea.className = 'filter-chips';
    const bar = listEl.querySelector('.facet-bar');
    if (bar) bar.after(chipArea);
  }
  chipArea.innerHTML = '';

  for (const [facetKey, tagValue] of Object.entries(activeFilters)) {
    if (!tagValue) continue;
    const chip = document.createElement('button');
    chip.className = 'filter-chip';
    const facetLabel = FACETS[facetKey]?.label || facetKey;
    chip.innerHTML = `<span class="filter-chip-facet">${facetLabel}:</span> ${getFacetValueLabel(facetKey, tagValue)} <span class="filter-chip-x">\u00d7</span>`;
    chip.addEventListener('click', () => {
      delete activeFilters[facetKey];
      saveState({ filters: activeFilters });
      buildFacetBar(listEl);
      buildGroups(listEl, allExplorations, listEl.querySelector('.sidebar-search-input')?.value || '');
    });
    chipArea.appendChild(chip);
  }

  const clearBtn = document.createElement('button');
  clearBtn.className = 'filter-chip filter-chip-clear';
  clearBtn.textContent = 'Clear all';
  clearBtn.addEventListener('click', () => {
    activeFilters = {};
    saveState({ filters: {} });
    buildFacetBar(listEl);
    buildGroups(listEl, allExplorations, listEl.querySelector('.sidebar-search-input')?.value || '');
  });
  chipArea.appendChild(clearBtn);
}

// ── Group rendering ─────────────────────────────────────────────────────

function buildGroups(listEl, explorations, filter) {
  listEl.querySelectorAll('.sidebar-group').forEach(g => g.remove());

  const lowerFilter = filter?.toLowerCase() || '';

  let filtered = explorations;
  if (lowerFilter) {
    filtered = explorations.filter(E => {
      const tagLabels = (E.tags || []).map(t => getTagLabel(t)).join(' ');
      const searchable = `${E.title} ${E.description || ''} ${E.formulaShort || ''} ${tagLabels}`.toLowerCase();
      return searchable.includes(lowerFilter);
    });
  }

  if (Object.values(activeFilters).some(v => v)) {
    filtered = filtered.filter(E => matchesFilters(E, activeFilters));
  }

  const groups = groupByFacet(filtered, activeFacet);
  const state = loadState();
  const expanded = state.expanded || {};

  for (const [tagValue, items] of groups) {
    if (items.length === 0) continue;
    const isCollapsed = !lowerFilter && expanded[tagValue] !== true;

    const group = document.createElement('div');
    group.className = 'sidebar-group';
    group.dataset.facetValue = tagValue;

    const header = document.createElement('button');
    header.className = 'sidebar-group-header';
    if (isCollapsed) header.classList.add('collapsed');

    const chevron = document.createElement('span');
    chevron.className = 'sidebar-chevron';
    chevron.textContent = '\u25BE';

    const label = document.createElement('span');
    label.className = 'sidebar-group-label';
    label.textContent = getFacetValueLabel(activeFacet, tagValue);

    const count = document.createElement('span');
    count.className = 'sidebar-group-count';
    count.textContent = items.length;

    header.appendChild(chevron);
    header.appendChild(label);
    header.appendChild(count);

    const content = document.createElement('div');
    content.className = 'sidebar-group-content';
    if (isCollapsed) content.classList.add('collapsed');

    header.addEventListener('click', () => {
      const wasCollapsed = content.classList.contains('collapsed');
      content.classList.toggle('collapsed', !wasCollapsed);
      header.classList.toggle('collapsed', !wasCollapsed);
      const st = loadState();
      if (!st.expanded) st.expanded = {};
      st.expanded[tagValue] = wasCollapsed;
      saveState({ expanded: st.expanded });
    });

    const seen = new Set();
    items.forEach(E => {
      if (seen.has(E.id)) return;
      seen.add(E.id);
      content.appendChild(createExplorationBtn(E));
    });

    group.appendChild(header);
    group.appendChild(content);
    listEl.appendChild(group);
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export async function buildSidebar(listEl, onSelect) {
  listEl.innerHTML = '';
  onSelectCallback = onSelect;
  listElRef = listEl;

  allExplorations = getAll();

  const state = loadState();
  activeFacet = state.facet || 'topic';
  activeFilters = state.filters || {};

  heroImages = await getAllHeroImages(allExplorations.map(E => E.id));

  // Search bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'sidebar-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search explorations\u2026';
  searchInput.className = 'sidebar-search-input';
  searchWrap.appendChild(searchInput);
  listEl.appendChild(searchWrap);

  // Facet bar
  buildFacetBar(listEl);

  // Hero card for active exploration
  const heroCard = document.createElement('div');
  heroCard.className = 'sidebar-hero-card';
  heroCard.id = 'sidebar-hero-card';
  heroCard.innerHTML = '<div class="hero-image-placeholder"></div>';
  listEl.appendChild(heroCard);

  buildGroups(listEl, allExplorations, '');

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      buildGroups(listEl, allExplorations, searchInput.value);
      const currentId = listEl.querySelector('.sidebar-hero-card')?.dataset.activeId;
      if (currentId) {
        listEl.querySelectorAll('.exploration-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.id === currentId);
        });
      }
    }, 150);
  });
}

export function setActive(listEl, id) {
  listEl.querySelectorAll('.exploration-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });

  const activeBtn = listEl.querySelector(`.exploration-btn[data-id="${id}"]`);
  if (activeBtn) {
    const content = activeBtn.closest('.sidebar-group-content');
    const header = content?.previousElementSibling;
    if (content?.classList.contains('collapsed')) {
      content.classList.remove('collapsed');
      header?.classList.remove('collapsed');
      const tagValue = content.closest('.sidebar-group')?.dataset.facetValue;
      if (tagValue) {
        const st = loadState();
        if (!st.expanded) st.expanded = {};
        st.expanded[tagValue] = true;
        saveState({ expanded: st.expanded });
      }
    }
  }

  const explorations = getAll();
  const E = explorations.find(e => e.id === id);
  const heroCard = listEl.querySelector('#sidebar-hero-card');
  if (heroCard && E) {
    heroCard.dataset.activeId = id;
    const heroUrl = heroImages[id];
    const heroImageHtml = heroUrl
      ? `<div class="hero-image" style="background-image:url(${heroUrl})"></div>`
      : `<div class="hero-image hero-placeholder"><span class="hero-placeholder-emoji">${PLACEHOLDER_EMOJI}</span></div>`;
    heroCard.innerHTML = `
      <div class="hero-image-wrap">
        ${heroImageHtml}
        <button class="hero-update-btn" data-id="${id}" title="Update hero from current view">Update</button>
      </div>
      <div class="hero-info">
        <div class="hero-title">${E.title}</div>
        <div class="hero-desc">${E.description || ''}</div>
      </div>
    `;
    heroCard.querySelector('.hero-update-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      onCaptureHeroCallback?.(id);
    });
    buildHeroCarousel(heroCard, id);
  }
}

export function setCaptureHeroCallback(callback) {
  onCaptureHeroCallback = callback;
}

export function setSnapshotLoadCallback(callback) {
  onSnapshotLoadCallback = callback;
}

/**
 * Add a facet filter from outside (e.g. clicking a tag badge in the info panel).
 */
export function addFilter(facetKey, tagValue) {
  activeFilters[facetKey] = tagValue;
  saveState({ filters: activeFilters });
  if (listElRef) {
    buildFacetBar(listElRef);
    buildGroups(listElRef, allExplorations, listElRef.querySelector('.sidebar-search-input')?.value || '');
  }
}

export function setFilterChangeCallback(callback) {
  onFilterChangeCallback = callback;
}

async function buildHeroCarousel(heroCard, id) {
  const snaps = await getSnapshots(id);
  if (snaps.length === 0) return;

  const carousel = document.createElement('div');
  carousel.className = 'hero-carousel';
  snaps.forEach((s, i) => {
    const item = document.createElement('button');
    item.className = 'hero-carousel-item';
    item.title = s.name || `Snapshot ${i + 1}`;
    if (s.thumbnail) item.style.backgroundImage = `url(${s.thumbnail})`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      onSnapshotLoadCallback?.(i);
    });
    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (s.thumbnail) openImageModal(s.thumbnail);
    });
    carousel.appendChild(item);
  });
  heroCard.querySelector('.hero-image-wrap')?.appendChild(carousel);
}

export async function updateHeroImage(id, dataUrl) {
  heroImages[id] = dataUrl;
  if (!listElRef) return;

  const thumb = listElRef.querySelector(`.exploration-btn[data-id="${id}"] .exploration-thumb`);
  if (thumb) {
    thumb.style.backgroundImage = `url(${dataUrl})`;
    thumb.classList.remove('placeholder');
    thumb.textContent = '';
  }

  const heroCard = listElRef.querySelector('#sidebar-hero-card');
  if (heroCard?.dataset.activeId === id) {
    const img = heroCard.querySelector('.hero-image');
    if (img) {
      img.style.backgroundImage = `url(${dataUrl})`;
      img.classList.remove('hero-placeholder');
      img.innerHTML = '';
    }
  }
}
