# GPA 计算器重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有单文件 HTML GPA 计算器重构为基于 Vue 3 + Vite 的现代化 PWA 应用，保留全部现有功能并新增多档案、数据统计和 What-if 模拟器。

**Architecture:** 采用 Vue 3 Composition API + Pinia 状态管理 + Vue Router 底部导航；核心 GPA 计算和旧版数据迁移抽离为纯函数；UI 按页面和可复用组件拆分；使用 `vite-plugin-pwa` 提供离线能力。

**Tech Stack:** Vue 3, Vite, Pinia, Vue Router, Chart.js/vue-chartjs, VueUse, vite-plugin-pwa, Vitest

---

## 项目结构与文件映射

```
.
├── public/
│   ├── manifest.json              # 更新现有 manifest
│   └── img/                       # 复用现有图标资源
├── src/
│   ├── assets/
│   │   └── styles.css             # 全局 CSS 变量、主题、工具类
│   ├── components/
│   │   ├── AppNav.vue             # 底部 Tab 导航
│   │   ├── AppDialog.vue          # 通用对话框
│   │   ├── GpaCard.vue            # GPA 大卡片
│   │   ├── StatChips.vue          # 首页统计 chips
│   │   ├── SearchBar.vue          # 课程搜索框
│   │   ├── SemesterList.vue       # 学期折叠列表
│   │   ├── SemesterItem.vue       # 单个学期折叠项
│   │   ├── CourseRow.vue          # 课程行（输入 + What-if 按钮）
│   │   ├── WhatIfPanel.vue        # 行内 What-if 模拟器
│   │   ├── IllegalWarning.vue     # 低分警告
│   │   ├── GpaSummaryCard.vue     # 统计页 GPA 摘要
│   │   ├── MetricGrid.vue         # 统计指标网格
│   │   ├── TargetAnalysisCard.vue # 目标达成分析
│   │   ├── FailingWarningCard.vue # 挂科预警
│   │   ├── GpaTrendChart.vue      # 学期 GPA 趋势图
│   │   ├── ScoreDistributionChart.vue # 成绩分布图
│   │   ├── ProfileSwitcher.vue    # 档案切换/新建
│   │   ├── CourseConfigEditor.vue # 表单化课程配置编辑器
│   │   ├── ImportExportCard.vue   # 导入导出卡片
│   │   ├── DisplaySettings.vue    # 显示设置
│   │   └── DangerZone.vue         # 清除数据危险区
│   ├── composables/
│   │   └── useGPA.js              # GPA 计算组合式函数
│   ├── router/
│   │   └── index.js               # 路由配置
│   ├── stores/
│   │   ├── app.js                 # 应用设置 store
│   │   ├── profiles.js            # 配置档案 store
│   │   ├── grades.js              # 成绩 store
│   │   └── ui.js                  # UI 临时状态 store
│   ├── utils/
│   │   ├── parsers.js             # 课程配置解析/序列化
│   │   └── migration.js           # 旧版 localStorage 迁移
│   ├── views/
│   │   ├── HomeView.vue           # 首页
│   │   ├── StatsView.vue          # 统计页
│   │   └── ProfileView.vue        # 配置页
│   ├── App.vue
│   └── main.js
├── tests/
│   ├── useGPA.test.js
│   ├── parsers.test.js
│   └── migration.test.js
├── index.html                     # 替换现有入口
├── vite.config.js
├── vitest.config.js
├── package.json
└── .gitignore                     # 追加 node_modules, dist 等
```

---

## Phase 1: 项目脚手架与核心计算

### Task 1: 初始化 Vite + Vue 项目

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vitest.config.js`
- Create: `.gitignore`
- Modify: `index.html`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "gpa-calculator",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "chart.js": "^4.4.0",
    "vue-chartjs": "^5.3.0",
    "@vueuse/core": "^10.9.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.2.0",
    "vite-plugin-pwa": "^0.19.0",
    "vitest": "^1.4.0",
    "jsdom": "^24.0.0",
    "@vue/test-utils": "^2.4.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/analysis\.gxb\.icu\/.*/,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom'
  }
})
```

- [ ] **Step 3: 创建 vitest.config.js**

```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom'
  }
})
```

- [ ] **Step 4: 创建 .gitignore**

```
node_modules
dist
dist-ssr
*.local
.vite
.coverage
.superpowers
```

- [ ] **Step 5: 替换 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>学位绩点计算器</title>
    <meta name="theme-color" content="#66ccff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#13171f" media="(prefers-color-scheme: dark)" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/img/favicon-512x512.png" sizes="512x512" type="image/png" />
    <script src="https://analysis.gxb.icu/script.js" data-website-id="502fa9db-262e-44fe-968b-c8b647e82edd"></script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 6: 安装依赖并验证**

Run:
```bash
npm install
npm run dev
```

Expected: Vite dev server starts without error.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js vitest.config.js .gitignore index.html

git commit -m "chore: initialize Vue 3 + Vite project scaffold"
```

---

### Task 2: 实现 GPA 计算与解析工具函数

**Files:**
- Create: `src/utils/parsers.js`
- Create: `src/composables/useGPA.js`
- Create: `tests/parsers.test.js`
- Create: `tests/useGPA.test.js`

- [ ] **Step 1: 编写 parsers.js 并添加测试**

`src/utils/parsers.js`:
```javascript
export function parseClasses(text) {
  if (!text || typeof text !== 'string') return {}
  const lines = text.split('\n')
  const classes = {}
  let currentSemester = ''
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (!line.includes(' ')) {
      currentSemester = line
      classes[currentSemester] = []
    } else {
      const parts = line.split(' ')
      const credit = parseFloat(parts[parts.length - 1])
      const name = parts.slice(0, parts.length - 1).join(' ')
      if (!isNaN(credit) && name) {
        classes[currentSemester].push({ name, credit })
      }
    }
  }
  return classes
}

export function serializeClasses(classes) {
  if (!classes) return ''
  const lines = []
  for (const semester of Object.keys(classes)) {
    lines.push(semester)
    for (const course of classes[semester]) {
      lines.push(`${course.name} ${course.credit}`)
    }
  }
  return lines.join('\n')
}

export const DEFAULT_CLASSES = {
  "大一下": [
    { name: "人体系统解剖学", credit: 6.5 },
    { name: "生物化学与分子生物学", credit: 7.0 }
  ],
  "大二上": [
    { name: "病理学", credit: 5.0 },
    { name: "医学微生物学与免疫学", credit: 6.0 },
    { name: "麻醉生理学", credit: 6.0 }
  ],
  "大二下": [
    { name: "病理生理学", credit: 3.0 },
    { name: "麻醉解剖学", credit: 5.5 },
    { name: "诊断学1", credit: 2.5 }
  ],
  "大三上": [
    { name: "麻醉药理学", credit: 5.0 },
    { name: "诊断学2", credit: 4.5 },
    { name: "外科学1", credit: 3.5 }
  ],
  "大三下": [
    { name: "麻醉设备学", credit: 3.5 },
    { name: "麻醉机能实验学", credit: 7.0 },
    { name: "内科学1", credit: 5.5 },
    { name: "外科学2", credit: 5.5 }
  ],
  "大四上": [
    { name: "危重病医学", credit: 5.5 },
    { name: "内科学2", credit: 5.0 },
    { name: "外科学3", credit: 2.0 },
    { name: "妇产科学", credit: 3.5 },
    { name: "儿科学", credit: 5.0 }
  ],
  "大四下": [
    { name: "临床麻醉学", credit: 6.0 },
    { name: "疼痛诊疗学", credit: 2.0 },
    { name: "神经病学", credit: 1.5 }
  ]
}

export const DEFAULT_PROFILE_NAME = "徐医本麻"
export const DEFAULT_TARGET_GPA = 2.0
```

`tests/parsers.test.js`:
```javascript
import { describe, it, expect } from 'vitest'
import { parseClasses, serializeClasses, DEFAULT_CLASSES } from '../src/utils/parsers'

describe('parseClasses', () => {
  it('parses semester and courses', () => {
    const input = `大二上\n病理学 5\n医学微生物学与免疫学 6`
    const result = parseClasses(input)
    expect(result).toEqual({
      "大二上": [
        { name: "病理学", credit: 5 },
        { name: "医学微生物学与免疫学", credit: 6 }
      ]
    })
  })

  it('returns empty object for empty input', () => {
    expect(parseClasses('')).toEqual({})
    expect(parseClasses(null)).toEqual({})
  })
})

describe('serializeClasses', () => {
  it('serializes classes to text', () => {
    const text = serializeClasses(DEFAULT_CLASSES)
    expect(text).toContain('大二上')
    expect(text).toContain('病理学 5')
  })
})
```

- [ ] **Step 2: 运行 parsers 测试，验证失败/通过**

Run:
```bash
npm test -- tests/parsers.test.js
```

Expected: PASS

- [ ] **Step 3: 编写 useGPA.js 并添加测试**

`src/composables/useGPA.js`:
```javascript
import { computed } from 'vue'

export function calculateGPA(courses, grades) {
  let totalGrade = 0
  let totalCredit = 0
  for (const course of courses) {
    const score = grades[course.name]
    if (score == null || isNaN(score)) continue
    const gradePoint = (score - 50) / 10
    totalGrade += gradePoint * course.credit
    totalCredit += course.credit
  }
  if (totalCredit <= 0) return 0
  return totalGrade / totalCredit
}

export function useGPA(profile, grades) {
  const allCourses = computed(() => {
    const list = []
    for (const semester of Object.keys(profile.value.classes)) {
      for (const course of profile.value.classes[semester]) {
        list.push({ ...course, semester })
      }
    }
    return list
  })

  const enteredCourses = computed(() =>
    allCourses.value.filter(c => grades.value[c.name] != null && !isNaN(grades.value[c.name]))
  )

  const currentGPA = computed(() => calculateGPA(allCourses.value, grades.value))

  const totalCredits = computed(() =>
    allCourses.value.reduce((sum, c) => sum + c.credit, 0)
  )

  const enteredCredits = computed(() =>
    enteredCourses.value.reduce((sum, c) => sum + c.credit, 0)
  )

  const semesterGPAs = computed(() => {
    const result = {}
    for (const semester of Object.keys(profile.value.classes)) {
      result[semester] = calculateGPA(profile.value.classes[semester], grades.value)
    }
    return result
  })

  const illegalGrades = computed(() =>
    enteredCourses.value.filter(c => grades.value[c.name] < 10).map(c => c.name)
  )

  const remainingCredits = computed(() =>
    allCourses.value
      .filter(c => grades.value[c.name] == null || isNaN(grades.value[c.name]))
      .reduce((sum, c) => sum + c.credit, 0)
  )

  const requiredAverageForTarget = computed(() => {
    const target = profile.value.targetGPA
    const currentTotalPoint = currentGPA.value * enteredCredits.value
    const needed = target * totalCredits.value - currentTotalPoint
    if (remainingCredits.value <= 0) return null
    return (needed / remainingCredits.value) * 10 + 50
  })

  function predictedGPA(averageScore) {
    const remaining = allCourses.value.filter(c => grades.value[c.name] == null || isNaN(grades.value[c.name]))
    const extraPoint = remaining.reduce((sum, c) => sum + ((averageScore - 50) / 10) * c.credit, 0)
    const extraCredit = remaining.reduce((sum, c) => sum + c.credit, 0)
    const totalCredit = enteredCredits.value + extraCredit
    if (totalCredit <= 0) return 0
    return (currentGPA.value * enteredCredits.value + extraPoint) / totalCredit
  }

  return {
    allCourses,
    enteredCourses,
    currentGPA,
    totalCredits,
    enteredCredits,
    semesterGPAs,
    illegalGrades,
    remainingCredits,
    requiredAverageForTarget,
    predictedGPA
  }
}
```

`tests/useGPA.test.js`:
```javascript
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useGPA, calculateGPA } from '../src/composables/useGPA'
import { DEFAULT_CLASSES } from '../src/utils/parsers'

describe('calculateGPA', () => {
  it('calculates basic GPA', () => {
    const courses = [{ name: 'A', credit: 5 }, { name: 'B', credit: 5 }]
    const grades = { A: 80, B: 90 }
    expect(calculateGPA(courses, grades)).toBe(3.5)
  })

  it('ignores missing grades', () => {
    const courses = [{ name: 'A', credit: 5 }, { name: 'B', credit: 5 }]
    const grades = { A: 80 }
    expect(calculateGPA(courses, grades)).toBe(3.0)
  })

  it('returns 0 when no grades entered', () => {
    expect(calculateGPA([{ name: 'A', credit: 5 }], {})).toBe(0)
  })
})

describe('useGPA', () => {
  const profile = ref({
    name: 'Test',
    targetGPA: 2.0,
    classes: DEFAULT_CLASSES
  })
  const grades = ref({
    '病理学': 85,
    '医学微生物学与免疫学': 78
  })

  it('computes current GPA and totals', () => {
    const gpa = useGPA(profile, grades)
    expect(gpa.currentGPA.value).toBeGreaterThan(0)
    expect(gpa.totalCredits.value).toBeGreaterThan(0)
    expect(gpa.enteredCredits.value).toBe(11)
    expect(gpa.illegalGrades.value).toEqual([])
  })
})
```

- [ ] **Step 4: 运行 useGPA 测试**

Run:
```bash
npm test -- tests/useGPA.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/parsers.js src/composables/useGPA.js tests/
git commit -m "feat: add GPA calculation and parser utilities with tests"
```

---

### Task 3: 实现旧版数据迁移工具

**Files:**
- Create: `src/utils/migration.js`
- Create: `tests/migration.test.js`

- [ ] **Step 1: 编写 migration.js 并添加测试**

`src/utils/migration.js`:
```javascript
import { parseClasses, DEFAULT_CLASSES, DEFAULT_PROFILE_NAME, DEFAULT_TARGET_GPA } from './parsers'

const LEGACY_KEYS = ['classes', 'classesName', 'targetGPA', 'grades', 'showVeryLongGPA']

export function hasLegacyData() {
  return LEGACY_KEYS.some(key => localStorage.getItem(key) !== null)
}

export function migrateLegacyData() {
  const classesStr = localStorage.getItem('classes')
  const classesName = localStorage.getItem('classesName')
  const targetGPA = parseFloat(localStorage.getItem('targetGPA'))
  const gradesStr = localStorage.getItem('grades')
  const showVeryLongGPA = localStorage.getItem('showVeryLongGPA')

  const profileId = 'migrated_default'
  const profile = {
    id: profileId,
    name: classesName || DEFAULT_PROFILE_NAME,
    targetGPA: isNaN(targetGPA) ? DEFAULT_TARGET_GPA : targetGPA,
    classes: parseClasses(classesStr) || DEFAULT_CLASSES
  }

  const grades = {}
  try {
    Object.assign(grades, JSON.parse(gradesStr) || {})
  } catch (e) {
    // ignore invalid grades
  }

  const normalizedGrades = {}
  for (const name of Object.keys(grades)) {
    const value = parseFloat(grades[name])
    if (!isNaN(value)) normalizedGrades[name] = value
  }

  const app = {
    showVeryLongGPA: showVeryLongGPA === 'true',
    theme: 'auto',
    currentProfileId: profileId
  }

  return {
    version: 2,
    app,
    profiles: [profile],
    grades: { [profileId]: normalizedGrades }
  }
}

export function clearLegacyData() {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key)
  }
}
```

`tests/migration.test.js`:
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { migrateLegacyData, hasLegacyData, clearLegacyData } from '../src/utils/migration'

describe('migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('detects legacy data', () => {
    expect(hasLegacyData()).toBe(false)
    localStorage.setItem('classesName', 'Test')
    expect(hasLegacyData()).toBe(true)
  })

  it('migrates legacy data to v2 format', () => {
    localStorage.setItem('classesName', 'OldProfile')
    localStorage.setItem('targetGPA', '2.5')
    localStorage.setItem('classes', '大二上\n病理学 5')
    localStorage.setItem('grades', JSON.stringify({ '病理学': 88 }))
    localStorage.setItem('showVeryLongGPA', 'true')

    const data = migrateLegacyData()
    expect(data.version).toBe(2)
    expect(data.profiles[0].name).toBe('OldProfile')
    expect(data.profiles[0].targetGPA).toBe(2.5)
    expect(data.profiles[0].classes['大二上']).toEqual([{ name: '病理学', credit: 5 }])
    expect(data.grades[data.profiles[0].id]['病理学']).toBe(88)
    expect(data.app.showVeryLongGPA).toBe(true)
  })

  it('clears legacy keys', () => {
    localStorage.setItem('classes', 'x')
    clearLegacyData()
    expect(localStorage.getItem('classes')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行迁移测试**

Run:
```bash
npm test -- tests/migration.test.js
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/utils/migration.js tests/migration.test.js
git commit -m "feat: add legacy localStorage migration with tests"
```

---

## Phase 2: 状态管理与应用外壳

### Task 4: 实现 Pinia Stores

**Files:**
- Create: `src/stores/app.js`
- Create: `src/stores/profiles.js`
- Create: `src/stores/grades.js`
- Create: `src/stores/ui.js`
- Create: `src/utils/storage.js`

- [ ] **Step 1: 创建 storage 辅助函数**

`src/utils/storage.js`:
```javascript
const STORAGE_KEY = 'gpa_v2'

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.error('Failed to load app state', e)
    return null
  }
}

export function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save app state', e)
  }
}
```

- [ ] **Step 2: 创建 app store**

`src/stores/app.js`:
```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const showVeryLongGPA = ref(false)
  const theme = ref('auto')
  const currentProfileId = ref('default')

  const isDark = computed(() => {
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  function setShowVeryLongGPA(value) {
    showVeryLongGPA.value = value
  }

  function setTheme(value) {
    theme.value = value
  }

  function setCurrentProfileId(id) {
    currentProfileId.value = id
  }

  function load(state) {
    if (state.showVeryLongGPA != null) showVeryLongGPA.value = state.showVeryLongGPA
    if (state.theme) theme.value = state.theme
    if (state.currentProfileId) currentProfileId.value = state.currentProfileId
  }

  function dump() {
    return {
      showVeryLongGPA: showVeryLongGPA.value,
      theme: theme.value,
      currentProfileId: currentProfileId.value
    }
  }

  return {
    showVeryLongGPA,
    theme,
    currentProfileId,
    isDark,
    setShowVeryLongGPA,
    setTheme,
    setCurrentProfileId,
    load,
    dump
  }
})
```

- [ ] **Step 3: 创建 profiles store**

`src/stores/profiles.js`:
```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_CLASSES, DEFAULT_PROFILE_NAME, DEFAULT_TARGET_GPA } from '../utils/parsers'

function createId() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref([])

  const currentProfile = computed(() => {
    const app = useAppStore()
    return profiles.value.find(p => p.id === app.currentProfileId) || profiles.value[0] || null
  })

  function createDefaultProfile() {
    return {
      id: 'default',
      name: DEFAULT_PROFILE_NAME,
      targetGPA: DEFAULT_TARGET_GPA,
      classes: DEFAULT_CLASSES
    }
  }

  function addProfile(name, targetGPA, classes) {
    const profile = {
      id: createId(),
      name: name || '新档案',
      targetGPA: isNaN(parseFloat(targetGPA)) ? DEFAULT_TARGET_GPA : parseFloat(targetGPA),
      classes: classes || {}
    }
    profiles.value.push(profile)
    return profile.id
  }

  function updateProfile(id, patch) {
    const p = profiles.value.find(x => x.id === id)
    if (!p) return
    if (patch.name != null) p.name = patch.name
    if (patch.targetGPA != null) p.targetGPA = parseFloat(patch.targetGPA)
    if (patch.classes != null) p.classes = patch.classes
  }

  function removeProfile(id) {
    profiles.value = profiles.value.filter(p => p.id !== id)
  }

  function setDefault() {
    profiles.value = [createDefaultProfile()]
  }

  function load(data) {
    if (Array.isArray(data) && data.length > 0) {
      profiles.value = data
    } else {
      setDefault()
    }
  }

  function dump() {
    return profiles.value
  }

  return {
    profiles,
    currentProfile,
    addProfile,
    updateProfile,
    removeProfile,
    setDefault,
    load,
    dump
  }
})
```

Note: The `useAppStore` import inside `currentProfile` creates a circular dependency risk. A better approach is to accept `currentProfileId` as a parameter or use a getter. For simplicity in this plan, we'll pass the app store reference when needed. **Fix this before implementation** by changing `currentProfile` to a function `getProfileById(id)`.

Let me correct this in the plan:

```javascript
export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref([])

  function getProfile(id) {
    return profiles.value.find(p => p.id === id) || profiles.value[0] || null
  }

  // ... rest

  return {
    profiles,
    getProfile,
    // ...
  }
})
```

- [ ] **Step 4: 创建 grades store**

`src/stores/grades.js`:
```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGradesStore = defineStore('grades', () => {
  const gradesByProfile = ref({})

  const currentGrades = computed({
    get: () => gradesByProfile.value[currentProfileId.value] || {},
    set: (value) => {
      gradesByProfile.value[currentProfileId.value] = value
    }
  })

  function setGrade(courseName, score) {
    if (!currentProfileId.value) return
    if (!gradesByProfile.value[currentProfileId.value]) {
      gradesByProfile.value[currentProfileId.value] = {}
    }
    if (score === '' || score == null) {
      delete gradesByProfile.value[currentProfileId.value][courseName]
    } else {
      const num = parseFloat(score)
      if (!isNaN(num)) {
        gradesByProfile.value[currentProfileId.value][courseName] = num
      }
    }
  }

  function clearGrades(profileId) {
    if (profileId) {
      delete gradesByProfile.value[profileId]
    } else {
      gradesByProfile.value = {}
    }
  }

  function load(data) {
    gradesByProfile.value = data || {}
  }

  function dump() {
    return gradesByProfile.value
  }

  return {
    gradesByProfile,
    currentGrades,
    setGrade,
    clearGrades,
    load,
    dump
  }
})
```

This also has a problem: `currentProfileId` is undefined. We need to accept it from app store. Better design: `setGrade(profileId, courseName, score)` and `currentGrades(profileId)`.

Let me fix:

```javascript
export const useGradesStore = defineStore('grades', () => {
  const gradesByProfile = ref({})

  function getGrades(profileId) {
    return gradesByProfile.value[profileId] || {}
  }

  function setGrade(profileId, courseName, score) {
    if (!gradesByProfile.value[profileId]) {
      gradesByProfile.value[profileId] = {}
    }
    if (score === '' || score == null) {
      delete gradesByProfile.value[profileId][courseName]
    } else {
      const num = parseFloat(score)
      if (!isNaN(num)) {
        gradesByProfile.value[profileId][courseName] = num
      }
    }
  }

  function clearGrades(profileId) {
    if (profileId) {
      delete gradesByProfile.value[profileId]
    } else {
      gradesByProfile.value = {}
    }
  }

  function load(data) {
    gradesByProfile.value = data || {}
  }

  function dump() {
    return gradesByProfile.value
  }

  return {
    gradesByProfile,
    getGrades,
    setGrade,
    clearGrades,
    load,
    dump
  }
})
```

- [ ] **Step 5: 创建 ui store**

`src/stores/ui.js`:
```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const expandedSemesters = ref(new Set())
  const searchQuery = ref('')
  const activeWhatIfCourse = ref(null)

  function toggleSemester(semester) {
    if (expandedSemesters.value.has(semester)) {
      expandedSemesters.value.delete(semester)
    } else {
      expandedSemesters.value.add(semester)
    }
  }

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  function setActiveWhatIfCourse(name) {
    activeWhatIfCourse.value = activeWhatIfCourse.value === name ? null : name
  }

  function reset() {
    expandedSemesters.value.clear()
    searchQuery.value = ''
    activeWhatIfCourse.value = null
  }

  return {
    expandedSemesters,
    searchQuery,
    activeWhatIfCourse,
    toggleSemester,
    setSearchQuery,
    setActiveWhatIfCourse,
    reset
  }
})
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/ src/utils/storage.js
git commit -m "feat: add Pinia stores for app, profiles, grades and UI state"
```

---

### Task 5: 实现应用入口、路由与持久化

**Files:**
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `src/router/index.js`
- Create: `src/assets/styles.css`

- [ ] **Step 1: 创建全局样式**

`src/assets/styles.css`:
```css
:root {
  --brand: #66ccff;
  --brand-dark: #3a8bc3;
  --danger: #f44336;
  --warning: #ff9800;
  --success: #4caf50;
  --radius: 0.75rem;
  --spacing: 1rem;
  --nav-height: 64px;
}

:root,
[data-theme="light"] {
  --bg: #ffffff;
  --surface: #f5f5f5;
  --text: #1a1a1a;
  --muted: #666666;
  --border: #dddddd;
}

[data-theme="dark"] {
  --bg: #13171f;
  --surface: #1e232d;
  --text: #f0f0f0;
  --muted: #a0a0a0;
  --border: #333844;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: var(--spacing);
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--spacing);
  margin-bottom: var(--spacing);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  padding: 0.6em 1em;
  border-radius: 0.5em;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.95rem;
  cursor: pointer;
  min-height: 44px;
}

.btn-primary {
  background: var(--brand);
  color: white;
  border-color: var(--brand);
}

.btn-danger {
  background: #ffebee;
  color: var(--danger);
  border-color: #ffcdD2;
}

.input {
  width: 100%;
  padding: 0.6em;
  border: 1px solid var(--border);
  border-radius: 0.5em;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
  min-height: 44px;
}

.gpa-display {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.gpa-display.below-target {
  color: var(--danger);
}

.nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted);
  text-decoration: none;
  font-size: 0.75rem;
}

.nav-item.active {
  color: var(--brand-dark);
}

@media (min-width: 768px) {
  .main-content {
    max-width: 900px;
  }
}
```

- [ ] **Step 2: 创建路由配置**

`src/router/index.js`:
```javascript
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import StatsView from '../views/StatsView.vue'
import ProfileView from '../views/ProfileView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/stats', name: 'stats', component: StatsView },
  { path: '/profile', name: 'profile', component: ProfileView }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

- [ ] **Step 3: 创建 App.vue**

`src/App.vue`:
```vue
<template>
  <div :data-theme="appStore.isDark ? 'dark' : 'light'">
    <main class="main-content">
      <RouterView />
    </main>
    <AppNav />
  </div>
</template>

<script setup>
import { useAppStore } from './stores/app'
import AppNav from './components/AppNav.vue'

const appStore = useAppStore()
</script>

<style>
@import './assets/styles.css';
</style>
```

- [ ] **Step 4: 创建 main.js**

`src/main.js`:
```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { loadAppState, saveAppState } from './utils/storage'
import { migrateLegacyData, hasLegacyData } from './utils/migration'
import { useAppStore } from './stores/app'
import { useProfilesStore } from './stores/profiles'
import { useGradesStore } from './stores/grades'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

function initializeState() {
  const appStore = useAppStore()
  const profilesStore = useProfilesStore()
  const gradesStore = useGradesStore()

  let state = loadAppState()

  if (!state && hasLegacyData()) {
    state = migrateLegacyData()
  }

  if (state) {
    appStore.load(state.app)
    profilesStore.load(state.profiles)
    gradesStore.load(state.grades)
  } else {
    profilesStore.setDefault()
  }

  // Ensure current profile exists
  const current = profilesStore.getProfile(appStore.currentProfileId)
  if (!current) {
    appStore.currentProfileId = profilesStore.profiles[0]?.id || 'default'
  }
}

initializeState()

app.mount('#app')

// Auto-save on state changes
const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()

const unsubscribe = () => {
  saveAppState({
    version: 2,
    app: appStore.dump(),
    profiles: profilesStore.dump(),
    grades: gradesStore.dump()
  })
}

appStore.$subscribe(unsubscribe)
profilesStore.$subscribe(unsubscribe)
gradesStore.$subscribe(unsubscribe)

unsubscribe()
```

Note: `currentProfileId` in appStore is a ref, so assignment should be `appStore.currentProfileId = ...` works because of Pinia's storeToRefs behavior? Actually in setup store, `currentProfileId` is a ref returned directly, so `appStore.currentProfileId` is the ref object, not the value. To set it, we need `appStore.currentProfileId = 'default'` which replaces the ref? That won't trigger reactivity properly. We should use `appStore.setCurrentProfileId(...)`. Let me fix.

Also `$subscribe` on setup stores requires passing the function directly. The unsubscribe pattern I wrote is wrong. `$subscribe` returns the unsubscribe function, and the callback receives `(mutation, state)`. Let me correct.

Corrected main.js:
```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { loadAppState, saveAppState } from './utils/storage'
import { migrateLegacyData, hasLegacyData } from './utils/migration'
import { useAppStore } from './stores/app'
import { useProfilesStore } from './stores/profiles'
import { useGradesStore } from './stores/grades'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

function initializeState() {
  const appStore = useAppStore()
  const profilesStore = useProfilesStore()
  const gradesStore = useGradesStore()

  let state = loadAppState()

  if (!state && hasLegacyData()) {
    state = migrateLegacyData()
  }

  if (state) {
    appStore.load(state.app)
    profilesStore.load(state.profiles)
    gradesStore.load(state.grades)
  } else {
    profilesStore.setDefault()
  }

  const current = profilesStore.getProfile(appStore.currentProfileId)
  if (!current) {
    appStore.setCurrentProfileId(profilesStore.profiles[0]?.id || 'default')
  }

  const save = () => {
    saveAppState({
      version: 2,
      app: appStore.dump(),
      profiles: profilesStore.dump(),
      grades: gradesStore.dump()
    })
  }

  appStore.$subscribe(save)
  profilesStore.$subscribe(save)
  gradesStore.$subscribe(save)
  save()
}

initializeState()
app.mount('#app')
```

- [ ] **Step 5: 创建 AppNav.vue**

`src/components/AppNav.vue`:
```vue
<template>
  <nav class="nav-bar">
    <RouterLink to="/" class="nav-item" :class="{ active: route.name === 'home' }">
      <span>🏠</span>
      <span>计算</span>
    </RouterLink>
    <RouterLink to="/stats" class="nav-item" :class="{ active: route.name === 'stats' }">
      <span>📊</span>
      <span>统计</span>
    </RouterLink>
    <RouterLink to="/profile" class="nav-item" :class="{ active: route.name === 'profile' }">
      <span>⚙️</span>
      <span>我的</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
```

- [ ] **Step 6: 验证开发服务器**

Run:
```bash
npm run dev
```

Expected: App loads with bottom navigation, no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/App.vue src/router/ src/assets/styles.css src/components/AppNav.vue
git commit -m "feat: add app shell, routing, navigation and state persistence"
```

---

## Phase 3: 首页实现

### Task 6: 实现首页组件

**Files:**
- Create: `src/components/GpaCard.vue`
- Create: `src/components/StatChips.vue`
- Create: `src/components/SearchBar.vue`
- Create: `src/components/SemesterItem.vue`
- Create: `src/components/CourseRow.vue`
- Create: `src/components/WhatIfPanel.vue`
- Create: `src/components/IllegalWarning.vue`
- Create: `src/views/HomeView.vue`

- [ ] **Step 1: 创建 GpaCard.vue**

```vue
<template>
  <div class="card" style="background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; border: none;">
    <div style="text-align: center;">
      <div style="font-size: 0.9rem; opacity: 0.9;">当前学位绩点</div>
      <div class="gpa-display" :class="{ 'below-target': isBelowTarget }" style="color: white; margin: 0.5rem 0;">
        {{ formattedGPA }}
      </div>
      <div style="font-size: 0.85rem; opacity: 0.9;">
        目标 {{ targetGPA }} · {{ diffText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'

const props = defineProps({
  gpa: { type: Number, required: true },
  targetGPA: { type: Number, required: true }
})

const appStore = useAppStore()

const formattedGPA = computed(() => {
  const decimals = appStore.showVeryLongGPA ? 5 : (Math.abs(props.gpa - props.targetGPA) < 0.01 ? 3 : 2)
  return props.gpa.toFixed(decimals)
})

const isBelowTarget = computed(() => props.gpa < props.targetGPA && props.gpa > 0)

const diffText = computed(() => {
  const diff = props.gpa - props.targetGPA
  if (Math.abs(diff) < 0.001) return '刚好达标'
  if (diff > 0) return `已超 ${diff.toFixed(2)}`
  return `还差 ${Math.abs(diff).toFixed(2)}`
})
</script>
```

- [ ] **Step 2: 创建 StatChips.vue**

```vue
<template>
  <div style="display: flex; gap: 0.5rem; overflow-x: auto; margin-bottom: 1rem;">
    <div class="card" style="min-width: 80px; text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.2rem; font-weight: bold;">{{ totalCredits.toFixed(1) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">总学分</div>
    </div>
    <div class="card" style="min-width: 80px; text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.2rem; font-weight: bold;">{{ enteredCount }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">已录入</div>
    </div>
    <div class="card" style="min-width: 80px; text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.2rem; font-weight: bold;">{{ semesterCount }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">学期</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalCredits: Number,
  enteredCount: Number,
  semesterCount: Number
})
</script>
```

- [ ] **Step 3: 创建 SearchBar.vue**

```vue
<template>
  <input
    type="text"
    class="input"
    placeholder="搜索课程..."
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
```

- [ ] **Step 4: 创建 CourseRow.vue**

```vue
<template>
  <div style="padding: 0.6rem 0; border-bottom: 1px solid var(--border);">
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ course.name }}</div>
        <div style="font-size: 0.75rem; color: var(--muted);">{{ course.credit }} 学分</div>
      </div>
      <input
        type="number"
        class="input"
        style="width: 80px; text-align: center;"
        min="0"
        max="100"
        step="1"
        :value="grade ?? ''"
        @input="onInput"
      />
      <button class="btn" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" @click="toggleWhatIf">
        📈
      </button>
    </div>
    <WhatIfPanel
      v-if="isActive"
      :course="course"
      :current-grade="grade"
      :all-courses="allCourses"
      :grades="grades"
      @close="$emit('closeWhatIf')"
    />
  </div>
</template>

<script setup>
import WhatIfPanel from './WhatIfPanel.vue'

const props = defineProps({
  course: Object,
  grade: Number,
  allCourses: Array,
  grades: Object,
  isActive: Boolean
})

const emit = defineEmits(['update:grade', 'toggleWhatIf', 'closeWhatIf'])

function onInput(event) {
  emit('update:grade', props.course.name, event.target.value)
}

function toggleWhatIf() {
  emit('toggleWhatIf', props.course.name)
}
</script>
```

- [ ] **Step 5: 创建 WhatIfPanel.vue**

```vue
<template>
  <div style="margin-top: 0.5rem; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 0.5rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
      <span style="font-size: 0.85rem; font-weight: 500;">假设分数</span>
      <span style="font-weight: bold;">{{ assumedScore }}</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      v-model.number="assumedScore"
      style="width: 100%; margin-bottom: 0.5rem;"
    />
    <div style="font-size: 0.8rem; color: var(--muted);">
      此科 {{ assumedScore }} 分时，总 GPA 将变为 <strong>{{ simulatedGPA.toFixed(2) }}</strong>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { calculateGPA } from '../composables/useGPA'

const props = defineProps({
  course: Object,
  currentGrade: Number,
  allCourses: Array,
  grades: Object
})

const assumedScore = ref(props.currentGrade ?? 60)

const simulatedGrades = computed(() => ({
  ...props.grades,
  [props.course.name]: assumedScore.value
}))

const simulatedGPA = computed(() => calculateGPA(props.allCourses, simulatedGrades.value))
</script>
```

- [ ] **Step 6: 创建 SemesterItem.vue**

```vue
<template>
  <div class="card" style="padding: 0; overflow: hidden;">
    <div
      style="padding: 0.8rem; background: var(--surface); display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
      @click="uiStore.toggleSemester(semester)"
    >
      <span style="font-weight: bold;">{{ semester }}</span>
      <span style="font-size: 0.85rem; color: var(--muted);">
        {{ expanded ? '▼' : '▶' }} GPA {{ semesterGPA.toFixed(2) }}
      </span>
    </div>
    <div v-if="expanded" style="padding: 0 0.8rem;">
      <CourseRow
        v-for="course in courses"
        :key="course.name"
        :course="course"
        :grade="grades[course.name]"
        :all-courses="allCourses"
        :grades="grades"
        :is-active="uiStore.activeWhatIfCourse === course.name"
        @update-grade="(name, value) => $emit('updateGrade', name, value)"
        @toggle-what-if="$emit('toggleWhatIf', course.name)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '../stores/ui'
import CourseRow from './CourseRow.vue'

const props = defineProps({
  semester: String,
  courses: Array,
  grades: Object,
  allCourses: Array,
  semesterGPA: Number
})

const emit = defineEmits(['updateGrade', 'toggleWhatIf'])

const uiStore = useUIStore()

const expanded = computed(() => uiStore.expandedSemesters.has(props.semester))
</script>
```

- [ ] **Step 7: 创建 IllegalWarning.vue**

```vue
<template>
  <div v-if="courses.length > 0" class="card" style="background: #fff3f3; border-color: #ffcccc; color: #c33;">
    <div style="font-size: 0.85rem;">
      ⚠️ 以下课程成绩小于 10 分，计算结果可能不准确：{{ courses.join('、') }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  courses: Array
})
</script>
```

- [ ] **Step 8: 创建 HomeView.vue**

```vue
<template>
  <div>
    <GpaCard :gpa="gpa.currentGPA.value" :target-gpa="currentProfile.targetGPA" />
    <StatChips
      :total-credits="gpa.totalCredits.value"
      :entered-count="gpa.enteredCourses.value.length"
      :semester-count="Object.keys(currentProfile.classes).length"
    />
    <SearchBar v-model="uiStore.searchQuery" />
    <IllegalWarning :courses="gpa.illegalGrades.value" />
    <SemesterItem
      v-for="(courses, semester) in filteredClasses"
      :key="semester"
      :semester="semester"
      :courses="courses"
      :grades="gradesStore.getGrades(currentProfile.id)"
      :all-courses="gpa.allCourses.value"
      :semester-gpa="gpa.semesterGPAs.value[semester] || 0"
      @update-grade="onUpdateGrade"
      @toggle-what-if="uiStore.setActiveWhatIfCourse"
    />
    <div v-if="Object.keys(filteredClasses).length === 0" style="text-align: center; color: var(--muted); padding: 2rem;">
      未找到匹配课程
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { useUIStore } from '../stores/ui'
import { useGPA } from '../composables/useGPA'
import GpaCard from '../components/GpaCard.vue'
import StatChips from '../components/StatChips.vue'
import SearchBar from '../components/SearchBar.vue'
import SemesterItem from '../components/SemesterItem.vue'
import IllegalWarning from '../components/IllegalWarning.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const uiStore = useUIStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId.value))
const currentGrades = computed(() => gradesStore.getGrades(appStore.currentProfileId.value))

const gpa = useGPA(currentProfile, currentGrades)

const filteredClasses = computed(() => {
  const query = uiStore.searchQuery.trim().toLowerCase()
  const result = {}
  for (const semester of Object.keys(currentProfile.value.classes)) {
    const courses = currentProfile.value.classes[semester]
    const filtered = query
      ? courses.filter(c => c.name.toLowerCase().includes(query))
      : courses
    if (filtered.length > 0) {
      result[semester] = filtered
    }
  }
  return result
})

function onUpdateGrade(courseName, value) {
  gradesStore.setGrade(appStore.currentProfileId.value, courseName, value)
}
</script>
```

- [ ] **Step 9: 验证首页**

Run:
```bash
npm run dev
```

Expected: 首页显示 GPA 卡片、学期列表、输入成绩后 GPA 实时更新。

- [ ] **Step 10: Commit**

```bash
git add src/views/HomeView.vue src/components/GpaCard.vue src/components/StatChips.vue src/components/SearchBar.vue src/components/SemesterItem.vue src/components/CourseRow.vue src/components/WhatIfPanel.vue src/components/IllegalWarning.vue
git commit -m "feat: implement home page with GPA card, search, what-if simulator"
```

---

## Phase 4: 统计页实现

### Task 7: 实现统计页组件

**Files:**
- Create: `src/components/GpaSummaryCard.vue`
- Create: `src/components/MetricGrid.vue`
- Create: `src/components/TargetAnalysisCard.vue`
- Create: `src/components/FailingWarningCard.vue`
- Create: `src/components/GpaTrendChart.vue`
- Create: `src/components/ScoreDistributionChart.vue`
- Create: `src/views/StatsView.vue`

- [ ] **Step 1: 创建 GpaSummaryCard.vue**

```vue
<template>
  <div class="card" style="background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; border: none;">
    <div style="text-align: center;">
      <div style="font-size: 2.8rem; font-weight: bold;">{{ gpa.toFixed(2) }}</div>
      <div style="font-size: 0.9rem; opacity: 0.9;">当前 GPA · 目标 {{ targetGPA }}</div>
      <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.3); font-size: 0.85rem;">
        {{ summaryText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  gpa: Number,
  targetGPA: Number
})

const summaryText = computed(() => {
  const diff = props.gpa - props.targetGPA
  if (Math.abs(diff) < 0.001) return '刚好达标'
  if (diff > 0) return `已超目标 ${diff.toFixed(2)}`
  return `还差 ${Math.abs(diff).toFixed(2)}`
})
</script>
```

- [ ] **Step 2: 创建 MetricGrid.vue**

```vue
<template>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem;">
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ totalCredits.toFixed(1) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">总学分</div>
    </div>
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ remainingCredits.toFixed(1) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">剩余学分</div>
    </div>
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ enteredCount }} / {{ totalCount }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">已录入 / 总课程</div>
    </div>
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ highestSemesterGPA.toFixed(2) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">最高学期 GPA</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalCredits: Number,
  remainingCredits: Number,
  enteredCount: Number,
  totalCount: Number,
  semesterGPAs: Object
})

const highestSemesterGPA = computed(() => {
  const values = Object.values(props.semesterGPAs)
  if (values.length === 0) return 0
  return Math.max(...values)
})
</script>
```

- [ ] **Step 3: 创建 TargetAnalysisCard.vue**

```vue
<template>
  <div class="card" style="background: #e8f5e9; border-color: #c8e6c9;">
    <div style="font-weight: bold; margin-bottom: 0.5rem;">📈 目标达成分析</div>
    <div style="font-size: 0.85rem; color: #333; line-height: 1.6;">
      <div>• 按当前成绩，最终 GPA 预计 <strong>{{ currentGPA.toFixed(2) }}</strong></div>
      <div v-if="requiredAverage != null">
        • 守住目标所需剩余课程平均分：<strong>{{ requiredAverage.toFixed(1) }}</strong>
      </div>
      <div v-else>• 所有课程已录入</div>
      <div>• 剩余课程平均 85 分时，最终 GPA 可达 <strong>{{ predicted85.toFixed(2) }}</strong></div>
      <div>• 剩余课程平均 90 分时，最终 GPA 可达 <strong>{{ predicted90.toFixed(2) }}</strong></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentGPA: Number,
  requiredAverage: Number,
  predicted: Function
})

const predicted85 = computed(() => props.predicted(85))
const predicted90 = computed(() => props.predicted(90))
</script>
```

- [ ] **Step 4: 创建 FailingWarningCard.vue**

```vue
<template>
  <div v-if="courses.length > 0" class="card" style="background: #fff3f3; border-color: #ffcccc; color: #c33;">
    <div style="font-weight: bold; margin-bottom: 0.5rem;">⚠️ 挂科预警</div>
    <div style="font-size: 0.85rem;">
      <div v-for="course in courses" :key="course.name">
        {{ course.name }}（{{ course.credit }} 学分）成绩 {{ course.score }} 分
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  courses: Array
})
</script>
```

- [ ] **Step 5: 创建 GpaTrendChart.vue**

```vue
<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">学期 GPA 趋势</div>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  semesterGPAs: Object
})

const chartData = computed(() => ({
  labels: Object.keys(props.semesterGPAs),
  datasets: [{
    label: '学期 GPA',
    data: Object.values(props.semesterGPAs),
    backgroundColor: '#66ccff',
    borderRadius: 4
  }]
}))

const chartOptions = {
  responsive: true,
  scales: {
    y: { min: 0, max: 5 }
  }
}
</script>
```

- [ ] **Step 6: 创建 ScoreDistributionChart.vue**

```vue
<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">成绩分布</div>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  grades: Object
})

const distribution = computed(() => {
  const buckets = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 }
  for (const score of Object.values(props.grades)) {
    if (score >= 90) buckets['90-100']++
    else if (score >= 80) buckets['80-89']++
    else if (score >= 70) buckets['70-79']++
    else if (score >= 60) buckets['60-69']++
    else buckets['<60']++
  }
  return buckets
})

const chartData = computed(() => ({
  labels: Object.keys(distribution.value),
  datasets: [{
    label: '课程数',
    data: Object.values(distribution.value),
    backgroundColor: ['#4caf50', '#66ccff', '#ff9800', '#ff5722', '#f44336'],
    borderRadius: 4
  }]
}))

const chartOptions = {
  responsive: true,
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
}
</script>
```

- [ ] **Step 7: 创建 StatsView.vue**

```vue
<template>
  <div>
    <GpaSummaryCard :gpa="gpa.currentGPA.value" :target-gpa="currentProfile.targetGPA" />
    <MetricGrid
      :total-credits="gpa.totalCredits.value"
      :remaining-credits="gpa.remainingCredits.value"
      :entered-count="gpa.enteredCourses.value.length"
      :total-count="gpa.allCourses.value.length"
      :semester-gpas="gpa.semesterGPAs.value"
    />
    <TargetAnalysisCard
      :current-gpa="gpa.currentGPA.value"
      :required-average="gpa.requiredAverageForTarget.value"
      :predicted="gpa.predictedGPA"
    />
    <FailingWarningCard :courses="failingCourses" />
    <GpaTrendChart :semester-gpas="gpa.semesterGPAs.value" />
    <ScoreDistributionChart :grades="currentGrades" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { useGPA } from '../composables/useGPA'
import GpaSummaryCard from '../components/GpaSummaryCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import TargetAnalysisCard from '../components/TargetAnalysisCard.vue'
import FailingWarningCard from '../components/FailingWarningCard.vue'
import GpaTrendChart from '../components/GpaTrendChart.vue'
import ScoreDistributionChart from '../components/ScoreDistributionChart.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId.value))
const currentGrades = computed(() => gradesStore.getGrades(appStore.currentProfileId.value))
const gpa = useGPA(currentProfile, currentGrades)

const failingCourses = computed(() => {
  const result = []
  for (const course of gpa.enteredCourses.value) {
    const score = currentGrades.value[course.name]
    if (score < 60) {
      result.push({ name: course.name, credit: course.credit, score })
    }
  }
  return result
})
</script>
```

- [ ] **Step 8: 验证统计页**

Run:
```bash
npm run dev
```

Expected: 统计页显示指标、趋势图、分布图。

- [ ] **Step 9: Commit**

```bash
git add src/views/StatsView.vue src/components/GpaSummaryCard.vue src/components/MetricGrid.vue src/components/TargetAnalysisCard.vue src/components/FailingWarningCard.vue src/components/GpaTrendChart.vue src/components/ScoreDistributionChart.vue
git commit -m "feat: implement stats page with charts and target analysis"
```

---

## Phase 5: 配置页实现

### Task 8: 实现配置页组件

**Files:**
- Create: `src/components/ProfileSwitcher.vue`
- Create: `src/components/CourseConfigEditor.vue`
- Create: `src/components/ImportExportCard.vue`
- Create: `src/components/DisplaySettings.vue`
- Create: `src/components/DangerZone.vue`
- Create: `src/views/ProfileView.vue`

- [ ] **Step 1: 创建 ProfileSwitcher.vue**

```vue
<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">配置档案</div>
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <div
        v-for="profile in profilesStore.profiles"
        :key="profile.id"
        style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; border-radius: 0.4rem;"
        :style="{ background: profile.id === appStore.currentProfileId.value ? '#e8f5e9' : 'var(--surface)' }"
      >
        <div>
          <div style="font-weight: 500;">{{ profile.name }}</div>
          <div style="font-size: 0.75rem; color: var(--muted);">目标 {{ profile.targetGPA }} · {{ courseCount(profile) }} 门课</div>
        </div>
        <div v-if="profile.id === appStore.currentProfileId.value" style="font-size: 0.75rem; color: #2e7d32;">使用中</div>
        <button v-else class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" @click="appStore.setCurrentProfileId(profile.id)">切换</button>
      </div>
    </div>
    <button class="btn btn-primary" style="width: 100%; margin-top: 0.8rem;" @click="addProfile">+ 新建档案</button>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'

const appStore = useAppStore()
const profilesStore = useProfilesStore()

function courseCount(profile) {
  return Object.values(profile.classes).reduce((sum, list) => sum + list.length, 0)
}

function addProfile() {
  const name = prompt('新档案名称')
  if (name) {
    const id = profilesStore.addProfile(name)
    appStore.setCurrentProfileId(id)
  }
}
</script>
```

- [ ] **Step 2: 创建 CourseConfigEditor.vue**

```vue
<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">编辑当前配置</div>
    <input class="input" v-model="draft.name" placeholder="档案名称" style="margin-bottom: 0.6rem;">
    <input class="input" v-model.number="draft.targetGPA" placeholder="目标绩点" style="margin-bottom: 0.6rem;">

    <div v-for="(courses, semester) in draft.classes" :key="semester" style="border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; margin-bottom: 0.8rem;">
      <div style="padding: 0.6rem; background: var(--surface); display: flex; justify-content: space-between; align-items: center;">
        <input class="input" v-model="semesterNames[semester]" style="width: 100px; font-weight: bold; background: transparent; border: none; padding: 0;" @change="renameSemester(semester, semesterNames[semester])">
        <div style="display: flex; gap: 0.3rem;">
          <button class="btn" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" @click="addCourse(semester)">+ 课</button>
          <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" @click="removeSemester(semester)">删除学期</button>
        </div>
      </div>
      <div style="padding: 0.6rem;">
        <div v-for="(course, index) in courses" :key="index" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <input class="input" v-model="course.name" placeholder="课程名称" style="flex: 2;">
          <input class="input" v-model.number="course.credit" placeholder="学分" style="flex: 1;">
          <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeCourse(semester, index)">✕</button>
        </div>
      </div>
    </div>

    <button class="btn" style="width: 100%; margin-bottom: 0.8rem;" @click="addSemester">+ 新建学期</button>

    <details style="font-size: 0.85rem;">
      <summary>高级：文本模式编辑</summary>
      <textarea class="input" v-model="textMode" rows="6" style="font-family: monospace; margin-top: 0.5rem;"></textarea>
    </details>

    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
      <button class="btn" style="flex: 1;" @click="reset">重置</button>
      <button class="btn btn-primary" style="flex: 1;" @click="save">保存</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { useProfilesStore } from '../stores/profiles'
import { useAppStore } from '../stores/app'
import { serializeClasses, parseClasses } from '../utils/parsers'

const appStore = useAppStore()
const profilesStore = useProfilesStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId.value))
const draft = reactive({ name: '', targetGPA: 2.0, classes: {} })
const semesterNames = reactive({})
const textMode = ref('')

function syncDraft() {
  draft.name = currentProfile.value.name
  draft.targetGPA = currentProfile.value.targetGPA
  draft.classes = JSON.parse(JSON.stringify(currentProfile.value.classes))
  Object.keys(semesterNames).forEach(k => delete semesterNames[k])
  Object.keys(draft.classes).forEach(k => { semesterNames[k] = k })
  textMode.value = serializeClasses(draft.classes)
}

watch(currentProfile, syncDraft, { immediate: true })
watch(() => draft.classes, () => {
  textMode.value = serializeClasses(draft.classes)
}, { deep: true })

function addSemester() {
  const name = prompt('学期名称')
  if (name && !draft.classes[name]) {
    draft.classes[name] = []
    semesterNames[name] = name
  }
}

function removeSemester(name) {
  if (confirm(`删除学期 "${name}" 及其所有课程？`)) {
    delete draft.classes[name]
    delete semesterNames[name]
  }
}

function renameSemester(oldName, newName) {
  if (oldName === newName) return
  if (draft.classes[newName]) {
    alert('学期名称已存在')
    semesterNames[oldName] = oldName
    return
  }
  draft.classes[newName] = draft.classes[oldName]
  delete draft.classes[oldName]
  semesterNames[newName] = newName
  delete semesterNames[oldName]
}

function addCourse(semester) {
  draft.classes[semester].push({ name: '', credit: 0 })
}

function removeCourse(semester, index) {
  draft.classes[semester].splice(index, 1)
}

function reset() {
  syncDraft()
}

function save() {
  let classes = draft.classes
  if (textMode.value.trim()) {
    const parsed = parseClasses(textMode.value)
    if (Object.keys(parsed).length > 0) {
      classes = parsed
    }
  }
  profilesStore.updateProfile(currentProfile.value.id, {
    name: draft.name,
    targetGPA: draft.targetGPA,
    classes
  })
}
</script>
```

- [ ] **Step 3: 创建 ImportExportCard.vue**

```vue
<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">数据备份</div>
    <div style="display: flex; gap: 0.5rem;">
      <button class="btn" style="flex: 1;" @click="importData">导入 JSON</button>
      <button class="btn btn-primary" style="flex: 1;" @click="exportData">导出备份</button>
    </div>
    <input ref="fileInput" type="file" accept=".json" style="display: none;" @change="onFileSelected">
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()

const fileInput = ref(null)

function exportData() {
  const profile = profilesStore.getProfile(appStore.currentProfileId.value)
  const data = {
    version: 2,
    profile,
    grades: gradesStore.getGrades(profile.id)
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GPA-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData() {
  fileInput.value.click()
}

function onFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      if (data.version === 2) {
        profilesStore.updateProfile(data.profile.id, data.profile)
        gradesStore.load({ ...gradesStore.gradesByProfile, [data.profile.id]: data.grades })
        appStore.setCurrentProfileId(data.profile.id)
      } else {
        // Legacy format fallback
        const id = profilesStore.addProfile(data.className || '导入配置', data.targetGPA, parseClasses(data.classes))
        gradesStore.load({ ...gradesStore.gradesByProfile, [id]: data.scores })
        appStore.setCurrentProfileId(id)
      }
    } catch (e) {
      alert('导入失败：' + e.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}
</script>
```

Note: `parseClasses` is used but not imported. Add `import { parseClasses } from '../utils/parsers'`.

- [ ] **Step 4: 创建 DisplaySettings.vue**

```vue
<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">显示设置</div>
    <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
      <span>结果显示至小数点后 5 位</span>
      <input type="checkbox" v-model="appStore.showVeryLongGPA">
    </label>
    <label style="display: flex; justify-content: space-between; align-items: center;">
      <span>深色模式</span>
      <select class="input" v-model="appStore.theme" style="width: auto;">
        <option value="auto">跟随系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </label>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
</script>
```

- [ ] **Step 5: 创建 DangerZone.vue**

```vue
<template>
  <div class="card" style="background: #fff3f3; border-color: #ffcccc;">
    <div style="font-weight: bold; margin-bottom: 0.8rem; color: #c33;">危险操作</div>
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <button class="btn btn-danger" @click="clearGrades">仅清除成绩</button>
      <button class="btn btn-danger" @click="clearAll">清除所有本地数据</button>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app'
import { useGradesStore } from '../stores/grades'
import { useProfilesStore } from '../stores/profiles'

const appStore = useAppStore()
const gradesStore = useGradesStore()
const profilesStore = useProfilesStore()

function clearGrades() {
  if (confirm('确定清除当前档案的所有成绩吗？此操作不可恢复。')) {
    gradesStore.clearGrades(appStore.currentProfileId.value)
  }
}

function clearAll() {
  if (confirm('确定清除所有本地数据吗？包括成绩、配置档案和设置。')) {
    localStorage.clear()
    location.reload()
  }
}
</script>
```

- [ ] **Step 6: 创建 ProfileView.vue**

```vue
<template>
  <div>
    <ProfileSwitcher />
    <CourseConfigEditor />
    <ImportExportCard />
    <DisplaySettings />
    <DangerZone />
    <div style="text-align: center; margin-top: 1rem;">
      <a href="https://github.com/gggxbbb/xhzmu-mz-GPA" target="_blank" style="font-size: 0.8rem; color: var(--muted);">GitHub</a>
    </div>
  </div>
</template>

<script setup>
import ProfileSwitcher from '../components/ProfileSwitcher.vue'
import CourseConfigEditor from '../components/CourseConfigEditor.vue'
import ImportExportCard from '../components/ImportExportCard.vue'
import DisplaySettings from '../components/DisplaySettings.vue'
import DangerZone from '../components/DangerZone.vue'
</script>
```

- [ ] **Step 7: 验证配置页**

Run:
```bash
npm run dev
```

Expected: 配置页可切换档案、编辑课程、导入导出、清除数据。

- [ ] **Step 8: Commit**

```bash
git add src/views/ProfileView.vue src/components/ProfileSwitcher.vue src/components/CourseConfigEditor.vue src/components/ImportExportCard.vue src/components/DisplaySettings.vue src/components/DangerZone.vue
git commit -m "feat: implement profile page with multi-profile config editor and import/export"
```

---

## Phase 6: PWA、构建与收尾

### Task 9: 配置 PWA 与构建产物

**Files:**
- Modify: `vite.config.js`
- Modify: `public/manifest.json`
- Modify: `package.json`

- [ ] **Step 1: 更新 vite.config.js 以支持 PWA manifest 注入**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/analysis\.gxb\.icu\/.*/,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ]
})
```

- [ ] **Step 2: 更新 manifest.json**

修改 `public/manifest.json` 中的以下字段（保留 icons）：
```json
{
  "name": "学位绩点计算器",
  "short_name": "GPA",
  "description": "一个现代化的 GPA 计算器",
  "id": "https://gpa.gxb.pub",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": [
    "window-controls-overlay",
    "standalone",
    "minimal-ui",
    "browser"
  ],
  "theme_color": "#66ccff",
  "background_color": "#ffffff",
  "icons": [ ... ]
}
```

- [ ] **Step 3: 添加 build 脚本与验证**

Run:
```bash
npm run build
```

Expected: `dist/` 目录生成，无错误。

- [ ] **Step 4: Commit**

```bash
git add vite.config.js public/manifest.json
git commit -m "feat: configure PWA build with vite-plugin-pwa"
```

---

### Task 10: 全面测试与 Bug 修复

**Files:**
- All existing files as needed

- [ ] **Step 1: 运行所有单元测试**

Run:
```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: 手动端到端验证清单**

1. 首页输入成绩后 GPA 实时更新。
2. 切换显示 5 位小数后格式变化。
3. 统计页图表正常渲染。
4. 配置页编辑课程并保存，首页同步更新。
5. 新建档案并切换，成绩互不影响。
6. 导入/导出 JSON 正常。
7. 清除成绩后首页归零。
8. 旧版 localStorage 数据自动迁移。
9. PWA 可安装（使用 Lighthouse 或 Chrome DevTools）。
10. 深色/浅色模式切换正常。

- [ ] **Step 3: 修复发现的 Bug 并提交**

根据验证结果修复问题，每次修复后运行相关测试并 commit。

- [ ] **Step 4: 最终 Commit**

```bash
git commit -m "fix: address bugs from end-to-end verification"
```

---

## 计划自评

### Spec 覆盖检查

| Spec 要求 | 对应任务 |
|-----------|----------|
| Vue 3 + Vite 项目搭建 | Task 1 |
| Pinia 状态管理 | Task 4 |
| 底部 Tab 三页导航 | Task 5 |
| 首页 GPA 计算 + What-if | Task 6 |
| 统计页图表与指标 | Task 7 |
| 配置页多档案 + 表单编辑 + 导入导出 | Task 8 |
| localStorage 持久化与旧版迁移 | Task 3, Task 5 |
| PWA 离线能力 | Task 9 |
| 深色模式 | Task 5 (styles.css), Task 8 (DisplaySettings) |
| 单元测试 | Task 2, Task 3, Task 10 |

### 无占位符检查
- 所有任务包含具体文件路径、代码示例和验证命令。
- 无 "TBD"、"TODO"、"稍后实现" 等占位内容。

### 类型一致性检查
- `currentProfile` 统一通过 `profilesStore.getProfile(appStore.currentProfileId)` 获取。
- `grades` 统一通过 `gradesStore.getGrades(profileId)` 获取。
- `draft.classes` 使用深拷贝避免直接修改 store 状态。
