import { highlightJS } from './syntax-highlight.js';
import { getRelatedExplorations, hasEmbeddings } from '../embeddings/exploration-embeddings.js';
import { getHeroImage } from './hero-images.js';
import { getNote, saveNote, getSnapshots, saveSnapshot, deleteSnapshot } from './user-state.js';

let panel, formulaContent, tutorialContent, relatedContent, notesContent, toggleBtn;
let currentTab = 'formula';
let onTourClick = null;
let onRelatedClick = null;
let onSnapshotLoad = null;
let currentExplId = null;

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

    const tourBtn = e.target.closest('.tour-btn');
    if (tourBtn && onTourClick) {
      const rmin = parseFloat(tourBtn.dataset.rmin);
      const rmax = parseFloat(tourBtn.dataset.rmax);
      if (!isNaN(rmin) && !isNaN(rmax)) onTourClick(rmin, rmax);
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

    const snapDeleteBtn = e.target.closest('.snapshot-delete');
    if (snapDeleteBtn && currentExplId) {
      deleteSnapshot(currentExplId, parseInt(snapDeleteBtn.dataset.index)).then(() => renderNotesTab());
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

export function setTourCallback(callback) {
  onTourClick = callback;
}

export function setRelatedCallback(callback) {
  onRelatedClick = callback;
}

export function setSnapshotLoadCallback(callback) {
  onSnapshotLoad = callback;
}

export function triggerSaveSnapshot(name, params, thumbnail = null) {
  if (!currentExplId) return;
  saveSnapshot(currentExplId, name, params, thumbnail).then(() => renderNotesTab());
}

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

export function updateInfoPanel(ExplClass) {
  if (!panel) return;

  const neighborhoods = getNeighborhoodLabels(ExplClass.tags);
  const neighborhoodHtml = neighborhoods.length > 0
    ? `<div class="neighborhood-badges">${neighborhoods.map(n => `<span class="neighborhood-badge">${n}</span>`).join('')}</div>`
    : '';

  if (ExplClass.formula) {
    formulaContent.innerHTML = neighborhoodHtml + ExplClass.formula;
  } else {
    formulaContent.innerHTML = neighborhoodHtml + '<p class="info-empty">No formula available.</p>';
  }
  if (ExplClass.tutorial) {
    let html = ExplClass.tutorial;
    html = html.replace(/<code class="language-js">([\s\S]*?)<\/code>/g, (_, code) => {
      return '<code class="language-js">' + highlightJS(code) + '</code>';
    });
    tutorialContent.innerHTML = html;
  } else {
    tutorialContent.innerHTML = '<p class="info-empty">No tutorial available.</p>';
  }

  currentExplId = ExplClass.id;
  updateRelatedDemos(ExplClass.id);
  renderNotesTab();
}

async function updateRelatedDemos(id) {
  const relatedTab = panel?.querySelector('.info-tab[data-tab="related"]');
  if (!relatedContent) return;

  if (!hasEmbeddings()) {
    if (relatedTab) relatedTab.style.display = 'none';
    relatedContent.innerHTML = '';
    return;
  }

  if (relatedTab) relatedTab.style.display = '';
  const related = getRelatedExplorations(id, 3);
  if (related.length === 0) {
    relatedContent.innerHTML = '<p class="info-empty">No related demos found.</p>';
    return;
  }

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

  relatedContent.innerHTML = '<h3>Related Explorations</h3>' + cards.join('');
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
          <button class="snapshot-delete" data-index="${i}" title="Delete">&times;</button>
        </div>`;
      }).join('')}</div>`
    : '<p class="info-empty">No saved snapshots yet.</p>';

  notesContent.innerHTML = `
    <h3>Notes</h3>
    <textarea class="notes-textarea" placeholder="Your notes on this exploration\u2026">${escHtml(noteText)}</textarea>
    <h3>Saved Views</h3>
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

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export { TAG_NEIGHBORHOODS, getNeighborhoodLabels };
