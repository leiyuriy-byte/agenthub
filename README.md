# AgentHub - AI Agent 开发者交流社区

<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Development-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20+-green" alt="Node.js">
</p>

> 面向 AI Agent 开发者、研究者和爱好者的综合性社区平台

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- SQLite (开发环境)

### 安装

```bash
# 克隆仓库
git clone https://github.com/agenthub/agenthub.git
cd agenthub

# 安装依赖
pnpm install

# 复制环境变量
cp apps/api/.env.example apps/api/.env

# 初始化数据库
pnpm db:push
pnpm db:seed

# 启动开发服务器
pnpm dev
```

### 环境变量

```bash
# apps/api/.env
DATABASE_URL=./data/agenthub.db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
```

## 📁 项目结构

```
agenthub/
├── apps/
│   ├── web/                 # Next.js 主站前端
│   │   ├── src/
│   │   │   ├── app/        # App Router 页面
│   │   │   ├── components/ # React 组件
│   │   │   ├── lib/        # 工具函数
│   │   │   ├── hooks/      # 自定义 Hooks
│   │   │   ├── providers/  # Context Providers
│   │   │   └── types/      # TypeScript 类型
│   │   └── ...
│   ├── api/                 # Fastify API 服务
│   │   ├── src/
│   │   │   ├── modules/    # 业务模块
│   │   │   ├── plugins/    # Fastify 插件
│   │   │   ├── routes/     # 路由定义
│   │   │   ├── middlewares/ # 中间件
│   │   │   ├── services/   # 业务逻辑
│   │   │   ├── types/      # 类型定义
│   │   │   └── utils/      # 工具函数
│   │   └── ...
│   └── admin/               # 后台管理系统 (规划中)
├── packages/
│   ├── config/             # 共享 TypeScript 配置
│   ├── db/                 # 数据库 schema 和工具
│   ├── auth/               # 认证相关
│   ├── validators/         # Zod 验证 schemas
│   └── ui/                 # 共享 UI 组件库
├── services/
│   └── websocket/          # WebSocket 服务 (规划中)
├── SPEC.md                 # 项目规格说明书
└── pnpm-workspace.yaml     # pnpm workspace 配置
```

## 🎯 技术栈

### 前端

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript (strict mode)
- **样式**: TailwindCSS + shadcn/ui
- **动画**: Framer Motion
- **状态管理**: Zustand + TanStack Query
- **表单**: React Hook Form + Zod
- **编辑器**: @uiw/react-md-editor

### 后端

- **框架**: Fastify
- **语言**: TypeScript
- **ORM**: Drizzle ORM
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **认证**: JWT + OAuth
- **验证**: Zod
- **文档**: Fastify Swagger

### 基础设施

- **包管理**: pnpm workspace
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript strict mode

## 📦 模块说明

### 用户系统

- 邮箱注册/登录
- OAuth (GitHub, Google)
- 个人主页管理
- 用户等级与积分
- 关注/粉丝系统
- 消息通知

### Agent 展示

- Agent 项目卡片与详情
- 版本管理
- 分类与标签系统
- 全文搜索 (MeiliSearch)
- 排行榜

### 社区交流

- 讨论区 (多频道)
- 帖子系统 (支持 Markdown)
- 嵌套评论
- 问答系统
- 投票系统

### 实时通讯

- 私信
- 群组聊天
- 在线状态

### 内容管理

- 博客/文章系统
- 资源分享
- 活动日历

### 后台管理

- 仪表盘
- 用户管理
- 内容审核
- 系统设置
- 数据统计

## 🛠️ 开发指南

### 代码规范

```bash
# 代码检查
pnpm lint

# 自动修复
pnpm lint:fix

# 代码格式化
pnpm format
```

### Commit 规范

```
feat: 新功能
fix: Bug 修复
style: 代码格式调整
refactor: 重构
docs: 文档更新
chore: 构建/工具变更
```

### 数据库操作

```bash
# 生成迁移
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 推送 schema 到数据库
pnpm db:push

# 填充种子数据
pnpm db:seed
```

## 🎨 设计参考

| 场景 | 参考 |
|------|------|
| 项目展示 | GitHub + Product Hunt |
| 社区交流 | Discord + Reddit |
| 问答知识 | Stack Overflow + 知乎 |
| 后台管理 | Vercel Dashboard + Linear |
| 整体风格 | Linear + Notion |

## 📄 License

MIT License - see LICENSE file for details

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
