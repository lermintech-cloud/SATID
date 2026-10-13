const C = 'bc-v7', A = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/db.js', 'js/ui.js', 'js/install.js', 'js/queue.js', 'js/icons.js', 'js/image.js', 'js/config.js', 'js/me.js', 'js/lists.js', 'js/notify.js', 'js/views/worker.js', 'js/views/teacher.js', 'js/views/director.js', 'js/views/dashboard.js', 'js/views/today.js', 'js/views/profile.js', 'js/views/settings.js', 'manifest.webmanifest', 'img/logo-v2.webp', 'img/icon-192.png'];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => Promise.all(A.map(u => c.add(u).catch(() => {}))))); });
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin) { // ไลบรารี/ฟอนต์จาก CDN: เก็บไว้ใช้ตอนออฟไลน์ (cache-first)
    if (CDN.includes(u.host)) e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); return r; })));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
});
