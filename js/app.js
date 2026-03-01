import { getAll, getById } from './explorations/registry.js';
import { buildSidebar, setActive } from './ui/sidebar.js';
import { buildControls } from './ui/controls.js';
import { setupCanvasResize } from './ui/layout.js';
import { initInfoPanel, showInfoPanel, updateInfoPanel } from './ui/info-panel.js';

// Import all explorations (self-registering)
import './explorations/mandelbrot.js';
import './explorations/dejong.js';
import './explorations/logistic-map.js';
import './explorations/sierpinski.js';
import './explorations/barnsley.js';
import './explorations/henon.js';
import './explorations/custom-iterator.js';

const canvas = document.getElementById('render-canvas');
const controlsPanel = document.getElementById('controls-panel');
const listEl = document.getElementById('exploration-list');
const overlay = document.getElementById('canvas-overlay');
const overlayText = document.getElementById('overlay-text');

let currentExploration = null;
let currentInstance = null;
let currentExplClass = null;

function rebuildControls() {
  const controls = currentInstance.getControls();
  buildControls(controlsPanel, controls, {
    onChange(key, value) {
      currentInstance.onParamChange(key, value);
      if (currentInstance.shouldRebuildControls?.(key)) {
        rebuildControls();
      }
    },
    onAction(action) {
      if (action === 'start') currentInstance.start();
      else if (action === 'stop') currentInstance.stop();
      else if (action === 'reset') currentInstance.reset();
      else if (action === 'showInfo') showInfoPanel();
    }
  });
}

function selectExploration(id) {
  if (currentInstance) {
    currentInstance.deactivate();
    currentInstance = null;
  }

  const ExplClass = getById(id);
  if (!ExplClass) return;

  currentExploration = id;
  currentExplClass = ExplClass;
  setActive(listEl, id);

  currentInstance = new ExplClass(canvas, controlsPanel);
  rebuildControls();
  updateInfoPanel(ExplClass);

  currentInstance.activate();
  currentInstance.resize(canvas.width, canvas.height);
  currentInstance.render();
}

initInfoPanel();
buildSidebar(listEl, selectExploration);
setupCanvasResize(canvas, (w, h) => {
  if (currentInstance) {
    currentInstance.resize(w, h);
    currentInstance.render();
  }
});

// Show/hide overlay helpers
window.showOverlay = (text) => { overlayText.textContent = text; overlay.classList.remove('hidden'); };
window.hideOverlay = () => { overlay.classList.add('hidden'); };

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'r' || e.key === 'R') {
    if (currentInstance) currentInstance.reset();
  }
});

// Select first exploration on load
const all = getAll();
if (all.length > 0) selectExploration(all[0].id);
