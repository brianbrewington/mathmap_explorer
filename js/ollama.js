const OLLAMA_BASE = '/ollama';

let tagsPromise = null;
let cachedTags = undefined;

/**
 * Single shared request for Ollama's model list.
 * Routed through the dev server's reverse proxy to avoid CORS.
 * Returns { models: [...] } or null if Ollama is unreachable.
 */
export function fetchOllamaTags() {
  if (cachedTags !== undefined) return Promise.resolve(cachedTags);
  if (tagsPromise) return tagsPromise;

  tagsPromise = fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) })
    .then(resp => {
      if (!resp.ok) { cachedTags = null; return null; }
      return resp.json();
    })
    .then(data => { cachedTags = data; return data; })
    .catch(() => { cachedTags = null; return null; });

  return tagsPromise;
}

export function getOllamaUrl() {
  return OLLAMA_BASE;
}
