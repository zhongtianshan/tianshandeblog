import os, sys, json, re
from datetime import datetime
import zipfile
sys.stdout.reconfigure(encoding='utf-8')

rebuild_zip = '--zip' in sys.argv

posts_dir = 'posts'
images_dir = 'images/yingxiang'
output_file = 'data.js'

# 扫描 .md 文件
posts = []
if os.path.exists(posts_dir):
    files = [f for f in os.listdir(posts_dir) if f.endswith('.md')]
    files.sort(reverse=True)

    for file in files:
        with open(os.path.join(posts_dir, file), 'r', encoding='utf-8') as f:
            content = f.read()

        title = file.replace('.md', '')
        date = ''
        tags = []
        body = content

        # 解析 frontmatter
        fm_match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', content)
        if fm_match:
            fm = fm_match.group(1)
            body = fm_match.group(2)

            t = re.search(r'title:\s*(.+)', fm)
            if t: title = t.group(1).strip("'\"")

            d = re.search(r'date:\s*(.+)', fm)
            if d: date = d.group(1).strip()

            tg = re.search(r'tags:\s*\[([\s\S]*?)\]', fm)
            if tg:
                tags = [t.strip().strip("'\"") for t in tg.group(1).split(',')]

        # 生成预览
        preview = body
        preview = re.sub(r'#{1,6}\s*', '', preview)
        preview = re.sub(r'```[\s\S]*?```', '', preview)
        preview = re.sub(r'!\[.*?\]\(.*?\)', '', preview)
        preview = re.sub(r'\[([^\]]*)\]\(.*?\)', r'\1', preview)
        preview = re.sub(r'[*_~`]', '', preview)
        preview = preview.replace('\n', ' ').strip()[:150] + '...'

        posts.append({
            'title': title,
            'date': date or '未知日期',
            'tags': tags,
            'file': file,
            'content': body.strip(),
            'preview': preview
        })

# 扫描图片
images = []
if os.path.exists(images_dir):
    for img in os.listdir(images_dir):
        if re.search(r'\.(png|jpg|jpeg|gif|webp)$', img, re.I):
            images.append({
                'name': img,
                'path': 'images/yingxiang/' + img
            })

# 收集所有标签，按出现频率排序（高频在前）
tag_freq = {}
for p in posts:
    for t in p['tags']:
        tag_freq[t] = tag_freq.get(t, 0) + 1

all_tags = sorted(tag_freq.keys(), key=lambda t: -tag_freq[t])

# 写出 data.js
output = {'posts': posts, 'images': images, 'tags': all_tags, 'updated': datetime.now().isoformat()}
with open(output_file, 'w', encoding='utf-8') as f:
    f.write('var blogData = ' + json.dumps(output, ensure_ascii=False, indent=2) + ';')

print(f'扫描完成: {len(posts)} 篇文章, {len(images)} 张图片')
print(f'已生成 {output_file}')

# 打包帧动画（仅 --zip 时执行）
if rebuild_zip:
    frames_dir = 'frames'
    zip_path = os.path.join(frames_dir, 'frames.zip')
    if os.path.exists(frames_dir):
        count = 0
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zf:
            for f in sorted(os.listdir(frames_dir)):
                if f.lower().endswith('.jpg'):
                    zf.write(os.path.join(frames_dir, f), arcname=f)
                    count += 1
        print(f'已打包 {count} 帧 → {zip_path}')
