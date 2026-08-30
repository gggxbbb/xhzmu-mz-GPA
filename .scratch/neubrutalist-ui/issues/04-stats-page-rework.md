# 04 — 统计页重排 + 图表重涂

**What to build:** 目标分析卡移出后的统计页重新分组排布（汇总 → 指标 → 警告 → 图表）；GpaTrendChart 与 ScoreDistributionChart 按新色板重涂（ink 坐标轴、accent 数据线、signal 目标线、硬边无渐变），图表类型与交互不变。

**Blocked by:** 03 — 首页重排（目标分析卡搬家的另一半）

**Status:** resolved

- [x] 统计页不再渲染目标分析卡，剩余卡片分组重排
- [x] 两图表颜色全部来自新 token，无硬编码色值、无渐变
- [x] 双主题下图表可读（坐标轴/标签随 ink 翻转）
- [x] 既有图表相关测试通过；浏览器冒烟确认双主题渲染

## Comments

已由 subagent 完成：StatsView 按 汇总→指标→警告→图表 语义分组（.stats-group）；两图表颜色改为运行时 getComputedStyle 解析 token（accent 数据线、danger 不及格区间、ink 坐标轴/标签、ink-soft 网格），borderRadius 归零硬边；MutationObserver 监听 documentElement data-theme 翻转触发重绘。grep 验证六个文件无硬编码色值；浏览器冒烟 light/dark 双向即时翻转，canvas 像素采样确认两主题色值正确。
