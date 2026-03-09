import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = parseInt(process.env.PORT || '8080', 10);
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const ROOT = resolve(fileURLToPath(import.meta.url), '..');
const HEROES_DIR = join(ROOT, 'heroes');

let heroesComplete = false;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico':  'image/x-icon',
  '.wasm': 'application/wasm',
  '.md':   'text/plain; charset=utf-8',
};

function serveStatic(res, filePath) {
  const ext = extname(filePath);
  return readFile(filePath)
    .then(data => {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    })
    .catch(() => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });
}

function proxyToOllama(req, res) {
  const ollamaPath = req.url.replace(/^\/ollama/, '');
  const url = new URL(ollamaPath, OLLAMA_HOST);

  const proxyReq = httpRequest(url, {
    method: req.method,
    headers: {
      ...req.headers,
      host: url.host,
    },
  }, proxyRes => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Ollama is not running. Start it with: ollama serve' }));
  });

  req.pipe(proxyReq);
}

function collectJSON(req, res, handler) {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', async () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      await handler(body);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  // Proxy Ollama API requests
  if (pathname.startsWith('/ollama/')) {
    proxyToOllama(req, res);
    return;
  }

  // Hero image API (used by ?generate-heroes and snapshot saves)
  if (pathname === '/api/save-hero' && req.method === 'POST') {
    collectJSON(req, res, async ({ id, dataUrl }) => {
      const dir = join(HEROES_DIR, id);
      await mkdir(dir, { recursive: true });
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      await writeFile(join(dir, 'hero.webp'), Buffer.from(base64, 'base64'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (pathname === '/api/save-snapshot-image' && req.method === 'POST') {
    collectJSON(req, res, async ({ id, name, dataUrl }) => {
      const dir = join(HEROES_DIR, id, 'saved');
      await mkdir(dir, { recursive: true });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      await writeFile(join(dir, `${slug}.webp`), Buffer.from(base64, 'base64'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: `/heroes/${id}/saved/${slug}.webp` }));
    });
    return;
  }

  if (pathname === '/api/heroes-complete' && req.method === 'POST') {
    heroesComplete = true;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === '/api/heroes-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ complete: heroesComplete }));
    return;
  }

  // Static file serving
  let filePath = join(ROOT, pathname === '/' ? 'index.html' : pathname);

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
  } catch { /* fall through to serveStatic's 404 */ }

  // Block path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  await serveStatic(res, filePath);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Error: port ${PORT} is already in use.\n  Try: PORT=<other> make serve\n`);
  } else {
    console.error(`\n  Server error: ${err.message}\n`);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n  MathMap Explorer running at  http://localhost:${PORT}`);
  console.log(`  Ollama proxy             /ollama/ → ${OLLAMA_HOST}`);
  console.log(`  Press Ctrl+C to stop\n`);
});
