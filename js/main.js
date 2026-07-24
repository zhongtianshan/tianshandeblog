// ===== 工具函数 =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

  // 自动补全图片路径：裸文件名 → images/wenzhang/文件名
  var imgs = content.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].getAttribute('src');
    if (src && src.indexOf('/') === -1) {
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
function goBack() {
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

function renderTags() {
  if (!blogData.tags || blogData.tags.length === 0) return;
  var container = document.getElementById('tag-filter');
  var html = '<span class="tag-filter-all tag-filter-item';
  if (activeTags.length === 0) html += ' active';
  html += '" onclick="filterByTag(\'__all__\')">全部</span>';
  blogData.tags.forEach(function(t) {
    html += '<span class="tag-filter-item';
    if (activeTags.indexOf(t) !== -1) html += ' active';
    html += '" onclick="filterByTag(\'' + t.replace(/'/g, "\\'") + '\')">' + t + '</span>';
  });
  container.innerHTML = html;
}

function filterByTag(tag) {
  if (tag === '__all__') {
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

// ===== 启动 =====
init();
