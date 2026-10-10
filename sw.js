const C = 'bc-v1', A = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/db.js', 'js/ui.js', 'js/image.js', 'js/config.js', 'js/views/worker.js', 'js/views/teacher.js', 'js/views/director.js', 'js/views/dashboard.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(A))));
self.addEventListener('fetch', e => {
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
});
