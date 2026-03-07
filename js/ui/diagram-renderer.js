/**
 * Mermaid lazy-loader and block diagram rendering utility.
 *
 * Loads Mermaid from jsDelivr on first use, initialises with a dark theme
 * matching the app palette, and renders diagrams into container elements.
 */

const MERMAID_VERSION = '11';
const CDN_URL = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`;

let loadPromise = null;
let diagramCounter = 0;

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

function ensureMermaid() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await loadScript(CDN_URL);
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0f1117',
        primaryColor: '#2a2d3a',
        primaryTextColor: '#c8d0e4',
        primaryBorderColor: '#6b7cff',
        secondaryColor: '#1e2030',
        tertiaryColor: '#151822',
        lineColor: '#8b9dc3',
        textColor: '#c8d0e4',
        mainBkg: '#1e2030',
        nodeBorder: '#6b7cff',
        clusterBkg: 'rgba(107,124,255,0.06)',
        clusterBorder: '#2a2d3a',
        edgeLabelBackground: '#1e2030',
        fontFamily: "'Lexend', sans-serif",
        fontSize: '13px',
      },
      flowchart: { curve: 'basis', padding: 12 },
    });
  })();
  return loadPromise;
}

/**
 * Render a Mermaid diagram definition into a container element.
 * Returns the rendered SVG string, or empty string on failure.
 */
export async function renderBlockDiagram(container, definition) {
  if (!container || !definition) return '';
  try {
    await ensureMermaid();
    const id = `mmd-${diagramCounter++}`;
    const { svg } = await window.mermaid.render(id, definition);
    container.innerHTML = svg;
    return svg;
  } catch (err) {
    console.warn('Mermaid rendering failed:', err);
    const escaped = definition.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    container.innerHTML = `<pre class="diagram-fallback">${escaped}</pre>`;
    return '';
  }
}

/**
 * Build the HTML wrapper for a block diagram, ready for async rendering.
 * Returns { html, containerId } so the caller can insert the HTML
 * and then call renderBlockDiagram on the container after DOM insertion.
 */
export function buildBlockDiagramHtml() {
  const containerId = `block-diagram-${diagramCounter++}`;
  const html = `<div class="circuit-learning-block">
    <h3>System Diagram</h3>
    <div class="block-diagram-container" id="${containerId}"></div>
  </div>`;
  return { html, containerId };
}
