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
    return;
  }

  document.getElementById('status').style.display = 'none';
  renderPostList();
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
  postView.style.display = 'block';
  postView.classList.remove('fade-in');
  void postView.offsetWidth;
  postView.classList.add('fade-in');

  // 直接从 data.js 里拿内容，不 fetch
  const html = marked.parse(post.content);
  content.innerHTML = html;

  // 自动补全图片路径：裸文件名 → images/wenzhang/文件名
  var imgs = content.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].getAttribute('src');
    if (src && src.indexOf('/') === -1) {
      imgs[i].src = 'images/wenzhang/' + src;
    }
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
    grid.appendChild(item);
  });
}

// ===== 标签切换 =====
function switchTab(name) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('tab-active');
  }
  document.querySelector('.tab[data-tab="' + name + '"]').classList.add('tab-active');

  var list = document.getElementById('post-list');
  var gallery = document.getElementById('gallery');

  if (name === 'gallery') {
    list.style.display = 'none';
    gallery.style.display = blogData.images.length > 0 ? 'block' : 'none';
    gallery.classList.remove('fade-in');
    void gallery.offsetWidth; // force reflow
    gallery.classList.add('fade-in');
  } else {
    list.style.display = 'block';
    gallery.style.display = 'none';
    list.classList.remove('fade-in');
    void list.offsetWidth;
    list.classList.add('fade-in');
  }
}

// ===== 启动 =====
init();
