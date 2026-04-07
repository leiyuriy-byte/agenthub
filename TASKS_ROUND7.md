# AgentHub 第 7 轮任务 — MiniMax 专属

> 分配时间：2026-03-23 02:30
> 触发条件：Phase 3 前三项已完成（采纳答案高亮 / API缓存 / 移动端菜单）

---

## 任务：Agent 版本功能对比表

### 位置
`apps/web/src/app/agents/[id]/page.tsx`
或新建 `apps/web/src/components/agent/version-compare.tsx`

### 功能要求
1. 在 Agent 详情页添加 Tab 切换：**版本详情** | **版本对比**
2. "版本对比"以表格矩阵展示各版本功能差异
3. 表格列 = 各版本号，行 = 功能特性（如：上下文长度、价格、API限制、支持的插件等）
4. 点击某版本 → 切换到该版本（联动现有版本选择器）
5. 无多版本数据时完全不显示此功能

### 数据来源
`agent.versions` 数组，每个版本已有字段：
- `version`: 版本号 string
- `changelog`: 更新说明 string
- `createdAt`: 创建时间

### 技术约束
- TypeScript + Tailwind CSS
- 复用 shadcn/ui 表格组件（如 `Table`, `TableHead`, `TableRow` 等）
- 移动端横向滚动
- 不引入新依赖
- 与现有版本选择器不冲突

### 验收标准
- [ ] Tab 切换正常，状态不丢失
- [ ] 表格美观，与页面风格一致
- [ ] 移动端可横向滚动
- [ ] 无多版本数据时完全不渲染

---

## 完成后
1. 更新 `TASKS.md`：标记"Agent 版本对比表 ✅"
2. 更新 `PROGRESS.md`：Phase 3 完成度 100%，标注 Phase 3 完全收尾
3. 如果所有 Phase 3 + 上线前检查清单均满足，通知小黑准备上线验收

---

## ✅ 完成记录

- **2026-04-08 00:01** — Agent 详情页版本历史区域改用 Tab 切换（版本详情 | 版本对比）
  - 使用 shadcn/ui Tabs 组件
  - 版本对比表格直接展示在 TabContent 中，无需弹窗
  - 点击版本按钮联动右侧边栏版本选择器
  - 无多版本数据时不显示 Tab 组件
  - 构建验证通过（37 routes）
