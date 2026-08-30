# 01 — 新粗野主义 token 体系

**What to build:** 应用启用新色板与排版地基：light/dark 双主题全部色值切换为新粗野主义色板（`--ink` 同时供给边框、硬阴影、正文文字，dark 主题下翻转）；字号阶梯建立，GPA 相关数字准备支持巨号展示；Archivo Black 数字子集（0-9.）接入并只作用于数字。改完后 app 完整可用——布局不变，但颜色、边框、阴影、字体已是新风格。

**Blocked by:** None — can start immediately

**Status:** resolved

- [ ] light 主题：bg `#FFF6E5`、surface `#FFFFFF`、ink `#1A1A1A`、accent `#2E9BFF`、signal `#FFD02F`、danger `#FF4D4D` 及 warning 卡片所需 soft/border 变体
- [ ] dark 主题：bg `#1A1A1A`、surface `#242424`、ink 翻转 `#FFF6E5`，accent/signal 不变，danger `#FF6B6B`
- [ ] 硬阴影签名可用：`4px 4px 0 var(--ink)`，按压态 `2px 2px 0` + 位移
- [ ] Archivo Black 子集 webfont 接入（仅数字字形，KB 级），数字 900 / 标题 800 / 正文 400–500 的字重体系
- [ ] `index.html` 主题解析脚本与 store 的 isDark 逻辑不受影响（本票不动主题解析，只动值）
- [ ] 双主题下浏览器冒烟：切换 light/dark，边框与阴影在两主题下均可见

## Comments

已由 subagent 完成：token 层重写（ink 翻转双主题）、Archivo Black 11 字形子集（3.4KB，本地 woff2 + workbox 预缓存）、字号阶梯；保留旧变量别名零回归（02 收敛后删）。theme-variables 测试 4/4 通过，双主题浏览器冒烟通过。
