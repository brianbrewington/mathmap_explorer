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
    req.onerror = () => reject(req.error);
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
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);
  const blob = await oc.convertToBlob({ type: 'image/webp', quality: 0.7 });
  return blobToDataUrl(blob);
}

export async function getHeroImage(id) {
  try {
    return await getFromDB(id);
  } catch { return null; }
}

export async function captureHeroImage(canvas, id) {
  try {
    const dataUrl = await captureCanvasThumbnail(canvas);
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
