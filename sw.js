// Service worker do PACO: guarda o app no aparelho para abrir sem internet.
const VERSION = 'paco-1.1.0';
const FONTS = 'paco-fonts';
const SHELL = [
  './', 'index.html', 'css/app.css', 'config.js', 'manifest.webmanifest',
  'js/app.js', 'js/store.js', 'js/supa.js', 'js/program.js', 'js/util.js', 'js/charts.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(swr(req, VERSION));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(swr(req, FONTS));
  // Supabase, YouTube e o resto passam direto pela rede.
});

async function swr(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (hit) { net.catch(() => {}); return hit; }
  const res = await net;
  if (res) return res;
  if (req.mode === 'navigate') {
    const shell = await cache.match('index.html') || await cache.match('./');
    if (shell) return shell;
  }
  return new Response('', { status: 504, statusText: 'Offline' });
}
