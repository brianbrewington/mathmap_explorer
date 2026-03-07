/**
 * KaTeX lazy-loader and math rendering utility.
 *
 * Loads KaTeX + auto-render from jsDelivr on first use, then provides
 * renderMath(element) which scans for $$...$$ (display) and $...$ (inline)
 * delimiters and replaces them with typeset math.
 */

const KATEX_VERSION = '0.16.11';
const CDN = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`;

let loadPromise = null;

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function ensureKaTeX() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    loadCSS(`${CDN}/katex.min.css`);
    await loadScript(`${CDN}/katex.min.js`);
    await loadScript(`${CDN}/contrib/auto-render.min.js`);
  })();
  return loadPromise;
}

/**
 * Scan an element for $...$ and $$...$$ delimiters and render them with KaTeX.
 * Safe to call multiple times; already-rendered spans are skipped.
 */
export async function renderMath(element) {
  if (!element) return;
  const hasDelimiters = element.textContent.includes('$');
  if (!hasDelimiters) return;

  try {
    await ensureKaTeX();
    /* global renderMathInElement */
    window.renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
      trust: true,
    });
  } catch (err) {
    console.warn('KaTeX rendering failed:', err);
  }
}
