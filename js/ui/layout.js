export function setupCanvasResize(canvas, onResize) {
  const container = canvas.parentElement;
  const observer = new ResizeObserver(entries => {
    const currentCanvas = container.querySelector('canvas');
    if (!currentCanvas) return;
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      currentCanvas.width = Math.floor(width * dpr);
      currentCanvas.height = Math.floor(height * dpr);
      onResize(currentCanvas.width, currentCanvas.height);
    }
  });
  observer.observe(container);
  return observer;
}
