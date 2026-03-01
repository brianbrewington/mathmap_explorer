import { highlightJS } from './syntax-highlight.js';

let panel, formulaContent, tutorialContent, toggleBtn;
let currentTab = 'formula';
let onTourClick = null;

export function initInfoPanel() {
  panel = document.getElementById('info-panel');
  formulaContent = document.getElementById('formula-content');
  tutorialContent = document.getElementById('tutorial-content');
  toggleBtn = document.getElementById('info-panel-toggle');

  toggleBtn.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      panel.classList.add('collapsed');
      toggleBtn.innerHTML = '&#x25C0;'; // ◀ pull out
    } else {
      panel.classList.remove('collapsed');
      panel.classList.add('open');
      toggleBtn.innerHTML = '&#x25B6;'; // ▶ push back
    }
  });

  panel.addEventListener('click', (e) => {
    const tab = e.target.closest('.info-tab');
    if (tab) {
      currentTab = tab.dataset.tab;
      panel.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t === tab));
      formulaContent.classList.toggle('active', currentTab === 'formula');
      tutorialContent.classList.toggle('active', currentTab === 'tutorial');
      return;
    }
    // Tour button delegation
    const tourBtn = e.target.closest('.tour-btn');
    if (tourBtn && onTourClick) {
      const rmin = parseFloat(tourBtn.dataset.rmin);
      const rmax = parseFloat(tourBtn.dataset.rmax);
      if (!isNaN(rmin) && !isNaN(rmax)) {
        onTourClick(rmin, rmax);
      }
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

export function updateInfoPanel(ExplClass) {
  if (!panel) return;
  if (ExplClass.formula) {
    formulaContent.innerHTML = ExplClass.formula;
  } else {
    formulaContent.innerHTML = '<p class="info-empty">No formula available.</p>';
  }
  if (ExplClass.tutorial) {
    let html = ExplClass.tutorial;
    // Highlight code blocks
    html = html.replace(/<code class="language-js">([\s\S]*?)<\/code>/g, (_, code) => {
      return '<code class="language-js">' + highlightJS(code) + '</code>';
    });
    tutorialContent.innerHTML = html;
  } else {
    tutorialContent.innerHTML = '<p class="info-empty">No tutorial available.</p>';
  }
}
