const HISTORY_KEY = 'ifs-visit-history';
const LAST_EXPLORATION_KEY = 'ifs-last-exploration';
const DB_NAME = 'ifs-user-data';
const STORE_NOTES = 'notes';
const STORE_SNAPSHOTS = 'snapshots';
const DB_VERSION = 1;
const MAX_HISTORY = 50;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) db.createObjectStore(STORE_NOTES);
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) db.createObjectStore(STORE_SNAPSHOTS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Last Exploration ---

export function getLastExploration() {
  try { return localStorage.getItem(LAST_EXPLORATION_KEY); }
  catch { return null; }
}

export function setLastExploration(id) {
  try { localStorage.setItem(LAST_EXPLORATION_KEY, id); }
  catch { /* localStorage unavailable */ }
}

// --- Visit History ---

export function recordVisit(id) {
  try {
    const history = getVisitHistory();
    const entry = { id, timestamp: Date.now() };
    const filtered = history.filter(h => h.id !== id);
    filtered.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
  } catch { /* localStorage full or unavailable */ }
}

export function getVisitHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

export function getRecentlyVisited(limit = 5) {
  return getVisitHistory().slice(0, limit);
}

export function hasVisited(id) {
  return getVisitHistory().some(h => h.id === id);
}

// --- Notes ---

export async function getNote(explorationId) {
  try {
    return await dbGet(STORE_NOTES, explorationId);
  } catch { return null; }
}

export async function saveNote(explorationId, text) {
  const note = { text, updatedAt: Date.now() };
  await dbPut(STORE_NOTES, explorationId, note);
  return note;
}

// --- Parameter Snapshots ---

export async function getSnapshots(explorationId) {
  try {
    return (await dbGet(STORE_SNAPSHOTS, explorationId)) || [];
  } catch { return []; }
}

export async function saveSnapshot(explorationId, name, params, thumbnail = null) {
  const snapshots = await getSnapshots(explorationId);
  snapshots.push({ name, params: { ...params }, savedAt: Date.now(), thumbnail });
  await dbPut(STORE_SNAPSHOTS, explorationId, snapshots);
  return snapshots;
}

export async function deleteSnapshot(explorationId, index) {
  const snapshots = await getSnapshots(explorationId);
  snapshots.splice(index, 1);
  await dbPut(STORE_SNAPSHOTS, explorationId, snapshots);
  return snapshots;
}
