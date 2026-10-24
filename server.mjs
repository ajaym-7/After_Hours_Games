import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleGenerateRequest } from './server/api.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon',
};

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;
  if (pathname === '/api/generate-session') return handleGenerateRequest(request, response);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end('Method not allowed');
    return;
  }
  const decoded = decodeURIComponent(pathname);
  const candidate = pathname === '/' ? path.join(dist, 'index.html') : path.resolve(dist, `.${decoded}`);
  if (pathname !== '/' && !candidate.startsWith(`${dist}${path.sep}`)) {
    response.writeHead(400).end('Bad request');
    return;
  }
  let file = candidate;
  try {
    if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html');
  } catch {
    file = path.join(dist, 'index.html');
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404).end('Build the app first with npm run build.');
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Drunk or Drama is ready on http://localhost:${port}`));
