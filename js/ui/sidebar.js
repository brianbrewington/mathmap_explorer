import { getAll } from '../explorations/registry.js';
import { groupByFacet, getFacetValueLabel } from '../explorations/taxonomy.js';
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

let allExplorations = [];

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return raw || { expanded: {} };
  } catch { return { expanded: {} }; }
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

// ── Group rendering ─────────────────────────────────────────────────────

function buildGroups(scrollZone, explorations, filter) {
  scrollZone.innerHTML = '';

  const lowerFilter = filter?.toLowerCase() || '';

  let filtered = explorations;
  if (lowerFilter) {
    filtered = explorations.filter(E => {
      const searchable = `${E.title} ${E.description || ''} ${E.formulaShort || ''}`.toLowerCase();
      return searchable.includes(lowerFilter);
    });
  }

  if (lowerFilter) {
    const flatDiv = document.createElement('div');
    flatDiv.className = 'sidebar-flat-results';
    if (filtered.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'sidebar-no-results';
      noResults.textContent = 'No explorations found';
      flatDiv.appendChild(noResults);
    } else {
      const seen = new Set();
      filtered.forEach(E => {
        if (seen.has(E.id)) return;
        seen.add(E.id);
        flatDiv.appendChild(createExplorationBtn(E));
      });
    }
    scrollZone.appendChild(flatDiv);
    return;
  }

  const groups = groupByFacet(filtered, 'topic');
  const state = loadState();
  const expanded = state.expanded || {};

  for (const [tagValue, items] of groups) {
    if (items.length === 0) continue;
    const isCollapsed = expanded[tagValue] !== true;

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
    label.textContent = getFacetValueLabel('topic', tagValue);

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
    scrollZone.appendChild(group);
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export async function buildSidebar(listEl, onSelect) {
  listEl.innerHTML = '';
  onSelectCallback = onSelect;
  listElRef = listEl;

  allExplorations = getAll();
  heroImages = await getAllHeroImages(allExplorations.map(E => E.id));

  // Fixed zone: search + hero card (pinned, does not scroll)
  const fixedZone = document.createElement('div');
  fixedZone.className = 'sidebar-fixed';
  listEl.appendChild(fixedZone);

  const searchWrap = document.createElement('div');
  searchWrap.className = 'sidebar-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search explorations\u2026';
  searchInput.className = 'sidebar-search-input';
  searchWrap.appendChild(searchInput);
  fixedZone.appendChild(searchWrap);

  const heroCard = document.createElement('div');
  heroCard.className = 'sidebar-hero-card';
  heroCard.id = 'sidebar-hero-card';
  heroCard.innerHTML = '<div class="hero-image-placeholder"></div>';
  fixedZone.appendChild(heroCard);

  // Scrollable zone: groups / flat results
  const scrollZone = document.createElement('div');
  scrollZone.className = 'sidebar-scroll';
  listEl.appendChild(scrollZone);

  buildGroups(scrollZone, allExplorations, '');

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      buildGroups(scrollZone, allExplorations, searchInput.value);
      const currentId = listEl.querySelector('#sidebar-hero-card')?.dataset.activeId;
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
