// ===== 天山博客 Service Worker — 全站缓存 =====
// 首次访问缓存到本地，后续复用缓存，最小化流量

var CACHE_NAME = 'tianshan-v2';
var PRECACHE = [
  'index.html',
  'css/style.css',
  'js/main.js',
  'js/marked.min.js',
  'data.js',
  'fonts/Minecraft.ttf'
];

// 安装：预缓存核心文件
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // data.js：网络优先（文章数据经常更新）
  if (/\bdata\.js\b/.test(url)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // 其他一切（HTML / CSS / JS / 图片 / 字体 / 帧动画 / 音频）：缓存优先
  e.respondWith(cacheFirst(e.request));
});

function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (!response || response.status !== 200) return response;
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
      return response;
    });
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
