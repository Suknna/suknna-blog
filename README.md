# 静态博客（VitePress）

基于 Vue + TypeScript 的静态博客/笔记站点，采用**框架与内容分离架构**。

**架构说明**：博客框架与笔记内容分别位于不同仓库，通过 GitHub Actions 自动化构建。

- [📚 架构文档](ARCHITECTURE.md) - 了解完整的跨仓库架构设计
- [🚀 子仓库设置](demo/SUB_REPO_SETUP.md) - 如何创建和配置私有笔记仓库
- [📝 单仓库参考](demo/pages.yml) - 传统的单仓库部署方式
## 架构概览

``` text
子仓库（私有）              主仓库（框架）
note-content-xxx    →    suknna-blog
  ├─ note/                  ├─ .vitepress/
  └─ .github/               ├─ scripts/
                              ├─ .github/
                              └─ package.json
```

**工作流程**：
1. 在**子仓库**编辑笔记，推送到 `main` 分支
2. 子仓库 workflow 触发主仓库构建
3. 主仓库拉取最新笔记，构建并部署到 GitHub Pages
## 展示
## 使用方法

本仓库是博客框架主仓库，**不包含笔记内容**。笔记内容位于独立的私有子仓库。

### 快速开始（框架使用）

如果你只是想使用本框架搭建博客：

1. **阅读架构文档**：[ARCHITECTURE.md](ARCHITECTURE.md)
2. **配置子仓库**：按照 [demo/SUB_REPO_SETUP.md](demo/SUB_REPO_SETUP.md) 创建私有笔记仓库
3. **设置 Secrets**：在主仓库配置 GitHub Secrets（见架构文档）
4. **开始写作**：在子仓库添加笔记，自动触发构建

### 定制站点信息

站点个性化配置通过环境变量注入：

| 配置项 | 环境变量 | 默认值 |
|--------|----------|--------|
| 语言 | `VITEPRESS_LANG` | `zh-CN` |
| 标题 | `VITEPRESS_TITLE` | `笔记` |
| 描述 | `VITEPRESS_DESCRIPTION` | `简洁、SEO 友好的静态博客。` |
| ICP 备案号 | `VITEPRESS_ICP_NUMBER` | `''` |
| Base URL | `VITEPRESS_BASE` | `/` |
| 站点 URL | `SITE_URL` | - |

**配置方式**：在主仓库 Settings → Secrets and variables → Actions 中添加对应 Secret。
### 修改首页标题

首页标题在**子仓库**的 `note/index.md` 中设置：

```yaml
---
layout: page
title: 我的笔记  # 修改这里
---
```

**修改首页标题**：编辑 `note/index.md`

```yaml
---
layout: page
title: 我的笔记  # 修改这里
---
```

### 配置黑名单（子仓库）

在子仓库根目录创建 `.blogignore` 文件：

```
# 忽略单个文件
draft.md

# 忽略整个目录
private/

# 忽略特定模式的文件
temp-*.md

# 忽略特定路径的文件
note/work/*.md
```

### GitHub Actions 工作流

主仓库包含两个 workflow：

- **cross-repo-build.yml**：跨仓库构建（默认启用）
  - 监听子仓库的 `repository_dispatch` 事件
  - 自动拉取笔记并构建部署

- **pages.yml**（已移至 demo/）：单仓库参考
  - 传统的单仓库部署方式
  - 用于 fork 使用场景的参考

**触发条件**：
- 子仓库推送到 `main` 分支时自动触发
- 主仓库支持手动触发（`workflow_dispatch`）
## 写作规范

- 文章放在 `note/**.md`。
- 分类规则：默认取路径第一段目录名。
  - 例：`note/tech/a.md` -> 分类 `tech`
  - 例：`note/a.md` -> 分类 `misc`
- 标题规则：
  - 默认使用文件名（不含扩展名），例如 `hello-world.md` -> `Hello World`
  - 可用 frontmatter `title` 覆盖。
- 编辑时间：使用 Git 中该文件最后一次提交时间（CI 环境稳定可复现）。

### 可选 frontmatter

```yaml
---
title: "自定义标题（可选）"
category: "自定义分类（可选）"
summary: "列表页摘要（可选）"
description: "SEO description（可选）"
---
```

## 本地开发

```bash
npm ci
npm run dev
```

访问 `http://localhost:5173` 查看效果。

## 构建与预览

```bash
npm run build
npm run preview
```

## 部署说明

- **跨仓库部署**（推荐）：使用 `.github/workflows/cross-repo-build.yml`
  - 子仓库更新时自动触发
  - 参考 [ARCHITECTURE.md](ARCHITECTURE.md)

- **单仓库部署**（备用）：参考 `demo/pages.yml`
  - 适用于 fork 后直接使用的场景
  - 需将 `note/` 放在主仓库中
## 切换到其他 CDN

参考 `demo/pages.yml` 中的构建步骤，将部署部分替换为对应平台的命令：

- **S3/OSS/COS**：使用 `aws s3 sync dist/ s3://bucket/` 或类似命令
- **Cloudflare Pages**：使用 Wrangler CLI
- **Netlify/Vercel**：使用各自的 CLI 或 API

**注意**：云存储需要配置 Secrets（访问密钥等），确保在 workflow 中正确引用。
