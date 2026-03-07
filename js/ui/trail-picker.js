import { getAllTrails, startTrail, nextStep, prevStep, getCurrentStep, exitTrail, isTrailActive, onTrailChange } from '../trails/trail-registry.js';

let trailNavEl = null;
let onNavigate = null;

export function initTrailPicker(infoPanel, navigateCallback) {
  onNavigate = navigateCallback;
  onTrailChange(_updateTrailNav);
}

export function buildTrailList() {
  const trails = getAllTrails();
  if (!trails.length) return '';
  let html = '<div class="trail-picker"><h4>Learning Paths</h4><div class="trail-list">';
  for (const trail of trails) {
    html += `<button class="trail-btn" data-trail-id="${trail.id}">
      <span class="trail-title">${trail.title}</span>
      <span class="trail-desc">${trail.description}</span>
      <span class="trail-steps">${trail.steps.length} steps</span>
    </button>`;
  }
  html += '</div></div>';
  return html;
}

export function attachTrailListeners(container) {
  if (!container) return;
  const btns = container.querySelectorAll('.trail-btn');
  for (const btn of btns) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.trailId;
      const step = startTrail(id);
      if (step && onNavigate) {
        onNavigate(step.step.explorationId, step.step.params);
      }
    });
  }
}

export function buildTrailNav() {
  const state = getCurrentStep();
  if (!state) return '';

  const { trail, step, isFirst, isLast, progress } = state;
  let html = `<div class="trail-nav">
    <div class="trail-nav-header">
      <span class="trail-nav-title">\uD83D\uDEB6 ${trail.title}</span>
      <span class="trail-nav-progress">${progress}</span>
      <button class="trail-exit-btn" title="Exit trail">\u2715</button>
    </div>`;

  if (step.narrativeCallback) {
    html += `<p class="trail-narrative">${step.narrativeCallback}</p>`;
  }

  html += '<div class="trail-nav-buttons">';
  if (!isFirst) {
    html += `<button class="trail-prev-btn">\u2190 Previous</button>`;
  }
  if (!isLast) {
    const nextIdx = state.stepIndex + 1;
    const nextStepData = trail.steps[nextIdx];
    html += `<button class="trail-next-btn">Next: ${nextStepData.teaser || nextStepData.explorationId} \u2192</button>`;
  } else {
    html += `<span class="trail-complete">Trail complete!</span>`;
  }
  html += '</div></div>';
  return html;
}

export function attachTrailNavListeners(container) {
  if (!container) return;
  const nextBtn = container.querySelector('.trail-next-btn');
  const prevBtn = container.querySelector('.trail-prev-btn');
  const exitBtn = container.querySelector('.trail-exit-btn');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const state = nextStep();
      if (state && onNavigate) {
        onNavigate(state.step.explorationId, state.step.params);
      }
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const state = prevStep();
      if (state && onNavigate) {
        onNavigate(state.step.explorationId, state.step.params);
      }
    });
  }
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      exitTrail();
      if (onNavigate) onNavigate(null, null);
    });
  }
}

function _updateTrailNav() {}
