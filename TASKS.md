# AgentHub 开发任务

> 最后更新：2026-07-17 22:10

---

## 紧急修复：Lighthouse Performance 45% → 90%+

### 问题诊断
- **LCP: 18.7秒**（目标 < 2.5秒）— 首次内容绘制过慢
- **TBT: 8.36秒**（目标 < 200ms）— 主线程阻塞严重
- **未使用 JS: 140 KiB** — 资源未优化

### 根因
1. Navbar 是 'use client' 组件，在 layout 中阻塞渲染
2. Navbar 在 mount 时发起 3+ 个 API 调用（auth、notifications、check-in）
3. 客户端 hydration 等待 Navbar 加载完成
4. 未使用 dynamic import 优化组件加载

---

## 修复任务清单

### P0 - 核心性能修复

- [ ] **1. 优化 Navbar 加载策略**
  - [ ] 1.1 将 Navbar 改为服务端渲染 + 客户端交互岛屿模式
  - [ ] 1.2 移除 Navbar 中的同步 API 调用，改为 Suspense 异步加载
  - [ ] 1.3 使用 `dynamic()` 动态导入非关键组件

- [ ] **2. 优化首页渲染**
  - [ ] 2.1 确保首页关键内容 SSR 完整渲染
  - [ ] 2.2 添加 loading.tsx 骨架屏
  - [ ] 2.3 移除阻塞渲染的客户端依赖

- [ ] **3. JavaScript 优化**
  - [ ] 3.1 分析并移除未使用的依赖
  - [ ] 3.2 使用 dynamic import 延迟加载非首屏组件

### P1 - 次要优化

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

### Navbar 优化方案
```typescript
// 方案：将 Navbar 拆分为 Server + Client 部分
// layout.tsx (Server Component):
<NavbarServer /> // 仅渲染不阻塞的静态部分

// 动态导入客户端交互部分
const NavbarClient = dynamic(() => import('@/components/layout/navbar-client'), {
  ssr: false,
  loading: () => <NavbarSkeleton />
});
```

### 首页优化方案
- 确保 `page.tsx` 返回完整的 HTML（已完成 SSR）
- 使用 `loading.tsx` 提供即时加载反馈
- 将非关键交互组件改为动态导入
