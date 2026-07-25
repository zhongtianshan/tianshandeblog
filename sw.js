// ===== Service Worker v8 — 缓存优先 =====
// 帧动画由页面 JS 直接解析 ZIP，SW 只做缓存加速

var CACHE = 'tianshan-v8';

self.addEventListener('install', function(e) {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(self.clients.claim())
  );
});

function cacheFirst(r) {
  return caches.match(r).then(function(c) { return c || fetch(r).then(function(res) {
    if (res && res.status === 200) { var cl = res.clone(); caches.open(CACHE).then(function(ca) { ca.put(r, cl); }); }
    return res;
  }); });
}

function staleWhileRevalidate(r) {
  var net = fetch(r).then(function(res) {
    if (res && res.status === 200) { var cl = res.clone(); caches.open(CACHE).then(function(ca) { ca.put(r, cl); }); }
    return res;
  }).catch(function() { return null; });
  return caches.match(r).then(function(c) { return c || net; });
}

function networkFirst(r) {
  return fetch(r).catch(function() { return caches.match(r); });
}

self.addEventListener('fetch', function(e) {
  var u = e.request.url;

  // 帧动画、音乐、字体、图标、光标、CSS/JS/图片 → 缓存优先
  if (/\/frames\/|\/audio\/|\/fonts\/|\/ICO\/|\/cursors\/|\.(css|js|png|jpg|jpeg|svg|webp)(\?|$)/.test(u)) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // data.js → 缓存优先 + 后台更新
  if (/\bdata\.js\b/.test(u)) { e.respondWith(staleWhileRevalidate(e.request)); return; }

  // HTML → 网络优先
  if (e.request.mode === 'navigate') { e.respondWith(networkFirst(e.request)); return; }

  e.respondWith(networkFirst(e.request));
});
