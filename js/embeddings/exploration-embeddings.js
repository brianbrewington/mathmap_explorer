import { getAll } from '../explorations/registry.js';
import { fetchOllamaTags, getOllamaUrl } from '../ollama.js';

const DB_NAME = 'ifs-embeddings';
const STORE_NAME = 'vectors';
const DB_VERSION = 1;
const MODEL = 'embeddinggemma';

let dbPromise = null;
let embeddingCache = {};
let available = null;

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

async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function hashText(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function buildMetadataText(E) {
  const parts = [
    E.title,
    E.description || '',
    E.category || '',
    (E.tags || []).join(', '),
    E.formulaShort || '',
    stripHtml(E.tutorial || '')
  ];
  return parts.filter(Boolean).join('. ');
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function isOllamaAvailable() {
  if (available !== null) return available;
  const data = await fetchOllamaTags();
  if (!data) { available = false; return false; }
  const models = (data.models || []).map(m => m.name?.split(':')[0]);
  available = models.includes(MODEL);
  return available;
}

async function fetchEmbedding(text) {
  const resp = await fetch(`${getOllamaUrl()}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: text })
  });
  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
  const data = await resp.json();
  return data.embedding;
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

export async function embedAllExplorations() {
  if (!(await isOllamaAvailable())) return false;

  const explorations = getAll();
  for (const E of explorations) {
    const text = buildMetadataText(E);
    const hash = hashText(text);
    const cacheKey = `${E.id}__${hash}`;

    const cached = await dbGet(cacheKey);
    if (cached) {
      embeddingCache[E.id] = cached;
      continue;
    }

    try {
      const vec = await fetchEmbedding(text);
      embeddingCache[E.id] = vec;
      await dbPut(cacheKey, vec);
    } catch {
      // Skip this exploration, try the rest
    }
  }
  return true;
}

export function getRelatedExplorations(id, topN = 3) {
  const sourceVec = embeddingCache[id];
  if (!sourceVec) return [];

  const explorations = getAll();
  const scored = [];

  for (const E of explorations) {
    if (E.id === id) continue;
    const vec = embeddingCache[E.id];
    if (!vec) continue;
    scored.push({ id: E.id, title: E.title, description: E.description, similarity: cosineSimilarity(sourceVec, vec) });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topN);
}

export function hasEmbeddings() {
  return Object.keys(embeddingCache).length > 0;
}

export { cosineSimilarity, hashText, buildMetadataText };
