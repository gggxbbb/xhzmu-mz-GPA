# 07 — 删除 `css/` pico 死文件

**What to build:** 删除仓库根目录 `css/` 下全部无引用的 pico CSS 变体文件（200+ 个），让「样式在哪」只有一个答案。应用行为零变化。

**Blocked by:** None — can start immediately

**Status:** resolved

- [ ] `css/` 目录整体删除
- [ ] 全局搜索确认无任何引用（index.html、源码、public/manifest.json）
- [ ] 开发与构建流程不受影响（dev server 与 build 均正常）

## Comments

已删除 css/ 目录（239 个文件），全局零引用，dev/build 脚本不涉及。
