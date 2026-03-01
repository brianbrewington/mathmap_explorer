let overlay = null;
let img = null;

function ensureModal() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.className = 'image-modal-overlay';

  img = document.createElement('img');
  img.className = 'image-modal-img';
  overlay.appendChild(img);

  document.body.appendChild(overlay);

  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function close() {
  if (overlay) overlay.classList.remove('open');
}

/**
 * Open a full-screen modal showing the image at the given URL.
 * Accepts a direct URL or a CSS background-image value like `url(...)`.
 */
export function openImageModal(src) {
  if (!src) return;
  ensureModal();

  const match = src.match(/^url\(["']?(.+?)["']?\)$/);
  img.src = match ? match[1] : src;

  requestAnimationFrame(() => overlay.classList.add('open'));
}
