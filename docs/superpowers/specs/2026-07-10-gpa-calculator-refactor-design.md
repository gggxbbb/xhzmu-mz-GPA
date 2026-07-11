# 学位绩点计算器重构设计文档

## 1. 项目概述

### 1.1 目标
将现有的单文件 HTML GPA 计算器重构为基于 **Vue 3 + Vite** 的现代化 PWA 应用，在保留全部现有功能的基础上，提升移动端体验、增加数据可视化和多配置档案能力，并改善可维护性。

### 1.2 现状
- 当前为单个 `index.html`（约 800 行），JS、CSS、HTML 全部内嵌。
- 依赖 Pico CSS，存在大量自定义样式覆盖。
- 使用原生 DOM API 手动构建 UI，状态与视图耦合严重。
- 数据持久化依赖 `localStorage`，已有导入/导出 JSON 能力。
- 已具备 PWA manifest 和 Umami 统计。

### 1.3 成功标准
- 界面在移动端优先、桌面端响应式可用。
- 保留原有 GPA 计算逻辑和数据导入导出兼容性。
- 新增多配置档案、数据统计、What-if 模拟器。
- 代码结构清晰，组件职责单一，便于后续维护。

---

## 2. 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | 组件化、响应式、生态成熟 |
| 构建工具 | Vite | 快速开发、现代打包、PWA 插件支持 |
| 状态管理 | Pinia | 类型友好、与 Vue 3 深度集成 |
| 路由 | Vue Router | 底部 Tab 三页切换 |
| 样式 | 自定义 CSS + CSS 变量 | 保留品牌色 `#66ccff`，支持深色模式 |
| 图表 | Chart.js / vue-chartjs | 趋势图、分布图 |
| PWA | vite-plugin-pwa | Workbox 离线缓存、manifest 生成 |
| 工具库 | VueUse | 本地存储、剪贴板等常用能力 |
| 分析 | Umami (保留) | 保持现有埋点行为 |

---

## 3. 架构设计

### 3.1 项目结构

```
.
├── public/
│   ├── manifest.json
│   └── img/
├── src/
│   ├── assets/              # 样式、图片
│   ├── components/          # 可复用组件
│   ├── composables/         # 组合式函数
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态模块
│   ├── utils/               # 纯工具函数
│   ├── views/               # 页面级组件
│   ├── App.vue
│   └── main.js
├── index.html
├── vite.config.js
└── package.json
```

### 3.2 状态管理 (Pinia Stores)

#### `stores/app.js`
应用级设置：
- `showVeryLongGPA`: 是否显示 5 位小数
- `theme`: `'light' | 'dark' | 'auto'`
- `currentProfileId`: 当前激活的配置档案 ID

#### `stores/profiles.js`
配置档案管理：
- `profiles`: `Profile[]`
- `currentProfile`: 当前档案（含 `id`、`name`、`targetGPA`、`classes`）
- CRUD 操作：创建、切换、编辑、删除
- 导入/导出 JSON

Profile 数据结构：
```ts
interface Profile {
  id: string;
  name: string;
  targetGPA: number;
  classes: Record<string, Array<{ name: string; credit: number }>>;
}
```

默认创建名为 "徐医本麻" 的档案，沿用现有默认课程配置，目标绩点默认 `2.0`。

#### `stores/grades.js`
当前档案的成绩数据：
- `grades`: `Record<string, number | null>`，key 为课程名
- 自动持久化到 `localStorage`
- 支持导入旧版成绩数据

#### `stores/ui.js`
UI 临时状态：
- `expandedSemesters`: 展开的学期集合
- `searchQuery`: 首页搜索关键词
- `activeWhatIfCourse`: 当前展开 What-if 的课程名

### 3.3 计算逻辑 (`composables/useGPA.js`)

核心计算保持不变：
```
GPA = Σ(学分 × (成绩 - 50) / 10) / Σ学分
```

导出计算属性：
- `currentGPA`: 当前 GPA
- `targetGPA`: 目标绩点
- `totalCredits`: 总学分
- `enteredCredits`: 已录入学分
- `semesterGPAs`: 各学期 GPA
- `illegalGrades`: 低于 10 分的课程列表
- `predictedGPA`: 剩余课程按不同平均分假设时的最终 GPA
- `requiredAverageForTarget`: 达到目标绩点所需剩余课程平均分

---

## 4. 页面与组件设计

### 4.1 底部导航
三页 Tab：
- **首页 / 计算**
- **统计 / 分析**
- **我的 / 配置**

### 4.2 首页 (`views/HomeView.vue`)

#### 组件
- `GpaCard.vue`: 顶部大卡片显示当前 GPA、目标绩点对比
- `StatChips.vue`: 总学分、已录入课程数、学期数
- `SearchBar.vue`: 课程搜索
- `SemesterList.vue`: 学期折叠列表
  - `SemesterItem.vue`: 单个学期折叠项
    - `CourseRow.vue`: 课程名 + 学分 + 数字输入框 + What-if 按钮
- `IllegalWarning.vue`: 低分警告

#### What-if 交互
- 每门课程右侧显示 "影响" 按钮。
- 点击后在该课程行内展开迷你模拟器：
  - 滑块调整假设分数（默认从当前成绩开始，若未录入则从 60 开始）。
  - 实时显示 "此科 X 分时，总 GPA 将变为 Y"。
- 模拟结果不持久化，收起后恢复实际成绩计算。

#### 搜索与过滤
- 搜索课程名，实时过滤显示的学期和课程。
- 无结果时显示空状态提示。

### 4.3 统计页 (`views/StatsView.vue`)

#### 组件
- `GpaSummaryCard.vue`: 当前 GPA + 目标对比
- `MetricGrid.vue`: 总学分、剩余学分、已录入/总课程、最高学期 GPA
- `TargetAnalysisCard.vue`: 目标达成分析
  - 当前预计最终 GPA
  - 守住目标所需剩余课程平均分
  - 剩余课程平均 85/90 分时的最终 GPA
- `FailingWarningCard.vue`: 挂科预警（成绩 < 60 时提示；默认规则与现有计算逻辑一致，后续可配置）
- `GpaTrendChart.vue`: 学期 GPA 柱状/折线图
- `ScoreDistributionChart.vue`: 成绩区间分布条形图

### 4.4 我的 / 配置页 (`views/ProfileView.vue`)

#### 组件
- `ProfileSwitcher.vue`: 档案列表 + 切换 + 新建
- `CourseConfigEditor.vue`: 表单化课程配置编辑器
  - 按学期分组
  - 每课程可编辑名称、学分、删除
  - 每学期可添加课程、删除学期
  - 支持新建学期
  - 高级入口：文本模式（兼容旧格式）
- `ImportExportCard.vue`: JSON 导入/导出
- `DisplaySettings.vue`: 5 位小数、深色模式
- `DangerZone.vue`: 清除成绩、清除所有数据（需二次确认）

---

## 5. 数据持久化与迁移

### 5.1 存储键名
新版使用统一的 `gpa_v2` 键存储完整应用状态，结构如下：
```json
{
  "version": 2,
  "app": { "showVeryLongGPA": false, "theme": "auto", "currentProfileId": "default" },
  "profiles": [...],
  "grades": { "default": { "病理学": 85, ... } }
}
```

### 5.2 旧版数据迁移
首次加载时检测旧版键：
- `classes`: 课程配置字符串
- `classesName`: 配置名称
- `targetGPA`: 目标绩点
- `grades`: 成绩对象
- `showVeryLongGPA`: 显示精度

若存在旧版数据且无新版数据，自动解析并创建默认档案，然后删除旧版键（可选保留备份）。

### 5.3 导入导出
导出格式扩展为：
```json
{
  "version": 2,
  "profile": { ... },
  "grades": { ... }
}
```
同时兼容导入旧版格式（自动升级）。

---

## 6. 错误处理与边界情况

### 6.1 输入校验
- 课程成绩限制 0-100。
- 学分限制 > 0。
- 配置保存时校验格式，错误通过 Toast/Dialog 提示。

### 6.2 空状态
- 无配置档案：引导创建或导入。
- 无成绩：提示开始输入。
- 搜索无结果：显示空状态。

### 6.3 异常
- JSON 导入失败：显示具体错误信息。
- localStorage 已满：降级提示，不崩溃。
- Umami 加载失败：静默忽略（保持现有行为）。

---

## 7. PWA 与离线能力

- 使用 `vite-plugin-pwa` 自动生成 Service Worker。
- 缓存策略：
  - 静态资源：CacheFirst，长期缓存。
  - index.html：NetworkFirst，保证更新。
- `manifest.json` 保留在 `public/` 目录下并更新 `start_url`、`theme_color` 等字段；图标复用现有 `img/AppImages/` 资源。
- 支持 standalone 安装，保留 `display_override` 中的 `window-controls-overlay` 能力。

---

## 8. 样式与主题

- 使用 CSS 变量定义颜色、间距、圆角。
- 主色调沿用 `#66ccff`。
- 支持浅色/深色/跟随系统三种模式。
- 移动端底部安全区适配。
- 触控目标最小 44px。

---

## 9. 测试与验证

- 计算函数单元测试：验证 GPA、学期 GPA、目标预测公式正确。
- 迁移逻辑测试：旧版数据正确转换为新版。
- 手动验证：
  - 移动端 Chrome/Safari 输入体验
  - PWA 安装与离线使用
  - 导入/导出 JSON 兼容

---

## 10. 范围与排期

### 10.1 本期必做
- Vue 3 + Vite 项目搭建
- 三页底部导航
- 首页 GPA 计算与 What-if
- 统计页核心指标与图表
- 配置页表单化编辑、多档案、导入导出
- localStorage 持久化与旧版迁移
- PWA 基础能力

### 10.2 后续可选
- 云端同步/账号系统
- 更复杂的数据分析（如学分绩点雷达图）
- 国际化
- 桌面端窗口控件优化

---

## 11. 风险与假设

- 假设用户设备支持现代浏览器（ES2020+、CSS Grid/Flex）。
- 假设 Umami 分析脚本保持现有接口。
- 假设 GPA 计算公式在新版中保持不变。
- 风险：What-if 行内展开在课程较多时可能增加页面复杂度，后续可根据反馈调整。
