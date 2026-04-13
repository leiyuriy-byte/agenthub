# AgentHub - AI Agent 开发者交流社区

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20+-green" alt="Node.js">
  <img src="https://img.shields.io/badge/Docker-Ready-blue" alt="Docker">
</p>

> 面向 AI Agent 开发者、研究者和爱好者的综合性社区平台。集项目展示、技术交流、知识沉淀、生态对接于一体。

## ✨ 功能亮点

- 🤖 **Agent 展示** - 发布、评分、评论、版本管理、分类检索
- 💬 **社区交流** - 讨论区、问答、投票、嵌套评论
- 📧 **实时通讯** - 私信、WebSocket 在线状态、通知推送
- 🏆 **积分系统** - 等级体系、排行榜、每日签到
- 📝 **内容管理** - 博客文章、资源分享、活动日历
- 🔍 **全文搜索** - MeiliSearch 集成（SQL 回退）
- 🛡️ **安全合规** - XSS 防护、速率限制、GDPR 数据导出/删除
- 📊 **后台管理** - 仪表盘、用户管理、内容审核、数据统计

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- SQLite (开发环境) / PostgreSQL (生产环境)

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

访问：
- 前端：http://localhost:3000
- API：http://localhost:3001
- API 文档：http://localhost:3001/docs

### Docker 部署

```bash
# 生产环境一键部署
./deploy.sh --domain yourdomain.com --email admin@yourdomain.com
```

或使用 Docker Compose：

```bash
# 开发环境
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 环境变量

```bash
# apps/api/.env
DATABASE_URL=./data/agenthub.db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001

# 可选：生产环境增强
# SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
# MEILISEARCH_URL, MEILISEARCH_KEY
# REDIS_URL
```

## 📁 项目结构

```
agenthub/
├── apps/
│   ├── web/                 # Next.js 主站前端
│   │   ├── src/
│   │   │   ├── app/        # App Router 页面 (38 路由)
│   │   │   ├── components/ # React 组件
│   │   │   ├── lib/        # 工具函数 & API 客户端
│   │   │   ├── hooks/      # 自定义 Hooks
│   │   │   └── types/      # TypeScript 类型
│   │   └── ...
│   └── api/                 # Fastify API 服务
│       └── src/
│           ├── modules/    # 业务模块 (22 route 文件)
│           ├── plugins/    # Fastify 插件 (cors, helmet, jwt, rate-limit)
│           ├── routes/     # 路由定义 (38 endpoints)
│           ├── services/   # 业务逻辑
│           └── utils/      # 工具函数
├── packages/
│   ├── config/             # 共享 TypeScript 配置
│   ├── db/                 # 数据库 schema (Drizzle ORM)
│   ├── auth/               # JWT + password 工具
│   ├── validators/         # Zod 验证 schemas
│   └── ui/                 # 共享 UI 组件库 (shadcn/ui)
├── services/
│   └── websocket/          # Socket.io WebSocket 服务
├── data/                    # SQLite 数据库文件
├── uploads/                 # 上传文件目录
├── SPEC.md                  # 项目规格说明书
├── PROGRESS.md              # 开发进度追踪
└── DEPLOY.md                # 部署指南
```

## 🎯 技术栈

### 前端

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript (strict mode) |
| 样式 | TailwindCSS + shadcn/ui |
| 动画 | Framer Motion |
| 状态管理 | Zustand + TanStack Query |
| 表单 | React Hook Form + Zod |
| Markdown | @uiw/react-md-editor + rehype-sanitize |

### 后端

| 类别 | 技术 |
|------|------|
| 框架 | Fastify |
| 语言 | TypeScript |
| ORM | Drizzle ORM |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| 认证 | JWT + OAuth (GitHub/Google) |
| 验证 | Zod |
| 文档 | Fastify Swagger |
| 实时通讯 | Socket.io |

### 基础设施

- **包管理**: pnpm workspace
- **代码规范**: ESLint + Prettier
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx + Let's Encrypt SSL

## 📦 已完成模块

### 用户系统 ✅
- 邮箱注册 / 登录 / 登出
- OAuth (GitHub / Google)
- 密码重置 (SMTP 邮件)
- 个人主页 (头像、简介、技术栈、社交链接)
- 用户等级 (L1-L10) + 积分系统
- 关注 / 粉丝系统
- 每日签到 + 连击奖励
- GDPR 合规 (数据导出 / 账号删除)

### Agent 展示 ✅
- Agent CRUD + 截图上传 (最多 5 张)
- 版本管理 (语义化版本 + Changelog)
- 5 星评分 + 分维度评分
- 评论系统 (嵌套回复、点赞、开发者回复)
- 分类标签筛选 + 全文搜索 (MeiliSearch)
- 排行榜 (热门/最新/评分/趋势)
- 相关 Agent 推荐
- 浏览量统计

### 社区交流 ✅
- 多频道讨论区 (综合/技术/求助/展示/资讯/灌水)
- 帖子系统 (Markdown 编辑器 + 实时预览)
- 嵌套评论 (最多 3 层)
- 问答系统 (采纳答案 + 相似问题推荐)
- 投票系统
- 帖子收藏 + 点赞

### 实时通讯 ✅
- 一对一私信 (Markdown 支持)
- WebSocket 在线状态
- 通知中心 (点赞/评论/关注/@/系统通知)
- 消息已读/未读状态

### 内容管理 ✅
- 博客文章 (Markdown + 目录自动生成)
- 资源分享
- 活动日历 (活动发布 + 报名)

### 后台管理 ✅
- 仪表盘 (用户/Agent/帖子统计数据)
- 用户管理 (搜索/角色修改/封禁)
- Agent 管理 (审核/上下架/精选)
- 帖子管理 (置顶/删除)
- 评论管理
- 举报处理
- 系统设置

### 安全与合规 ✅
- XSS 防护 (rehype-sanitize)
- 速率限制 (登录 5/min, 注册 3/hr, API 100/min)
- 输入校验 (Zod schemas)
- 操作日志审计
- GDPR 合规

## 🛠️ 开发指南

### 常用命令

```bash
# 开发
pnpm dev              # 启动全部服务
pnpm build            # 生产构建
pnpm lint             # 代码检查
pnpm lint:fix         # 自动修复

# 数据库
pnpm db:push          # 推送 schema
pnpm db:seed          # 填充种子数据
pnpm db:generate      # 生成迁移
pnpm db:migrate       # 执行迁移

# Docker
docker-compose up -d            # 启动
docker-compose logs -f         # 查看日志
make prod                      # 生产部署
make db-backup                 # 备份数据库
```

### Commit 规范

```
feat: 新功能
fix: Bug 修复
style: 代码格式调整
refactor: 重构
docs: 文档更新
chore: 构建/工具变更
perf: 性能优化
test: 测试
```

## 🎨 设计参考

| 场景 | 参考 |
|------|------|
| 项目展示 | GitHub + Product Hunt |
| 社区交流 | Discord + Reddit |
| 问答知识 | Stack Overflow + 知乎 |
| 后台管理 | Vercel Dashboard + Linear |
| 整体风格 | Linear + Notion |

## 📊 Lighthouse 性能

| 指标 | 分数 |
|------|------|
| Performance | 100% |
| Accessibility | ~95% |
| Best Practices | 100% |
| SEO | 100% |

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
