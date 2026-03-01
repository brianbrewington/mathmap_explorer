/**
 * Adds mouse-driven pan (drag) and zoom (scroll) to a canvas.
 * Returns a cleanup function to remove all listeners.
 *
 * callbacks:
 *   getBounds()  → { xMin, xMax, yMin, yMax }
 *   setBounds({ xMin, xMax, yMin, yMax })
 *   onUpdate()   — called after bounds change (debounce externally if needed)
 */
export function setupPanZoom(canvas, callbacks) {
  let isDragging = false;
  let dragStart = null;
  let boundsStart = null;

  const onWheel = (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;

    const { xMin, xMax, yMin, yMax } = callbacks.getBounds();

    // Mouse position in world coordinates (y flipped: top = yMax)
    const wx = xMin + mx * (xMax - xMin);
    const wy = yMax - my * (yMax - yMin);

    const factor = e.deltaY > 0 ? 1.1 : 0.9;

    callbacks.setBounds({
      xMin: wx - (wx - xMin) * factor,
      xMax: wx + (xMax - wx) * factor,
      yMin: wy - (wy - yMin) * factor,
      yMax: wy + (yMax - wy) * factor
    });
    callbacks.onUpdate();
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    boundsStart = { ...callbacks.getBounds() };
    canvas.style.cursor = 'grabbing';
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - dragStart.x) / rect.width;
    const dy = (e.clientY - dragStart.y) / rect.height;

    const { xMin, xMax, yMin, yMax } = boundsStart;
    const xShift = dx * (xMax - xMin);
    const yShift = dy * (yMax - yMin);

    callbacks.setBounds({
      xMin: xMin - xShift,
      xMax: xMax - xShift,
      yMin: yMin - yShift,
      yMax: yMax - yShift
    });
    callbacks.onUpdate();
  };

  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = '';
    }
  };

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}
