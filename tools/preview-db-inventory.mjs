// Local-only UI fixture. No upstream requests, production records, or payments.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const seller = { sellerId: 'preview', status: 'approved', channel: 'LG전자', branch: '강남점', branchRegion: '서울', manager: '테스트 매니저', consent: true };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const route = url.pathname.slice(5);
      let data = { ok: true, rows: [] };
      if (route === 'seller-login') data = { ok: true, row: seller, sessionToken: 'preview-local-session' };
      if (route === 'seller-session') data = { ok: true, lastActivityAt: new Date().toISOString() };
      if (route === 'approved-sellers') data.rows = [seller];
      if (route === 'lead-availability') data = { ok: true, availableCount: 0, waitingCount: 20, assignedCount: process.argv.includes('--paid') ? 2 : 0, unassignedCount: process.argv.includes('--paid') ? 3 : 0, hasPurchased: process.argv.includes('--paid'), checkedAt: new Date().toISOString() };
      if (route === 'lead-payments') data = { ok: true, access: false, remaining: 0, ready: false };
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(data)); return;
    }
    const route = url.pathname === '/' ? '/seller/index.html' : url.pathname === '/register' ? '/seller/register/index.html' : url.pathname === '/db-checkout' ? '/db-checkout/index.html' : url.pathname;
    const file = resolve(root, '.' + decodeURIComponent(route));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    let bytes = await readFile(file);
    if (extname(file) === '.html') bytes = bytes.toString().replace('<title>', '<title>로컬 테스트 · ');
    // Exercise the touch-only styles in a desktop test browser without changing production CSS.
    if (process.argv.includes('--touch') && extname(file) === '.css') bytes = bytes.toString()
      .replaceAll('(hover: hover) and (pointer: fine)', '(min-width: 1101px)')
      .replaceAll('(max-width: 760px) and (pointer: coarse)', '(max-width: 760px)');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1', () => console.log(`Local inventory fixture: http://127.0.0.1:${server.address().port}`));
