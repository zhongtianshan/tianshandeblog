// ===== 天山博客 Service Worker =====
// 帧动画：缓存优先（内容不变，省流量）
// CSS/JS/HTML/其他：网络优先（保证更新即时生效，没网时降级缓存）

var CACHE_NAME = 'tianshan-v3';

self.addEventListener('install', function(e) {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(self.clients.claim())
  );
});

self.addEventListener('fetch', function(e) {
  // 帧动画（855 张 JPG，永不变化）：缓存优先
  if (e.request.url.indexOf('/frames/') !== -1) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // 其他所有请求（CSS/JS/HTML/图片/数据/字体/音频）：网络优先
  e.respondWith(networkFirst(e.request));
});

function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetchAndCache(request);
  });
}

function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(request);
  });
}

function fetchAndCache(request) {
  return fetch(request).then(function(response) {
    if (!response || response.status !== 200) return response;
    var clone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
    return response;
  });
}
