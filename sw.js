// ===== 天山博客 Service Worker =====
// v7 — 缓存优先策略：首次完整加载后，后续访问几乎零流量
// CSS/JS/图片缓存优先（URL 版本号变则自动换缓存）
// data.js 缓存优先 + 后台静默更新
// HTML 网络优先（保证内容最新）

var CACHE_NAME = 'tianshan-v7';
var FRAME_CACHE = 'tianshan-frames-v7';

// ===== 极简 ZIP 解析器（仅 STORE 模式，不解压 JPEG） =====
var Zip = {
  // 读取中央目录，返回文件条目列表
  readDir: function(blob) {
    var size = blob.size;
    // 从末尾扫描 EOCD 签名 PK\x05\x06
    var end = size - 22;
    while (end >= 0) {
      var b = new Uint8Array(blob.slice(end, end + 4));
      if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x05 && b[3] === 0x06) break;
      end--;
    }
    if (end < 0) return [];

    var dv = new DataView(blob.slice(end, end + 22));
    var cdOffset = dv.getUint32(16, true);
    var cdEntries = dv.getUint16(10, true);
    var entries = [];

    for (var i = 0; i < cdEntries; i++) {
      var buf = blob.slice(cdOffset, cdOffset + 46);
      var cdv = new DataView(buf);
      if (cdv.getUint32(0, true) !== 0x02014b50) break;

      var method = cdv.getUint16(10, true);
      var compSize = cdv.getUint32(20, true);
      var nameLen = cdv.getUint16(28, true);
      var extraLen = cdv.getUint16(30, true);
      var localOffset = cdv.getUint32(42, true);

      var nameBytes = new Uint8Array(blob.slice(cdOffset + 46, cdOffset + 46 + nameLen));
      var name = new TextDecoder().decode(nameBytes);
      if (!name.endsWith('.jpg')) { cdOffset += 46 + nameLen + extraLen + cdv.getUint16(32, true); continue; }

      // 读 local header 获取文件数据偏移
      var lbuf = blob.slice(localOffset, localOffset + 30);
      var ldv = new DataView(lbuf);
      var lNameLen = ldv.getUint16(26, true);
      var lExtraLen = ldv.getUint16(28, true);
      var dataOff = localOffset + 30 + lNameLen + lExtraLen;

      entries.push({ name: name, offset: dataOff, size: compSize, method: method });
      cdOffset += 46 + nameLen + extraLen + cdv.getUint16(32, true);
    }
    return entries;
  },

  // 提取某个条目为 Blob
  extract: function(blob, entry) {
    return blob.slice(entry.offset, entry.offset + entry.size, 'image/jpeg');
  }
};

// ===== 安装：下载 ZIP + 解压到缓存 =====
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(FRAME_CACHE).then(function(cache) {
      return fetch('frames/frames.zip', { priority: 'low' }).then(function(res) {
        if (!res || res.status !== 200) throw new Error('zip not found');
        return res.blob();
      }).then(function(blob) {
        var entries = Zip.readDir(blob);
        var chain = Promise.resolve();
        entries.forEach(function(entry) {
          chain = chain.then(function() {
            var data = Zip.extract(blob, entry);
            return cache.put('frames/' + entry.name, new Response(data, {
              headers: { 'Content-Type': 'image/jpeg' }
            }));
          });
        });
        return chain;
      }).catch(function() {
        // ZIP 下载失败不打紧，走逐个加载
      });
    }).then(self.skipWaiting())
  );
});

// ===== 激活：清理旧缓存 =====
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME && k !== FRAME_CACHE) return caches.delete(k);
      }));
    }).then(self.clients.claim())
  );
});

// ===== 缓存策略函数 =====

// 缓存优先：有缓存直接返回，无缓存走网络并缓存
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(res) {
      if (!res || res.status !== 200) return res;
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(request, clone); });
      return res;
    });
  });
}

// 缓存优先 + 后台更新：立即返回缓存，网络返回后更新缓存
function staleWhileRevalidate(request) {
  var fetchPromise = fetch(request).then(function(res) {
    if (res && res.status === 200) {
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(request, clone); });
    }
    return res;
  }).catch(function() { return null; });

  return caches.match(request).then(function(cached) {
    // 有缓存立即返回，无缓存等网络
    return cached || fetchPromise;
  });
}

// 网络优先：先走网络，失败时用缓存
function networkFirst(request) {
  return fetch(request).then(function(res) {
    if (res && res.status === 200) {
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(request, clone); });
    }
    return res;
  }).catch(function() {
    return caches.match(request);
  });
}

// ===== 请求拦截 =====
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // 帧动画：缓存优先（ZIP 提取的）
  if (url.indexOf('/frames/') !== -1) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // 背景音乐：缓存优先（永不变更）
  if (url.indexOf('/audio/') !== -1) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // 字体/图标/光标：缓存优先（永不变更）
  if (/\/fonts\/|\/ICO\/|\/cursors\//.test(url)) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // CSS/JS/图片（含版本号 ?v=xxx）：缓存优先
  // URL 带版本号，新部署时版本号变 → 自动请求新文件
  if (/\.(css|js|png|jpg|jpeg|svg|webp)(\?|$)/.test(url)) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // data.js：立即从缓存渲染，后台静默更新
  if (/\bdata\.js\b/.test(url)) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // HTML 导航：网络优先，保证内容最新
  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // 其他：网络优先
  e.respondWith(networkFirst(e.request));
});
