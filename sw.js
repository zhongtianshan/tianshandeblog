// ===== 天山博客 Service Worker =====
// 帧动画 ZIP 整包缓存 + CSS/JS/HTML 网络优先

var CACHE_NAME = 'tianshan-v4';
var FRAME_CACHE = 'tianshan-frames-v4';

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

// ===== 请求拦截 =====
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // 帧动画：缓存优先（ZIP 提取的）
  if (url.indexOf('/frames/') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(res) {
          if (!res || res.status !== 200) return res;
          var clone = res.clone();
          caches.open(FRAME_CACHE).then(function(c) { c.put(e.request, clone); });
          return res;
        });
      })
    );
    return;
  }

  // data.js：网络优先（文章数据经常更新）
  if (/\bdata\.js\b/.test(url)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // 其他：网络优先
  e.respondWith(networkFirst(e.request));
});

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
