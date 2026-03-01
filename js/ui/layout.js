export function setupCanvasResize(canvas, onResize) {
  const container = canvas.parentElement;
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      onResize(canvas.width, canvas.height);
    }
  });
  observer.observe(container);
  return observer;
}
