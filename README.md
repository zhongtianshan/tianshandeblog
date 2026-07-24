# TIaNSHAN BLOG

赛博朋克风格个人博客，纯静态。部署于 GitHub Pages。

## 项目结构

```
├── index.html        # 博客主页
├── css/style.css     # 赛博朋克主题
├── js/
│   ├── main.js       # 核心逻辑（非必要不动）
│   └── marked.min.js # Markdown 渲染器
├── build.js          # 扫描工具（增删文章后运行）
├── data.js           # 自动生成的文章索引（build.js 生成）
├── posts/            # 文章目录（放 .md 文件）
├── images/
│   ├── wenzhang/     # 文章内引用的图片
│   └── yingxiang/    # 首页画廊图片
├── frames/           # 24fps 背景帧动画（855 张 JPG）
├── audio/            # 背景音乐
└── fonts/            # 自定义字体
```

## 发布文章流程

1. 把 `.md` 文件拖进 `posts/` 文件夹
2. 在本机运行 `node build.js`（更新索引）
3. `git add .` → `git commit` → `git push`
4. GitHub Actions 自动部署

也可以直接在 GitHub 网页上 `posts/` 目录里上传或编辑 `.md` 文件，然后等待自动构建。

### 图片

- 文章图片放 `images/wenzhang/`，Markdown 里直接写文件名：`![描述](图片名.png)`
- 画廊图片放 `images/yingxiang/`，跑 `node build.js` 后自动展示

## 推送流程

```bash
# 1. 写文章：把 .md 拖进 posts/
# 2. 更新索引
node build.js
# 3. 提交到 Git
git add .
git commit -m "写的内容"
# 4. 推送到 GitHub
git push
```

直接在 GitHub 网页上 `posts/` 目录里上传或编辑 `.md` 文件也可以，不过不生成 data.js 的话新文章不会显示（需配合 GitHub Actions 自动构建）。

## Git 注意事项

- **可以推送的**：`posts/`、`images/`、`data.js`、`index.html`、`css/`、`js/`、`frames/`、`audio/`
- **不要推送的**：`node_modules/`、`.bat` 文件、`package.json`
- 首次克隆后需运行 `npm install` 安装 build 依赖，或直接安装 Node.js 后在全局安装 marked

## 构建说明

```bash
# 本地预览（电脑手机同 WiFi）
双击 局域网测试.bat

# 构建文章索引
node build.js
```

## 技术栈

纯手写 HTML+CSS+JS，零框架。24fps 帧动画背景替代视频，Base64 混淆防爬虫。
