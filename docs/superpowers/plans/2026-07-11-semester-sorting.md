# 学期强制排序功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让学期在首页和配置编辑器中严格按 `大一上` 到 `大五下` 的顺序展示与保存。

**Architecture:** 新增独立的 `utils/semesterSort.js` 工具函数；在 `HomeView.vue` 的渲染计算属性中调用它进行展示排序；在 `CourseConfigEditor.vue` 的保存逻辑中调用它，使持久化数据本身有序。

**Tech Stack:** Vue 3, Pinia, Vite, Vitest

---

## 文件结构

| 文件 | 责任 |
|------|------|
| `src/utils/semesterSort.js` | 提供 `sortClasses(classes)`，按标准学期顺序排序，非标准学期后置并保持原顺序 |
| `tests/utils/semesterSort.test.js` | 对排序函数进行单元测试 |
| `src/views/HomeView.vue` | 在 `filteredClasses` 中使用 `sortClasses` 控制渲染顺序 |
| `src/components/CourseConfigEditor.vue` | 在 `save()` 中对最终写入的 classes 调用 `sortClasses` |

---

### Task 1: 学期排序工具函数

**Files:**
- Create: `src/utils/semesterSort.js`
- Test: `tests/utils/semesterSort.test.js`

- [ ] **Step 1: 编写失败的测试**

创建 `tests/utils/semesterSort.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { sortClasses } from '../../src/utils/semesterSort'

describe('sortClasses', () => {
  it('sorts standard semesters in order', () => {
    const input = {
      '大四上': [{ name: 'A', credit: 1 }],
      '大一上': [{ name: 'B', credit: 2 }],
      '大一下': [{ name: 'C', credit: 3 }],
    }
    expect(Object.keys(sortClasses(input))).toEqual(['大一上', '大一下', '大四上'])
  })

  it('places non-standard semesters after standard ones', () => {
    const input = {
      '实习期': [{ name: 'A', credit: 1 }],
      '大一上': [{ name: 'B', credit: 2 }],
      '重修': [{ name: 'C', credit: 3 }],
    }
    expect(Object.keys(sortClasses(input))).toEqual(['大一上', '实习期', '重修'])
  })

  it('preserves insertion order for non-standard semesters', () => {
    const input = {
      '研二上': [{ name: 'A', credit: 1 }],
      '研一上': [{ name: 'B', credit: 2 }],
    }
    expect(Object.keys(sortClasses(input))).toEqual(['研二上', '研一上'])
  })

  it('handles empty and invalid input', () => {
    expect(sortClasses({})).toEqual({})
    expect(sortClasses(null)).toEqual({})
    expect(sortClasses(undefined)).toEqual({})
    expect(sortClasses('not an object')).toEqual({})
  })

  it('does not mutate input', () => {
    const input = { '大二上': [], '大一上': [] }
    const result = sortClasses(input)
    expect(Object.keys(input)).toEqual(['大二上', '大一上'])
    expect(result).not.toBe(input)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/utils/semesterSort.test.js`

Expected: FAIL，提示 `Cannot find module '../../src/utils/semesterSort'` 或 `sortClasses is not a function`

- [ ] **Step 3: 实现排序函数**

创建 `src/utils/semesterSort.js`：

```js
const STANDARD_SEMESTERS = [
  '大一上', '大一下',
  '大二上', '大二下',
  '大三上', '大三下',
  '大四上', '大四下',
  '大五上', '大五下',
]

const SEMESTER_INDEX = new Map(
  STANDARD_SEMESTERS.map((name, index) => [name, index])
)

/**
 * Sort semester keys so that standard semesters （大一上~大五下） come first
 * in their canonical order, followed by non-standard semesters in their
 * original insertion order.
 *
 * @param {Record<string, any>} classes
 * @returns {Record<string, any>}
 */
export function sortClasses(classes) {
  if (!classes || typeof classes !== 'object' || Array.isArray(classes)) {
    return {}
  }

  const entries = Object.entries(classes).map((entry, originalIndex) => ({
    entry,
    originalIndex,
  }))

  entries.sort((a, b) => {
    const indexA = SEMESTER_INDEX.get(a.entry[0])
    const indexB = SEMESTER_INDEX.get(b.entry[0])

    if (indexA !== undefined && indexB !== undefined) {
      return indexA - indexB
    }
    if (indexA !== undefined) return -1
    if (indexB !== undefined) return 1

    return a.originalIndex - b.originalIndex
  })

  return Object.fromEntries(entries.map(({ entry }) => entry))
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/utils/semesterSort.test.js`

Expected: 5 tests PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/semesterSort.js tests/utils/semesterSort.test.js
git commit -m "feat(utils): add semester sort utility with tests"
```

---

### Task 2: 首页展示排序

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: 引入排序函数并修改渲染顺序**

在 `src/views/HomeView.vue` 中：

1. 在 `<script setup>` 顶部导入：

```js
import { sortClasses } from '../utils/semesterSort'
```

2. 修改 `filteredClasses`：

```js
const filteredClasses = computed(() => {
  const query = uiStore.searchQuery.trim().toLowerCase()
  const result = {}
  for (const semester of Object.keys(sortClasses(currentProfile.value.classes))) {
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
```

- [ ] **Step 2: 运行测试确认无回归**

Run: `npm test`

Expected: 全部通过（当前基线为 15 个文件 101 个测试通过）

- [ ] **Step 3: 提交**

```bash
git add src/views/HomeView.vue
git commit -m "feat(home): render semesters in canonical order"
```

---

### Task 3: 编辑器保存排序

**Files:**
- Modify: `src/components/CourseConfigEditor.vue`

- [ ] **Step 1: 引入排序函数并修改保存逻辑**

在 `src/components/CourseConfigEditor.vue` 中：

1. 在 `<script setup>` 中追加导入：

```js
import { sortClasses } from '../utils/semesterSort'
```

2. 在 `save()` 中，将写入的 `classes` 改为排序后的结果：

```js
profilesStore.updateProfile(currentProfile.value.id, {
  name: draft.name,
  targetGPA,
  classes: sortClasses(filteredClasses),
})
```

当前代码位置在 `save()` 末尾附近：

```js
profilesStore.updateProfile(currentProfile.value.id, {
  name: draft.name,
  targetGPA,
  classes: JSON.parse(JSON.stringify(filteredClasses)),
})
```

将其替换为：

```js
profilesStore.updateProfile(currentProfile.value.id, {
  name: draft.name,
  targetGPA,
  classes: sortClasses(filteredClasses),
})
```

注意：`sortClasses` 会返回新对象，不修改 `filteredClasses`。

- [ ] **Step 2: 运行测试确认无回归**

Run: `npm test`

Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add src/components/CourseConfigEditor.vue
git commit -m "feat(editor): sort semesters before saving profile"
```

---

### Task 4: 全量验证

**Files:**
- 无新增或修改

- [ ] **Step 1: 运行完整测试套件**

Run: `npm test`

Expected: 全部通过

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: `dist/` 生成成功，无 TypeScript/Vite 错误

- [ ] **Step 3: 最终提交（如需要）**

如果前面步骤已分别提交，此步骤可跳过；如需汇总提交：

```bash
git commit --amend -m "feat: force canonical semester ordering on display and save"
```

---

## 自审查

**1. Spec coverage**
- 标准学期顺序：Task 1 工具函数 + Task 2/3 调用。
- 非标准学期后置并保持原顺序：Task 1 测试用例 + 实现。
- 不修改 `DEFAULT_CLASSES`：计划中无相关改动。
- 非法输入防御：Task 1 的 `sortClasses` 开头有类型检查及对应测试。

**2. Placeholder scan**
- 无 TBD/TODO。
- 每个代码步骤均提供完整代码。
- 每个运行命令均给出预期输出。

**3. Type consistency**
- `sortClasses` 名称在 Task 1/2/3 中一致。
- 导入路径 `../utils/semesterSort` 在 `src/views/HomeView.vue` 和 `src/components/CourseConfigEditor.vue` 中正确（二者均在 `src/` 子目录下）。

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-07-11-semester-sorting.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
