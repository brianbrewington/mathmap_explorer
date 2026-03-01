import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock IndexedDB — always returns null (no user overrides)
const idbStore = {};
vi.stubGlobal('indexedDB', {
  open: () => {
    const store = {
      get: (key) => {
        const req = { onsuccess: null, onerror: null, result: idbStore[key] ?? null };
        setTimeout(() => req.onsuccess?.());
        return req;
      },
      put: (value, key) => {
        idbStore[key] = value;
        const req = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.());
        return req;
      }
    };
    const db = {
      createObjectStore: () => store,
      transaction: () => ({
        objectStore: () => store,
        oncomplete: null,
        onerror: null
      })
    };
    const req = { onupgradeneeded: null, onsuccess: null, onerror: null, result: db };
    setTimeout(() => {
      req.onupgradeneeded?.();
      req.onsuccess?.();
    });
    return req;
  }
});

// Mock FileReader for blobToDataUrl
vi.stubGlobal('FileReader', class {
  readAsDataURL() {
    setTimeout(() => this.onload?.());
  }
  get result() { return 'data:image/webp;base64,AAAA'; }
});

// Mock OffscreenCanvas for captureCanvasThumbnail
vi.stubGlobal('OffscreenCanvas', class {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext() {
    return { drawImage: () => {} };
  }
  convertToBlob() { return Promise.resolve(new Blob(['fake'])); }
});

let fetchMock;

beforeEach(() => {
  for (const k in idbStore) delete idbStore[k];
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

const { getAllHeroImages, getHeroImage, captureHeroImage, captureCanvasThumbnail } = await import('../js/ui/hero-images.js');

describe('getAllHeroImages', () => {
  it('returns static hero URL when no IndexedDB entry exists and static file is found', async () => {
    fetchMock.mockImplementation((url, opts) => {
      if (opts?.method === 'HEAD' && url === '/heroes/mandelbrot/hero.webp') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false });
    });

    const result = await getAllHeroImages(['mandelbrot']);
    expect(result.mandelbrot).toBe('/heroes/mandelbrot/hero.webp');
  });

  it('returns null for explorations with no static file and no IndexedDB entry', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    const result = await getAllHeroImages(['nonexistent']);
    expect(result.nonexistent).toBeUndefined();
  });

  it('prefers IndexedDB (user override) over static file', async () => {
    idbStore['custom-saved'] = 'data:image/webp;base64,USERDATA';
    fetchMock.mockResolvedValue({ ok: true });

    const result = await getAllHeroImages(['custom-saved']);
    expect(result['custom-saved']).toBe('data:image/webp;base64,USERDATA');
  });

  it('handles multiple explorations in parallel', async () => {
    idbStore['a'] = 'data:image/webp;base64,A';
    fetchMock.mockImplementation((url) => {
      if (url === '/heroes/b/hero.webp') return Promise.resolve({ ok: true });
      return Promise.resolve({ ok: false });
    });

    const result = await getAllHeroImages(['a', 'b', 'c']);
    expect(result.a).toBe('data:image/webp;base64,A');
    expect(result.b).toBe('/heroes/b/hero.webp');
    expect(result.c).toBeUndefined();
  });

  it('handles fetch errors gracefully', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));

    const result = await getAllHeroImages(['broken']);
    expect(result.broken).toBeUndefined();
  });
});

describe('captureCanvasThumbnail', () => {
  it('returns a data URL string', async () => {
    const fakeCanvas = { width: 800, height: 600 };
    const result = await captureCanvasThumbnail(fakeCanvas);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^data:image/);
  });
});
