// ===== 工具函数 =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 全局跟踪所有内联音频，确保彻底销毁
var _inlineAudios = [];
// 记录背景音乐被文章音频暂停前的状态
var _bgSavedState = { wasPlaying: false };

function createAudioPlayer(filename) {
  var container = document.createElement('div');
  container.className = 'audio-player';

  var audio = document.createElement('audio');
  audio.src = 'yinpin/' + filename;
  audio.preload = 'auto';
  audio.load();
  _inlineAudios.push(audio);

  function resumeBg() {
    if (_bgSavedState.wasPlaying) {
      if (typeof _playWasm === 'function') {
        _playWasm(_bgSavedState.currentTime || 0);
      }
      _bgSavedState.wasPlaying = false;
    }
  }

  var btn = document.createElement('span');
  btn.className = 'ap-btn';
  btn.textContent = '▶';
  btn.onclick = function(e) {
    if (e) e.stopPropagation();
    if (audio.paused) {
      // 先更新按钮状态，再处理背景音乐（避免 musicBtn 问题卡住）
      btn.textContent = '⏸';
      // 暂停背景音乐
      if (typeof _stopWasm === 'function' && musicPlaying) {
        _bgSavedState.wasPlaying = true;
        _bgSavedState.currentTime = _source ? (_ctx.currentTime || 0) - _startTime : (_fallbackAudio.currentTime || 0);
        _pauseTime = _bgSavedState.currentTime;
        _stopWasm();
        if (typeof _fallbackAudio !== 'undefined') _fallbackAudio.pause();
        if (musicBtn) { musicBtn.textContent = '♪'; musicBtn.classList.remove('on'); }
      }
      var promise = audio.play();
      if (promise) {
        promise.catch(function() {
          btn.textContent = '▶';
        });
      }
    } else {
      audio.pause();
      btn.textContent = '▶';
      resumeBg();
    }
  };

  var bar = document.createElement('div');
  bar.className = 'ap-bar';

  var progress = document.createElement('div');
  progress.className = 'ap-progress';

  var timeEl = document.createElement('span');
  timeEl.className = 'ap-time';
  timeEl.textContent = '0:00 / --:--';

  var nameEl = document.createElement('span');
  nameEl.className = 'ap-name';
  nameEl.textContent = filename;

  bar.appendChild(progress);
  container.appendChild(btn);
  container.appendChild(bar);
  container.appendChild(nameEl);
  container.appendChild(timeEl);

  // 加载完成后显示总时长
  audio.addEventListener('loadedmetadata', function() {
    timeEl.textContent = '0:00 / ' + formatTime(audio.duration);
  });

  // 更新时间
  audio.addEventListener('timeupdate', function() {
    var pct = (audio.currentTime / (audio.duration || 1)) * 100;
    progress.style.width = pct + '%';
    if (audio.duration) {
      timeEl.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    }
  });

  // 点击进度条跳转
  bar.addEventListener('click', function(e) {
    var rect = bar.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * (audio.duration || 0);
  });

  // 播放结束
  audio.addEventListener('ended', function() {
    btn.textContent = '▶';
    progress.style.width = '0%';
    timeEl.textContent = '0:00 / ' + formatTime(audio.duration || 0);
    resumeBg();
  });

  return container;
}

function formatTime(s) {
  var m = Math.floor(s / 60);
  var sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// ===== 初始化 =====
function init() {
  if (!blogData || blogData.posts.length === 0) {
    document.getElementById('status').innerHTML = `
      <span style="color:var(--text-dim);">还没有文章</span>
    `;
  } else {
    document.getElementById('status').style.display = 'none';
    renderPostList();
  }

  renderTags();
  renderGallery();
}

// ===== 渲染文章列表 =====
function renderPostList() {
  const container = document.getElementById('post-list');

  blogData.posts.forEach((post, index) => {
    const card = document.createElement('div');
    card.className = 'post-card scroll-hidden';
    card.style.setProperty('--delay', (index * 0.1) + 's');
    card.onclick = () => showPost(index, card);

    card.innerHTML = `
      <span class="post-number">#${String(blogData.posts.length - index).padStart(2, '0')}</span>
      <h2>${escapeHtml(post.title)}</h2>
      <div class="meta">
        ${post.date}
        ${post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}
      </div>
      <div class="preview">${escapeHtml(post.preview)}</div>
    `;
    container.appendChild(card);
  });

  observePostCards();
}

// ===== 代码雨过渡动画 =====
function showCodeRain(opts) {
  opts = opts || {};
  var duration = opts.duration || 1200;
  var callback = opts.callback || function(){};

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;z-index:999;top:0;left:0;width:100vw;height:100vh;background:#0a0a0f';

  var canvas = document.createElement('canvas');
  overlay.appendChild(canvas);
  document.body.appendChild(overlay);

  var ctx = canvas.getContext('2d');
  var W, H, cols, rows, drops = [], running = true;
  var chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cols = Math.floor(W / 14);
    rows = Math.floor(H / 18);
    drops = [];
    for (var i = 0; i < cols; i++) drops[i] = Math.floor(Math.random() * -rows);
  }
  resize();

  function draw() {
    if (!running) return;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '14px "Minecraft", monospace';
    for (var i = 0; i < cols; i++) {
      var x = i * 14;
      for (var j = 0; j < 4; j++) {
        var y = (drops[i] - j) * 18;
        if (y < 0) continue;
        var alpha = (1 - j * 0.25) * 0.5;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = j === 0 ? '#00ff41' : '#00f0ff';
        ctx.shadowColor = j === 0 ? '#00ff41' : '#00f0ff';
        ctx.shadowBlur = j === 0 ? 12 : 4;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
      }
      drops[i]++;
      if (drops[i] * 18 > H + 72) drops[i] = 0;
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();

  setTimeout(function() {
    running = false;
    overlay.style.transition = 'opacity 0.3s ease';
    overlay.style.opacity = '0';
    setTimeout(function() {
      overlay.remove();
      if (callback) callback();
    }, 300);
  }, duration);
}

// ===== 展示文章（代码雨过渡） =====
var _savedScrollY = 0;

function showPost(index, cardEl) {
  // 保存当前滚动位置，返回时恢复
  _savedScrollY = window.scrollY;

  const post = blogData.posts[index];
  const listView = document.getElementById('post-list');
  const postView = document.getElementById('post-view');
  const content = document.getElementById('post-content');

  // 暂停上一篇文章的音频
  for (var i = 0; i < _inlineAudios.length; i++) {
    try { _inlineAudios[i].pause(); } catch(e) {}
  }
  _inlineAudios = [];
  resumeBgMusic();

  // 渲染内容（作为模板）
  var text = post.content.replace(
    /[！!]\s*\\?\[链接\\?\]\s*\(([^)]+)\)\s*\(([^)]+)\)/g,
    '[$2]($1)'
  );
  content.innerHTML = marked.parse(text);

  if (cardEl) {
    var cardRect = cardEl.getBoundingClientRect();

    // 隐藏列表
    listView.style.display = 'none';
    document.getElementById('gallery').style.display = 'none';
    document.querySelector('.search-box').style.display = 'none';
    document.getElementById('tag-filter').style.display = 'none';

    // 创建展开元素，从卡片位置开始
    var expander = document.createElement('div');
    expander.id = 'fs-expander';
    expander.style.cssText =
      'position:fixed;z-index:99;' +
      'top:' + cardRect.top + 'px;left:' + cardRect.left + 'px;' +
      'width:' + cardRect.width + 'px;height:' + cardRect.height + 'px;' +
      'background:var(--bg-primary);border:1px solid var(--cyan);' +
      'border-radius:4px;overflow:hidden;' +
      'box-shadow:0 0 20px rgba(0,240,255,0.2);' +
      'transition:all 0.4s cubic-bezier(0.4,0,0.2,1)';
    document.body.appendChild(expander);

    void expander.offsetWidth;

    // 展开到全屏
    expander.style.top = '0';
    expander.style.left = '0';
    expander.style.width = '100vw';
    expander.style.height = '100vh';
    expander.style.borderRadius = '0';
    expander.style.boxShadow = '0 0 50px rgba(0,240,255,0.35)';

    // 展开完成，在 expander 内渲染正文
    setTimeout(function() {
      expander.style.overflow = 'auto';
      expander.style.padding = '40px 20px';
      expander.style.display = 'flex';
      expander.style.justifyContent = 'center';

      // 阅读容器
      var reader = document.createElement('div');
      reader.style.cssText =
        'max-width:900px;width:100%;' +
        'opacity:0;transition:opacity 0.5s ease';

      // 返回按钮（调用 goBack → 代码雨过渡）
      var backBtn = document.createElement('button');
      backBtn.className = 'back-btn';
      backBtn.textContent = '<< 返回列表';
      backBtn.onclick = goBack;
      reader.appendChild(backBtn);

      // 文章内容
      var contentDiv = document.createElement('div');
      contentDiv.className = 'post-content';
      contentDiv.innerHTML = content.innerHTML;
      reader.appendChild(contentDiv);

      expander.innerHTML = '';
      expander.appendChild(reader);

      // 内容淡入
      void reader.offsetWidth;
      reader.style.opacity = '1';

      // 处理图片
      var imgs = contentDiv.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        var src = imgs[i].getAttribute('src');
        if (!src || src.indexOf('/') !== -1) continue;
        if (imgs[i].getAttribute('alt') === '音频') {
          var player = createAudioPlayer(src);
          imgs[i].parentNode.replaceChild(player, imgs[i]);
        } else {
          imgs[i].src = 'images/wenzhang/' + src;
        }
      }

      // 链接在新标签页打开
      var links = contentDiv.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        links[i].setAttribute('target', '_blank');
        links[i].setAttribute('rel', 'noopener');
      }
    }, 400);
  } else {
    // 无卡片→直接显示 post-view
    content.style.opacity = '';
    postView.style.display = 'block';
    postView.classList.remove('fade-in');
    void postView.offsetWidth;
    postView.classList.add('fade-in');

    var imgs = content.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].getAttribute('src');
      if (!src || src.indexOf('/') !== -1) continue;
      if (imgs[i].getAttribute('alt') === '音频') {
        var player = createAudioPlayer(src);
        imgs[i].parentNode.replaceChild(player, imgs[i]);
      } else {
        imgs[i].src = 'images/wenzhang/' + src;
      }
    }
    var links = content.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('target', '_blank');
      links[i].setAttribute('rel', 'noopener');
    }
  }
}

// ===== 返回列表（代码雨流完 → 纯背景 → UI 淡入） =====
function goBack() {
  // 暂停所有内联音频
  for (var i = 0; i < _inlineAudios.length; i++) {
    try { _inlineAudios[i].pause(); } catch(e) {}
  }
  _inlineAudios = [];
  resumeBgMusic();

  // 隐藏展开器
  var expander = document.getElementById('fs-expander');
  if (expander) expander.style.display = 'none';

  // 清理 post-view
  document.getElementById('post-content').innerHTML = '';
  document.getElementById('post-view').style.display = 'none';

  // 准备列表显示状态（先不展示）
  document.getElementById('post-list').style.display = 'block';
  document.querySelector('.search-box').style.display = '';
  document.getElementById('tag-filter').style.display = '';
  document.getElementById('gallery').style.display = 'none';
  document.getElementById('status').style.display = 'none';

  var header = document.querySelector('header');
  var tabs = document.querySelector('.tabs');
  var container = document.querySelector('.container');

  // 立即隐藏所有 UI（代码雨期间只有背景动画 + 字符）
  if (header) { header.style.opacity = '0'; header.style.transition = 'none'; }
  if (tabs) { tabs.style.opacity = '0'; tabs.style.transition = 'none'; }
  if (container) { container.style.opacity = '0'; container.style.transition = 'none'; }

  // 趁代码雨悄悄滚回上次位置（用户看不到）
  window.scrollTo(0, _savedScrollY);

  // === 代码雨（透明 canvas，背景可见） ===
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;z-index:999;top:0;left:0;width:100vw;height:100vh;pointer-events:none';
  var rainCanvas = document.createElement('canvas');
  overlay.appendChild(rainCanvas);
  document.body.appendChild(overlay);

  var ctx = rainCanvas.getContext('2d');
  var W = window.innerWidth, H = window.innerHeight;
  rainCanvas.width = W; rainCanvas.height = H;
  var cols = Math.floor(W / 14);
  var drops = [];
  for (var i = 0; i < cols; i++) drops[i] = Math.floor(Math.random() * -Math.floor(H / 18));
  var rainChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
  var running = true, draining = false;

  function drawRain() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H); // 透明清除，背景透出
    ctx.font = '14px "Minecraft", monospace';
    var anyOnScreen = false;
    for (var i = 0; i < cols; i++) {
      var x = i * 14;
      for (var j = 0; j < 4; j++) {
        var y = (drops[i] - j) * 18;
        if (y < 0) continue;
        if (y < H) anyOnScreen = true;
        var alpha = (1 - j * 0.25) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = j === 0 ? '#00ff41' : '#00f0ff';
        ctx.shadowColor = j === 0 ? '#00ff41' : '#00f0ff';
        ctx.shadowBlur = j === 0 ? 12 : 4;
        ctx.fillText(rainChars[Math.floor(Math.random() * rainChars.length)], x, y);
      }
      drops[i]++;
      if (!draining && drops[i] * 18 > H + 72) drops[i] = 0;
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    if (draining && !anyOnScreen) {
      running = false;
      afterRainDrained();
      return;
    }
    requestAnimationFrame(drawRain);
  }
  drawRain();

  var uiEls = [header, tabs, container];

  // 0.5s 后排空（字符不再重置，自然往下掉）
  setTimeout(function() { draining = true; }, 500);

  // 1.0s 后 UI 开始淡入（雨下够了再出现）
  setTimeout(function() {
    uiEls.forEach(function(el) {
      if (el) { el.style.transition = 'opacity 0.35s ease'; el.style.opacity = '1'; }
    });
    setTimeout(function() {
      uiEls.forEach(function(el) { if (el) el.style.transition = ''; });
    }, 350);
  }, 1000);

  var safetyTimer = setTimeout(function() {
    if (running) { running = false; afterRainDrained(); }
  }, 2500);

  function afterRainDrained() {
    clearTimeout(safetyTimer);
    // UI 已经显示了，只需清理 canvas
    overlay.remove();
    if (expander) expander.remove();
  }
}

// ===== 恢复背景音乐（被文章内音频暂停时调用） =====
function resumeBgMusic() {
  if (_bgSavedState.wasPlaying && !musicPlaying) {
    if (typeof _playWasm === 'function') {
      _playWasm(_bgSavedState.currentTime || 0);
    }
    _bgSavedState.wasPlaying = false;
  }
}

// ===== 图片画廊 =====
function renderGallery() {
  if (!blogData.images || blogData.images.length === 0) return;

  const gallery = document.getElementById('gallery');
  const grid = document.getElementById('gallery-grid');

  blogData.images.forEach(img => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
      <img src="${img.path}" alt="${img.name}" loading="lazy">
      <div class="gallery-name">${img.name}</div>
    `;
    item.onclick = function() { openLightbox(img.path); };
    grid.appendChild(item);
  });
}

// ===== 标签筛选（多选） =====
var activeTags = [];

var maxVisibleTags = 15;

function renderTags() {
  if (!blogData.tags || blogData.tags.length === 0) return;
  var container = document.getElementById('tag-filter');
  var html = '<span class="tag-filter-all tag-filter-item';
  if (activeTags.length === 0) html += ' active';
  html += '" onclick="filterByTag(\'__all__\')">全部</span>';

  var showTags = blogData.tags;
  var hasMore = showTags.length > maxVisibleTags;
  if (hasMore) showTags = showTags.slice(0, maxVisibleTags);

  showTags.forEach(function(t) {
    html += '<span class="tag-filter-item';
    if (activeTags.indexOf(t) !== -1) html += ' active';
    html += '" onclick="filterByTag(\'' + t.replace(/'/g, "\\'") + '\')">' + t + '</span>';
  });

  if (hasMore) {
    html += '<span class="tag-filter-item tag-filter-more" onclick="openTagPicker()">...</span>';
  }

  container.innerHTML = html;
}

// ===== 标签选择弹窗 =====
function openTagPicker() {
  var picker = document.getElementById('tag-picker');
  var list = document.getElementById('tag-picker-list');
  var html = '';
  blogData.tags.forEach(function(t) {
    var active = activeTags.indexOf(t) !== -1;
    html += '<span class="tag-picker-item' + (active ? ' active' : '') + '" onclick="togglePickerTag(\'' + t.replace(/'/g, "\\'") + '\')">' + t + '</span>';
  });
  list.innerHTML = html;
  picker.className = 'show';
}

function closeTagPicker(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('tag-picker').className = '';
}

function togglePickerTag(tag) {
  var idx = activeTags.indexOf(tag);
  if (idx !== -1) {
    activeTags.splice(idx, 1);
  } else {
    activeTags.push(tag);
  }
  // 更新弹窗内的选中状态
  var items = document.querySelectorAll('.tag-picker-item');
  items.forEach(function(el) {
    var t = el.textContent;
    el.className = 'tag-picker-item' + (activeTags.indexOf(t) !== -1 ? ' active' : '');
  });
}

function applyTagPicker() {
  document.getElementById('tag-picker').className = '';
  renderTags();
  // 重新筛选文章
  filterByTag('__refresh__');
}

function filterByTag(tag) {
  if (tag === '__refresh__') {
    // 只刷新显示，不修改 activeTags
  } else if (tag === '__all__') {
    activeTags = [];
  } else {
    var idx = activeTags.indexOf(tag);
    if (idx !== -1) {
      activeTags.splice(idx, 1);
    } else {
      activeTags.push(tag);
    }
  }
  renderTags();
  var cards = document.querySelectorAll('.post-card');
  cards.forEach(function(c, i) {
    if (activeTags.length === 0) {
      c.style.display = '';
    } else {
      var postTags = blogData.posts[i].tags || [];
      var match = true;
      for (var j = 0; j < activeTags.length; j++) {
        if (postTags.indexOf(activeTags[j]) === -1) {
          match = false;
          break;
        }
      }
      c.style.display = match ? '' : 'none';
    }
  });
}

// ===== 标签切换 =====
function switchTab(name) {
  // 切标签时暂停内联音频
  for (var i = 0; i < _inlineAudios.length; i++) {
    try { _inlineAudios[i].pause(); } catch(e) {}
  }
  // 恢复被文章音频暂停的背景音乐
  resumeBgMusic();

  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('tab-active');
  }
  document.querySelector('.tab[data-tab="' + name + '"]').classList.add('tab-active');

  // 切标签时隐藏文章阅读视图，恢复搜索框
  document.getElementById('post-view').style.display = 'none';
  document.querySelector('.search-box').style.display = '';

  var list = document.getElementById('post-list');
  var gallery = document.getElementById('gallery');
  var status = document.getElementById('status');

  var searchInput = document.getElementById('search-input');
  searchInput.value = '';
  searchPosts('');
  if (name === 'gallery') {
    list.style.display = 'none';
    gallery.style.display = blogData.images.length > 0 ? 'block' : 'none';
    gallery.classList.remove('fade-in');
    void gallery.offsetWidth;
    gallery.classList.add('fade-in');
    status.style.display = 'none';
    searchInput.placeholder = '搜索图片...';
    document.getElementById('tag-filter').style.display = 'none';
  } else {
    if (blogData.posts.length === 0) {
      list.style.display = 'none';
      status.style.display = 'block';
    } else {
      list.style.display = 'block';
      status.style.display = 'none';
    }
    gallery.style.display = 'none';
    list.classList.remove('fade-in');
    void list.offsetWidth;
    list.classList.add('fade-in');
    // 标签筛选器也加淡入
    var tf = document.getElementById('tag-filter');
    tf.classList.remove('fade-in');
    void tf.offsetWidth;
    tf.classList.add('fade-in');
    searchInput.placeholder = '搜索文章...';
    document.getElementById('tag-filter').style.display = '';
  }
}

// ===== 搜索（文章 + 影像库） =====
function searchPosts(keyword) {
  var tab = document.querySelector('.tab-active');
  var isGallery = tab && tab.getAttribute('data-tab') === 'gallery';
  var kw = keyword.trim().toLowerCase();
  var noResult = document.getElementById('search-none');

  if (isGallery) {
    // 搜索影像库
    var items = document.querySelectorAll('.gallery-item');
    var found = false;
    items.forEach(function(item) {
      var name = item.querySelector('.gallery-name').textContent.toLowerCase();
      if (!kw || name.indexOf(kw) !== -1) {
        item.style.display = '';
        found = true;
      } else {
        item.style.display = 'none';
      }
    });
    if (!noResult) {
      noResult = document.createElement('div');
      noResult.id = 'search-none';
      noResult.style.cssText = 'text-align:center;padding:40px 20px;color:var(--text-dim);font-size:0.9em;';
      document.getElementById('gallery-grid').appendChild(noResult);
    }
    noResult.textContent = '没有找到匹配的图片';
    noResult.style.display = found ? 'none' : 'block';
    return;
  }

  // 搜索文章
  var cards = document.querySelectorAll('.post-card');
  if (!kw) {
    cards.forEach(function(c) { c.style.display = ''; });
    if (noResult) noResult.style.display = 'none';
    return;
  }

  var found = false;
  cards.forEach(function(c, i) {
    var text = (blogData.posts[i].title + ' ' +
                blogData.posts[i].tags.join(' ') + ' ' +
                blogData.posts[i].preview).toLowerCase();
    if (text.indexOf(kw) !== -1) {
      c.style.display = '';
      found = true;
    } else {
      c.style.display = 'none';
    }
  });

  if (!noResult) {
    noResult = document.createElement('div');
    noResult.id = 'search-none';
    noResult.style.cssText = 'text-align:center;padding:40px 20px;color:var(--text-dim);font-size:0.9em;';
    document.getElementById('post-list').appendChild(noResult);
  }
  noResult.textContent = '没有找到匹配的文章';
  noResult.style.display = found ? 'none' : 'block';
}

// ===== 图片放大查看 =====
function openLightbox(src) {
  var lb = document.getElementById('lightbox');
  var img = document.getElementById('lightbox-img');
  img.src = src;
  lb.className = 'show';
}

function closeLightbox(e) {
  // 如果有点击事件且不是点击背景或关闭按钮，不关闭
  if (e && e.target !== e.currentTarget && e.target.id !== 'lightbox-close') return;
  document.getElementById('lightbox').className = '';
  document.getElementById('lightbox-img').src = '';
}

// ESC 关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.getElementById('lightbox').className = '';
    document.getElementById('lightbox-img').src = '';
  }
});

// 手机端下滑关闭 Lightbox
(function() {
  var lb = document.getElementById('lightbox');
  var startY = 0, moving = false;

  lb.addEventListener('touchstart', function(e) {
    if (e.target === e.currentTarget || e.target.id === 'lightbox-img') {
      startY = e.touches[0].clientY;
      moving = true;
    }
  }, { passive: true });

  lb.addEventListener('touchmove', function(e) {
    if (!moving) return;
    var dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      lb.style.transition = 'none';
      lb.style.transform = 'translateY(' + dy + 'px)';
    }
  }, { passive: true });

  lb.addEventListener('touchend', function(e) {
    if (!moving) return;
    moving = false;
    var dy = e.changedTouches[0].clientY - startY;
    lb.style.transition = '';
    lb.style.transform = '';
    if (dy > 80) {
      document.getElementById('lightbox').className = '';
      document.getElementById('lightbox-img').src = '';
    }
  }, { passive: true });
})();

// ===== 手机端轻震动反馈 =====
(function() {
  // 只在触屏设备上启用（手机/平板）
  if (!navigator.vibrate || window.matchMedia('(pointer: fine)').matches) return;

  var targets = '.post-card, .tab, .tag-filter-item, .back-btn, .ap-btn, .hm-item, .hamburger, .gallery-item, #lightbox-close';
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el) {
      if (el.matches && el.matches(targets)) {
        navigator.vibrate(12);
        return;
      }
      el = el.parentElement;
      if (el === document.body || !el) return;
    }
  });
})();

// ===== Logo 彩蛋：点击连击 + 长按缩放手感 + 钢琴音阶 =====
(function() {
  var ring = document.querySelector('.logo-ring');
  if (!ring) return;
  var lastTap = 0;
  var longTimer = null;
  var holding = false;
  var vibeTimer = null;

  // 钢琴八度：Do Re Mi Fa So La Ti Do
  var _pianoNotes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
  var _pianoIdx = 0;
  var _pianoCtx = null;

  // 连击提示
  var _combo = 0;
  var _comboTimer = null;
  var _comboEl = document.createElement('div');
  _comboEl.className = 'combo-indicator';
  _comboEl.style.cssText =
    'position:fixed;z-index:9999;' +
    'font-family:"Minecraft",monospace;font-size:1.6em;' +
    'letter-spacing:2px;' +
    'color:#00ff41;text-shadow:0 0 10px rgba(0,255,65,0.8),0 0 30px rgba(0,255,65,0.3);' +
    'pointer-events:none;opacity:0;';
  document.body.appendChild(_comboEl);

  function showCombo() {
    _combo++;
    var r = ring.getBoundingClientRect();
    var logoCenterX = r.left + r.width / 2;
    var finalY = r.top - 58;
    // 从 LOGO 中心到最终位置的距离
    var flyDist = (r.top + r.height / 2) - finalY;

    _comboEl.textContent = 'x' + _combo;
    _comboEl.style.left = logoCenterX + 'px';
    _comboEl.style.top = finalY + 'px';
    _comboEl.style.opacity = '1'; // 确保每次都可见
    // 颜色随连击递增渐变：每次转 14°（绿→青→蓝→紫→红→橙→黄→循环）
    var hue = (_combo * 14 + 100) % 360;
    _comboEl.style.color = 'hsl(' + hue + ', 100%, 55%)';
    _comboEl.style.textShadow =
      '0 0 8px hsla(' + hue + ', 100%, 55%, 0.8),' +
      '0 0 25px hsla(' + hue + ', 100%, 55%, 0.3)';

    if (_combo === 1) {
      // 第一次弹出：从 LOGO 中心弹射出来
      _comboEl.animate([
        { transform: 'translateY(' + flyDist + 'px) scale(0.3)', opacity: '0' },
        { transform: 'translateY(' + (flyDist * 0.4) + 'px) scale(0.7)', opacity: '1' },
        { transform: 'translateY(-4px) scale(1.15)', opacity: '1' },
        { transform: 'translateY(0) scale(1)',       opacity: '1' }
      ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
    } else {
      // 后续连击：只在原位跳动一下
      _comboEl.animate([
        { transform: 'scale(1.15)' },
        { transform: 'scale(1)' }
      ], { duration: 180, easing: 'ease-out' });
    }

    // 清除旧定时器
    if (_comboTimer) clearTimeout(_comboTimer);
    // 1.2s 无点击则渐隐并重置
    _comboTimer = setTimeout(function() {
      _comboEl.animate([
        { opacity: '1', transform: 'scale(1)' },
        { opacity: '0', transform: 'scale(0.6)' }
      ], { duration: 250, easing: 'ease-in' });
      _comboEl.style.opacity = '0';
      _combo = 0;
    }, 1200);
  }

  function playPianoNote(freq) {
    try {
      if (!_pianoCtx) _pianoCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (_pianoCtx.state === 'suspended') _pianoCtx.resume();
      var now = _pianoCtx.currentTime;

      // 三层谐波叠加模拟钢琴音色
      [1, 2, 3].forEach(function(h, i) {
        var osc = _pianoCtx.createOscillator();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq * h;
        var gain = _pianoCtx.createGain();
        var vol = i === 0 ? 0.25 : (i === 1 ? 0.08 : 0.03);
        // 快速起 + 指数衰减
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(_pianoCtx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      });
    } catch(e) {}
  }

  function startVibe() {
    if (!navigator.vibrate || vibeTimer) return;
    navigator.vibrate(60);
    vibeTimer = setInterval(function() {
      navigator.vibrate(60);
    }, 100);
  }

  function stopVibe() {
    if (vibeTimer) {
      clearInterval(vibeTimer);
      vibeTimer = null;
    }
    if (navigator.vibrate) navigator.vibrate(0);
  }

  function onPress(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;
    // 阻止浏览器长按弹出菜单（保存图片等）
    e.preventDefault();
    holding = false;

    longTimer = setTimeout(function() {
      holding = true;
      ring.classList.add('pressed');
      startVibe();
    }, 250);

    function onRelease() {
      clearTimeout(longTimer);
      stopVibe();
      if (holding) {
        // 长按松手：放大回去
        ring.classList.remove('pressed');
      } else {
        // 短点：连击判定 + 按节奏震动 + 弹动动画
        var now = Date.now();
        var gap = now - lastTap;
        lastTap = now;

        // 间隔超过 0.6s 连击重置
        if (gap >= 600) _combo = 0;

        var vib = 12;
        if (gap < 120) {
          vib = Math.min(130, Math.round(80 * (120 - gap) / 120 + 50));
        } else if (gap < 300) {
          vib = 35;
        } else if (gap < 600) {
          vib = 18;
        }
        if (navigator.vibrate) navigator.vibrate(vib);

        // 钢琴音阶：Do→Re→Mi→...→Do→循环
        playPianoNote(_pianoNotes[_pianoIdx]);
        _pianoIdx = (_pianoIdx + 1) % _pianoNotes.length;

        // 连击提示
        showCombo();

        ring.classList.remove('tapped');
        void ring.offsetWidth;
        ring.classList.add('tapped');
      }
      document.removeEventListener('mouseup', onRelease);
      document.removeEventListener('touchend', onRelease);
      document.removeEventListener('touchcancel', onRelease);
    }

    document.addEventListener('mouseup', onRelease, { once: true });
    document.addEventListener('touchend', onRelease, { once: true });
    document.addEventListener('touchcancel', onRelease, { once: true });
  }

  ring.addEventListener('mousedown', onPress);
  ring.addEventListener('touchstart', onPress, { passive: false });
  // 阻止浏览器默认的长按菜单（保存图片等）
  ring.addEventListener('contextmenu', function(e) { e.preventDefault(); });
})();

// ===== 文章卡片滚动动画 =====
function observePostCards() {
  if (!('IntersectionObserver' in window)) {
    // 降级：直接显示全部
    document.querySelectorAll('.post-card.scroll-hidden').forEach(function(card) {
      card.classList.remove('scroll-hidden');
      card.classList.add('scroll-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('scroll-hidden');
        entry.target.classList.add('scroll-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -60px 0px',
    threshold: 0
  });

  document.querySelectorAll('.post-card.scroll-hidden').forEach(function(card) {
    observer.observe(card);
  });
}

// ===== 启动 =====
init();
