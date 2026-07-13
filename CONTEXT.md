# Domain glossary

This repo is a GPA calculator for medical-school course plans. When the engineering skills name a domain concept, they should use the terms below.

## Terms

- **Profile** — a student configuration that contains a target GPA and a set of semesters/courses. A user may have multiple profiles.
- **Course** — one subject in a semester. Has a name and a credit value.
- **Semester** — a named grouping of courses within a profile (e.g. "大二下").
- **Grade** — a numeric score entered for a course. Stored canonically as `{ score, updatedAt }` so merge logic can pick the latest value during sync.
- **Target GPA** — the GPA a profile aims to reach.
- **GPA** — grade-point average calculated from entered grades and course credits.

## Not in this glossary

Architecture terms like `SyncEngine`, `SyncPort`, and `stateMerge` are engineering decisions recorded in `docs/adr/` and `AGENTS.md`, not domain language.
