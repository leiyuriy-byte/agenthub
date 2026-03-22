# AgentHub 开发任务 - 第 5 轮迭代

> 上次更新：2026-03-22 22:30（第6轮任务规划）

## 已完成（第 1-5 轮）
- 全部 Phase 1 基础功能 ✅
- Phase 2 全部完成 ✅（OAuth / MeiliSearch / 邮件通知 / 数据统计）
- Phase 3 第1批全部完成 ✅（举报管理 / Agent版本选择器 / 截图灯箱 / Q&A增强 / 列表懒加载）

---

## 第 6 轮任务（Phase 3 收尾）

### Phase 3 已完成 ✅
- ✅ 举报管理 /admin/reports（完整处理流程：忽略/警告/删除/封禁）
- ✅ Agent 截图灯箱预览（lightbox + 键盘导航 ← + →）
- ✅ Agent 版本选择器（版本下拉 + changelog 展示）
- ✅ Q&A 增强（相似问题推荐 5 条 + 采纳答案 toast 提示）
- ✅ 列表图片懒加载（next/image loading="lazy"）
- ✅ navbar 移动端响应式适配

### 待完成（Phase 3 收尾）
1. **采纳答案置顶 + 高亮** → 采纳后该评论固定在顶部，有视觉区分（⭐ 核心）
2. **API 内存缓存** → agents列表/首页统计热点数据，node-cache 即可
3. **移动端 hamburger menu 抽屉** → 导航完整侧边栏（影响可用性）
4. **Agent 版本对比** → 不同版本功能对比表（次要）
5. **Lighthouse Performance 90+** → 重点 LCP/CLS（延后到测试阶段）

### 优先级
1. 采纳答案置顶高亮（Q&A核心，必须有）
2. 移动端 hamburger 抽屉（影响日常使用）
3. API缓存（性能，部署前做）
4. Agent版本对比（次要）
5. Lighthouse调优（测试阶段）

---

### 上线前检查清单
- ✅ 核心功能全部可用
- ✅ WebSocket 实时推送
- ✅ UI 质感达到参考标准
- ✅ 后台管理完整（用户/Agent/帖子/评论/统计/举报管理）
- ✅ 数据统计图表完整（7个端点）
- ✅ 数据库设计合理
- ✅ Docker 部署就绪
- ✅ 基础安全性（XSS/CSRF/速率限制）
- ✅ 举报审核流程完整
- ✅ Q&A 增强（相似问题 + 采纳按钮）
- ✅ Agent 版本管理（选择器 + changelog）
- ✅ 截图灯箱预览
- ⏳ 采纳答案置顶高亮（待实现）
- ⏳ 移动端 hamburger 抽屉（待实现）
- ⏳ API 内存缓存（待实现）
- ⏳ Lighthouse Performance 90+（待测评）
- ⏳ 移动端真机验证（待真机测试）

**Phase 3 完成度：~85%**
