# 学期强制排序功能设计文档

## 背景

目前 `HomeView.vue` 使用 `Object.keys(currentProfile.value.classes)` 遍历学期，顺序由对象插入顺序决定。用户希望学期在界面上严格按照

```
大一上 < 大一下 < 大二上 < 大二下 < 大三上 < 大三下 < 大四上 < 大四下 < 大五上 < 大五下
```

的顺序展示，并在保存配置时也保持该顺序。

## 目标

1. 首页学期卡片与配置编辑器中的学期始终按上述 10 个标准学期名称的顺序呈现。
2. 非标准学期名（如“实习期”“研一上”“重修”）统一排在所有标准学期之后，并保持其原有出现顺序。
3. 不修改 `DEFAULT_CLASSES`，仅在排序函数中维护标准学期顺序表。
4. 对非法输入具备防御性，避免渲染崩溃。

## 非目标

- 不改变 `parseClasses` / `serializeClasses` 的文本格式。
- 不新增默认空学期到 `DEFAULT_CLASSES`。
- 不处理学期名称大小写转换或模糊匹配。

## 排序规则

新建 `src/utils/semesterSort.js`，导出 `sortClasses(classes)`。

- 内部维护：
  ```js
  const STANDARD_SEMESTERS = [
    '大一上', '大一下',
    '大二上', '大二下',
    '大三上', '大三下',
    '大四上', '大四下',
    '大五上', '大五下',
  ]
  ```
- 比较逻辑：
  1. 若两个学期名都在 `STANDARD_SEMESTERS` 中，按索引升序排列。
  2. 若仅一个在标准列表中，标准学期排在前面。
  3. 若都不在标准列表中，保持两者在原对象中的相对插入顺序。
- 函数返回新的对象，不修改输入对象，内部课程数组引用保持不变。
- 对 `undefined` / `null` / 非对象输入，返回 `{}`。

## 改动点

### 新增文件

- `src/utils/semesterSort.js`：排序函数实现。
- `tests/utils/semesterSort.test.js`：单元测试（标准顺序、非标准后置、空对象、重复键、非法输入）。

### 修改文件

- `src/views/HomeView.vue`
  - 在 `filteredClasses` 计算属性中，过滤前先调用 `sortClasses(currentProfile.value.classes)`，确保渲染顺序固定。
- `src/components/CourseConfigEditor.vue`
  - 在 `save()` 中，对最终要写入的 `filteredClasses` 调用 `sortClasses`，使持久化数据本身有序。

## 测试计划

1. **单元测试** `tests/utils/semesterSort.test.js`
   - 标准学期乱序输入 → 按大一上到大五下输出。
   - 混合非标准学期 → 标准学期在前，非标准学期按原顺序在后。
   - 无非标准学期、无标准学期、空对象、`null` / `undefined`。
   - 重复学期名按最后一次出现处理（对象键天然唯一，测试用于文档化行为）。
2. **集成测试**
   - 运行现有 `npm test`，确保不破坏已有用例。
   - 运行 `npm run build`，确保构建通过。
3. **手工验证**
   - 在首页调整学期顺序（通过导入或编辑），确认刷新后顺序固定。
   - 在编辑器中添加“实习期”，确认其始终位于标准学期之后。

## 兼容性

- 现有数据无需迁移：展示层排序会让旧数据立即呈现正确顺序，编辑器保存后持久化顺序。
- 不修改 stores、composables、router 等核心逻辑，风险可控。
