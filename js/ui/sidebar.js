import { getAll } from '../explorations/registry.js';

export function buildSidebar(listEl, onSelect) {
  listEl.innerHTML = '';
  const explorations = getAll();
  const groups = { fractal: [], attractor: [], map: [], custom: [] };
  explorations.forEach(E => (groups[E.category] || groups.fractal).push(E));

  const labels = { fractal: 'Fractals', attractor: 'Attractors', map: 'Maps', custom: 'Custom' };

  for (const [cat, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    const h3 = document.createElement('h3');
    h3.textContent = labels[cat] || cat;
    listEl.appendChild(h3);
    items.forEach(E => {
      const btn = document.createElement('button');
      btn.className = 'exploration-btn';
      btn.dataset.id = E.id;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'exploration-title';
      titleSpan.textContent = E.title;
      btn.appendChild(titleSpan);

      if (E.formulaShort) {
        const formulaSpan = document.createElement('span');
        formulaSpan.className = 'exploration-formula';
        formulaSpan.innerHTML = E.formulaShort;
        btn.appendChild(formulaSpan);
      }

      btn.addEventListener('click', () => onSelect(E.id));
      listEl.appendChild(btn);
    });
  }
}

export function setActive(listEl, id) {
  listEl.querySelectorAll('.exploration-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });
}
