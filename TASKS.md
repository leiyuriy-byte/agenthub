# TASKS.md - AgentHub 开发任务

## 第 1-3 轮任务
详见 git 历史，全部已完成 ✅

---

## 第 4 轮任务（2026-03-20 完成）

### ✅ 已完成 - 全部任务

1. **后台管理系统** ✅
   - 路由：`/admin`（仅 admin/moderator 角色可访问）
   - 仪表盘：用户总数、Agent总数、帖子总数、今日活跃
   - 用户管理：/admin/users（列表、搜索、角色修改、删除）
   - Agent 管理：/admin/agents（列表、搜索、状态管理、精选、删除）
   - 帖子管理：/admin/posts（列表、搜索、置顶、删除）
   - 评论管理：/admin/comments（列表、搜索、删除）
   - 后端：admin.service.ts + admin.routes.ts

2. **私信功能** ✅
   - 后端：message.service.ts + message.routes.ts（完善）
   - 前端：/messages 列表、/messages/[id] 聊天页、/messages/new 新建对话
   - 未读消息计数（navbar badge + API）
   - useAuth hook 修复（修复 useAuth 缺失）

3. **全局搜索功能** ✅
   - 后端：search.service.ts（统一搜索 Agent/Post/User）
   - 后端：search.routes.ts
   - 前端：/search 页面（分类筛选、分页）
   - 导航栏搜索框接入真实 API

4. **Markdown 编辑器增强** ✅
   - 组件：components/markdown/markdown-editor.tsx
   - 工具栏：加粗、斜体、代码、链接、图片、列表、引用、标题
   - 实时预览（内置切换按钮）
   - 键盘快捷键（Ctrl+B/I/K）
   - 已集成到 /discussions/new

5. **SEO 优化** ✅
   - 全局 metadata（title、description、og tags）
   - sitemap.ts 自动生成站点地图
   - robots.txt 配置爬虫规则

6. **加载状态与空状态** ✅
   - skeleton.tsx（AgentCardSkeleton、PostCardSkeleton、UserCardSkeleton、TableRowSkeleton 等）
   - empty-state.tsx（AgentsEmptyState、PostsEmptyState、UsersEmptyState、MessagesEmptyState 等）

---

## 待开发（第 5 轮）

### 高优先级
- 移动端适配优化（体验基础）
- 页面加载性能优化（Next.js 静态生成、图片懒加载）
- 实时通讯（WebSocket）推送

### 中优先级
- 用户积分与等级系统
- OAuth 第三方登录（GitHub/Google）
- 邮件通知
- 数据统计图表

### 低优先级
- 搜索功能优化（MeiliSearch 集成）

---

## ⚠️ 注意事项
- 所有新页面已做好移动端适配
- 保持代码风格一致
- 完成后更新 PROGRESS.md
