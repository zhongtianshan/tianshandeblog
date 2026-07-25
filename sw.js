// ===== 博客帧动画缓存 Service Worker =====
// 缓存 855 张帧动画到用户设备，后续访问直接从缓存加载

var CACHE_NAME = 'tianshan-frames-v1';
var FRAME_PATTERN = '/frames/';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
  // 只拦截帧动画图片请求
  if (event.request.url.indexOf(FRAME_PATTERN) === -1) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      return fetch(event.request).then(function(response) {
        // 只缓存成功的响应
        if (!response || response.status !== 200) return response;

        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
