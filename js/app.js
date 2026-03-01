import { getAll, getById } from './explorations/registry.js';
import { buildSidebar, setActive, updateHeroImage, setCaptureHeroCallback } from './ui/sidebar.js';
import { buildControls, updateSliderDisplay } from './ui/controls.js';
import { setupCanvasResize } from './ui/layout.js';
import { initInfoPanel, showInfoPanel, updateInfoPanel, setTourCallback, setRelatedCallback, setSnapshotLoadCallback, triggerSaveSnapshot } from './ui/info-panel.js';
import { AnimationController } from './ui/animation-controller.js';
import { RecipeManager } from './ui/recipe-manager.js';
import { captureHeroImage, captureCanvasThumbnail } from './ui/hero-images.js';
import { embedAllExplorations } from './embeddings/exploration-embeddings.js';
import { recordVisit, getSnapshots, getLastExploration, setLastExploration } from './ui/user-state.js';
import { initChatPanel } from './ui/chat-panel.js';

// Import all explorations (self-registering)
import './explorations/mandelbrot.js';
import './explorations/newton-fractal.js';
import './explorations/dejong.js';
import './explorations/logistic-map.js';
import './explorations/bifurcation-2d.js';
import './explorations/sierpinski.js';
import './explorations/barnsley.js';
import './explorations/henon.js';
import './explorations/affine-ifs.js';
import './explorations/custom-iterator.js';
import './explorations/l-system.js';
import './explorations/mandelbrot-logistic-3d.js';
import './explorations/julia-set.js';
import './explorations/kleinian.js';
import './explorations/coupled-systems.js';
import './explorations/fluid-dynamics.js';

const canvas = document.getElementById('render-canvas');
const controlsPanel = document.getElementById('controls-panel');
const listEl = document.getElementById('exploration-list');
const overlay = document.getElementById('canvas-overlay');
const overlayText = document.getElementById('overlay-text');

let currentExploration = null;
let currentInstance = null;
let currentExplClass = null;

const animator = new AnimationController();
const recipeManager = new RecipeManager();
recipeManager.init();

// Animation parameter definitions per exploration
const ANIM_PARAMS = {
  'custom-iterator': [
    { key: 'a', label: 'a', min: -5, max: 5 },
    { key: 'b', label: 'b', min: -5, max: 5 },
    { key: 'c', label: 'c', min: -5, max: 5 },
    { key: 'd', label: 'd', min: -5, max: 5 }
  ],
  'dejong': [
    { key: 'a', label: 'a', min: -5, max: 5 },
    { key: 'b', label: 'b', min: -5, max: 5 },
    { key: 'c', label: 'c', min: -5, max: 5 },
    { key: 'd', label: 'd', min: -5, max: 5 }
  ],
  'henon': [
    { key: 'a', label: 'a', min: 0.1, max: 2.0 },
    { key: 'b', label: 'b', min: 0.0, max: 1.0 }
  ],
  'newton-fractal': [
    { key: 'damping', label: 'Damping', min: 0.1, max: 2.0 }
  ],
  'logistic-map': [
    { key: 'rMin', label: 'r Min', min: 0, max: 4 },
    { key: 'rMax', label: 'r Max', min: 0, max: 4 }
  ],
  'bifurcation-2d': [
    { key: 'sweepMin', label: 'Sweep Min', min: -5, max: 5 },
    { key: 'sweepMax', label: 'Sweep Max', min: -5, max: 5 }
  ],
  'l-system': [
    { key: 'angle', label: 'Angle', min: 1, max: 180 },
    { key: 'iterations', label: 'Iterations', min: 1, max: 12 }
  ],
  'julia-set': [
    { key: 'c_re', label: 'c (real)', min: -2, max: 2 },
    { key: 'c_im', label: 'c (imag)', min: -2, max: 2 }
  ],
  'mandelbrot-logistic-3d': [
    { key: 'azimuth', label: 'Azimuth', min: -3.14, max: 3.14 },
    { key: 'elevation', label: 'Elevation', min: 0.1, max: 1.5 }
  ],
  'coupled-systems': [
    { key: 'epsilon', label: 'Coupling ε', min: 0, max: 0.5 },
    { key: 'rA', label: 'r (A)', min: 0.5, max: 4.0 },
    { key: 'rB', label: 'r (B)', min: 0.5, max: 4.0 }
  ]
};

function getAnimParamsForExploration(id) {
  return ANIM_PARAMS[id] || [];
}

let heroRefreshTimer = null;

function scheduleHeroCapture() {
  clearTimeout(heroRefreshTimer);
  heroRefreshTimer = setTimeout(async () => {
    if (!currentExploration || !currentInstance) return;
    currentInstance.render();
    const dataUrl = await captureHeroImage(canvas, currentExploration);
    if (dataUrl) updateHeroImage(currentExploration, dataUrl);
  }, 1500);
}

function rebuildControls() {
  const controls = currentInstance.getControls();

  // Add animation control if this exploration has animatable params
  const animParams = getAnimParamsForExploration(currentExploration);
  if (animParams.length > 0) {
    controls.push({ type: 'separator' });
    controls.push({
      type: 'animation',
      key: 'animation',
      params: animParams
    });
  }

  controls.push({ type: 'separator' });
  controls.push({ type: 'button', key: 'saveSnapshot', label: 'Save Snapshot', action: 'saveSnapshot' });

  if (currentExploration === 'custom-iterator') {
    controls.push({ type: 'button', key: 'saveRecipe', label: 'Save Recipe', action: 'saveRecipe' });
    controls.push({ type: 'button', key: 'loadRecipe', label: 'Load Recipe', action: 'loadRecipe' });
  }

  buildControls(controlsPanel, controls, {
    onChange(key, value) {
      currentInstance.onParamChange(key, value);
      if (currentInstance.shouldRebuildControls?.(key)) {
        rebuildControls();
      }
      scheduleHeroCapture();
    },
    onAction(action) {
      if (action === 'start') currentInstance.start();
      else if (action === 'stop') currentInstance.stop();
      else if (action === 'reset') { animator.stop(); currentInstance.reset(); }
      else if (action === 'regrow' && currentInstance.onAction) { currentInstance.onAction('regrow'); }
      else if (action === 'showInfo') showInfoPanel();
      else if (action === 'saveSnapshot') {
        const name = prompt('Snapshot name:');
        if (name) {
          currentInstance.render();
          captureCanvasThumbnail(canvas).then(thumb => {
            triggerSaveSnapshot(name, currentInstance.params, thumb);
            fetch('/api/save-snapshot-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: currentExploration, name, dataUrl: thumb })
            }).catch(() => {});
          }).catch(() => {
            triggerSaveSnapshot(name, currentInstance.params);
          });
        }
      }
      else if (action === 'saveRecipe') saveCurrentRecipe();
      else if (action === 'loadRecipe') showRecipeLoader();
    },
    onAnimAction(action, data) {
      handleAnimAction(action, data);
    }
  });
}

function handleAnimAction(action, data) {
  if (action === 'play' && data) {
    const animParams = getAnimParamsForExploration(currentExploration);
    const paramDef = animParams.find(p => p.key === data.paramKey);
    if (!paramDef) return;

    // Find the slider descriptor to get actual min/max
    const controls = currentInstance.getControls();
    const sliderDesc = controls.find(c => c.key === data.paramKey && c.type === 'slider');
    const min = sliderDesc ? sliderDesc.min : paramDef.min;
    const max = sliderDesc ? sliderDesc.max : paramDef.max;

    animator.configure({
      paramKey: data.paramKey,
      min, max,
      speed: data.speed || 0.5,
      mode: data.mode || 'bounce',
      onChange: (key, value) => {
        currentInstance.onParamChange(key, value);
        updateSliderDisplay(controlsPanel, key, value);
      }
    });
    animator.play();
  } else if (action === 'pause') {
    animator.pause();
  } else if (action === 'stop') {
    animator.stop();
  } else if (action === 'speed' && data) {
    animator.setSpeed(data.speed);
  } else if (action === 'mode' && data) {
    animator.setMode(data.mode);
  }
}

function saveCurrentRecipe() {
  const name = prompt('Recipe name:');
  if (!name) return;
  const author = prompt('Your name (optional):') || 'Anonymous';

  const params = { ...currentInstance.params };
  const recipe = {
    name, author,
    mode: params.mode || 'real',
    exprX: params.exprX, exprY: params.exprY,
    exprZ: params.exprZ, exprMap: params.exprMap,
    a: params.a, b: params.b, c: params.c, d: params.d,
    xMin: params.xMin, xMax: params.xMax,
    yMin: params.yMin, yMax: params.yMax,
    iterations: params.iterations, resolution: params.resolution,
    colorScheme: params.colorScheme, transient: params.transient,
    maxIter: params.maxIter, gpuColorScheme: params.gpuColorScheme,
    rMin: params.rMin, rMax: params.rMax
  };

  const saved = recipeManager.save(recipe);
  alert(`Saved "${name}" (${saved.id})`);
}

function showRecipeLoader() {
  const recipes = recipeManager.getAll();
  if (recipes.length === 0) {
    alert('No saved recipes. Save one first!');
    return;
  }

  const names = recipes.map((r, i) => `${i + 1}. ${r.name} (by ${r.author || '?'}, ${r.date || '?'})`);
  const choice = prompt('Select recipe:\n' + names.join('\n') + '\n\nEnter number (or "export" to export all):');
  if (!choice) return;

  if (choice.toLowerCase() === 'export') {
    recipeManager.exportAll();
    return;
  }

  const idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= recipes.length) return;

  const r = recipes[idx];
  // Load recipe into custom iterator
  if (r.mode) currentInstance.params.mode = r.mode;
  if (r.exprX) currentInstance.params.exprX = r.exprX;
  if (r.exprY) currentInstance.params.exprY = r.exprY;
  if (r.exprZ) currentInstance.params.exprZ = r.exprZ;
  if (r.exprMap) currentInstance.params.exprMap = r.exprMap;
  if (r.a !== undefined) currentInstance.params.a = r.a;
  if (r.b !== undefined) currentInstance.params.b = r.b;
  if (r.c !== undefined) currentInstance.params.c = r.c;
  if (r.d !== undefined) currentInstance.params.d = r.d;
  if (r.xMin !== undefined) { currentInstance.params.xMin = r.xMin; currentInstance.params.xMax = r.xMax; }
  if (r.yMin !== undefined) { currentInstance.params.yMin = r.yMin; currentInstance.params.yMax = r.yMax; }
  if (r.iterations) currentInstance.params.iterations = r.iterations;
  if (r.transient !== undefined) currentInstance.params.transient = r.transient;
  if (r.colorScheme !== undefined) currentInstance.params.colorScheme = r.colorScheme;
  if (r.maxIter) currentInstance.params.maxIter = r.maxIter;
  if (r.gpuColorScheme !== undefined) currentInstance.params.gpuColorScheme = r.gpuColorScheme;
  currentInstance.params.preset = 'custom';

  rebuildControls();
  // Trigger a mode switch to re-activate properly
  currentInstance.deactivate();
  currentInstance.activate();
  currentInstance.resize(canvas.width, canvas.height);
  currentInstance.render();
}

function selectExploration(id) {
  animator.stop();

  if (currentInstance) {
    currentInstance.deactivate();
    currentInstance = null;
  }

  const ExplClass = getById(id);
  if (!ExplClass) return;

  currentExploration = id;
  currentExplClass = ExplClass;
  setActive(listEl, id);
  recordVisit(id);
  setLastExploration(id);

  currentInstance = new ExplClass(canvas, controlsPanel);
  rebuildControls();
  updateInfoPanel(ExplClass);

  // Wire up tour callback for logistic map
  if (id === 'logistic-map') {
    setTourCallback((rmin, rmax) => {
      currentInstance.params.rMin = rmin;
      currentInstance.params.rMax = rmax;
      currentInstance._bounds.xMin = rmin;
      currentInstance._bounds.xMax = rmax;
      currentInstance._startWorker();
      rebuildControls();
    });
  } else {
    setTourCallback(null);
  }

  currentInstance.activate();
  currentInstance.resize(canvas.width, canvas.height);
  currentInstance.render();

  // Capture hero image after a delay to let workers/shaders finish.
  // Re-render immediately before capture so the WebGL buffer is fresh
  // (browsers clear it after compositing if preserveDrawingBuffer is off).
  setTimeout(async () => {
    if (currentExploration === id && currentInstance) {
      currentInstance.render();
      const dataUrl = await captureHeroImage(canvas, id);
      if (dataUrl) updateHeroImage(id, dataUrl);
    }
  }, 800);
}

initInfoPanel();
setRelatedCallback(id => selectExploration(id));

setCaptureHeroCallback(async (id) => {
  if (currentInstance) currentInstance.render();
  const dataUrl = await captureHeroImage(canvas, id);
  if (dataUrl) updateHeroImage(id, dataUrl);
});
setSnapshotLoadCallback(async (index) => {
  if (!currentInstance || !currentExploration) return;
  const snapshots = await getSnapshots(currentExploration);
  const snap = snapshots[index];
  if (!snap) return;
  Object.assign(currentInstance.params, snap.params);
  rebuildControls();
  currentInstance.deactivate();
  currentInstance.activate();
  currentInstance.resize(canvas.width, canvas.height);
  currentInstance.render();
  scheduleHeroCapture();
});

// buildSidebar is async (loads hero images from IndexedDB)
buildSidebar(listEl, selectExploration).then(() => {
  const all = getAll();
  if (all.length === 0) return;

  // ?generate-heroes: batch-cycle every exploration to capture thumbnails
  if (new URLSearchParams(location.search).has('generate-heroes')) {
    runHeroGeneration(all);
    return;
  }

  // Restore last exploration or fall back to first
  const lastId = getLastExploration();
  const startId = (lastId && all.find(e => e.id === lastId)) ? lastId : all[0].id;
  selectExploration(startId);

  // Embed explorations in background (non-blocking, graceful if Ollama unavailable)
  embedAllExplorations().then(ok => {
    if (ok && currentExplClass) updateInfoPanel(currentExplClass);
  });

  // Initialize chat panel (non-blocking, hidden if no Ollama chat model)
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) initChatPanel(chatContainer, id => selectExploration(id));
});

async function runHeroGeneration(explorations) {
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a1d27;color:#e2e4ea;padding:12px 24px;border-radius:8px;border:1px solid #6b7cff;z-index:9999;font-family:inherit;font-size:14px;';
  document.body.appendChild(status);

  let saved = 0;
  for (let i = 0; i < explorations.length; i++) {
    const E = explorations[i];
    status.textContent = `Generating heroes: ${i + 1}/${explorations.length} — ${E.title}`;
    selectExploration(E.id);
    await new Promise(r => setTimeout(r, 2000));
    currentInstance.render();
    const dataUrl = await captureCanvasThumbnail(canvas);
    if (dataUrl) {
      updateHeroImage(E.id, dataUrl);
      try {
        await fetch('/api/save-hero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: E.id, dataUrl })
        });
        saved++;
      } catch { /* server may not support save — IndexedDB fallback */ }
    }
  }

  await fetch('/api/heroes-complete', { method: 'POST' }).catch(() => {});
  status.textContent = `Done — ${saved} hero images saved to heroes/`;
  setTimeout(() => status.remove(), 3000);
}

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
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'r' || e.key === 'R') {
    if (currentInstance) { animator.stop(); currentInstance.reset(); }
  }
  if (e.key === ' ') {
    e.preventDefault();
    if (animator.playing) animator.pause();
    else if (animator.paramKey) animator.play();
  }
});
