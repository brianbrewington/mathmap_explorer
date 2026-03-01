import { highlightJS } from './syntax-highlight.js';
import { getRelatedExplorations, hasEmbeddings } from '../embeddings/exploration-embeddings.js';
import { getHeroImage } from './hero-images.js';
import { getById } from '../explorations/registry.js';
import { getNote, saveNote, getSnapshots, saveSnapshot, deleteSnapshot } from './user-state.js';
import { getTagLabel, getFacet, isFacetTag } from '../explorations/taxonomy.js';
import { addFilter } from './sidebar.js';
import { openImageModal } from './image-modal.js';

let panel, formulaContent, tutorialContent, relatedContent, notesContent, toggleBtn;
let currentTab = 'formula';
let onGuidedStepClick = null;
let onRelatedClick = null;
let onSnapshotLoad = null;
let onSaveView = null;
let onSetHero = null;
let currentExplId = null;
let currentExplClass = null;

export function initInfoPanel() {
  panel = document.getElementById('info-panel');
  formulaContent = document.getElementById('formula-content');
  tutorialContent = document.getElementById('tutorial-content');
  relatedContent = document.getElementById('related-content');
  notesContent = document.getElementById('notes-content');
  toggleBtn = document.getElementById('info-panel-toggle');

  toggleBtn.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      panel.classList.add('collapsed');
      toggleBtn.innerHTML = '&#x25C0;';
    } else {
      panel.classList.remove('collapsed');
      panel.classList.add('open');
      toggleBtn.innerHTML = '&#x25B6;';
    }
  });

  panel.addEventListener('click', (e) => {
    const tab = e.target.closest('.info-tab');
    if (tab) {
      currentTab = tab.dataset.tab;
      panel.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t === tab));
      formulaContent.classList.toggle('active', currentTab === 'formula');
      tutorialContent.classList.toggle('active', currentTab === 'tutorial');
      if (relatedContent) relatedContent.classList.toggle('active', currentTab === 'related');
      if (notesContent) notesContent.classList.toggle('active', currentTab === 'notes');
      return;
    }

    const stepBtn = e.target.closest('.guided-step-btn');
    if (stepBtn && onGuidedStepClick) {
      const index = parseInt(stepBtn.dataset.stepIndex);
      if (!isNaN(index)) onGuidedStepClick(index);
      return;
    }

    const tourBtn = e.target.closest('.tour-btn');
    if (tourBtn && onGuidedStepClick) {
      const rmin = parseFloat(tourBtn.dataset.rmin);
      const rmax = parseFloat(tourBtn.dataset.rmax);
      if (!isNaN(rmin) && !isNaN(rmax)) {
        onGuidedStepClick('tour', { rmin, rmax });
      }
      return;
    }

    const relBtn = e.target.closest('.related-demo-card');
    if (relBtn && onRelatedClick) {
      onRelatedClick(relBtn.dataset.id);
      return;
    }

    const snapLoadBtn = e.target.closest('.snapshot-load');
    if (snapLoadBtn && onSnapshotLoad) {
      onSnapshotLoad(parseInt(snapLoadBtn.dataset.index));
      return;
    }

    const snapHeroBtn = e.target.closest('.snapshot-set-hero');
    if (snapHeroBtn && onSetHero) {
      onSetHero(parseInt(snapHeroBtn.dataset.index));
      return;
    }

    const snapDeleteBtn = e.target.closest('.snapshot-delete');
    if (snapDeleteBtn && currentExplId) {
      deleteSnapshot(currentExplId, parseInt(snapDeleteBtn.dataset.index)).then(() => renderNotesTab());
      return;
    }

    const saveViewBtn = e.target.closest('.save-view-btn');
    if (saveViewBtn && onSaveView) {
      onSaveView();
    }

    // Tell Me More button
    const tmmBtn = e.target.closest('.tell-me-more-btn');
    if (tmmBtn) {
      const wrap = tmmBtn.closest('.tell-me-more-wrap');
      if (wrap) {
        tmmBtn.style.display = 'none';
        const wt = wrap.querySelector('.walkthrough');
        if (wt) {
          wt.style.display = '';
          goToWalkthroughStep(wt, 0);
        }
      }
      return;
    }

    // Walkthrough close
    const wtClose = e.target.closest('.wt-close');
    if (wtClose) {
      const wrap = wtClose.closest('.tell-me-more-wrap');
      if (wrap) {
        const wt = wrap.querySelector('.walkthrough');
        const btn = wrap.querySelector('.tell-me-more-btn');
        if (wt) wt.style.display = 'none';
        if (btn) btn.style.display = '';
      }
      return;
    }

    // Walkthrough "Try It"
    const wtTry = e.target.closest('.wt-try-btn');
    if (wtTry && onGuidedStepClick) {
      const index = parseInt(wtTry.dataset.stepIndex);
      if (!isNaN(index)) onGuidedStepClick(index);
      return;
    }

    // Walkthrough nav (prev / next / dot)
    const wtNav = e.target.closest('.wt-prev') || e.target.closest('.wt-next') || e.target.closest('.wt-dot');
    if (wtNav) {
      const wt = wtNav.closest('.walkthrough');
      if (!wt) return;
      const current = parseInt(wt.dataset.wtCurrent) || 0;
      const total = wt.querySelectorAll('.wt-step').length;
      let next;
      if (wtNav.classList.contains('wt-dot')) next = parseInt(wtNav.dataset.wtDot);
      else if (wtNav.classList.contains('wt-prev')) next = Math.max(0, current - 1);
      else next = Math.min(total - 1, current + 1);
      if (!isNaN(next)) goToWalkthroughStep(wt, next);
      return;
    }

    const badge = e.target.closest('.clickable-badge');
    if (badge) {
      const facetKey = badge.dataset.facet;
      const tagValue = badge.dataset.tag;
      if (facetKey && tagValue) addFilter(facetKey, tagValue);
    }
  });

  panel.addEventListener('dblclick', (e) => {
    const thumb = e.target.closest('.snapshot-thumb');
    if (thumb) {
      const src = thumb.style.backgroundImage;
      if (src) openImageModal(src);
    }
  });
}

export function showInfoPanel() {
  if (panel) {
    panel.classList.remove('collapsed');
    panel.classList.add('open');
    if (toggleBtn) toggleBtn.innerHTML = '&#x25B6;';
  }
}

export function setGuidedStepCallback(callback) {
  onGuidedStepClick = callback;
}

/** @deprecated Use setGuidedStepCallback instead */
export function setTourCallback(callback) {
  onGuidedStepClick = callback;
}

export function setRelatedCallback(callback) {
  onRelatedClick = callback;
}

export function setSnapshotLoadCallback(callback) {
  onSnapshotLoad = callback;
}

export function setSaveViewCallback(callback) {
  onSaveView = callback;
}

export function setSetHeroCallback(callback) {
  onSetHero = callback;
}

export function triggerSaveSnapshot(name, params, thumbnail = null) {
  if (!currentExplId) return;
  saveSnapshot(currentExplId, name, params, thumbnail).then(() => renderNotesTab());
}

/** @deprecated Kept for backward compatibility with tests. Use taxonomy.js instead. */
const TAG_NEIGHBORHOODS = {
  'complex-plane': 'Complex Dynamics',
  'escape-time': 'Escape-Time Fractals',
  'discrete-map': 'Discrete Maps',
  'strange-attractor': 'Strange Attractors',
  'ifs-classic': 'Iterated Function Systems',
  'bifurcation': 'Bifurcation & Routes to Chaos',
  'self-similar': 'Self-Similarity',
  'chaos': 'Chaotic Systems',
  'biological-form': 'Natural Forms',
  'string-rewriting': 'Formal Grammars',
  '3D': '3D Visualization',
  'group-theory': 'Group Theory',
  'numerical-methods': 'Numerical Methods',
  'user-defined': 'User-Defined Systems',
  'affine-transform': 'Affine Geometry'
};

function getNeighborhoodLabels(tags) {
  if (!tags || tags.length === 0) return [];
  const seen = new Set();
  const labels = [];
  for (const tag of tags) {
    const label = TAG_NEIGHBORHOODS[tag];
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.slice(0, 3);
}

function buildTagBadges(tags) {
  if (!tags || tags.length === 0) return '';
  const seen = new Set();
  const badges = [];
  for (const tag of tags) {
    const info = getFacet(tag);
    if (!info) continue;
    const key = `${info.facet}:${tag}`;
    if (seen.has(key)) continue;
    seen.add(key);
    badges.push({ tag, facet: info.facet, label: info.label });
  }
  if (badges.length === 0) return '';
  return `<div class="neighborhood-badges">${badges.map(b =>
    `<span class="neighborhood-badge clickable-badge" data-facet="${b.facet}" data-tag="${b.tag}" title="Filter by ${b.label}">${b.label}</span>`
  ).join('')}</div>`;
}

const RESOURCE_ICONS = {
  youtube: '\u25B6\uFE0F',
  wikipedia: '\uD83D\uDCD6',
  wolfram: '\uD83D\uDD2C',
  paper: '\uD83D\uDCC4'
};

const RESOURCE_LABELS = {
  youtube: 'YouTube',
  wikipedia: 'Wikipedia',
  wolfram: 'Wolfram',
  paper: 'Paper'
};

function buildResourceLinks(resources) {
  if (!resources || resources.length === 0) return '';
  const links = resources.map(r => {
    const icon = RESOURCE_ICONS[r.type] || '\uD83D\uDD17';
    const badge = RESOURCE_LABELS[r.type] || '';
    return `<a class="resource-link" href="${escHtml(r.url)}" target="_blank" rel="noopener">
      <span class="resource-icon">${icon}</span>
      <span class="resource-text">
        <span class="resource-title">${escHtml(r.title)}</span>
        ${badge ? `<span class="resource-badge">${badge}</span>` : ''}
      </span>
    </a>`;
  }).join('');
  return `<div class="resource-links"><h3>Learn More</h3>${links}</div>`;
}

function buildGuidedSteps(steps) {
  if (!steps || steps.length === 0) return '';
  const buttons = steps.map((step, i) => {
    return `<button class="guided-step-btn" data-step-index="${i}">
      <span class="guided-step-number">${i + 1}</span>
      <span class="guided-step-content">
        <span class="guided-step-label">${escHtml(step.label)}</span>
        ${step.description ? `<span class="guided-step-desc">${step.description}</span>` : ''}
      </span>
    </button>`;
  }).join('');
  return `<div class="guided-steps"><h3>Try This</h3><p class="guided-steps-hint">Click each step to set the parameters and see what changes.</p>${buttons}</div>`;
}

function buildTellMeMore(steps) {
  if (!steps || steps.length === 0) return '';
  const total = steps.length;

  const stepsHtml = steps.map((step, i) => `
    <div class="wt-step${i === 0 ? ' active' : ''}" data-wt-step="${i}">
      <div class="wt-step-badge">Step ${i + 1} of ${total}</div>
      <h4 class="wt-step-label">${escHtml(step.label)}</h4>
      <p class="wt-step-desc">${step.description || ''}</p>
      <button class="wt-try-btn" data-step-index="${i}">&#x25B6; Try It</button>
    </div>`).join('');

  const dots = steps.map((_, i) =>
    `<button class="wt-dot${i === 0 ? ' active' : ''}" data-wt-dot="${i}"></button>`
  ).join('');

  return `<div class="tell-me-more-wrap">
    <button class="tell-me-more-btn">&#x2728; Tell Me More</button>
    <div class="walkthrough" data-wt-current="0" style="display:none">
      <div class="wt-header">
        <span class="wt-heading">Guided Exploration</span>
        <button class="wt-close">&times;</button>
      </div>
      ${stepsHtml}
      <div class="wt-nav">
        <button class="wt-prev" disabled>&#x2039; Previous</button>
        <div class="wt-dots">${dots}</div>
        <button class="wt-next"${total <= 1 ? ' disabled' : ''}>Next &#x203A;</button>
      </div>
    </div>
  </div>`;
}

export function updateInfoPanel(ExplClass) {
  if (!panel) return;

  const badgeHtml = buildTagBadges(ExplClass.tags);
  const overviewHtml = ExplClass.overview || '';
  const resourceHtml = buildResourceLinks(ExplClass.resources);
  const tellMeMoreHtml = buildTellMeMore(ExplClass.guidedSteps);

  let formulaHtml = '';
  if (overviewHtml) {
    formulaHtml = badgeHtml + overviewHtml;
    if (ExplClass.formula) formulaHtml += ExplClass.formula;
    formulaHtml += resourceHtml + tellMeMoreHtml;
  } else if (ExplClass.formula) {
    formulaHtml = badgeHtml + ExplClass.formula + resourceHtml + tellMeMoreHtml;
  } else {
    formulaHtml = badgeHtml + '<p class="info-empty">No overview available.</p>' + tellMeMoreHtml;
  }
  formulaContent.innerHTML = formulaHtml;

  const guidedHtml = buildGuidedSteps(ExplClass.guidedSteps);
  if (ExplClass.tutorial) {
    let html = ExplClass.tutorial;
    html = html.replace(/<code class="language-js">([\s\S]*?)<\/code>/g, (_, code) => {
      return '<code class="language-js">' + highlightJS(code) + '</code>';
    });
    tutorialContent.innerHTML = html + guidedHtml;
  } else if (guidedHtml) {
    tutorialContent.innerHTML = guidedHtml;
  } else {
    tutorialContent.innerHTML = '<p class="info-empty">No guide available.</p>';
  }

  currentExplId = ExplClass.id;
  currentExplClass = ExplClass;
  updateRelatedDemos(ExplClass.id, ExplClass);
  renderNotesTab();
}

async function buildCuratedCards(ids) {
  if (!ids || ids.length === 0) return '';
  const cards = await Promise.all(ids.map(async refId => {
    const E = getById(refId);
    if (!E) return '';
    const heroUrl = await getHeroImage(refId);
    return `<button class="related-demo-card" data-id="${refId}">
      <div class="related-demo-thumb" ${heroUrl ? `style="background-image:url(${heroUrl})"` : ''}></div>
      <div class="related-demo-info">
        <div class="related-demo-title">${E.title}</div>
      </div>
    </button>`;
  }));
  return cards.filter(Boolean).join('');
}

async function updateRelatedDemos(id, ExplClass) {
  const relatedTab = panel?.querySelector('.info-tab[data-tab="related"]');
  if (!relatedContent) return;

  const foundations = ExplClass?.foundations || [];
  const extensions = ExplClass?.extensions || [];
  const hasCurated = foundations.length + extensions.length > 0;
  const hasEmbed = hasEmbeddings();

  if (!hasCurated && !hasEmbed) {
    if (relatedTab) relatedTab.style.display = 'none';
    relatedContent.innerHTML = '';
    return;
  }

  if (relatedTab) relatedTab.style.display = '';

  let html = '';

  if (foundations.length > 0) {
    html += '<h3>Foundations</h3><p class="related-section-hint">Understand these first</p>';
    html += await buildCuratedCards(foundations);
  }

  if (extensions.length > 0) {
    html += '<h3>Extensions</h3><p class="related-section-hint">Ready for more?</p>';
    html += await buildCuratedCards(extensions);
  }

  if (hasEmbed) {
    const related = getRelatedExplorations(id, 3);
    if (related.length > 0) {
      const cards = await Promise.all(related.map(async r => {
        const heroUrl = await getHeroImage(r.id);
        const pct = Math.round(r.similarity * 100);
        return `<button class="related-demo-card" data-id="${r.id}">
          <div class="related-demo-thumb" ${heroUrl ? `style="background-image:url(${heroUrl})"` : ''}></div>
          <div class="related-demo-info">
            <div class="related-demo-title">${r.title}</div>
            <div class="related-demo-sim">${pct}% related</div>
          </div>
        </button>`;
      }));
      html += '<h3>More Like This</h3>' + cards.join('');
    }
  }

  relatedContent.innerHTML = html || '<p class="info-empty">No related demos found.</p>';
}

async function renderNotesTab() {
  if (!notesContent || !currentExplId) return;

  const note = await getNote(currentExplId);
  const snapshots = await getSnapshots(currentExplId);

  const noteText = note?.text || '';
  const snapshotHtml = snapshots.length > 0
    ? `<div class="snapshot-gallery">${snapshots.map((s, i) => {
        const date = new Date(s.savedAt).toLocaleDateString();
        const thumbStyle = s.thumbnail ? `style="background-image:url(${s.thumbnail})"` : '';
        return `<div class="snapshot-card">
          <button class="snapshot-load" data-index="${i}" title="Load this snapshot">
            <div class="snapshot-thumb" ${thumbStyle}></div>
            <div class="snapshot-card-info">
              <span class="snapshot-card-name">${escHtml(s.name)}</span>
              <span class="snapshot-card-date">${date}</span>
            </div>
          </button>
          ${s.thumbnail ? `<button class="snapshot-set-hero" data-index="${i}" title="Set as hero image">&#x2605;</button>` : ''}
          <button class="snapshot-delete" data-index="${i}" title="Delete">&times;</button>
        </div>`;
      }).join('')}</div>`
    : '<p class="info-empty">No saved snapshots yet.</p>';

  notesContent.innerHTML = `
    <h3>Notes</h3>
    <textarea class="notes-textarea" placeholder="Your notes on this exploration\u2026">${escHtml(noteText)}</textarea>
    <h3>Saved Views</h3>
    <button class="control-btn save-view-btn">Save Current View</button>
    ${snapshotHtml}
  `;

  const textarea = notesContent.querySelector('.notes-textarea');
  if (textarea) {
    let saveTimer = null;
    textarea.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveNote(currentExplId, textarea.value);
      }, 500);
    });
  }
}

function goToWalkthroughStep(wt, index) {
  const steps = wt.querySelectorAll('.wt-step');
  const total = steps.length;
  if (index < 0 || index >= total) return;
  wt.dataset.wtCurrent = index;
  steps.forEach((s, i) => s.classList.toggle('active', i === index));
  wt.querySelectorAll('.wt-dot').forEach((d, i) => d.classList.toggle('active', i === index));
  const prev = wt.querySelector('.wt-prev');
  const next = wt.querySelector('.wt-next');
  if (prev) prev.disabled = index === 0;
  if (next) next.disabled = index === total - 1;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function getGuidedSteps() {
  return currentExplClass?.guidedSteps || [];
}

export { TAG_NEIGHBORHOODS, getNeighborhoodLabels };
