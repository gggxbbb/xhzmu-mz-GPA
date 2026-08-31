# 学位绩点计算对齐徐医（xzhmu）官方规则

Status: ready-for-agent

## Problem Statement

用户（徐州医科大学麻醉专业本科生）用这个应用计算真正影响毕业的学位课平均学分绩点。当前应用的绩点换算与校方规则不符：不及格（< 60）的课程会被算出**负绩点**（如 45 分 → −0.5），把 GPA 拉到低于教务系统核算值的水平，使「离目标学位绩点还差多少」这个核心问题的答案是错的。此外代码中存在一条无校规依据的「< 10 分特殊分支」，语义含混。

依据：《徐州医科大学本科生学籍管理规定》（徐医大办〔2016〕44号，https://xxgk.xzhmu.edu.cn/info/1041/1062.htm ）第十二条：百分制成绩 < 60 → 绩点 0.0；≥ 60 → 绩点 = (成绩−50)/10。第二十五条：重修以历次最高分记录。第十五条：补考及格以 60 分计。

## Solution

从用户视角：录入的每一分都按学校教务处的规则参与计算——挂科的课记 0 绩点（而不是负分），GPA 数字与教务系统口径一致；挂科学位课被明确警告（它阻断毕业）；低于 10 分的录入被提示「疑似误输入」，但计算仍按校规处理；目标分析给出的「所需剩余均分」永远不会给出低于 60 的无意义数字（60 分以下不产生任何绩点）。

## User Stories

1. As a 学位课学生, I want 挂科课程按 0 绩点计入 GPA, so that 应用算出的 GPA 与教务系统核算一致
2. As a 学位课学生, I want 我的 GPA 永远不为负数所累, so that 一次挂科不会让 GPA 低于真实校规口径
3. As a 学位课学生, I want 60 分整的课程计 1.0 绩点, so that 压线及格得到正确的边界处理
4. As a 学位课学生, I want 看到挂科学位课的明确警告（课名、学分、分数）, so that 我知道哪些课阻断毕业需要重修
5. As a 学位课学生, I want 低于 10 分的录入被提示疑似误输入, so that 我能发现手滑打错的成绩
6. As a 学位课学生, I want 误输入的低分仍按校规（0 绩点）计入, so that 提示与计算互不干扰
7. As a 学位课学生, I want 学期 GPA 与总 GPA 使用同一套校规换算, so that 统计页和首页数字自洽
8. As a 学位课学生, I want 目标已达时「所需剩余均分」显示 0, so that 我知道目标已守住
9. As a 学位课学生, I want 「所需剩余均分」的下限是 60, so that 我不会被告知一个实际上不产生任何绩点的目标分数
10. As a 学位课学生, I want 目标不可达时（所需均分 > 100）明确显示不可达, so that 我能及时调整预期
11. As a 学位课学生, I want What-If 模拟中低于 60 的假设均分按 0 绩点贡献, so that 模拟结果与真实规则一致
12. As a 重修学生, I want 只需录入历次最高分, so that 我不需要管理多次成绩记录（校规第二十五条）
13. As a 补考通过的学生, I want 该课有效分按 60 录入, so that 与校规第十五条的记载一致

## Implementation Decisions

- 唯一被修改的计算模块是 GPA composable（useGPA）：
  - 纯函数 calculateGPA：score < 60 → 绩点 0；score ≥ 60 → (score−50)/10。任何成绩不产生负绩点。
  - 新增 failingCourses 派生：已录入且 < 60 的学位课列表（含课名、学分、分数），供警告卡消费。
  - 原 illegalGrades（< 10）保留为 suspiciousGrades，语义收窄为「疑似误输入」的纯 UI 提示，与计算无关。
  - requiredAverageForTarget：目标已达（needed ≤ 0）→ 返回 0；needed > 0 时反解均分，下限 60（低于 60 的均分不产生绩点，无意义）；> 100 → null（不可达）。
  - predictedGPA：模拟均分对剩余课程的绩点贡献以 0 为下限。
- 视图层：统计页的挂科警告改为直接消费 composable 的 failingCourses（删除视图内的重复计算）；首页的 < 10 提示改消费 suspiciousGrades；提示文案改为「疑似误输入；按校规将以 0 绩点计入」。
- 课程身份不变：课程名在 profile 内唯一即为键（徐医培养方案同名课程带数字后缀），不引入内部 ID。
- 域文档已就位：CONTEXT.md 新增/收紧 Grade、Grade Point (绩点)、Degree Course (学位课程) 定义；docs/adr/0004-xzhmu-official-grading-rules.md 记录全部决策与出处。
- 本次会话中 src 侧改动已先行落盘（calculateGPA 下限、failingCourses/suspiciousGrades、视图消费切换、文案），但测试尚未切换到新契约——实现者必须先核对 src 与 spec 一致，再完成测试切换；如发现 src 与 spec 不符，以 spec 为准修正。

## Testing Decisions

- 好测试的标准：只测外部可观察契约（GPA 数值、派生列表内容、目标分析返回值），不测实现细节。
- 唯一测试接缝：现有的 useGPA 测试文件（纯函数 calculateGPA + composable useGPA）。不新增接缝。
- 需要覆盖的契约：挂科 → 0 绩点且不产生负值；60 分整 → 1.0；与及格课混合的加权；suspiciousGrades 标记但不影响计算；failingCourses 内容；requiredAverageForTarget 的 0/60 下限/null 三态；predictedGPA 的 0 下限。
- Prior art：现有测试文件中的 calculateGPA 基本用例与 useGPA 用例（DEFAULT_CLASSES + ref(grades) 模式）直接沿用；旧的「flags illegal grades」用例按新语义改写。
- 组件级样式测试（theme-variables 中的 IllegalWarning/FailingWarningCard 挂载用例）不受影响，保持原样。

## Out of Scope

- 五级制（A–E）课程：徐医学位课全部为百分制，不支持（ADR-0004 决策 4）。
- 课程内部 ID、跨学期同名课支持：校规保证名称唯一（ADR-0004 决策 5）。
- 多次成绩记录/重修历史：glossary 已将 Grade 定义为历次最高分。
- 教务系统成绩粘贴导入：用户明确推迟。
- 导出提醒：用户明确否决（恢复路径是从教务系统重新录入）。
- 任何形式的云同步：ADR-0002 已定死。

## Further Notes

- 校规出处需长期可考：徐州医科大学信息公开网《徐州医科大学本科生学籍管理规定》，条款号见 ADR-0004。
- 已录入不及格成绩的历史数据在本修复后 GPA 显示值会上升（负绩点 → 0），这是修正而非回归。
- 换算表在 < 60 处存在不连续（59 → 0，60 → 1.0），requiredAverageForTarget 的 60 下限正是这一事实的直接推论，不要「优化」掉。
