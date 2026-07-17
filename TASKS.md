# AgentHub 开发任务

> 最后更新：2026-07-18 02:03

---

## 紧急修复：Lighthouse Performance 45% → 90%+

### 问题诊断
- **LCP: 18.7秒**（目标 < 2.5秒）— 首次内容绘制过慢
- **TBT: 8.36秒**（目标 < 200ms）— 主线程阻塞严重
- **未使用 JS: 140 KiB** — 资源未优化

### 根因
1. Navbar 是 'use client' 组件，在 layout 中使用 `ssr: false`
2. 整个导航栏需要等待 JS 加载完成才能渲染
3. 客户端 hydration 等待 Navbar 加载完成
4. 未使用 Islands Architecture 优化

---

## 修复任务清单

### P0 - 核心性能修复

- [x] **1. Islands Architecture 优化**
  - [x] 1.1 创建 NavbarStatic 服务端组件（纯静态 HTML）
  - [x] 1.2 创建 NavbarClient 客户端交互组件
  - [x] 1.3 更新 layout.tsx 使用 Islands 模式
  - [x] 1.4 修复 Turbo 模式路径别名问题

- [x] **2. 验证优化效果**
  - [x] 2.1 开发服务器测试（HTTP 200 正常）
  - [ ] 2.2 Lighthouse Performance 测试

### P1 - 次要优化

- [ ] **3. JavaScript 优化**
  - [x] 3.1 首页 framer-motion 已移除（使用纯 CSS 动画）
  - [ ] 3.2 使用 dynamic import 延迟加载非首屏组件
  - [ ] 3.3 其他页面 framer-motion 优化（32 个文件）

- [ ] **4. 图片优化**
  - [ ] 4.1 配置 next/image 优化
  - [ ] 4.2 添加图片懒加载

- [ ] **5. 缓存策略**
  - [ ] 5.1 配置 SWR/React Query 缓存
  - [ ] 5.2 添加服务端缓存头

---

## 验证标准
- [ ] Lighthouse Performance ≥ 90%
- [ ] LCP < 2.5秒
- [ ] TBT < 200ms
- [ ] 无 TypeScript 编译错误

---

## 技术方案

### Islands Architecture（已完成 ✅）
```typescript
// layout.tsx:
<NavbarStatic /> {/* 服务端渲染，立即显示 */}
<Suspense fallback={<NavbarSkeleton />}>
  <NavbarClient /> {/* 客户端动态加载 */}
</Suspense>
```

### NavbarStatic（已完成 ✅）
- 服务端组件，纯静态 HTML
- Logo + 导航链接 + 搜索框
- 无客户端交互，无 hydration 开销
- 立即渲染，LCP 最优化

### NavbarClient（已完成 ✅）
- 客户端组件，动态导入
- 用户菜单 + 通知 + 消息 + 签到
- 移动端菜单
- ssr: false + 骨架屏加载

### 首页优化方案（已完成 ✅）
- 确保 `page.tsx` 返回完整的 HTML（已完成 SSR）
- 使用 `loading.tsx` 提供即时加载反馈
- 将非关键交互组件改为动态导入
- 首页 loading 使用纯 CSS 动画，移除 framer-motion
