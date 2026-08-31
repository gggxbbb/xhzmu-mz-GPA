# Domain glossary

This repo is a GPA calculator for medical-school course plans. When the engineering skills name a domain concept, they should use the terms below.

## Terms

- **Profile** — a student configuration that contains a target GPA and a set of semesters/courses. A user may have multiple profiles.
- **Course** — one subject in a semester. Has a name and a credit value. Within a profile, course names are unique and serve as the course's identity: XZHMU teaching plans suffix would-be duplicates with numbers (诊断学1/诊断学2).
- **Degree Course (学位课程)** — a Course that counts toward the degree. This app tracks Degree Courses only; at XZHMU every Degree Course is graded on the percentage scale, so five-scale (A–E) grades are out of scope.
- **Semester** — a named grouping of courses within a profile (e.g. "大二下").
- **Grade** — the effective score the university records for a course: the highest score across all attempts (重修以历次最高分记录); a course passed via 补考 is recorded as 60. Percentage scale, 0–100.
_Avoid_: latest attempt score, raw exam score
- **Grade Point (绩点)** — the per-course quality unit converted from a Grade per the university's official table (徐州医科大学本科生学籍管理规定 第十二条): Grade ≥ 60 → (Grade − 50) / 10; Grade < 60 → 0.
_Avoid_: raw score, percentage
- **Target GPA** — the GPA a profile aims to reach.
- **GPA** — grade-point average calculated from entered grades and course credits.

## Not in this glossary

Architecture and engineering decisions are recorded in `docs/adr/`, not domain language.
