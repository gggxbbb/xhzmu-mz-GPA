# 新粗野主义 UI 改版

**Status:** done

## Problem Statement

用户（医学生）使用手机上的 PWA 录入成绩、查看 GPA 与 Target GPA 的差距。当前界面视觉风格平庸、GPA 这一核心信息不够醒目，且组件内联样式散落各处，主题一致性只能靠测试事后兜底。

## Solution

一次性整体改版：大字移动优先的信息层次（GPA 巨号化）+ 新粗野主义视觉风格（粗实线边框、无模糊硬阴影、高饱和平涂色块），保留完整 auto/light/dark 三态主题（ink 翻转方案），并把样式代码收敛为「token + 签名类 + scoped 布局」三层架构。三 tab 骨架（计算/统计/我的）不动。

设计决策全文见 `docs/adr/0003-neubrutalist-ui-redesign.md`。

## User Stories

1. As a student, I want to see my current GPA as a huge number on the home page, so that I can glance at it in one second.
2. As a student, I want the target-analysis summary (how far I am from my Target GPA) next to the big GPA number on the home page, so that I don't have to switch to the stats tab for the most important question.
3. As a student, I want large touch targets for grade entry on my phone, so that I can enter scores one-handed without mis-taps.
4. As a student, I want the app to respect my system dark mode, so that using it at night doesn't blind me.
5. As a student, I want the dark theme to still look like the same design (borders and shadows visible), so that the app doesn't feel like two different products.
6. As a student, I want warning cards (failing courses, illegal grades) to be visually loud, so that I notice problems immediately.
7. As a student, I want buttons to give tactile press feedback, so that the app feels responsive.
8. As a student, I want the bottom navigation icons to look crisp and consistent, so that the UI feels intentionally designed rather than default.
9. As a student, I want the stats page charts to match the app's color palette, so that the whole app feels coherent.
10. As a student, I want the profile/settings page to follow the same visual language, so that every tab feels like one product.
11. As a student with the app installed as a PWA, I want the first load to stay fast, so that the digit display font must not add meaningful weight.
12. As a returning user with existing data, I want all my profiles, grades and settings untouched by the redesign, so that a visual update never risks my data.
13. As a maintainer, I want all colors/borders/shadows to come from theme variables, so that components are automatically correct in both themes.
14. As a maintainer, I want zero inline styles in components, so that theme regressions of the hardcoded-color kind become impossible.
15. As a maintainer, I want the neubrutalist signature (border + hard shadow + press state) defined once, so that changing it later is a one-line edit.
16. As a maintainer, I want dead CSS files removed, so that "where do styles live" has one answer.

## Implementation Decisions

- **Palette tokens**: `--bg`, `--surface`, `--ink`, `--accent`, `--signal`, `--danger`, plus soft/border variants for warning cards. Light: bg `#FFF6E5`, surface `#FFFFFF`, ink `#1A1A1A`, accent `#2E9BFF`, signal `#FFD02F`, danger `#FF4D4D`. Dark: bg `#1A1A1A`, surface `#242424`, ink flips to `#FFF6E5`; accent/signal unchanged; danger brightens to `#FF6B6B`. `--ink` feeds borders, hard shadows AND body text — one token flips all three across themes.
- **Hard shadow signature**: `box-shadow: 4px 4px 0 var(--ink)`; pressed state `2px 2px 0` + matching translate. No blur, no alpha.
- **Typography**: Chinese text uses the system stack; digits (`0-9.`) use an Archivo Black subset webfont (≈11 glyphs, KB-scale). Weights: digits 900, headings 800, body 400/500. GPA hero number sized 56–72px.
- **Information architecture**: the three-tab skeleton stays. The target-analysis card moves from the stats tab to the home page beside the hero GPA. Page interiors get re-prioritized (home: hero → stats chips → search → semester list).
- **Style architecture**: `styles.css` holds ONLY design tokens and signature classes (`.neo-card`, `.neo-btn`, `.neo-input`, with modifier variants like `.neo-card--danger`); component-specific layout lives in each component's `<style scoped>`; ALL inline styles are purged from components.
- **Navigation icons**: emoji replaced by inline SVG icons with thick strokes using `--ink`; the "我的" tab icon changes from a gear to a person glyph (its content is profile management, not settings).
- **Charts**: GpaTrendChart and ScoreDistributionChart are repainted with the new palette (ink axes, accent data, signal target line, hard edges, no gradients); chart types and interactions unchanged.
- **Dead code**: the unreferenced `css/` pico files at repo root are deleted.
- **Data safety**: zero changes to stores, storage format, or migration logic.
- **Sequencing**: three batches on a feature branch — tokens → signature classes + inline-style purge → page-by-page re-layout — each batch independently verifiable and revertible, merged when complete.

## Testing Decisions

- Good tests assert external behavior only: which classes a component renders with, absence of inline styles, presence of theme-variable references — never internal structure.
- **Seam**: the existing Vitest + `@vue/test-utils` component-mount seam is the ONLY seam. Prior art: `tests/components/theme-variables.test.js`.
- `theme-variables.test.js` is updated to the new token names and extended to cover the inline-style purge and signature-class usage where observable.
- Existing store/composable/util tests must keep passing untouched (they are below the UI seam and prove data safety).
- Page-level re-layout is verified by browser smoke (manual), not automated tests.

## Out of Scope

- Navigation structure changes (the three tabs stay).
- New features: no new stats, no new chart types, no changes to grade entry mechanics beyond styling/layout.
- Store, storage-format, or migration changes.
- Full Chinese webfont.
- Any CSS framework adoption (Tailwind/UnoCSS etc.).

## Further Notes

- Theme resolution inline script in `index.html` and `isDark` computed in the app store must stay consistent — the redesign does not touch theme *resolution*, only theme *values*.

## Comments

- 2026-09-10：全部 7 个 ticket 完成（b0d127a → 3e0ffaa merge），后续跟进 163816b（useThemeTokens 抽取、PWA chrome 颜色）与 cf03e3e（stat chips 等宽网格、硬阴影裁切修复）。验收：测试全绿、构建成功、三态主题浏览器实测。随 v2.1.0 发布关闭。
