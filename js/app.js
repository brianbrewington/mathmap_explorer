import { getAll, getById } from './explorations/registry.js';
import { buildSidebar, setActive, updateHeroImage, setCaptureHeroCallback, setSnapshotLoadCallback as setSidebarSnapshotLoadCallback } from './ui/sidebar.js';
import { buildControls, updateSliderDisplay } from './ui/controls.js';
import { setupCanvasResize } from './ui/layout.js';
import { initInfoPanel, showInfoPanel, updateInfoPanel, setGuidedStepCallback, setRelatedCallback, setSnapshotLoadCallback, setSaveViewCallback, setSetHeroCallback, triggerSaveSnapshot, getGuidedSteps } from './ui/info-panel.js';
import { AnimationController } from './ui/animation-controller.js';
import { RecipeManager } from './ui/recipe-manager.js';
import { captureHeroImage, captureCanvasThumbnail, hasRealHero, setHeroImage } from './ui/hero-images.js';
import { embedAllExplorations } from './embeddings/exploration-embeddings.js';
import { recordVisit, hasVisited, getSnapshots, getLastExploration, setLastExploration } from './ui/user-state.js';
import { initChatPanel } from './ui/chat-panel.js';
import { AudioEngine } from './audio/engine.js';

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
import './explorations/double-pendulum.js';
import './explorations/firefly-synchrony.js';
import './explorations/coupled-metronomes.js';
import './explorations/lorenz-attractor.js';
import './explorations/perceptron-bifurcation.js';
import './explorations/nn-bifurcation.js';
import './explorations/fluid-dynamics.js';

// PDE demos
import './explorations/thermal-diffusion.js';

// Trig explorer ports
import './explorations/lissajous.js';
import './explorations/fourier-synthesis.js';
import './explorations/unit-circle.js';
import './explorations/phase-space.js';
import './explorations/simple-harmonic.js';

// Trig & math explorations (batch 2)
import './explorations/sine-cosine.js';
import './explorations/complex-spiral.js';
import './explorations/archimedean-spiral.js';
import './explorations/roots-of-unity.js';
import './explorations/cycloid.js';
import './explorations/rose-curves.js';
import './explorations/epitrochoid.js';
import './explorations/taylor-series.js';
import './explorations/damped-oscillation.js';
import './explorations/trig-identities-circle.js';
import './explorations/wave-identities.js';
import './explorations/calculus-of-trig.js';
import './explorations/heart-curve.js';
import './explorations/butterfly-curve.js';
import './explorations/phasor-diagrams.js';

// PDEs, probability & combinatorics (batch 3)
import './explorations/reaction-diffusion.js';
import './explorations/wave-packet.js';
import './explorations/pascals-triangle.js';
import './explorations/central-limit-theorem.js';
import './explorations/power-laws.js';

// Calculus explorations (batch 4)
import './explorations/epsilon-delta.js';
import './explorations/limit-game.js';
import './explorations/derivative-definition.js';
import './explorations/chain-rule.js';
import './explorations/taylor-approximation.js';
import './explorations/taylor-coeff-fit.js';
import './explorations/integration-riemann.js';

// Probability & statistics (batch 4)
import './explorations/random-walk.js';
import './explorations/law-of-large-numbers.js';
import './explorations/bayes-theorem.js';
import './explorations/markov-chain.js';
import './explorations/normal-distribution.js';

// PDE & turbulence (batch 4)
import './explorations/wave-equation.js';
import './explorations/vortex-shedding.js';

// Analog circuits
import './explorations/van-der-pol.js';
import './explorations/rlc-filter.js';
import './explorations/diode-clipper.js';
import './explorations/chua-circuit.js';
import './explorations/phase-locked-loop.js';
import './explorations/relaxation-oscillator.js';
import './explorations/bucket-brigade.js';
import './explorations/colpitts-oscillator.js';
import './explorations/memristor-chaos.js';
import './explorations/ring-oscillator.js';
import './explorations/charge-pump.js';

// Number theory (batch 5)
import './explorations/modular-multiplication-circle.js';
import './explorations/ulam-spiral.js';
import './explorations/ulam-sphere.js';
import './explorations/ulam-helix.js';
import './explorations/ford-circles.js';
import './explorations/euclidean-rectangles.js';
import './explorations/gaussian-primes.js';

// Information theory (batch 6)
import './explorations/surprise-entropy.js';
import './explorations/source-coding.js';
import './explorations/noisy-channel.js';
import './explorations/kl-divergence.js';
import './explorations/shannon-boltzmann.js';

// Principle of least action (batch 6)
import './explorations/least-action-paths.js';
import './explorations/brachistochrone.js';
import './explorations/fermats-principle.js';
import './explorations/laplacian-growth.js';

// Numerical DE foundations & dynamics on networks (batch 7)
import './explorations/ode-integrator.js';
import './explorations/phase-portrait.js';
import './explorations/stability-regions.js';
import './explorations/opinion-dynamics.js';
import './explorations/graph-laplacian.js';
import './explorations/kuramoto-network.js';
import './explorations/network-epidemic.js';
import './explorations/bifurcation-anatomy.js';
import './explorations/delay-de.js';
import './explorations/stochastic-resonance.js';

let canvas = document.getElementById('render-canvas');
const controlsPanel = document.getElementById('controls-panel');
const listEl = document.getElementById('exploration-list');
const overlay = document.getElementById('canvas-overlay');
const overlayText = document.getElementById('overlay-text');
const teaserOverlay = document.getElementById('teaser-overlay');
const teaserText = document.getElementById('teaser-text');
const teaserClose = document.getElementById('teaser-close');

/**
 * Replace the canvas element with a fresh one so the new exploration can
 * request whichever context type it needs (2d vs webgl2).  A canvas that
 * already owns a context of one type will refuse a different type.
 */
function resetCanvas() {
  const parent = canvas.parentElement;
  const fresh = document.createElement('canvas');
  fresh.id = canvas.id;
  fresh.width = canvas.width;
  fresh.height = canvas.height;
  parent.replaceChild(fresh, canvas);
  canvas = fresh;
}

let currentExploration = null;
let currentInstance = null;
let currentExplClass = null;

let teaserTimerId = null;
let teaserFadeTimerId = null;

function showTeaser(question) {
  if (!question || !teaserOverlay) return;
  hideTeaser();
  teaserText.textContent = question;
  teaserOverlay.classList.remove('teaser-hidden', 'teaser-fading');
  teaserTimerId = setTimeout(() => {
    teaserOverlay.classList.add('teaser-fading');
    teaserFadeTimerId = setTimeout(() => {
      teaserOverlay.classList.add('teaser-hidden');
      teaserOverlay.classList.remove('teaser-fading');
    }, 4000);
  }, 10000);
}

function hideTeaser() {
  if (teaserTimerId) { clearTimeout(teaserTimerId); teaserTimerId = null; }
  if (teaserFadeTimerId) { clearTimeout(teaserFadeTimerId); teaserFadeTimerId = null; }
  if (teaserOverlay) {
    teaserOverlay.classList.add('teaser-hidden');
    teaserOverlay.classList.remove('teaser-fading');
  }
}

if (teaserClose) {
  teaserClose.addEventListener('click', () => hideTeaser());
}

const audioEngine = new AudioEngine();
const muteBtn = document.getElementById('mute-toggle');
if (muteBtn) {
  if (!audioEngine.isMuted) muteBtn.classList.add('audible');
  muteBtn.addEventListener('click', () => {
    const audible = audioEngine.toggle();
    muteBtn.classList.toggle('audible', audible);
    if (currentInstance) {
      if (audible) {
        currentInstance.setupAudio(audioEngine.ctx, audioEngine.masterGain);
      } else {
        currentInstance.teardownAudio();
      }
    }
  });
}

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
  ],
  'double-pendulum': [
    { key: 'damping', label: 'Damping', min: 0, max: 0.2 },
    { key: 'gravity', label: 'Gravity', min: 1, max: 20 },
  ],
  'firefly-synchrony': [
    { key: 'count', label: 'Fly Count', min: 8, max: 120 },
    { key: 'spread', label: 'Freq Spread', min: 0.01, max: 0.8 },
    { key: 'coupling', label: 'Coupling K', min: 0, max: 3 },
  ],
  'coupled-metronomes': [
    { key: 'count', label: 'Count', min: 2, max: 12 },
    { key: 'mismatch', label: 'Mismatch', min: 0, max: 0.6 },
    { key: 'coupling', label: 'Coupling', min: 0, max: 4 },
  ],
  'lorenz-attractor': [
    { key: 'sigma', label: 'sigma', min: 0.1, max: 30 },
    { key: 'rho', label: 'rho', min: 0, max: 70 },
    { key: 'beta', label: 'beta', min: 0.1, max: 6 },
  ],
  'perceptron-bifurcation': [
    { key: 'etaMax', label: 'η Max', min: 5, max: 150 },
    { key: 'target', label: 'Target', min: 0.1, max: 0.9 },
  ],
  'sine-cosine': [
    { key: 'frequency', label: 'Frequency (ω)', min: 0.1, max: 10 },
    { key: 'phase', label: 'Phase (φ)', min: 0, max: 6.28 }
  ],
  'complex-spiral': [
    { key: 'sigma', label: 'Growth/Decay (σ)', min: -2.0, max: 2.0 },
    { key: 'omega', label: 'Angular Frequency (ω)', min: -10, max: 10 }
  ],
  'archimedean-spiral': [
    { key: 'growthRate', label: 'Growth Rate (b)', min: 0.1, max: 2.0 },
    { key: 'startOffset', label: 'Start Offset (a)', min: 0.0, max: 3.0 }
  ],
  'roots-of-unity': [
    { key: 'n', label: 'Number of roots (n)', min: 2, max: 24 }
  ],
  'cycloid': [
    { key: 'radius', label: 'Wheel Radius (r)', min: 0.5, max: 3.0 },
    { key: 'penRatio', label: 'Pen Offset (d/r)', min: 0.0, max: 2.0 }
  ],
  'rose-curves': [
    { key: 'k', label: 'Petals (k)', min: 0.5, max: 12.0 },
    { key: 'amplitude', label: 'Amplitude (A)', min: 0.5, max: 3.0 }
  ],
  'epitrochoid': [
    { key: 'penOffset', label: 'Pen Offset (d)', min: 0.5, max: 8.0 },
    { key: 'rollingRadius', label: 'Rolling Radius (r)', min: 0.5, max: 8.0 }
  ],
  'taylor-series': [
    { key: 'numTerms', label: 'Number of terms (N)', min: 1, max: 20 }
  ],
  'damped-oscillation': [
    { key: 'damping', label: 'Damping (b)', min: 0, max: 5 }
  ],
  'trig-identities-circle': [
    { key: 'angle', label: 'Angle (θ)', min: 0, max: 6.28 }
  ],
  'wave-identities': [
    { key: 'constantA', label: 'Constant (a)', min: 0, max: 6.28 }
  ],
  'calculus-of-trig': [
    { key: 'resolution', label: 'Resolution (n)', min: 4, max: 200 }
  ],
  'heart-curve': [
    { key: 'scale', label: 'Scale', min: 0.5, max: 3.0 },
    { key: 'harmonics', label: 'Harmonics', min: 1, max: 4 }
  ],
  'butterfly-curve': [
    { key: 'scale', label: 'Scale', min: 0.5, max: 3.0 },
    { key: 'rotations', label: 'Rotations', min: 1, max: 12 }
  ],
  'phasor-diagrams': [
    { key: 'freq1', label: 'Frequency 1 (ω₁)', min: 0.1, max: 10.0 },
    { key: 'phase', label: 'Phase Difference (Δφ)', min: 0, max: 6.283 }
  ],
  'reaction-diffusion': [
    { key: 'feed', label: 'Feed (F)', min: 0.01, max: 0.10 },
    { key: 'kill', label: 'Kill (k)', min: 0.03, max: 0.07 }
  ],
  'wave-packet': [
    { key: 'carrierK', label: 'Carrier Wave Number (k)', min: 1, max: 20 }
  ],
  'pascals-triangle': [
    { key: 'rows', label: 'Rows', min: 10, max: 128 }
  ],
  'central-limit-theorem': [
    { key: 'numSums', label: 'Number of Sums (N)', min: 1, max: 20 }
  ],
  'power-laws': [
    { key: 'alpha', label: 'Exponent (α)', min: 1.1, max: 5.0 }
  ],
  'epsilon-delta': [
    { key: 'epsilon', label: 'Epsilon (ε)', min: 0.01, max: 2.0 }
  ],
  'limit-game': [
    { key: 'epsilon', label: 'Your ε challenge', min: 0.001, max: 2.0 }
  ],
  'derivative-definition': [
    { key: 'h', label: 'Step size (h)', min: 0.01, max: 3.0 },
    { key: 'x0', label: 'Point (x₀)', min: -3, max: 3 }
  ],
  'chain-rule': [
    { key: 'a', label: 'Point (a)', min: -2, max: 2 }
  ],
  'taylor-approximation': [
    { key: 'numTerms', label: 'Terms (N)', min: 1, max: 15 },
    { key: 'center', label: 'Center (a)', min: -3, max: 3 }
  ],
  'integration-riemann': [
    { key: 'n', label: 'Subdivisions (n)', min: 1, max: 200 }
  ],
  'random-walk': [
    { key: 'numSteps', label: 'Steps', min: 10, max: 2000 }
  ],
  'law-of-large-numbers': [
    { key: 'maxN', label: 'Max samples (N)', min: 100, max: 10000 }
  ],
  'bayes-theorem': [
    { key: 'trueTheta', label: 'True θ', min: 0.01, max: 0.99 }
  ],
  'markov-chain': [
    { key: 'speed', label: 'Speed', min: 1, max: 50 }
  ],
  'normal-distribution': [
    { key: 'mu', label: 'Mean (μ)', min: -5, max: 5 },
    { key: 'sigma', label: 'Std Dev (σ)', min: 0.1, max: 3.0 }
  ],
  'wave-equation': [
    { key: 'c', label: 'Wave Speed (c)', min: 0.1, max: 5.0 },
    { key: 'damping', label: 'Damping', min: 0, max: 0.01 }
  ],
  'vortex-shedding': [
    { key: 'inflowSpeed', label: 'Inflow Speed', min: 0.5, max: 5.0 },
    { key: 'viscosity', label: 'Viscosity (ν)', min: 0.00005, max: 0.01 }
  ],
  'modular-multiplication-circle': [
    { key: 'multiplier', label: 'Multiplier (k)', min: 2.0, max: 50.0 },
    { key: 'numPoints', label: 'Points (N)', min: 10, max: 400 },
  ],
  'ulam-spiral': [
    { key: 'gridSize', label: 'Grid Size', min: 50, max: 500 },
  ],
  'ford-circles': [
    { key: 'maxDenom', label: 'Max Denominator', min: 2, max: 60 },
  ],
  'euclidean-rectangles': [
    { key: 'a', label: 'a', min: 1, max: 200 },
    { key: 'b', label: 'b', min: 1, max: 200 },
  ],
  'gaussian-primes': [
    { key: 'range', label: 'Range', min: 10, max: 100 },
  ],
  'ode-integrator': [
    { key: 'h', label: 'Step Size (h)', min: 0.01, max: 1.0 },
  ],
  'phase-portrait': [
    { key: 'arrowDensity', label: 'Arrow Density', min: 8, max: 40 },
  ],
  'stability-regions': [
    { key: 'eigenReal', label: 'Re(λ)', min: -10, max: 2 },
    { key: 'eigenImag', label: 'Im(λ)', min: -10, max: 10 },
    { key: 'h', label: 'Step size h', min: 0.01, max: 2.0 },
  ],
  'opinion-dynamics': [
    { key: 'epsilon', label: 'Confidence ε', min: 0.02, max: 0.5 },
    { key: 'mu', label: 'Convergence μ', min: 0.05, max: 0.5 },
  ],
  'graph-laplacian': [
    { key: 'mode', label: 'Eigenmode k', min: 0, max: 39 },
  ],
  'kuramoto-network': [
    { key: 'coupling', label: 'Coupling K', min: 0, max: 5 },
    { key: 'freqSpread', label: 'Freq Spread σ', min: 0.01, max: 1.5 },
  ],
  'network-epidemic': [
    { key: 'beta', label: 'Infection β', min: 0.01, max: 0.5 },
    { key: 'gamma', label: 'Recovery γ', min: 0.01, max: 0.3 },
    { key: 'vaccination', label: 'Vaccination %', min: 0, max: 0.9 },
  ],
  'bifurcation-anatomy': [
    { key: 'mu', label: 'Parameter μ', min: -2, max: 2 },
  ],
  'delay-de': [
    { key: 'tau', label: 'Delay τ', min: 1, max: 40 },
  ],
  'stochastic-resonance': [
    { key: 'sigma', label: 'Noise σ', min: 0, max: 2.0 },
    { key: 'amplitude', label: 'Forcing A', min: 0, max: 0.8 },
  ],
};

function getAnimParamsForExploration(id) {
  return ANIM_PARAMS[id] || [];
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
    },
    onAction(action) {
      if (action === 'start') currentInstance.start();
      else if (action === 'stop') currentInstance.stop();
      else if (action === 'reset') { animator.stop(); currentInstance.reset(); }
      else if (action === 'randomize' && currentInstance.onAction) { animator.stop(); currentInstance.onAction('randomize'); }
      else if (action === 'regrow' && currentInstance.onAction) { currentInstance.onAction('regrow'); }
      else if (action === 'challenge' && currentInstance.onAction) { currentInstance.onAction('challenge'); }
      else if (action === 'showInfo') showInfoPanel();
      else if (action === 'saveSnapshot') {
        const now = new Date();
        const name = now.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
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
  hideTeaser();

  if (currentInstance) {
    currentInstance.teardownAudio();
    currentInstance.deactivate();
    currentInstance = null;
  }

  resetCanvas();

  const ExplClass = getById(id);
  if (!ExplClass) return;

  currentExploration = id;
  currentExplClass = ExplClass;
  const firstVisit = !hasVisited(id);
  setActive(listEl, id);
  recordVisit(id);
  setLastExploration(id);

  currentInstance = new ExplClass(canvas, controlsPanel);
  rebuildControls();
  updateInfoPanel(ExplClass);

  // Generic guided step callback — works for any exploration
  setGuidedStepCallback((indexOrType, data) => {
    if (!currentInstance) return;

    // Legacy tour-btn support (logistic map)
    if (indexOrType === 'tour' && data) {
      currentInstance.params.rMin = data.rmin;
      currentInstance.params.rMax = data.rmax;
      if (currentInstance._bounds) {
        currentInstance._bounds.xMin = data.rmin;
        currentInstance._bounds.xMax = data.rmax;
      }
      if (currentInstance._startWorker) currentInstance._startWorker();
      rebuildControls();
      return;
    }

    // Generic guided steps from ExplClass.guidedSteps[]
    const steps = getGuidedSteps();
    const step = steps[indexOrType];
    if (!step) return;

    if (step.params) {
      for (const [key, value] of Object.entries(step.params)) {
        currentInstance.params[key] = value;
        currentInstance.onParamChange(key, value);
      }
    }
    if (step.bounds && currentInstance._bounds) {
      Object.assign(currentInstance._bounds, step.bounds);
    }
    if (currentInstance.shouldRebuildControls?.('preset')) {
      rebuildControls();
    } else {
      rebuildControls();
    }
    if (currentInstance._startWorker) currentInstance._startWorker();
  });

  // Auto-open info panel on first visit if there's educational content
  if (firstVisit && (ExplClass.overview || (ExplClass.guidedSteps && ExplClass.guidedSteps.length > 0))) {
    showInfoPanel();
  }

  currentInstance.activate();
  currentInstance.resize(canvas.width, canvas.height);
  currentInstance.render();
  showTeaser(ExplClass.teaserQuestion);

  currentInstance.setupAudio(audioEngine.ctx, audioEngine.masterGain);

  // Auto-capture hero only when one doesn't already exist (or existing is blank).
  // Two attempts with increasing delay for worker-based explorations.
  const attemptAutoHero = async () => {
    if (currentExploration !== id || !currentInstance) return false;
    if (await hasRealHero(id)) return true;
    currentInstance.render();
    const dataUrl = await captureHeroImage(canvas, id);
    if (dataUrl) { updateHeroImage(id, dataUrl); return true; }
    return false;
  };
  setTimeout(async () => {
    if (!(await attemptAutoHero())) {
      setTimeout(() => attemptAutoHero(), 3000);
    }
  }, 1500);
}

initInfoPanel();
setRelatedCallback(id => selectExploration(id));

setCaptureHeroCallback(async (id) => {
  if (currentInstance) currentInstance.render();
  const dataUrl = await captureHeroImage(canvas, id);
  if (dataUrl) updateHeroImage(id, dataUrl);
});
const loadSnapshot = async (index) => {
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
};
setSnapshotLoadCallback(loadSnapshot);
setSidebarSnapshotLoadCallback(loadSnapshot);

setSetHeroCallback(async (index) => {
  if (!currentExploration) return;
  const snapshots = await getSnapshots(currentExploration);
  const snap = snapshots[index];
  if (!snap?.thumbnail) return;
  const saved = await setHeroImage(currentExploration, snap.thumbnail);
  if (saved) updateHeroImage(currentExploration, saved);
});

setSaveViewCallback(() => {
  if (!currentInstance) return;
  const now = new Date();
  const name = now.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
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

const HERO_OVERRIDES = {
  'mandelbrot':           { maxIter: 100 },
  'julia-set':            { maxIter: 100 },
  'newton-fractal':       { maxIter: 100 },
  'kleinian':             { maxIter: 100 },
  'dejong':               { resolution: 800, iterations: 500000 },
  'henon':                { resolution: 800, iterations: 500000 },
  'sierpinski':           { resolution: 800, iterations: 500000 },
  'barnsley':             { resolution: 800, iterations: 500000 },
  'affine-ifs':           { resolution: 800, iterations: 500000 },
  'coupled-systems':      { resolution: 800, iterations: 500000 },
  'custom-iterator':      { resolution: 800, iterations: 500000 },
  'fluid-dynamics':       { resolution: 128, pressureIterations: 5 },
};

const WORKER_EXPLORATIONS = new Set([
  'dejong', 'henon', 'sierpinski', 'barnsley', 'affine-ifs',
  'coupled-systems', 'custom-iterator'
]);

async function runHeroGeneration(explorations) {
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a1d27;color:#e2e4ea;padding:12px 24px;border-radius:8px;border:1px solid #6b7cff;z-index:9999;font-family:inherit;font-size:14px;';
  document.body.appendChild(status);

  let saved = 0;
  for (let i = 0; i < explorations.length; i++) {
    const E = explorations[i];
    status.textContent = `Generating heroes: ${i + 1}/${explorations.length} — ${E.title}`;

    const overrides = HERO_OVERRIDES[E.id];
    let savedParams = null;
    selectExploration(E.id);
    if (overrides && currentInstance) {
      savedParams = {};
      for (const [k, v] of Object.entries(overrides)) {
        savedParams[k] = currentInstance.params[k];
        currentInstance.onParamChange(k, v);
      }
    }

    const wait = WORKER_EXPLORATIONS.has(E.id) ? 3000 : 2000;
    await new Promise(r => setTimeout(r, wait));
    currentInstance.render();
    const dataUrl = await captureCanvasThumbnail(canvas);

    if (savedParams && currentInstance) {
      for (const [k, v] of Object.entries(savedParams)) {
        currentInstance.onParamChange(k, v);
      }
    }

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
