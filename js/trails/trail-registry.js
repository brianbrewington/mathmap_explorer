const trails = [];
let activeTrail = null;
let activeStepIndex = -1;
const listeners = [];

export function registerTrail(trail) {
  if (!trail.id || !trail.steps || !trail.steps.length) return;
  if (trails.some(t => t.id === trail.id)) return;
  trails.push(trail);
}

export function getAllTrails() { return trails; }

export function getTrailById(id) { return trails.find(t => t.id === id) || null; }

export function startTrail(trailId) {
  const trail = getTrailById(trailId);
  if (!trail) return null;
  activeTrail = trail;
  activeStepIndex = 0;
  _notify();
  return getCurrentStep();
}

export function nextStep() {
  if (!activeTrail) return null;
  if (activeStepIndex < activeTrail.steps.length - 1) {
    activeStepIndex++;
    _notify();
    return getCurrentStep();
  }
  return null;
}

export function prevStep() {
  if (!activeTrail) return null;
  if (activeStepIndex > 0) {
    activeStepIndex--;
    _notify();
    return getCurrentStep();
  }
  return null;
}

export function getCurrentStep() {
  if (!activeTrail || activeStepIndex < 0) return null;
  return {
    trail: activeTrail,
    stepIndex: activeStepIndex,
    step: activeTrail.steps[activeStepIndex],
    isFirst: activeStepIndex === 0,
    isLast: activeStepIndex === activeTrail.steps.length - 1,
    progress: `${activeStepIndex + 1} / ${activeTrail.steps.length}`,
  };
}

export function exitTrail() {
  activeTrail = null;
  activeStepIndex = -1;
  _notify();
}

export function isTrailActive() { return activeTrail !== null; }

export function onTrailChange(fn) { listeners.push(fn); }

function _notify() {
  const state = getCurrentStep();
  for (const fn of listeners) fn(state);
}
