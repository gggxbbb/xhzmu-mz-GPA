# 06 — 底部导航 SVG 图标

**What to build:** 底部导航的 emoji 图标（🏠📊⚙️）替换为粗描边内联 SVG 图标，颜色取 `--ink` 随主题翻转；「我的」tab 图标从齿轮改为人形（其内容是 profile 管理而非设置）。激活态样式保持可辨识。

**Blocked by:** 02 — `.neo-*` 签名类 + 清除组件内联样式

**Status:** resolved

- [ ] 三个 tab 图标均为内联 SVG，粗描边，颜色来自 `--ink`
- [ ] 「我的」图标为人形语义
- [ ] 激活态在双主题下清晰可辨
- [ ] 无障碍：`aria-current` 等现有语义保留

## Comments

已由 subagent 完成：emoji 换粗描边内联 SVG（stroke-width 3、currentColor 随 --ink 翻转），我的=人形，aria-current 保留，双主题冒烟通过。
