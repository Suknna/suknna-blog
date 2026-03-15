# 静态博客（VitePress）

基于 VitePress + TypeScript 的静态博客/笔记站点。

在线访问：[www.suknna.top](https://www.suknna.top)

## 特性

- Markdown 驱动写作，内容即数据
- 自动分类与文章聚合
- 稳定的发布时间 / 更新时间模型
- sitemap / robots.txt 自动生成
- `.blogignore` 内容过滤

## 快速开始

```bash
# 安装依赖
npm ci

# 开发预览
npm run dev

# 构建生产站点
npm run build

# 预览构建产物
npm run preview
```

构建产物位于 `dist/` 目录。

## 编写笔记注意事项

所有文章放在 `note/**/*.md`，保留页为 `note/index.md` 和 `note/categories.md`。

### Frontmatter 必填字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `date` | 是 | 发布时间，格式 `YYYY-MM-DD` 或 ISO 日期 |
| `updated` | 否 | 更新时间，若不填则自动取 Git 最近提交时间 |

### 可选字段

| 字段 | 说明 |
|------|------|
| `title` | 自定义标题，默认使用文件名 |
| `category` | 自定义分类，默认取路径第一段目录名 |
| `summary` | 列表页摘要 |

最小 frontmatter 示例：

```yaml
---
title: 示例标题
date: 2026-03-15
summary: 这是一句话摘要
---
```

### 分类规则

默认取路径第一段目录名。例如：

- `note/tech/a.md` → 分类 `tech`
- `note/kubernetes/b.md` → 分类 `kubernetes`
- 根目录文件 → 分类 `misc`

### 构建黑名单

在项目根目录创建 `.blogignore` 文件，可过滤不发布的内容：

```
# 注释行
draft.md        # 精确文件名
draft/          # 整个目录
temp-*.md       # 通配符匹配
note/private/   # 路径前缀匹配
```

### 注意事项

- 缺失 `date` 会导致构建失败
- 更新时间不再依赖文件系统 mtime，避免构建时间污染
- 建议显式填写 `updated`，确保更新时间可控

## 关键配置入口

- `.vitepress/config.ts` — 站点配置（SEO、base URL、主题设置）
- `note/posts.data.ts` — 文章列表与时间规则
- `scripts/postbuild.mjs` — sitemap / robots / 黑名单后处理

### 环境变量

| 变量 | 用途 |
|------|------|
| `VITEPRESS_BASE` | 站点基础路径（如 `/blog/`） |
| `SITE_URL` | 站点完整 URL（用于 sitemap / canonical） |

## 常见问题

**为什么 `date` 必填？**

确保发布时间稳定可循，不受构建环境影响。

**为什么更新时间不会再变成构建时间？**

已移除文件系统 mtime 作为兜底，仅使用 Git 提交时间或显式填写的 `updated`。

**如何隐藏不想发布的草稿？**

在项目根目录创建 `.blogignore`，添加文件名、目录或通配符规则。构建时会自动跳过匹配的文件。
