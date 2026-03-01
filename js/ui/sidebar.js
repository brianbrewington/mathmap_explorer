import { getAll } from '../explorations/registry.js';
import { getHeroImage, getAllHeroImages } from './hero-images.js';
import { hasVisited } from './user-state.js';

const STORAGE_KEY = 'ifs-sidebar-collapsed';
const PLACEHOLDER_EMOJI = '\u221E'; // ∞
let heroImages = {};
let onSelectCallback = null;
let onCaptureHeroCallback = null;
let listElRef = null;

function loadExpandedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveExpandedState(state) {
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

function buildGroups(listEl, explorations, filter) {
  listEl.querySelectorAll('.sidebar-group').forEach(g => g.remove());

  const groups = { fractal: [], attractor: [], map: [], custom: [] };
  const lowerFilter = filter?.toLowerCase() || '';

  explorations.forEach(E => {
    if (lowerFilter) {
      const searchable = `${E.title} ${E.description || ''} ${E.formulaShort || ''} ${E.category}`.toLowerCase();
      if (!searchable.includes(lowerFilter)) return;
    }
    (groups[E.category] || groups.fractal).push(E);
  });

  const labels = { fractal: 'Fractals', attractor: 'Attractors', map: 'Maps', custom: 'Custom' };
  const expanded = loadExpandedState();

  for (const [cat, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    const isCollapsed = !lowerFilter && expanded[cat] !== true;

    const group = document.createElement('div');
    group.className = 'sidebar-group';
    group.dataset.category = cat;

    const header = document.createElement('button');
    header.className = 'sidebar-group-header';
    if (isCollapsed) header.classList.add('collapsed');

    const chevron = document.createElement('span');
    chevron.className = 'sidebar-chevron';
    chevron.textContent = '\u25BE';

    const label = document.createElement('span');
    label.className = 'sidebar-group-label';
    label.textContent = labels[cat] || cat;

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
      const state = loadExpandedState();
      state[cat] = wasCollapsed;
      saveExpandedState(state);
    });

    items.forEach(E => content.appendChild(createExplorationBtn(E)));

    group.appendChild(header);
    group.appendChild(content);
    listEl.appendChild(group);
  }
}

export async function buildSidebar(listEl, onSelect) {
  listEl.innerHTML = '';
  onSelectCallback = onSelect;
  listElRef = listEl;

  const explorations = getAll();

  // Load cached hero images
  heroImages = await getAllHeroImages(explorations.map(E => E.id));

  // Search bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'sidebar-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search explorations\u2026';
  searchInput.className = 'sidebar-search-input';
  searchWrap.appendChild(searchInput);
  listEl.appendChild(searchWrap);

  // Hero card for active exploration
  const heroCard = document.createElement('div');
  heroCard.className = 'sidebar-hero-card';
  heroCard.id = 'sidebar-hero-card';
  heroCard.innerHTML = '<div class="hero-image-placeholder"></div>';
  listEl.appendChild(heroCard);

  buildGroups(listEl, explorations, '');

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      buildGroups(listEl, explorations, searchInput.value);
      // Re-apply active state
      const activeBtn = listEl.querySelector('.exploration-btn.active');
      if (!activeBtn) {
        const currentId = listEl.querySelector('.sidebar-hero-card')?.dataset.activeId;
        if (currentId) {
          listEl.querySelectorAll('.exploration-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.id === currentId);
          });
        }
      }
    }, 150);
  });
}

export function setActive(listEl, id) {
  listEl.querySelectorAll('.exploration-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });

  // Auto-expand the group containing the active exploration
  const activeBtn = listEl.querySelector(`.exploration-btn[data-id="${id}"]`);
  if (activeBtn) {
    const content = activeBtn.closest('.sidebar-group-content');
    const header = content?.previousElementSibling;
    if (content?.classList.contains('collapsed')) {
      content.classList.remove('collapsed');
      header?.classList.remove('collapsed');
      const cat = content.closest('.sidebar-group')?.dataset.category;
      if (cat) {
        const state = loadExpandedState();
        state[cat] = true;
        saveExpandedState(state);
      }
    }
  }

  // Update hero card
  const explorations = getAll();
  const E = explorations.find(e => e.id === id);
  const heroCard = listEl.querySelector('#sidebar-hero-card');
  if (heroCard && E) {
    heroCard.dataset.activeId = id;
    const heroUrl = heroImages[id];
    const heroContent = heroUrl
      ? `<div class="hero-image" style="background-image:url(${heroUrl})"></div>`
      : `<div class="hero-image hero-placeholder"><span class="hero-placeholder-emoji">${PLACEHOLDER_EMOJI}</span><button class="hero-capture-btn" data-id="${id}" title="Capture thumbnail">Capture</button></div>`;
    heroCard.innerHTML = `
      ${heroContent}
      <div class="hero-info">
        <div class="hero-title">${E.title}</div>
        <div class="hero-desc">${E.description || ''}</div>
      </div>
    `;
    const captureBtn = heroCard.querySelector('.hero-capture-btn');
    if (captureBtn) {
      captureBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onCaptureHeroCallback?.(id);
      });
    }
  }
}

export function setCaptureHeroCallback(callback) {
  onCaptureHeroCallback = callback;
}

export async function updateHeroImage(id, dataUrl) {
  heroImages[id] = dataUrl;
  if (!listElRef) return;

  // Update sidebar thumbnail
  const thumb = listElRef.querySelector(`.exploration-btn[data-id="${id}"] .exploration-thumb`);
  if (thumb) {
    thumb.style.backgroundImage = `url(${dataUrl})`;
    thumb.classList.remove('placeholder');
    thumb.textContent = '';
  }

  // Update hero card if this is the active exploration
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
