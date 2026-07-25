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
    card.className = 'post-card';
    card.onclick = () => showPost(index);

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
}

// ===== 展示文章 =====
function showPost(index) {
  const post = blogData.posts[index];
  const listView = document.getElementById('post-list');
  const postView = document.getElementById('post-view');
  const content = document.getElementById('post-content');

  // 暂停上一篇文章的音频
  for (var i = 0; i < _inlineAudios.length; i++) {
    try { _inlineAudios[i].pause(); } catch(e) {}
  }
  _inlineAudios = [];
  // 切文章时恢复背景音乐
  resumeBgMusic();
  content.innerHTML = '';

  listView.style.display = 'none';
  document.getElementById('gallery').style.display = 'none';
  document.querySelector('.search-box').style.display = 'none';
  document.getElementById('tag-filter').style.display = 'none';
  postView.style.display = 'block';
  postView.classList.remove('fade-in');
  void postView.offsetWidth;
  postView.classList.add('fade-in');

  // 直接从 data.js 里拿内容，不 fetch
  // 自定义链接语法：[链接](url)(名称) → 标准 markdown 链接
  // 兼容有无反斜杠转义、有无空格
  var text = post.content.replace(
    /[！!]\s*\\?\[链接\\?\]\s*\(([^)]+)\)\s*\(([^)]+)\)/g,
    '[$2]($1)'
  );
  const html = marked.parse(text);
  content.innerHTML = html;

  // 处理图片和音频
  var imgs = content.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].getAttribute('src');
    if (!src || src.indexOf('/') !== -1) continue;

    if (imgs[i].getAttribute('alt') === '音频') {
      // 音频标记：替换为播放器
      var player = createAudioPlayer(src);
      imgs[i].parentNode.replaceChild(player, imgs[i]);
    } else {
      // 普通图片：补全路径
      imgs[i].src = 'images/wenzhang/' + src;
    }
  }

  // 文章里的链接在新标签页打开
  var links = content.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    links[i].setAttribute('target', '_blank');
    links[i].setAttribute('rel', 'noopener');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 返回列表 =====
function resumeBgMusic() {
  if (_bgSavedState.wasPlaying && !musicPlaying) {
    if (typeof _playWasm === 'function') {
      _playWasm(_bgSavedState.currentTime || 0);
    }
    _bgSavedState.wasPlaying = false;
  }
}

function goBack() {
  // 暂停所有内联音频
  for (var i = 0; i < _inlineAudios.length; i++) {
    try { _inlineAudios[i].pause(); } catch(e) {}
  }
  _inlineAudios = [];
  // 恢复被文章音频暂停的背景音乐
  resumeBgMusic();
  document.getElementById('post-content').innerHTML = '';
  document.getElementById('post-view').style.display = 'none';
  switchTab('posts');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

// ===== Logo 彩蛋：点击连击 + 长按缩放手感 =====
(function() {
  var ring = document.querySelector('.logo-ring');
  if (!ring) return;
  var lastTap = 0;
  var longTimer = null;
  var holding = false;
  var vibeTimer = null;

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

        var vib = 12;
        if (gap < 120) {
          vib = Math.min(130, Math.round(80 * (120 - gap) / 120 + 50));
        } else if (gap < 300) {
          vib = 35;
        } else if (gap < 600) {
          vib = 18;
        }
        if (navigator.vibrate) navigator.vibrate(vib);

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

// ===== 启动 =====
init();
