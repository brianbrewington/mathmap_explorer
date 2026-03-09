let overlay = null;
let contentEl = null;

function mdToHtml(text) {
  const lines = text.split('\n');
  const out = [];
  let inCode = false;
  let codeLines = [];
  let para = [];

  function flushPara() {
    if (para.length === 0) return;
    const html = para.join(' ')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    out.push(`<p>${html}</p>`);
    para = [];
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${codeLines.map(l => escHtml(l)).join('\n')}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushPara();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith('## ')) {
      flushPara();
      out.push(`<h2>${escHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      flushPara();
      out.push(`<h1>${escHtml(line.slice(2))}</h1>`);
    } else if (line.trim() === '') {
      flushPara();
    } else {
      para.push(line.trim());
    }
  }
  flushPara();
  return out.join('\n');
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ensureModal() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.className = 'markdown-modal-overlay';

  const card = document.createElement('div');
  card.className = 'markdown-modal-content';

  contentEl = document.createElement('div');
  contentEl.className = 'markdown-modal-body';
  card.appendChild(contentEl);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function close() {
  if (overlay) overlay.classList.remove('open');
}

export function openMarkdownModal(path) {
  if (!path) return;
  ensureModal();
  contentEl.innerHTML = '<p style="color:#8b8fa3">Loading…</p>';
  requestAnimationFrame(() => overlay.classList.add('open'));

  fetch(path)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(text => {
      contentEl.innerHTML = mdToHtml(text);
    })
    .catch(() => {
      contentEl.innerHTML = `<pre style="white-space:pre-wrap;color:#e2e4ea">Could not load ${escHtml(path)}</pre>`;
    });
}
