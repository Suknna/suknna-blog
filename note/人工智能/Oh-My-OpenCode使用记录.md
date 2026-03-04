# Oh My OpenCode 中文完全指南

## 项目介绍

**项目仓库**: https://github.com/code-yeongyu/oh-my-opencode

**oh-my-opencode (omo)** 是一个开源的多模型 Agent 编排框架，GitHub 星标 36.8k+。它将单一的 AI Agent 转变为协调工作的开发团队，通过多模型编排实现最佳效果。

**核心理念**：不依赖单一模型，而是让 Claude 做编排、GPT 做推理、Kimi 提速度、Gemini 处理视觉——各司其职，并行运转。

---

## 安装教程

安装直接参考官方的：

复制并粘贴以下提示词到你的 LLM Agent (Claude Code, AmpCode, Cursor 等):

```
Install and configure oh-my-opencode by following the instructions here:
https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/refs/heads/master/docs/guide/installation.md
```

在这期间模型会问你所拥有的订阅如：

- Anthropic 的 Claude
- OpenAI 的 ChatGPT
- Google 的 Gemini

如果都没有填写"无"，下面文章会带你定制剖析这个项目来配置独属于你的最佳实践。

---

## 功能介绍

## 代理

opencode 内置 11 个不同功能的代理。每个代理都有独特的专长，omo 对每个代理优化了模型和工具权限。

### 核心代理

| 代理 | 推荐模型 | 职责 |
| :--- | :--- | :--- |
| **Sisyphus（西西弗斯）** | Claude Opus 4.6 / Kimi K2.5 | 默认编排器。负责计划制定、任务分配、并行执行、强制完成。永不半途而废。 |
| **Sisyphus-Junior** | Category 决定 | 通过 Category 委托的任务执行器。根据任务类型自动选择最优模型。 |
| **Atlas（阿特拉斯）** | Claude Opus 4.6 | Todo 编排和执行。负责分发任务给子代理、累积学习成果、独立验证完成度。 |

### 规划代理

| 代理 | 推荐模型 | 职责 |
| :--- | :--- | :--- |
| **Prometheus（普罗米修斯）** | Claude Opus 4.6 / Kimi K2.5 | 战略规划师。面试模式——像真正的工程师一样提问、识别范围和歧义、构建详细计划。 |
| **Metis（梅蒂斯）** | Claude Opus 4.5 | 计划质量分析。捕捉 Prometheus 遗漏的问题，在计划定稿前发现缺口。 |
| **Momus（摩摩斯）** | GPT-5.2 / Claude Opus | 严格审查员。根据清晰度、可验证性、完整性标准验证计划。 |

### 专业代理

| 代理 | 推荐模型 | 职责 |
| :--- | :--- | :--- |
| **Hephaestus（赫菲斯托斯）** | GPT-5.3 Codex **（必须）** | 自主深度工作者。给予目标而非步骤，自主探索代码库、研究模式、端到端执行。 |
| **Oracle（甲骨文）** | GPT-5.2 → Gemini 3 Pro → Claude Opus | 只读高智商顾问。架构决策、复杂调试、多系统权衡。 |
| **Librarian（图书管理员）** | GLM-4.7 / Claude Sonnet | 文档查阅、GitHub 代码搜索、官方文档查询、多仓库分析。 |
| **Explore（探索者）** | Grok Code Fast 1 / Gemini Flash | 极速代码库 grep。上下文感知的模式匹配和文件结构搜索。 |
| **Multimodal Looker** | Gemini 3 Flash | PDF、图片、图表等视觉内容分析。 |

---

## Category（任务分类）系统

当 Sisyphus 委托任务时，它不选择具体模型，而是选择 **Category**。系统自动将 Category 映射到最优模型。

**重要**：Category 是 **Sisyphus 内部使用的机制**，用户**无法直接调用**。用户只能通过自然语言描述需求，Sisyphus 会自动选择合适的 Category。

### 内置 Category

| Category | 推荐模型 | Sisyphus 何时使用 |
| :--- | :--- | :--- |
| `visual-engineering` | Gemini 3 Pro | 前端、UI/UX、设计、样式、动画 |
| `ultrabrain` | GPT-5.3 Codex (xhigh) | 真正困难的逻辑密集型任务 |
| `deep` | GPT-5.3 Codex (medium) | 目标导向的自主问题解决，充分调研后行动 |
| `artistry` | Gemini 3 Pro (max) | 高度创意/艺术任务，非常规解决方案 |
| `quick` | Claude Haiku 4.5 | 简单任务——单文件修改、拼写错误、简单改动 |
| `unspecified-low` | Claude Sonnet 4.6 | 不符合其他分类的低难度任务 |
| `unspecified-high` | Claude Opus 4.6 (max) | 不符合其他分类的高难度任务 |
| `writing` | Kimi K2.5 | 文档、技术写作 |

### 用户如何触发 Category（间接方式）

用户**无法直接使用** `delegate_task`，但可以通过描述需求让 Sisyphus 自动选择合适的 Category：

| 用户输入 | Sisyphus 会选择 |
| :--- | :--- |
| "帮我写一个漂亮的登录页面" | `visual-engineering` |
| "修复这个内存泄漏" | `deep` 或 `ultrabrain` |
| "帮我写个文档" | `writing` |
| "改一下这个拼写错误" | `quick` |

### 用户如何直接调用特定代理

虽然不能直接用 Category，但可以用 `@` 调用特定代理：

```bash
# 直接调用 Oracle（架构顾问）
@oracle 帮我设计一个微服务架构

# 直接调用 Librarian（文档搜索）
@librarian 查找 React useState 的最佳实践

# 直接调用 Explore（代码搜索）
@explore 找到项目中的认证相关代码
```

### @ 可用的代理

| 调用方式 | 代理 | 用途 |
| :--- | :--- | :--- |
| `@oracle` | Oracle | 架构决策、代码审查、调试 |
| `@librarian` | Librarian | 文档查阅、GitHub 代码搜索 |
| `@explore` | Explore | 代码库模式搜索、文件定位 |
| `@frontend-engineer` | Frontend Engineer | 前端开发 |
| `@multimodal-looker` | Multimodal Looker | 图片、PDF 分析 |

---

## 模型匹配指南

### 模型家族

| 家族 | 模型 | 特点 |
| :--- | :--- | :--- |
| **Claude 系列** | Opus 4.6, Sonnet 4.6, Haiku 4.5 | 指令遵循能力强，结构化输出好 |
| **Claude 替代品** | Kimi K2.5, GLM 5 | 行为类似 Claude，适合做编排 |
| **GPT 系列** | GPT-5.3 Codex, GPT-5.2 | 显式推理，原则驱动，深度推理能力强 |
| **快速模型** | GPT-5-Nano, Claude Haiku | 超快超便宜，适合简单任务 |
| **视觉模型** | Gemini 3 Pro | 前端/视觉任务表现优异 |
| **搜索模型** | Grok Code Fast 1 | 代码搜索/grep 优化 |

### 安全 vs 危险替换

**安全替换**（相同人格类型）：

- Sisyphus: Opus → Sonnet, Kimi K2.5, GLM 5（都是沟通型模型）
- Prometheus: Opus → GPT-5.2（自动切换到 GPT prompt）
- Atlas: Kimi K2.5 → Sonnet, GPT-5.2

**危险替换**：

- Sisyphus → GPT：**没有 GPT prompt，会显著降级**

---

## 最佳实践

### 项目从 0-1：从零构建 MVP

从零开始构建项目是 omo 最强大的场景之一。以下是最佳实践流程：

#### 步骤 1：初始化项目

首先用传统方式创建项目基础结构：

```bash
# 创建项目目录
mkdir my-project && cd my-project

# 初始化项目（根据你的技术栈）
bun init          # 或 npm init, cargo init 等
# 不要手动写代码，让 omo 来做

# 初始化 opencode
opencode init
```

#### 步骤 2：创建需求文档

在项目根目录创建 `SPEC.md` 或 `prd.md`：

```markdown
# 项目名称：图片处理工具

## 项目类型
Web 应用 - 图片处理 SaaS

## 核心功能
1. 用户注册登录（邮箱 + 密码）
2. 图片上传（支持拖拽）
3. 图片压缩（可调质量）
4. 图片裁剪
5. 下载处理后的图片

## 技术栈
- 前端：React + Vite + TypeScript
- 后端：Bun + Hono
- 数据库：SQLite
- 样式：TailwindCSS

## UI 设计要求
- 现代简约风格
- 暗色主题为主
- 移动端响应式

## 验收标准
- [ ] 用户可以注册和登录
- [ ] 可以上传 JPG/PNG 图片
- [ ] 可以压缩图片并下载
- [ ] 页面加载时间 < 2s
- [ ] 无控制台错误
```

#### 步骤 3：使用 ultrawork 模式构建

进入 opencode 后，直接输入：

```
ulw: 根据 SPEC.md 构建整个项目，实现所有功能。完成后运行构建并验证页面可访问。
```

omo 会自动：

1. **探索代码库** - 了解项目结构
2. **研究最佳实践** - 通过 Librarian 查找相关库的使用方式
3. **并行实现** - 同时处理前端、后端、样式
4. **验证完成** - 运行构建、检查错误

#### 步骤 4：迭代完善

如果首次构建不完美，使用 ralph loop 继续迭代：

```
/ralph-loop "完善图片压缩功能，添加进度条显示"
```

或者直接继续：

```
ulw: 修复以下问题：
1. 图片上传后没有预览
2. 下载按钮点击无反应
3. 添加移动端适配
```

#### 0-1 场景的关键技巧

| 技巧 | 说明 |
| :--- | :--- |
| **详细的 SPEC.md** | 越详细，omo 执行越准确 |
| **明确验收标准** | 用 checklist 形式，omo 知道何时完成 |
| **指定技术栈** | 避免 omo 猜测，选择你最熟悉的 |
| **先跑起来再优化** | 先实现功能，再优化代码质量 |
| **信任 omo** | 不要频繁干预，让它完整执行 |

---

### 项目从 1-N：迭代加速开发

对于已有项目的迭代开发，omo 可以大幅提升效率。

#### 场景 1：添加新功能

```
ulw: 为现有博客系统添加评论功能，包括：
- 前端评论组件
- 后端 API 接口
- 数据库表设计
- 评论管理后台
```

omo 会：

- 探索现有代码结构
- 遵循现有代码风格
- 正确集成到现有系统

#### 场景 2：重构优化

```
ulw: 重构用户认证模块，将目前的 session 方式改为 JWT
```

推荐使用 `/refactor` 命令：

```
/refactor auth-module --scope=module --strategy=safe
```

#### 场景 3：Bug 修复

```
ulw: 修复用户登录后 token 过期时间显示错误的 bug
```

omo 会自动：

- 定位相关代码
- 分析问题原因
- 修复并验证

#### 场景 4：技术调研

在使用新库或新技术前，先让 omo 调研：

```
ulw: 研究将当前 Redux 状态管理迁移到 Zustand 的可行性，包括：
- 迁移工作量评估
- 潜在风险点
- 推荐的迁移步骤
```

---

### 工作模式选择

#### Ultrawork 模式（推荐用于 0-1）

**触发方式**：在 prompt 中包含 `ultrawork` 或 `ulw`

**适用场景**：

- 从零构建项目
- 添加复杂功能
- 需要多模块协作

**工作流程**：
```
1. 分析需求 → 2. 探索代码库 → 3. 研究最佳实践 → 4. 并行实现 → 5. 验证完成
```

**示例**：
```
ulw: 构建一个完整的用户管理系统
ulw: 为电商添加购物车和订单功能
ulw: 实现图片上传、裁剪、滤镜功能
```

#### Prometheus 模式（推荐用于复杂项目）

**触发方式**：按 `Tab` 键切换到 Prometheus 模式

**适用场景**：

- 大型项目（多天工作）
- 需要详细规划
- 关键生产系统变更

**工作流程**：
```
1. 面试式提问（Prometheus） → 2. 生成详细计划 → 3. Metis/Momus 审查 → 4. /start-work 执行
```

**示例**：
```
# 按 Tab 进入 Prometheus 模式
# 输入：
帮我设计一个微服务架构的电商系统，包括：
- 用户服务
- 商品服务
- 订单服务
- 支付服务
- 每个服务的 API 设计
- 数据库表结构

# 确认计划后，输入：
/start-work
```

#### Ralph Loop（持续迭代）

**触发方式**：`/ralph-loop` 或 `/ulw-loop`

**适用场景**：

- 需要多轮迭代
- 验收标准明确
- 长时间运行任务

**关键**：定义清晰的完成条件

```
/ralph-loop "完善支付模块，确保所有测试通过" --max-iterations=50
```

**Ralph Loop 最佳实践**：

| 实践 | 说明 |
| :--- | :--- |
| **小步快跑** | 每次迭代任务要小，不要贪多 |
| **明确完成标志** | 告诉 omo 什么是"DONE" |
| **定期检查** | 每隔几个迭代检查进度 |
| **保持上下文** | AGENTS.md 会累积学习成果 |

---

### 使用场景选择

| 场景 | 推荐方式 |
| :--- | :--- |
| 从零构建 MVP | `ulw` + 详细 SPEC.md |
| 添加功能 | `ulw` |
| Bug 修复 | `ulw` 或直接描述问题 |
| 大型重构 | `/refactor` 或 Prometheus 模式 |
| 长时间迭代 | `/ralph-loop` |
| 技术调研 | `ulw` |
| 代码审查 | `@oracle` |

---

### 项目从 1-N：深度配置

#### 自定义配置示例

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/dev/assets/oh-my-opencode.schema.json",
  
  "agents": {
    // 主编排器
    "sisyphus": {
      "model": "kimi-for-coding/k2p5",
      "ultrawork": { "model": "anthropic/claude-opus-4-6", "variant": "max" }
    },
    // 研究代理用便宜模型
    "librarian": { "model": "zai-coding-plan/glm-4.7" },
    "explore": { "model": "github-copilot/grok-code-fast-1" },
    // 架构顾问
    "oracle": { "model": "openai/gpt-5.2", "variant": "high" }
  },
  
  "categories": {
    "visual-engineering": { "model": "google/gemini-3-pro", "variant": "high" },
    "quick": { "model": "anthropic/claude-haiku-4-5" },
    "ultrabrain": { "model": "openai/gpt-5.3-codex", "variant": "xhigh" }
  },
  
  "background_task": {
    "providerConcurrency": {
      "anthropic": 3,
      "openai": 3,
      "opencode": 10,
      "zai-coding-plan": 10
    },
    "modelConcurrency": {
      "anthropic/claude-opus-4-6": 2,
      "opencode/gpt-5-nano": 20
    }
  }
}
```

#### 后台任务配置

```jsonc
{
  "background_task": {
    "defaultConcurrency": 5,
    "staleTimeoutMs": 180000,
    "providerConcurrency": {
      "anthropic": 3,
      "google": 10,
      "openai": 5
    },
    "modelConcurrency": {
      "anthropic/claude-opus-4-5": 2,
      "openai/gpt-5.2": 1
    }
  }
}
```

---

## 核心命令

| 命令 | 作用 |
| :--- | :--- |
| `ultrawork` / `ulw` | 激活全自动工作模式 |
| `/start-work` | 执行 Prometheus 计划 |
| `/init-deep` | 生成项目层级 AGENTS.md |
| `/ralph-loop` | 自引用开发循环 |
| `/ulw-loop` | ultrawork 循环模式 |
| `/cancel-ralph` | 取消 Ralph Loop |

---

## 工作流程

```
用户请求
    ↓
[Intent Gate] — 分析真实意图并分类
    ↓
[Sisyphus] — 主编排器，制定计划并分配任务
    ↓
    ├─→ [Prometheus] — 战略规划（面试模式）
    ├─→ [Atlas] — Todo 编排和执行
    ├─→ [Oracle] — 架构咨询
    ├─→ [Librarian] — 文档/代码搜索
    ├─→ [Explore] — 快速代码库 grep
    └─→ [Category 代理] — 按任务类型专业化执行
```
