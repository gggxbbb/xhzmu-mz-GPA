# 02 — `.neo-*` 签名类 + 清除组件内联样式

**What to build:** 新粗野主义签名（粗边框 + 硬阴影 + 按压反馈）收敛为 `.neo-card`、`.neo-btn`、`.neo-input` 等共享签名类，语义变体用修饰类（如 `.neo-card--danger`）表达；所有组件改用签名类 + scoped 布局样式，内联样式清零。用户看到：每个页面元素获得统一的新粗野主义外观与按压反馈。

**Blocked by:** 01 — 新粗野主义 token 体系

**Status:** claimed

- [ ] 签名类封装边框 + 硬阴影 + 按压态（`:active` 位移 + 阴影缩小），全站只定义一次
- [ ] warning 类卡片（TargetAnalysisCard、DangerZone、FailingWarningCard、IllegalWarning 等）改用修饰类，不再手写颜色
- [ ] 全部组件内联样式清零（`style="..."` 属性不再出现在组件模板中，动态绑定除外且只能引用变量类）
- [ ] `theme-variables.test.js` 更新到新 token 名，并扩展覆盖「无内联样式」与签名类使用
- [ ] 既有全部测试通过；双主题浏览器冒烟无裸色/无主题泄漏
