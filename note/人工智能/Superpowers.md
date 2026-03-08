# Superpowers 最佳使用方式

## 简介

Superpowers 是一个完整的 AI 编码代理软件开发生工作流框架，基于一组可组合的"技能"构建。

核心理念：
- 测试驱动开发（TDD）
- 系统化方法 > 临时猜测
- 复杂度简化作为主要目标
- 证据 > 声明（验证后再宣布成功）

## 安装

### Claude Code
```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### Cursor
```
/plugin-add superpowers
```

### OpenCode
```
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md
```

### Codex
```
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.codex/INSTALL.md
```

### 验证安装
开始新会话后，请求触发技能的内容（如"帮我规划这个功能"或"调试这个问题"），代理应自动调用相关技能。

## 基本工作流程

1. **brainstorming** - 写代码前激活。完善想法，探索替代方案，分块展示设计供确认，保存设计文档

2. **using-git-worktrees** - 设计批准后激活。创建隔离的工作空间和新分支，运行项目设置，验证干净的测试基线

3. **writing-plans** - 设计通过后激活。将工作分解为可管理的任务（每个 2-5 分钟），每个任务有精确的文件路径、完整代码、验证步骤

4. **subagent-driven-development** / **executing-plans** - 有计划后激活。每个任务分发新的子代理进行两阶段审查（规范合规性、代码质量），或批量执行并设置检查点

5. **test-driven-development** - 实现期间激活。强制 RED-GREEN-REFACTOR：写失败测试→看它失败→写最小代码→看它通过→提交。删除测试前写的代码

6. **requesting-code-review** - 任务间激活。根据计划审查，按严重程度报告问题。关键问题阻止进度

7. **finishing-a-development-branch** - 任务完成时激活。验证测试，呈现选项（合并/PR/保留/丢弃），清理 worktree

## 技能库

### 测试
- `test-driven-development` - RED-GREEN-REFACTOR 循环

### 调试
- `systematic-debugging` - 4 阶段根因分析
- `verification-before-completion` - 确保真正修复

### 协作
- `brainstorming` - 苏格拉底式设计完善
- `writing-plans` - 详细实现计划
- `executing-plans` - 批量执行与检查点
- `dispatching-parallel-agents` - 并发子代理工作流
- `requesting-code-review` - 预审查清单
- `receiving-code-review` - 响应反馈
- `using-git-worktrees` - 并行开发分支
- `finishing-a-development-branch` - 合并/PR 决策工作流
- `subagent-driven-development` - 快速迭代两阶段审查

### 元技能
- `writing-skills` - 创建新技能
- `using-superpowers` - 技能系统入门

## 使用技巧

1. **技能自动触发** - 无需特殊操作，代理会在任何任务前检查相关技能

2. **Mandatory Workflows** - 强制工作流，不是建议

3. **子代理自主运行** - Claude 可以自主工作数小时不偏离计划

4. **更新技能**
```
/plugin update superpowers
```

## 场景一：从 0-N 启动新项目

从零开始一个新项目时，Superpowers 提供完整的开箱即用流程。

### 步骤一：需求澄清（brainstorming）

启动项目时，不要直接写代码。与代理进行开放式对话：

```
"我想要构建一个任务管理系统，需要支持用户注册、任务 CRUD、标签分类"
```

代理会：
- 询问目标用户、使用场景、性能要求
- 探索 2-3 种可行方案及其权衡
- 分块展示设计供你确认（而不是一次性给完整方案）
- 生成设计文档保存到 `docs/plans/`

### 步骤二：环境准备（using-git-worktrees）

设计确认后，代理自动：
- 创建新的 git worktree（隔离工作空间）
- 创建新分支
- 安装依赖、运行项目初始化
- 验证测试基线（确保从干净状态开始）

### 步骤三：制定计划（writing-plans）

设计文档确认后，代理制定详细实现计划：
- 每个任务 2-5 分钟可完成
- 精确的文件路径
- 完整的代码（包括测试）
- 验证步骤

### 步骤四：执行开发（subagent-driven-development）

你说"开始"后：
- 每个任务由独立子代理执行
- 两阶段审查：先检查规范合规性，再检查代码质量
- 代理可自主工作数小时不偏离计划

### 步骤五：测试驱动（test-driven-development）

实现时强制执行 RED-GREEN-REFACTOR：
1. 写一个失败的测试
2. 运行看它失败
3. 写最小代码让它通过
4. 重构
5. 提交

**关键：测试必须在代码之前写**

### 步骤六：代码审查（requesting-code-review）

任务之间触发审查：
- 对照计划检查实现
- 按严重程度报告问题
- 关键问题阻止继续

### 步骤七：完成分支（finishing-a-development-branch）

所有任务完成后：
- 运行完整测试套件
- 呈现选项：合并 / PR / 保留 / 丢弃
- 清理 worktree

## 场景二：遗留项目从 1-N 添加功能

在现有项目中增加新功能，需要先理解现有代码再制定计划。

### 场景 2A：添加新功能

#### 步骤一：理解现有代码库

代理首先探索项目结构：
- 读取关键文件、README、配置文件
- 了解现有架构和代码风格
- 识别与新功能相关的现有模块

#### 步骤二：设计新功能（brainstorming）

基于对现有代码的理解：
- 明确新功能的目标
- 确定与现有代码的集成点
- 设计接口和数据流
- **特别注意：不破坏现有功能**

#### 步骤三：制定计划（writing-plans）

计划中明确：
- 新增文件 vs 修改现有文件
- 需要兼容的现有测试
- 回归测试策略

#### 步骤四：执行开发（test-driven-development）

使用 TDD：
- 先写新功能的测试
- 确保新功能不破坏现有功能
- 必要时添加回归测试

#### 步骤五：验证（verification-before-completion）

功能完成后：
- 运行完整测试套件
- 手动验证关键路径
- 确保没有引入回归

### 场景 2B：重构现有模块

当需要重构遗留代码时，Superpowers 提供安全重构流程。

#### 步骤一：理解目标模块（systematic-debugging）

使用系统化调试技能：
- 识别需要重构的代码
- 理解当前实现逻辑
- 确定重构边界和依赖

#### 步骤二：创建重构计划（brainstorming + writing-plans）

与代理讨论：
- 重构目标（可读性、性能、可维护性）
- 重构策略（渐进式 vs 大爆炸）
- 保持功能兼容的计划
- 每个重构步骤的验证点

#### 步骤三：安全执行（test-driven-development）

重构铁律：
1. **先有测试覆盖** - 确保目标模块有足够测试
2. **小步重构** - 每次只改一件事
3. **红绿循环** - 每步都运行测试
4. **提交** - 每步完成后立即提交

```
重构流程：
┌─────────────────────────────────────┐
│  1. 写一个测试描述期望行为          │
│  2. 运行测试（应该通过）           │
│  3. 重构代码                       │
│  4. 运行测试（应该通过）           │
│  5. 提交                           │
│  6. 重复                           │
└─────────────────────────────────────┘
```

#### 步骤四：验证重构（verification-before-completion）

重构完成后：
- 完整测试套件通过
- 手动测试关键功能
- 性能测试（如适用）
- 代码审查

### 遗留项目关键原则

1. **不破坏现有功能** - 每次变更后测试
2. **理解优先运行** - 在修改前充分理解现有代码
3. **渐进式变更** - 避免大爆炸式重写
4. **保持兼容** - 对外接口变更保持向后兼容
5. **测试先行** - 重构必须有测试覆盖

## 参考

- GitHub: https://github.com/obra/superpowers
- 文档: https://github.com/obra/superpowers-marketplace
