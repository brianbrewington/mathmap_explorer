import { highlightJS } from './syntax-highlight.js';

let panel, formulaContent, tutorialContent;
let currentTab = 'formula';

export function initInfoPanel() {
  panel = document.getElementById('info-panel');
  formulaContent = document.getElementById('formula-content');
  tutorialContent = document.getElementById('tutorial-content');

  panel.addEventListener('click', (e) => {
    const tab = e.target.closest('.info-tab');
    if (tab) {
      currentTab = tab.dataset.tab;
      panel.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t === tab));
      formulaContent.classList.toggle('active', currentTab === 'formula');
      tutorialContent.classList.toggle('active', currentTab === 'tutorial');
      return;
    }
    if (e.target.closest('.info-panel-close')) {
      panel.classList.add('collapsed');
    }
  });
}

export function showInfoPanel() {
  if (panel) panel.classList.remove('collapsed');
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
