const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
const imagesDir = path.join(__dirname, 'images');
const outputFile = path.join(__dirname, 'data.js');

// 扫描 .md 文件
const posts = [];
if (fs.existsSync(postsDir)) {
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  files.sort().reverse(); // 最新的在前面

  for (const file of files) {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');

    // 解析 frontmatter
    let title = file.replace('.md', '');
    let date = '';
    let tags = [];
    let body = content;

    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (fmMatch) {
      const fm = fmMatch[1];
      body = fmMatch[2];

      const titleMatch = fm.match(/title:\s*(.+)/);
      if (titleMatch) title = titleMatch[1].replace(/['"]/g, '');

      const dateMatch = fm.match(/date:\s*(.+)/);
      if (dateMatch) date = dateMatch[1].trim();

      const tagsMatch = fm.match(/tags:\s*\[([\s\S]*?)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      }
    }

    posts.push({
      title,
      date: date || '未知日期',
      tags,
      file,
      content: body.trim(), // 全文嵌入 data.js
      preview: body.replace(/#{1,6}\s*/g, '').replace(/```[\s\S]*?```/g, '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[([^\]]*)\]\(.*?\)/g, '$1').replace(/[*_~`]/g, '').replace(/\n/g, ' ').trim().slice(0, 150) + '...'
    });
  }
}

// 扫描图片（只扫 yingxiang/ 目录）
const imagesDir2 = path.join(__dirname, 'images', 'yingxiang');
const images = [];
if (fs.existsSync(imagesDir2)) {
  const imgs = fs.readdirSync(imagesDir2).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
  for (const img of imgs) {
    images.push({
      name: img,
      path: 'images/yingxiang/' + img
    });
  }
}

// 写出 JS 数据（可直接被 script 标签加载）
const output = { posts, images, updated: new Date().toISOString() };
fs.writeFileSync(outputFile, 'var blogData = ' + JSON.stringify(output, null, 2) + ';', 'utf-8');
console.log(`✅ 扫描完成: ${posts.length} 篇文章, ${images.length} 张图片`);
console.log(`📄 已生成 data.js`);
