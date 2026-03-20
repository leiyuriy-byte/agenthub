# TASKS.md - AgentHub 开发任务

## 第 1 轮任务（已完成 ✅）

全部完成：
- 项目 monorepo 结构
- 基础包初始化
- UI 组件
- auth 包
- db 包
- API 服务器
- Agent 模块后端
- Auth 模块前后端
- 登录/注册页面

---

## 第 2 轮任务（已完成 ✅ 2026-03-20）

### 全部完成清单

1. ✅ **全局导航栏**
   - 创建 `apps/web/src/components/layout/navbar.tsx`
   - 左侧：AgentHub Logo + 首页链接
   - 中间：搜索框
   - 右侧：创建 Agent 按钮 + 通知图标 + 用户头像下拉菜单
   - 登录后显示用户菜单，未登录显示登录/注册按钮
   - 移动端汉堡菜单
   - framer-motion 动画

2. ✅ **首页重构**
   - Hero 区域：标语 + 搜索框 + CTA 按钮
   - 精选 Agent 展示（横向滚动卡片）
   - 热门讨论预览
   - 分类快捷入口
   - 未登录也能看到，视觉冲击力强
   - framer-motion 动画

3. ✅ **Agent 创建/编辑页面**
   - 创建：`/agents/new`
   - 编辑：`/agents/:id/edit`
   - 表单字段完整：名称、Logo URL、一句话描述、详细描述（Markdown）、分类、标签（多选）、Demo链接、GitHub链接、文档链接
   - 表单验证（Zod schema）
   - 支持草稿保存
   - 创建后跳转到 Agent 详情页

4. ✅ **用户设置页面**
   - 路由：`/settings`
   - 个人资料编辑：昵称、Bio、头像 URL
   - 社交链接管理
   - 安全设置：修改密码（UI 完成）
   - 退出登录

5. ✅ **Post（帖子）后端 API**
   - `post.service.ts` + `post.routes.ts`
   - CRUD：创建帖子、获取帖子列表（分页、频道筛选、排序）、获取帖子详情、更新、删除
   - 字段完整：标题、内容（Markdown）、频道ID、标签、类型
   - 点赞、踩、收藏功能
   - Zod 验证，JWT 鉴权

6. ✅ **Channel（频道）后端 API**
   - `channel.service.ts` + `channel.routes.ts`
   - 频道列表、频道详情、帖子计数

7. ✅ **讨论区页面**
   - 路由：`/discussions`
   - 左侧：频道列表侧边栏
   - 右侧：帖子列表（标题、作者、时间、点赞、评论数、标签）
   - 顶部：排序 + 筛选 + 创建帖子按钮
   - 帖子详情页：`/discussions/:id`
   - Markdown 内容渲染，代码块语法高亮（样式）

8. ✅ **用户个人主页**
   - 路由：`/users/:id`
   - 展示：头像、昵称、Bio、技术栈标签、社交链接
   - 统计面板：发布 Agent 数、帖子数、粉丝数、关注数
   - Tab 切换：Ta 的 Agents / Ta 的帖子
   - 关注/取关功能

9. ✅ **用户关注功能 API**
   - `user.service.ts` 增加 follow/unfollow 方法
   - 获取关注列表、粉丝列表
   - 不能关注自己

10. ✅ **全局 Footer 组件**
    - `apps/web/src/components/layout/footer.tsx`
    - 内容：版权信息、快速链接、社交媒体
    - 所有页面底部显示，移动端适配

---

## 第 3 轮任务（待开发）

### 高优先级
1. 评论与回复系统（后端 + 前端）
2. 消息通知系统
3. 实时通讯（WebSocket）

### 中优先级
4. 后台管理系统（用户管理、内容审核、Agent管理）
5. 用户积分与等级系统
6. 搜索功能优化（MeiliSearch 集成）

### 低优先级
7. OAuth 第三方登录（GitHub/Google）
8. 邮件通知
9. 数据统计图表

---

## 遇到的问题 ⚠️
- better-sqlite3 native module 编译失败（Node.js v25 不兼容），需要：
  - 方案1：切换到 libsql (sql.js)
  - 方案2：降级 Node.js 到 v20 LTS
  - 方案3：使用 Docker 容器化部署
