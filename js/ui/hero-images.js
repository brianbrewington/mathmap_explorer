const DB_NAME = 'ifs-hero-images';
const STORE_NAME = 'thumbnails';
const DB_VERSION = 1;
const THUMB_SIZE = 256;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function getFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function putToDB(id, dataUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Pure canvas-to-dataURL capture. No DB writes.
 * Usable for hero images, snapshot thumbnails, or anything else.
 */
export async function captureCanvasThumbnail(canvas, size = THUMB_SIZE) {
  const oc = new OffscreenCanvas(size, size);
  const ctx = oc.getContext('2d');
  const sw = canvas.width, sh = canvas.height;
  const cropSize = Math.min(sw, sh);
  const sx = (sw - cropSize) / 2;
  const sy = (sh - cropSize) / 2;
  ctx.drawImage(canvas, sx, sy, cropSize, cropSize, 0, 0, size, size);
  const blob = await oc.convertToBlob({ type: 'image/webp', quality: 0.7 });
  return blobToDataUrl(blob);
}

function isCanvasBlank(canvas) {
  try {
    const oc = new OffscreenCanvas(16, 16);
    const ctx = oc.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 16, 16);
    const { data } = ctx.getImageData(0, 0, 16, 16);
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 15 || data[i + 1] > 15 || data[i + 2] > 15) {
        if (++bright > 10) return false;
      }
    }
    return true;
  } catch { return false; }
}

async function isBlankDataUrl(dataUrl) {
  if (!dataUrl) return true;
  if (!dataUrl.startsWith('data:')) return false;
  try {
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    const bmp = await createImageBitmap(blob);
    const oc = new OffscreenCanvas(16, 16);
    const ctx = oc.getContext('2d');
    ctx.drawImage(bmp, 0, 0, 16, 16);
    bmp.close();
    const { data } = ctx.getImageData(0, 0, 16, 16);
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 15 || data[i + 1] > 15 || data[i + 2] > 15) {
        if (++bright > 10) return false;
      }
    }
    return true;
  } catch { return true; }
}

/**
 * Returns true if a non-blank hero image exists for this exploration.
 */
export async function hasRealHero(id) {
  const hero = await getHeroImage(id);
  if (!hero) return false;
  return !(await isBlankDataUrl(hero));
}

export async function getHeroImage(id) {
  try {
    return await getFromDB(id);
  } catch { return null; }
}

/**
 * Capture the canvas as a hero image, but reject blank/black canvases.
 */
export async function captureHeroImage(canvas, id) {
  try {
    if (isCanvasBlank(canvas)) return null;
    const dataUrl = await captureCanvasThumbnail(canvas);
    await putToDB(id, dataUrl);
    return dataUrl;
  } catch { return null; }
}

/**
 * Set hero image directly from a data URL (e.g. from a saved snapshot thumbnail).
 */
export async function setHeroImage(id, dataUrl) {
  try {
    await putToDB(id, dataUrl);
    return dataUrl;
  } catch { return null; }
}

async function getStaticHero(id) {
  try {
    const url = `/heroes/${id}/hero.webp`;
    const resp = await fetch(url, { method: 'HEAD' });
    return resp.ok ? url : null;
  } catch { return null; }
}

export async function getAllHeroImages(ids) {
  const result = {};
  await Promise.all(ids.map(async id => {
    const dbHero = await getHeroImage(id);
    if (dbHero) { result[id] = dbHero; return; }
    const staticHero = await getStaticHero(id);
    if (staticHero) result[id] = staticHero;
  }));
  return result;
}
