# 04 — 统计页重排 + 图表重涂

**What to build:** 目标分析卡移出后的统计页重新分组排布（汇总 → 指标 → 警告 → 图表）；GpaTrendChart 与 ScoreDistributionChart 按新色板重涂（ink 坐标轴、accent 数据线、signal 目标线、硬边无渐变），图表类型与交互不变。

**Blocked by:** 03 — 首页重排（目标分析卡搬家的另一半）

**Status:** ready-for-agent

- [ ] 统计页不再渲染目标分析卡，剩余卡片分组重排
- [ ] 两图表颜色全部来自新 token，无硬编码色值、无渐变
- [ ] 双主题下图表可读（坐标轴/标签随 ink 翻转）
- [ ] 既有图表相关测试通过；浏览器冒烟确认双主题渲染
