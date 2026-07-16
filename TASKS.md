# AgentHub 开发任务

> 最后更新：2026-07-16 22:04

---

## 项目状态：🔄 进入优化阶段（第8轮）

> ⚠️ 基础功能虽完成，但 Lighthouse 可访问性 83% 包含多个 0% 项，达不到 SPEC.md 上线标准（要求参考 Linear/Notion 质感）。必须解决以下问题后才能上线。

---

## 本轮任务（2026-07-16）

### ✅ 已完成
1. **项目全部核心功能** — 用户系统、Agent 展示、社区交流、实时通讯、评价反馈、内容管理、后台管理、安全加固、SEO、Lighthouse 性能优化
2. **可访问性优化** — button-name、heading-order、target-size 修复

---

## ⚠️ 剩余优化项

### 1. 可访问性修复（部分完成）🟡

| 问题 | 状态 | 备注 |
|------|------|------|
| button-name | ✅ 已修复 | 添加 aria-label/aria-pressed/aria-selected 到 44 个按钮 |
| color-contrast | ✅ 已修复 | globals.css 主题色对比度符合 WCAG AA |
| heading-order | ✅ 已修复 | 标题层级 h1→h2→h3 正确 |
| target-size | ✅ 已修复 | 所有可点击元素 min-h-[44px] |
| errors-in-console | 🔴 待处理 | 全局排查 console.error |

**验收标准：**
- `npx lighthouse http://localhost:3000 --only-categories=accessibility` A11y ≥ 96%
- 无新增 console.error
- 手动测试：Tab 键导航流畅，所有按钮/链接有文字或 aria-label

### 2. 控制台错误排查 🔴

**具体任务：**
- 启动开发服务器 `cd apps/web && pnpm dev`
- 打开浏览器 Console，访问首页、Agent 列表、用户主页
- 列出所有 console.error，逐个修复

**常见问题模式：：**
- API 请求失败但组件未做空值保护
- 第三方 SDK 初始化错误
- WebSocket 连接失败
- 缺少必要环境变量导致初始化失败

**验收标准：**
- 控制台无任何 Error 级别日志（Warning 可选）

### 3. 构建产物优化（加分项）🟡

| 问题 | 当前状态 | 目标 |
|------|---------|------|
| unminified-javascript | 存在未压缩 JS | 生产构建添加 minification |
| unused-javascript | 存在未使用 JS | Tree-shaking 优化 |
| render-blocking-requests | 存在渲染阻塞请求 | defer/async 处理 |

**验收标准：**
- `pnpm build` 后 `npx lighthouse http://localhost:3000 --only-categories=performance` Performance ≥ 90%

---

## 已完成功能清单

| 模块 | 状态 |
|------|------|
| 用户系统（注册/登录/OAuth/个人主页/等级积分） | ✅ |
| Agent 展示（CRUD/分类/搜索/排行榜/版本管理） | ✅ |
| 社区交流（讨论区/帖子/评论/问答/投票） | ✅ |
| 实时通讯（私信/群组/WebSocket） | ✅ |
| 评价与反馈（评分/评论/用户反馈） | ✅ |
| 内容管理（文章/资源/活动，含文章目录自动生成） | ✅ |
| 后台管理（仪表盘/用户/内容/审核/统计） | ✅ |
| 安全加固（XSS/速率限制/输入校验） | ✅ |
| SEO 优化（metadata/sitemap/robots） | ✅ |
| Lighthouse 性能优化 | ✅ (100%) |
| Lighthouse Best Practices | ✅ (96%) |
| Lighthouse SEO | ✅ (100%) |
| GDPR 合规（数据导出/账号删除） | ✅ |
| 邮件通知（SMTP 集成，欢迎/密码重置/通知邮件） | ✅ |
| 可访问性优化 | ⚠️ 83%（含多个 0% 项，需修复）|
| 构建验证（34 routes） | ✅ |
| 图片 CDN 配置（支持 AWS S3、Cloudflare R2、MinIO、OSS） | ✅ |

---

## 上线标准（未达标，持续迭代）

根据 SPEC.md，以下条件全部满足方可上线：
- ✅ SPEC.md Phase 1 核心功能 — 已完成
- ❌ UI 美观度 — Lighthouse A11y 83%，多个 0% 项，需修复到 ≥ 96%
- ⚠️ 无明显 bug — 控制台存在 Error，需排查
- ✅ 后台管理 — 已实现
- ✅ 移动端适配 — 已实现
- ✅ 基础安全性 — 已加固
- ✅ 数据库设计 — 合理
- ⚠️ 页面加载性能 — 理想环境 Lighthouse 100%，实际部署需验证

---

## 优先级排序

1. **🔴 button-name / heading-order / target-size** — 可访问性核心问题，影响真实用户
2. **🔴 color-contrast** — 影响所有用户阅读体验
3. **🔴 errors-in-console** — 潜在运行时错误
4. **🟡 unminified-javascript / build optimization** — 提升生产环境性能
