# TIaNSHAN BLOG

> 赛博朋克风格个人博客 · 纯静态 · 部署于 GitHub Pages

🔗 **博客地址**: [https://zhongtianshan.github.io/tianshandeblog/](https://zhongtianshan.github.io/tianshandeblog/)
📦 **GitHub 仓库**: [https://github.com/zhongtianshan/tianshandeblog](https://github.com/zhongtianshan/tianshandeblog)

---

## 项目结构

```
├── index.html        # 博客主页
├── css/style.css     # 赛博朋克主题
├── js/
│   ├── main.js       # 核心逻辑（非必要不动）
│   └── marked.min.js # Markdown 渲染器
├── build.py          # 【新】Python 版扫描工具（增删文章后运行）
├── build.js          # JS 版扫描工具（功能相同，任选其一）
├── deploy.py         # 【新】一键部署脚本（build + commit + push）
├── data.js           # 自动生成的文章索引（build 生成）
├── posts/            # 文章目录（放 .md 文件）
├── images/
│   ├── wenzhang/     # 文章内引用的图片
│   └── yingxiang/    # 首页画廊图片
├── cursors/          # 【新】自定义鼠标指针（赛博朋克风）
├── frames/           # 24fps 背景帧动画（855 张 JPG）
├── audio/            # 背景音乐
└── fonts/            # 自定义字体
```

## 发布文章流程（给人类用户看）

1. 把 `.md` 文件拖进 `posts/` 文件夹
2. 双击 `deploy.py` 一键注册 + 推送
   - 或手动跑 `python build.py` → `git add data.js` → `git commit` → `git push`

也可以直接在 GitHub 网页上 `posts/` 目录里上传或编辑 `.md` 文件。

### 图片

- 文章图片放 `images/wenzhang/`，Markdown 里直接写文件名：`![描述](图片名.png)`
- 画廊图片放 `images/yingxiang/`，跑 `build.py` 后自动展示
- 点击画廊图片可放大查看，按 ESC 或点击 X 关闭

### 标签筛选

文章 frontmatter 里的 `tags` 会被 `build.py` 自动收集，显示为可点击的标签栏。点击标签筛选文章，新增或删除标签后重新运行 `build.py` 即可更新。

### 自定义链接（文章内使用）

```
！[链接](https://...)(显示名称)
```

显示为亮绿色链接，点击在新标签页打开。

## 推送流程（给 AI 看）

```bash
# 1. 写文章：把 .md 拖进 posts/（不要碰）
# 2. 更新索引（任选其一）
python build.py
# 或
node build.js
# 3. 提交到 Git（只提交 data.js，不要提交其他任何文件）
git add data.js
git commit -m "更新索引"
# 4. 推送到 GitHub
git push
```

### AI 注意事项（重要）

- **只允许提交 `data.js`**。不要提交 `README.md`、`index.html`、`css/`、`js/`、`.gitignore` 等重要文件。
- 除非用户明确要求，否则 AI 不得修改或提交 `README.md` 及其他项目配置文件。
- 不要在 `posts/` 目录里写文章或修改文章内容——用户自己放 `.md` 文件进去。
- 不要在 `images/` 目录里增删图片——用户自己管理图片资源。

直接在 GitHub 网页上 `posts/` 目录里上传或编辑 `.md` 文件也可以，不过不生成 data.js 的话新文章不会显示（需配合 GitHub Actions 自动构建）。

## Git 注意事项（给 AI 看）

### AI 可以推送的
- `data.js`（唯一需要 AI 提交的文件）

### AI 不要推送的
- `README.md`、`index.html`、`css/`、`js/`、`.gitignore`、`build.js`、`build.py`——这些是项目核心文件，除非用户明确要求，否则 AI 不得修改或提交
- `posts/`——用户自己管理文章
- `images/`——用户自己管理图片
- `cursors/`、`frames/`、`audio/`、`fonts/`——用户自己管理资源文件
- `node_modules/`、`.bat` 文件、`package.json`

首次克隆后需运行 `npm install` 安装 build 依赖，或直接安装 Node.js 后在全局安装 marked。
Python 版不需要安装额外依赖（只用到了标准库）。

## 构建说明

```bash
# 本地预览（电脑手机同 WiFi）
python -m http.server 8080
# 浏览器打开 http://192.168.1.100:8080

# 构建文章索引（任选其一）
python build.py
node build.js

# 一键构建 + 推送
python deploy.py
```

## 技术栈

纯手写 HTML+CSS+JS，零框架。Python 构建脚本（也保留 JS 版）。

### 特色功能

- **帧动画背景** — 24fps、855 张 JPG 替代视频，防 IDM 嗅探
- **粒子拖尾** — 赛博朋克发光粒子跟随鼠标（仅 PC）
- **自定义光标** — 霓虹箭头赛博朋克风格
- **图片画廊** — 点击放大查看（Lightbox），ESC/点击关闭
- **背景音乐** — 自动播放尝试 + 首次点击后备方案
- **Base64 混淆** — 静态资源路径防爬虫
- **缓存穿透** — data.js 加载时带时间戳，永远读取最新
- **图片路径自动补全** — 文章内写裸文件名即可
