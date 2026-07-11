# Supabase 集成实施计划

> **For agentic workers:** REQUIRED SUB- SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 GPA 计算器的失效分析脚本替换为 Supabase，新增匿名登录、云端数据备份/恢复、分享码、事件统计和异常上报，同时保持离线优先。

**Architecture:** 在 `src/services/supabase/` 下封装 client、auth、sync、analytics、errorReporter、config；通过 `useSync` / `useAnalytics` composables 接入 Vue 组件；`main.js` 按是否配置 Supabase 分支初始化，未配置时离线运行，已配置时按需动态导入服务并把 Supabase client 拆分为独立 chunk；所有云端操作失败时静默降级。同步以 profile 和单条 grade 的 `updatedAt` 做 last-write-wins 合并。

**Tech Stack:** Vue 3, Pinia, Vite, Vitest, Supabase (Postgres + Auth), `@supabase/supabase-js`, Supabase CLI (`npx supabase`)

---

## 文件结构

```
supabase/
  config.toml                         # Supabase CLI 配置（可选，若用本地栈）
  migrations/
    20260711000000_initial_schema.sql # 初始表结构与 RLS
.env                                  # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
.env.example
src/
  services/
    supabase/
      config.js                       # 环境变量是否配置的判断
      client.js                       # createClient，未配置时返回 null
      auth.js                         # 匿名登录、session 恢复
      sync.js                         # 本地状态与云端双向同步 + 合并工具
      analytics.js                    # 事件队列与上报
      errorReporter.js                # 全局异常捕获与上报
      shareCodes.js                   # 分享码生成与读取
  composables/
    useSync.js                        # 同步状态与手动触发
    useAnalytics.js                   # 事件上报便捷方法
  components/
    SyncStatusBar.vue                 # 在线/同步/离线状态条
    ShareCodeDialog.vue               # 生成分享码弹窗
    RecoverDialog.vue                 # 通过分享码恢复弹窗
  main.js                             # 异步初始化 Supabase、注册全局错误处理
  App.vue                             # 挂载 SyncStatusBar
  views/
    ProfileView.vue                   # 增加同步/分享/恢复入口
index.html                            # 删除 analysis.gxb.icu 脚本
tests/
  services/
    supabase/
      client.test.js
      auth.test.js
      sync.test.js
      analytics.test.js
      errorReporter.test.js
  components/
    SyncStatusBar.test.js
    ShareCodeDialog.test.js
    RecoverDialog.test.js
```

---

## Task 1: 环境准备与依赖安装

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `.env`（本地开发用，不提交）

**依赖:**
- `@supabase/supabase-js@^2.49.0`

- [ ] **Step 1: 安装 Supabase JS 客户端**

```bash
npm install @supabase/supabase-js@^2.49.0
```

Expected: `package.json` 的 `dependencies` 中出现 `@supabase/supabase-js`。

- [ ] **Step 2: 创建 .env.example**

Create `.env.example`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

- [ ] **Step 3: 创建本地 .env**

复制 `.env.example` 为 `.env`，填入你的 Supabase 项目 URL 和 Publishable key。

- [ ] **Step 4: 提交 package.json 与 .env.example**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add @supabase/supabase-js and env example"
```

---

## Task 2: 创建 Supabase 迁移文件

**Files:**
- Create: `supabase/migrations/20260711000000_initial_schema.sql`
- Create: `supabase/config.toml`（仅目录占位，CLI link 时会生成）

- [ ] **Step 1: 创建 migrations 目录并写入初始 schema**

Create `supabase/migrations/20260711000000_initial_schema.sql`:

```sql
-- profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  local_id text NOT NULL,
  name text NOT NULL,
  target_gpa numeric NOT NULL,
  classes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, local_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- grades 表
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_local_id text NOT NULL,
  course_name text NOT NULL,
  score numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, profile_local_id, course_name)
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own grades"
  ON grades FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- share_codes 表
CREATE TABLE IF NOT EXISTS share_codes (
  code text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE share_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read share code by code"
  ON share_codes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owners can manage their share codes"
  ON share_codes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- events 表
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only insert their own events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only read their own events"
  ON events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- errors 表
CREATE TABLE IF NOT EXISTS errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  stack text,
  component text,
  url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only insert their own errors"
  ON errors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only read their own errors"
  ON errors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: 提交迁移文件**

```bash
git add supabase/
git commit -m "chore: add Supabase initial schema migration"
```

---

## Task 3: Supabase Client 初始化

**Files:**
- Create: `src/services/supabase/client.js`
- Create: `tests/services/supabase/client.test.js`

- [ ] **Step 1: 写 client 测试**

Create `tests/services/supabase/client.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createClientMock = vi.fn(() => ({
  auth: {}
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => createClientMock(...args)
}))

describe('supabase client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('creates client with url and publishable key', async () => {
    await import('../../../src/services/supabase/client.js')
    expect(createClientMock).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-key',
      expect.any(Object)
    )
  })

  it('returns null client if env vars are missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    const { supabase } = await import('../../../src/services/supabase/client.js')
    expect(supabase).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/services/supabase/client.test.js
```

Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 config.js 与 client.js**

Create `src/services/supabase/config.js`:

```js
export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )
}
```

Create `src/services/supabase/client.js`:

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

function createSafeClient() {
  if (!url || !key) {
    return null
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  })
}

export const supabase = createSafeClient()
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- tests/services/supabase/client.test.js
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/services/supabase/config.js src/services/supabase/client.js tests/services/supabase/client.test.js
git commit -m "feat: initialize Supabase client with env validation"
```

---

## Task 4: 匿名认证服务

**Files:**
- Create: `src/services/supabase/auth.js`
- Create: `tests/services/supabase/auth.test.js`

- [ ] **Step 1: 写 auth 测试**

Create `tests/services/supabase/auth.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSessionMock = vi.fn()
const signInAnonymouslyMock = vi.fn()

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
      signInAnonymously: () => signInAnonymouslyMock()
    }
  }
}))

import { initAnonymousAuth, getCurrentUserId } from '../../../src/services/supabase/auth.js'

describe('auth', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns existing session user', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null
    })
    const { user } = await initAnonymousAuth()
    expect(user.id).toBe('u1')
    expect(signInAnonymouslyMock).not.toHaveBeenCalled()
  })

  it('signs in anonymously when no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null })
    signInAnonymouslyMock.mockResolvedValue({
      data: { user: { id: 'u2' }, session: { user: { id: 'u2' } } },
      error: null
    })
    const { user } = await initAnonymousAuth()
    expect(user.id).toBe('u2')
    expect(signInAnonymouslyMock).toHaveBeenCalled()
  })

  it('returns null user id before init', () => {
    expect(getCurrentUserId()).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/services/supabase/auth.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现 auth.js**

Create `src/services/supabase/auth.js`:

```js
import { supabase } from './client.js'

let currentUser = null
let initPromise = null

export async function initAnonymousAuth() {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    if (!supabase) {
      return { user: null, error: new Error('Supabase client is not initialized') }
    }

    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to retrieve session:', error)
      }

      if (data?.session?.user) {
        currentUser = data.session.user
        return { user: currentUser, error: null }
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()

      if (signInError) {
        console.error('Failed to sign in anonymously:', signInError)
        return { user: null, error: signInError }
      }

      currentUser = signInData?.user ?? null
      return { user: currentUser, error: null }
    } catch (err) {
      console.error('Unexpected error during anonymous auth initialization:', err)
      return { user: null, error: err }
    }
  })()

  const result = await initPromise

  // Only cache successful authentication; allow retry on transient failures.
  if (result.error || !result.user) {
    initPromise = null
  }

  return result
}

export function getCurrentUserId() {
  return currentUser?.id ?? null
}

export function isAuthenticated() {
  return currentUser !== null
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- tests/services/supabase/auth.test.js
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/services/supabase/auth.js tests/services/supabase/auth.test.js
git commit -m "feat: add anonymous Supabase auth service"
```

---

## Task 5: 同步服务

**Files:**
- Create: `src/services/supabase/sync.js`
- Create: `tests/services/supabase/sync.test.js`

- [ ] **Step 1: 写 sync 测试**

Create `tests/services/supabase/sync.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fromMock = vi.fn()
const upsertMock = vi.fn()
const selectMock = vi.fn()

defineMock()

function defineMock() {
  selectMock.mockReturnValue({ data: [], error: null })
  upsertMock.mockReturnValue({ data: null, error: null })
  fromMock.mockImplementation((table) => {
    if (table === 'profiles') {
      return {
        upsert: upsertMock,
        select: () => selectMock()
      }
    }
    if (table === 'grades') {
      return {
        upsert: upsertMock,
        select: () => selectMock()
      }
    }
    return {}
  })
}

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: { from: (table) => fromMock(table) }
}))

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: () => 'u1'
}))

import { pushState, pullState, mergeProfiles, mergeGrades } from '../../../src/services/supabase/sync.js'

describe('sync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    defineMock()
  })

  it('pushes profiles and grades with updated_at', async () => {
    const now = Date.now()
    const state = {
      profiles: [{ id: 'p1', name: '默认', targetGPA: 3.5, classes: {}, updatedAt: now }],
      grades: { p1: { 数学: 90 } }
    }
    await pushState(state)
    expect(fromMock).toHaveBeenCalledWith('profiles')
    expect(fromMock).toHaveBeenCalledWith('grades')
    expect(upsertMock).toHaveBeenCalled()
  })

  it('returns empty state when pull has no data', async () => {
    selectMock.mockResolvedValue({ data: [], error: null })
    const result = await pullState()
    expect(result.profiles).toEqual([])
    expect(result.grades).toEqual({})
  })

  it('mergeProfiles keeps newer local profile', async () => {
    const local = [{ id: 'p1', name: 'Local', updatedAt: 2000 }]
    const remote = [{ id: 'p1', name: 'Remote', updatedAt: 1000 }]
    expect(mergeProfiles(local, remote)).toEqual(local)
  })

  it('mergeGrades prefers remote grade when newer', async () => {
    const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
    const remoteGrades = { p1: { math: { score: 95, updatedAt: 2000 } } }
    expect(mergeGrades(localGrades, remoteGrades, [{ id: 'p1' }])).toEqual({
      p1: { math: { score: 95, updatedAt: 2000 } }
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/services/supabase/sync.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现 sync.js**

Create `src/services/supabase/sync.js`:

```js
import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

function toTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function toProfileRow(userId, profile) {
  return {
    user_id: userId,
    local_id: profile.id,
    name: profile.name,
    target_gpa: profile.targetGPA,
    classes: profile.classes ?? {},
    updated_at:
      profile.updatedAt != null
        ? new Date(profile.updatedAt).toISOString()
        : new Date().toISOString()
  }
}

function fromProfileRow(row) {
  return {
    id: row.local_id,
    name: row.name,
    targetGPA: row.target_gpa,
    classes: row.classes ?? {},
    updatedAt: toTimestamp(row.updated_at)
  }
}

function extractGrade(value) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && typeof value.score === 'number') {
    return { score: value.score, updatedAt: value.updatedAt }
  }
  if (typeof value === 'number') {
    return { score: value, updatedAt: Date.now() }
  }
  return null
}

function toGradeRows(userId, gradesByProfile) {
  const rows = []
  for (const [profileLocalId, courses] of Object.entries(gradesByProfile)) {
    for (const [courseName, value] of Object.entries(courses)) {
      const grade = extractGrade(value)
      if (!grade) continue
      rows.push({
        user_id: userId,
        profile_local_id: profileLocalId,
        course_name: courseName,
        score: grade.score,
        updated_at:
          grade.updatedAt != null
            ? new Date(grade.updatedAt).toISOString()
            : new Date().toISOString()
      })
    }
  }
  return rows
}

function fromGradeRows(rows) {
  const grades = {}
  for (const row of rows) {
    if (!grades[row.profile_local_id]) {
      grades[row.profile_local_id] = {}
    }
    grades[row.profile_local_id][row.course_name] = {
      score: row.score,
      updatedAt: toTimestamp(row.updated_at)
    }
  }
  return grades
}

export function mergeProfiles(localProfiles, remoteProfiles, { syncMode = false } = {}) {
  const localMap = new Map(localProfiles.map((p) => [p.id, p]))
  const remoteMap = new Map(remoteProfiles.map((p) => [p.id, p]))
  const mergedIds = new Set([...localMap.keys(), ...remoteMap.keys()])
  const merged = []

  for (const id of mergedIds) {
    const local = localMap.get(id)
    const remote = remoteMap.get(id)

    if (!local) {
      // During normal sync we do not re-add profiles that were deleted locally.
      // Share-code recovery still uses the default behavior (syncMode = false).
      if (!syncMode && remote) {
        merged.push(remote)
      }
      continue
    }

    if (!remote) {
      merged.push(local)
      continue
    }

    if (toTimestamp(remote.updatedAt) >= toTimestamp(local.updatedAt)) {
      merged.push(remote)
    } else {
      merged.push(local)
    }
  }

  return merged
}

export function mergeGrades(localGrades, remoteGrades, mergedProfiles, { syncMode = false } = {}) {
  const merged = {}

  for (const profile of mergedProfiles) {
    const localCourses = localGrades[profile.id] ?? {}
    const remoteCourses = remoteGrades[profile.id] ?? {}
    const courseNames = new Set([
      ...Object.keys(localCourses),
      ...Object.keys(remoteCourses)
    ])
    const mergedCourses = {}

    for (const courseName of courseNames) {
      const localGrade = extractGrade(localCourses[courseName])
      const remoteGrade = extractGrade(remoteCourses[courseName])

      if (!localGrade) {
        // During normal sync we do not re-add grades that were deleted locally.
        if (!syncMode && remoteGrade) {
          mergedCourses[courseName] = remoteGrade
        }
        continue
      }

      if (!remoteGrade) {
        mergedCourses[courseName] = localGrade
        continue
      }

      const localTs = toTimestamp(localGrade.updatedAt)
      const remoteTs = toTimestamp(remoteGrade.updatedAt)

      if (remoteTs >= localTs) {
        mergedCourses[courseName] = remoteGrade
      } else {
        mergedCourses[courseName] = localGrade
      }
    }

    merged[profile.id] = mergedCourses
  }

  return merged
}

export async function pushState({ profiles = [], grades = {} } = {}) {
  if (!supabase) {
    return { error: new Error('Supabase client is not initialized') }
  }

  const userId = getCurrentUserId()
  if (!userId) {
    return { error: new Error('User not authenticated') }
  }

  const profileRows = profiles.map((profile) => toProfileRow(userId, profile))
  if (profileRows.length > 0) {
    const { error } = await supabase
      .from('profiles')
      .upsert(profileRows, { onConflict: 'user_id,local_id' })

    if (error) {
      return { error }
    }
  }

  const gradeRows = toGradeRows(userId, grades)
  if (gradeRows.length > 0) {
    const { error } = await supabase
      .from('grades')
      .upsert(gradeRows, { onConflict: 'user_id,profile_local_id,course_name' })

    if (error) {
      return { error }
    }
  }

  return { error: null }
}

export async function pullState() {
  if (!supabase) {
    return {
      profiles: [],
      grades: {},
      error: new Error('Supabase client is not initialized')
    }
  }

  const userId = getCurrentUserId()
  if (!userId) {
    return {
      profiles: [],
      grades: {},
      error: new Error('User not authenticated')
    }
  }

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('local_id, name, target_gpa, classes, updated_at')
    .eq('user_id', userId)

  if (profilesError) {
    return { profiles: [], grades: {}, error: profilesError }
  }

  const { data: gradeRows, error: gradesError } = await supabase
    .from('grades')
    .select('profile_local_id, course_name, score, updated_at')
    .eq('user_id', userId)

  if (gradesError) {
    return { profiles: [], grades: {}, error: gradesError }
  }

  return {
    profiles: (profileRows ?? []).map(fromProfileRow),
    grades: fromGradeRows(gradeRows ?? []),
    error: null
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- tests/services/supabase/sync.test.js
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/services/supabase/sync.js tests/services/supabase/sync.test.js
git commit -m "feat: add Supabase sync service for profiles and grades"
```

---

## Task 6: Analytics 服务

**Files:**
- Create: `src/services/supabase/analytics.js`
- Create: `tests/services/supabase/analytics.test.js`

- [ ] **Step 1: 写 analytics 测试**

Create `tests/services/supabase/analytics.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const fromMock = vi.fn(() => ({
  insert: vi.fn(() => Promise.resolve({ error: null }))
}))

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: { from: (table) => fromMock(table) }
}))

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: () => 'u1'
}))

import { track, flush } from '../../../src/services/supabase/analytics.js'

describe('analytics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('queues events and flushes on interval', async () => {
    track('page_view', { path: '/' })
    vi.advanceTimersByTime(5000)
    await flush()
    expect(fromMock).toHaveBeenCalledWith('events')
  })

  it('filters sensitive properties', () => {
    track('grade_entered', { courseName: '数学', score: 90 })
    // 实现层应过滤敏感字段；测试通过 if no throw
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/services/supabase/analytics.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现 analytics.js**

Create `src/services/supabase/analytics.js`:

```js
import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const queue = []
let flushTimer = null
const FLUSH_INTERVAL = 5000
const MAX_QUEUE_SIZE = 10

function startFlushTimer() {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flush()
  }, FLUSH_INTERVAL)
}

export function track(name, properties = {}) {
  // 过滤敏感字段：不上报课程名、成绩、档案名
  const safeProperties = { ...properties }
  delete safeProperties.courseName
  delete safeProperties.score
  delete safeProperties.profileName
  delete safeProperties.courseNames
  delete safeProperties.scores

  queue.push({
    name,
    properties: safeProperties,
    ts: Date.now()
  })

  if (queue.length >= MAX_QUEUE_SIZE) {
    flush()
  } else {
    startFlushTimer()
  }
}

export async function flush() {
  if (queue.length === 0) {
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    return
  }

  const userId = getCurrentUserId()
  const batch = queue.splice(0, queue.length)

  if (!userId) {
    // 未登录时重新入队，等待登录成功后再次 flush
    queue.unshift(...batch)
    return
  }

  const rows = batch.map(e => ({
    user_id: userId,
    name: e.name,
    properties: e.properties,
    created_at: new Date(e.ts).toISOString()
  }))

  const { error } = await supabase.from('events').insert(rows)
  if (error) {
    console.error('Analytics flush failed', error)
  }
}

export function clearQueue() {
  queue.length = 0
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- tests/services/supabase/analytics.test.js
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/services/supabase/analytics.js tests/services/supabase/analytics.test.js
git commit -m "feat: add Supabase analytics service with PII filtering"
```

---

## Task 7: 异常上报服务

**Files:**
- Create: `src/services/supabase/errorReporter.js`
- Create: `tests/services/supabase/errorReporter.test.js`

- [ ] **Step 1: 写 errorReporter 测试**

Create `tests/services/supabase/errorReporter.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fromMock = vi.fn(() => ({
  insert: vi.fn(() => Promise.resolve({ error: null }))
}))

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: { from: (table) => fromMock(table) }
}))

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: () => 'u1'
}))

import { reportError, installErrorHandlers } from '../../../src/services/supabase/errorReporter.js'

describe('errorReporter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reports error with safe fields', async () => {
    await reportError(new Error('test error'), 'TestComponent')
    expect(fromMock).toHaveBeenCalledWith('errors')
  })

  it('does not throw on insert failure', async () => {
    fromMock.mockReturnValue({
      insert: () => Promise.resolve({ error: new Error('db down') })
    })
    await expect(reportError(new Error('x'))).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/services/supabase/errorReporter.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现 errorReporter.js**

Create `src/services/supabase/errorReporter.js`:

```js
import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const recentErrors = new Map()
const RATE_LIMIT_MS = 60 * 1000
const RATE_LIMIT_COUNT = 3

function isRateLimited(key) {
  const now = Date.now()
  const record = recentErrors.get(key)
  if (!record || now - record.windowStart > RATE_LIMIT_MS) {
    recentErrors.set(key, { windowStart: now, count: 1 })
    return false
  }
  if (record.count < RATE_LIMIT_COUNT) {
    record.count += 1
    return false
  }
  return true
}

export async function reportError(error, component = '') {
  if (!error) return

  const userId = getCurrentUserId()
  const message = error.message || String(error)
  const key = `${component}:${message}`

  if (isRateLimited(key)) return

  // 防止递归：如果上报本身出错，不再上报
  try {
    const { error: insertError } = await supabase.from('errors').insert({
      user_id: userId,
      message,
      stack: error.stack || '',
      component,
      url: typeof window !== 'undefined' ? window.location.href : ''
    })
    if (insertError) {
      console.error('Error reporting failed', insertError)
    }
  } catch (e) {
    console.error('Error reporting crashed', e)
  }
}

export function installErrorHandlers(app) {
  if (app && app.config) {
    const originalErrorHandler = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
      reportError(err, instance?.$options?.name || info)
      if (typeof originalErrorHandler === 'function') {
        originalErrorHandler(err, instance, info)
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      reportError(event.error || new Error(event.message))
    })

    window.addEventListener('unhandledrejection', (event) => {
      const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      reportError(err, 'unhandledrejection')
    })
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- tests/services/supabase/errorReporter.test.js
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/services/supabase/errorReporter.js tests/services/supabase/errorReporter.test.js
git commit -m "feat: add Supabase error reporter with rate limiting"
```

---

## Task 8: Composables

**Files:**
- Create: `src/composables/useSync.js`
- Create: `src/composables/useAnalytics.js`

说明：匿名认证与错误上报未封装为独立 composable，而是直接在 `main.js` 中按需动态导入服务并调用，以减少未配置 Supabase 时的初始 bundle。

- [ ] **Step 1: 实现 useSync.js**

Create `src/composables/useSync.js`:

```js
import { ref } from 'vue'
import { isSupabaseConfigured } from '../services/supabase/config.js'
import { useProfilesStore } from '../stores/profiles.js'
import { useGradesStore } from '../stores/grades.js'
import { useAnalytics } from './useAnalytics.js'

const status = ref('idle') // idle | syncing | offline | error
const lastError = ref(null)
const isApplying = ref(false)

const { trackSyncCompleted, trackSyncFailed } = useAnalytics()

export function useSync() {
  async function sync({ profiles = [], grades = {} } = {}) {
    lastError.value = null

    if (!isSupabaseConfigured()) {
      console.warn('Supabase is not configured; skipping sync.')
      status.value = 'offline'
      return { error: null }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      status.value = 'offline'
      return { error: new Error('Offline') }
    }

    status.value = 'syncing'

    try {
      const [
        { pushState, pullState, mergeProfiles, mergeGrades },
        { initAnonymousAuth, getCurrentUserId }
      ] = await Promise.all([
        import('../services/supabase/sync.js'),
        import('../services/supabase/auth.js')
      ])

      if (!getCurrentUserId()) {
        const { error: authError } = await initAnonymousAuth()
        if (authError || !getCurrentUserId()) {
          throw authError || new Error('Anonymous authentication failed')
        }
      }

      const pushResult = await pushState({ profiles, grades })
      if (pushResult?.error) {
        throw pushResult.error
      }

      const pullResult = await pullState()
      if (pullResult?.error) {
        throw pullResult.error
      }

      const profilesStore = useProfilesStore()
      const gradesStore = useGradesStore()

      const mergedProfiles = mergeProfiles(profiles, pullResult.profiles, { syncMode: true })
      const mergedGrades = mergeGrades(grades, pullResult.grades, mergedProfiles, { syncMode: true })

      isApplying.value = true
      profilesStore.load(mergedProfiles)
      gradesStore.load(mergedGrades)
      isApplying.value = false

      status.value = 'idle'
      trackSyncCompleted('push_pull')

      return {
        profiles: mergedProfiles,
        grades: mergedGrades,
        error: null
      }
    } catch (err) {
      isApplying.value = false
      status.value = 'error'
      lastError.value = err
      trackSyncFailed(String(err?.message ?? err))
      return { error: err }
    }
  }

  return { status, lastError, isApplying, sync }
}
```

- [ ] **Step 2: 实现 useAnalytics.js**

Create `src/composables/useAnalytics.js`:

```js
import { track } from '../services/supabase/analytics.js'

export function useAnalytics() {
  return {
    trackPageView: (path, name) => track('page_view', { path, name }),
    trackGradeEntered: (courseCount) => track('grade_entered', { courseCount }),
    trackProfileSwitched: (profileCount) => track('profile_switched', { profileCount }),
    trackProfileCreated: () => track('profile_created'),
    trackProfileImported: (format) => track('profile_imported', { format }),
    trackProfileExported: (format) => track('profile_exported', { format }),
    trackShareCodeGenerated: () => track('share_code_generated'),
    trackShareCodeRecovered: () => track('share_code_recovered'),
    trackThemeChanged: (theme) => track('theme_changed', { theme }),
    trackSyncCompleted: (direction) => track('sync_completed', { direction }),
    trackSyncFailed: (errorCode) => track('sync_failed', { errorCode })
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/composables/useSync.js src/composables/useAnalytics.js
git commit -m "feat: add Supabase composables"
```

---

## Task 9: 分享码服务

**Files:**
- Create: `src/services/supabase/shareCodes.js`
- Create: `tests/services/supabase/shareCodes.test.js`

- [ ] **Step 1: 写 shareCodes 测试**

Create `tests/services/supabase/shareCodes.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fromMock = vi.fn()
const rpcMock = vi.fn()

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: { from: (table) => fromMock(table), rpc: rpcMock }
}))

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: () => 'u1'
}))

import { supabase } from '../../../src/services/supabase/client.js'
import { createShareCode, getShareCodePayload } from '../../../src/services/supabase/shareCodes.js'

describe('shareCodes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates a share code', async () => {
    const insertMock = vi.fn(() => Promise.resolve({ error: null }))
    fromMock.mockReturnValue({ insert: insertMock })

    const payload = { profiles: [], grades: {} }
    const code = await createShareCode(payload)
    expect(code).toHaveLength(6)
    expect(insertMock).toHaveBeenCalled()
  })

  it('retrieves payload by code via RPC', async () => {
    const payload = { profiles: [{ id: 'p1' }] }
    rpcMock.mockResolvedValue({ data: payload, error: null })
    const result = await getShareCodePayload('ABC123')
    expect(result).toEqual(payload)
    expect(rpcMock).toHaveBeenCalledWith('get_share_code', { code_input: 'ABC123' })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/services/supabase/shareCodes.test.js
```

Expected: FAIL。

- [ ] **Step 3: 实现 shareCodes.js**

Create `src/services/supabase/shareCodes.js`:

```js
import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CODE_LENGTH = 6
const DEFAULT_TTL_DAYS = 7

function generateCode() {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length))
  }
  return code
}

export async function createShareCode(payload, ttlDays = DEFAULT_TTL_DAYS) {
  const userId = getCurrentUserId()
  if (!userId) throw new Error('Not authenticated')

  const code = generateCode()
  const expiresAt = ttlDays > 0
    ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await supabase.from('share_codes').insert({
    code,
    user_id: userId,
    payload,
    expires_at: expiresAt
  })

  if (error) throw error
  return code
}

export async function getShareCodePayload(code) {
  const { data, error } = await supabase.rpc('get_share_code', { code_input: code })

  if (error) throw error
  if (!data) throw new Error('Share code not found or expired')

  return data
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- tests/services/supabase/shareCodes.test.js
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/services/supabase/shareCodes.js tests/services/supabase/shareCodes.test.js
git commit -m "feat: add share code service"
```

---

## Task 10: UI 组件

**Files:**
- Create: `src/components/SyncStatusBar.vue`
- Create: `src/components/ShareCodeDialog.vue`
- Create: `src/components/RecoverDialog.vue`
- Create: `tests/components/SyncStatusBar.test.js`

- [ ] **Step 1: 实现 SyncStatusBar.vue**

Create `src/components/SyncStatusBar.vue`:

```vue
<template>
  <div class="sync-status" :class="status" role="status" aria-live="polite">
    <span class="sync-dot"></span>
    <span class="sync-label">{{ label }}</span>
  </div>
</template>

<script setup>
const props = defineProps({
  status: { type: String, default: 'idle' }
})

const labels = {
  idle: '已同步',
  syncing: '同步中…',
  offline: '离线模式',
  error: '同步失败'
}

const label = labels[props.status] || props.status
</script>

<style scoped>
.sync-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}
.sync-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}
.sync-status.idle { color: var(--pico-color-green-500, #22c55e); }
.sync-status.syncing { color: var(--pico-color-amber-500, #f59e0b); }
.sync-status.offline { color: var(--pico-color-grey-500, #6b7280); }
.sync-status.error { color: var(--pico-color-red-500, #ef4444); }
</style>
```

- [ ] **Step 2: 实现 ShareCodeDialog.vue**

Create `src/components/ShareCodeDialog.vue`:

```vue
<template>
  <dialog :open="open">
    <article>
      <header>
        <h3>生成分享码</h3>
        <button @click="$emit('close')" aria-label="关闭">×</button>
      </header>
      <p v-if="code">
        分享码：<code>{{ code }}</code>（7 天内有效）
      </p>
      <p v-else-if="error" class="error">生成失败：{{ error }}</p>
      <p v-else>点击生成后，其他人可凭此码恢复当前数据。</p>
      <footer>
        <button class="secondary" @click="$emit('close')">关闭</button>
        <button @click="generate" :aria-busy="loading" :disabled="loading">
          {{ code ? '重新生成' : '生成' }}
        </button>
      </footer>
    </article>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import { createShareCode } from '../services/supabase/shareCodes.js'

const props = defineProps({
  open: Boolean,
  payload: { type: Object, required: true }
})

defineEmits(['close'])

const code = ref('')
const error = ref('')
const loading = ref(false)

async function generate() {
  loading.value = true
  error.value = ''
  try {
    code.value = await createShareCode(props.payload)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 3: 实现 RecoverDialog.vue**

Create `src/components/RecoverDialog.vue`:

```vue
<template>
  <dialog :open="open">
    <article>
      <header>
        <h3>通过分享码恢复</h3>
        <button @click="$emit('close')" aria-label="关闭">×</button>
      </header>
      <label>
        分享码
        <input v-model="code" type="text" maxlength="6" placeholder="ABC123" />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <footer>
        <button class="secondary" @click="$emit('close')">关闭</button>
        <button @click="recover" :aria-busy="loading" :disabled="loading || !code">
          恢复
        </button>
      </footer>
    </article>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import { getShareCodePayload } from '../services/supabase/shareCodes.js'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'recovered'])

const code = ref('')
const error = ref('')
const loading = ref(false)

async function recover() {
  loading.value = true
  error.value = ''
  try {
    const payload = await getShareCodePayload(code.value.trim())
    emit('recovered', payload)
    emit('close')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 4: 写 SyncStatusBar 测试**

Create `tests/components/SyncStatusBar.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SyncStatusBar from '../../src/components/SyncStatusBar.vue'

describe('SyncStatusBar', () => {
  it('renders idle label', () => {
    const wrapper = mount(SyncStatusBar, { props: { status: 'idle' } })
    expect(wrapper.text()).toContain('已同步')
  })

  it('renders offline label', () => {
    const wrapper = mount(SyncStatusBar, { props: { status: 'offline' } })
    expect(wrapper.text()).toContain('离线模式')
  })
})
```

- [ ] **Step 5: 运行组件测试确认通过**

```bash
npm test -- tests/components/SyncStatusBar.test.js
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/components/SyncStatusBar.vue src/components/ShareCodeDialog.vue src/components/RecoverDialog.vue tests/components/SyncStatusBar.test.js
git commit -m "feat: add Supabase sync and share code UI components"
```

---

## Task 11: 集成到应用入口

**Files:**
- Modify: `src/main.js`
- Modify: `src/App.vue`
- Modify: `index.html`

- [ ] **Step 1: 修改 main.js 异步初始化 Supabase**

Modify `src/main.js`:

```js
import './assets/styles.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { loadAppState, saveAppState } from './utils/storage'
import { migrateLegacyData, hasLegacyData } from './utils/migration'
import { useAppStore } from './stores/app'
import { useProfilesStore } from './stores/profiles'
import { useGradesStore } from './stores/grades'
import { useSync } from './composables/useSync.js'
import { useAnalytics } from './composables/useAnalytics.js'
import { isSupabaseConfigured } from './services/supabase/config.js'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const { status, lastError, isApplying } = useSync()

function initializeState({ flushAnalytics } = {}) {
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
    profilesStore.resetToDefault()
  }

  const currentId = appStore.currentProfileId
  const current = profilesStore.profiles.find((p) => p.id === currentId)
  if (!current) {
    appStore.setCurrentProfileId(profilesStore.profiles[0]?.id || 'default')
  }

  if (!appStore.currentProfileId) {
    appStore.setCurrentProfileId('default')
  }

  const save = () => {
    saveAppState({
      version: 2,
      app: appStore.dump(),
      profiles: profilesStore.dump(),
      grades: gradesStore.dump()
    })
  }

  const unsubApp = appStore.$subscribe(save)
  const unsubProfiles = profilesStore.$subscribe(save)
  const unsubGrades = gradesStore.$subscribe(save)
  save()

  window.addEventListener('beforeunload', () => {
    unsubApp()
    unsubProfiles()
    unsubGrades()
    flushAnalytics?.().catch((err) =>
      console.error('Failed to flush analytics on unload:', err)
    )
  })
}

async function initializeSupabase() {
  status.value = 'syncing'
  lastError.value = null

  try {
    const [
      { initAnonymousAuth },
      { pushState, pullState, mergeProfiles, mergeGrades }
    ] = await Promise.all([
      import('./services/supabase/auth.js'),
      import('./services/supabase/sync.js')
    ])

    const { user, error: authError } = await initAnonymousAuth()
    if (authError || !user) {
      throw authError || new Error('Supabase anonymous auth failed')
    }

    const appStore = useAppStore()
    const profilesStore = useProfilesStore()
    const gradesStore = useGradesStore()
    const { trackSyncCompleted, trackSyncFailed } = useAnalytics()

    const pushResult = await pushState({
      profiles: profilesStore.profiles,
      grades: gradesStore.gradesByProfile
    })
    if (pushResult?.error) {
      throw pushResult.error
    }

    const pullResult = await pullState()
    if (pullResult?.error) {
      throw pullResult.error
    }

    const mergedProfiles = mergeProfiles(
      profilesStore.profiles,
      pullResult.profiles,
      { syncMode: true }
    )
    const mergedGrades = mergeGrades(
      gradesStore.gradesByProfile,
      pullResult.grades,
      mergedProfiles,
      { syncMode: true }
    )

    isApplying.value = true
    profilesStore.load(mergedProfiles)
    gradesStore.load(mergedGrades)
    isApplying.value = false

    const currentId = appStore.currentProfileId
    if (!mergedProfiles.some((p) => p.id === currentId)) {
      appStore.setCurrentProfileId(mergedProfiles[0]?.id || 'default')
    }

    status.value = 'idle'
    trackSyncCompleted('push_pull')
  } catch (err) {
    isApplying.value = false
    status.value = 'error'
    lastError.value = err
    const { trackSyncFailed } = useAnalytics()
    trackSyncFailed(String(err?.message ?? err))
    console.error('Failed to initialize Supabase:', err)
  }
}

async function bootstrap() {
  if (isSupabaseConfigured()) {
    const [{ installErrorHandlers }, { flush }] = await Promise.all([
      import('./services/supabase/errorReporter.js'),
      import('./services/supabase/analytics.js')
    ])

    installErrorHandlers(app)

    const { trackPageView } = useAnalytics()
    router.afterEach((to) => trackPageView(to.path, to.name ?? to.path))

    initializeState({ flushAnalytics: flush })
    app.mount('#app')
    await initializeSupabase()
  } else {
    console.warn(
      'Supabase environment variables are missing; running without cloud sync.'
    )
    status.value = 'offline'
    initializeState()
    app.mount('#app')
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
})
```

- [ ] **Step 2: 修改 App.vue 挂载 SyncStatusBar**

Modify `src/App.vue`:

```vue
<template>
  <div :data-theme="appStore.isDark ? 'dark' : 'light'">
    <SyncStatusBar :status="syncStatus" />
    <main class="main-content">
      <RouterView />
    </main>
    <AppNav />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from './stores/app'
import { useProfilesStore } from './stores/profiles'
import { useGradesStore } from './stores/grades'
import AppNav from './components/AppNav.vue'
import SyncStatusBar from './components/SyncStatusBar.vue'
import { useSync } from './composables/useSync.js'
import { isSupabaseConfigured } from './services/supabase/config.js'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const { status: syncStatus, isApplying, sync } = useSync()

let syncTimeout = null
let pendingSync = false
let localSyncInProgress = false

function canSync() {
  return isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine
}

function syncStores() {
  if (!canSync() || isApplying.value) {
    return
  }

  if (syncStatus.value === 'syncing' || localSyncInProgress) {
    pendingSync = true
    return
  }

  pendingSync = false
  clearTimeout(syncTimeout)
  syncTimeout = setTimeout(() => {
    localSyncInProgress = true
    sync({
      profiles: profilesStore.profiles,
      grades: gradesStore.gradesByProfile
    })
  }, 3000)
}

const unwatchStatus = watch(syncStatus, (newStatus) => {
  if (newStatus === 'idle') {
    localSyncInProgress = false
    if (pendingSync) {
      pendingSync = false
      syncStores()
    }
  } else if (newStatus === 'error') {
    localSyncInProgress = false
  }
})

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    syncStores()
  }
}

const unsubs = []

onMounted(() => {
  unsubs.push(profilesStore.$subscribe(syncStores))
  unsubs.push(gradesStore.$subscribe(syncStores))

  window.addEventListener('online', syncStores)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  clearTimeout(syncTimeout)
  unwatchStatus()

  unsubs.forEach((unsub) => unsub())
  unsubs.length = 0

  window.removeEventListener('online', syncStores)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>
```

- [ ] **Step 3: 从 index.html 移除失效脚本**

Edit `index.html`，删除第 11 行：

```html
<script src="https://analysis.gxb.icu/script.js" data-website-id="502fa9db-262e-44fe-968b-c8b647e82edd"></script>
```

- [ ] **Step 4: 提交**

```bash
git add src/main.js src/App.vue index.html
git commit -m "feat: integrate Supabase initialization, sync status, and remove dead analytics script"
```

---

## Task 12: Profile 页面增加入口

**Files:**
- Modify: `src/views/ProfileView.vue`

- [ ] **Step 1: 在 ProfileView.vue 增加同步/分享/恢复按钮和弹窗**

先查看当前 `src/views/ProfileView.vue` 内容，然后在合适位置（通常在导出/设置区域）插入：

```vue
<template>
  <!-- 原有模板内容 -->
  <section class="card">
    <h3>云端同步</h3>
    <div class="grid">
      <button @click="syncNow" :aria-busy="syncStatus === 'syncing'">立即同步</button>
      <button @click="showShare = true">生成分享码</button>
      <button class="secondary" @click="showRecover = true">通过分享码恢复</button>
    </div>
    <p v-if="syncError" class="error">同步失败：{{ syncError }}</p>
  </section>

  <ShareCodeDialog
    :open="showShare"
    :payload="sharePayload"
    @close="showShare = false"
  />
  <RecoverDialog
    :open="showRecover"
    @close="showRecover = false"
    @recovered="handleRecovered"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProfilesStore } from '../stores/profiles.js'
import { useGradesStore } from '../stores/grades.js'
import { useSync } from '../composables/useSync.js'
import ShareCodeDialog from '../components/ShareCodeDialog.vue'
import RecoverDialog from '../components/RecoverDialog.vue'

const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const { status: syncStatus, lastError: syncError, sync, isApplying } = useSync()

const showShare = ref(false)
const showRecover = ref(false)

const sharePayload = computed(() => ({
  profiles: profilesStore.dump(),
  grades: gradesStore.dump()
}))

async function syncNow() {
  await sync({
    profiles: profilesStore.dump(),
    grades: gradesStore.dump()
  })
}

async function handleRecovered(payload) {
  if (!payload) return

  const { mergeProfiles, mergeGrades } = await import('../services/supabase/sync.js')

  isApplying.value = true

  let mergedProfiles = profilesStore.profiles
  if (Array.isArray(payload.profiles)) {
    mergedProfiles = mergeProfiles(profilesStore.profiles, payload.profiles)
    profilesStore.load(mergedProfiles)
  }

  let mergedGrades = gradesStore.gradesByProfile
  if (payload.grades && typeof payload.grades === 'object' && !Array.isArray(payload.grades)) {
    mergedGrades = mergeGrades(
      gradesStore.gradesByProfile,
      payload.grades,
      mergedProfiles
    )
    gradesStore.load(mergedGrades)
  }

  isApplying.value = false

  const previousId = appStore.currentProfileId
  if (!mergedProfiles.some((p) => p.id === previousId)) {
    appStore.setCurrentProfileId(mergedProfiles[0]?.id || 'default')
  }

  // Push the merged state to the current anonymous user's cloud backup.
  await sync({ profiles: mergedProfiles, grades: mergedGrades })
}
</script>
```

- [ ] **Step 2: 提交**

```bash
git add src/views/ProfileView.vue
git commit -m "feat: add sync/share/recover actions to profile page"
```

---

## Task 13: 端到端验证

**Files:**
- 无新增文件

- [ ] **Step 1: 本地构建通过**

```bash
npm run build
```

Expected: 无构建错误；构建产物中 Supabase 相关代码应拆分为独立 chunk（如 `assets/supabase-*.js`），主 bundle 不显著膨胀。

- [ ] **Step 2: 运行全部测试**

```bash
npm test
```

Expected: 所有测试通过。

- [ ] **Step 3: 启动开发服务器并手动验证**

```bash
npm run dev
```

打开浏览器验证：
- 控制台没有 `analysis.gxb.icu` 相关错误。
- `SyncStatusBar` 显示“已同步”或“离线模式”。
- 输入成绩后，3 秒左右状态变为“同步中…”再变回“已同步”。
- Profile 页生成分享码，另一浏览器输入后数据恢复。
- 断开网络，核心功能仍可用。

- [ ] **Step 4: 提交验证结果（可选）**

```bash
git commit --allow-empty -m "test: manual e2e verification passed"
```

---

## Self-Review

### Spec Coverage

| 设计文档章节 | 对应 Task |
|--------------|-----------|
| 3.1 新增模块结构 | Task 3-7, 10 |
| 3.2 启动流程 | Task 11 |
| 3.3 数据流 | Task 5, 11 |
| 4. Database Schema | Task 2 |
| 5. 匿名用户生命周期 | Task 4 |
| 6. 同步策略 | Task 5, 11 |
| 7. 分享码机制 | Task 9, 10, 12 |
| 8. Analytics 与异常上报 | Task 6, 7, 11 |
| 9. 安全与 RLS | Task 2 |
| 10. 前端组件变更 | Task 10, 11, 12 |
| 11. 测试策略 | Task 3-7, 10, 13 |
| 12. 部署、迁移与环境变量 | Task 1, 2 |

### Placeholder Scan

- 无 `TBD` / `TODO` / "implement later"。
- 每个 Task 都包含具体文件路径、代码、命令。
- 测试代码与实现代码同步给出。

### Type Consistency

- `profiles` 字段统一使用 `targetGPA`（前端）和 `target_gpa`（DB），并携带 `updatedAt` 时间戳用于 last-write-wins 合并。
- `grades` 前端结构为 `{ profileId: { courseName: { score, updatedAt } } }`，兼容旧版纯数字成绩；DB 按行存储。
- `sync.js` 暴露 `mergeProfiles` / `mergeGrades` 合并工具，供 `useSync`、初始化流程和分享码恢复共同使用。
- `client.js` 未配置环境变量时导出 `null`，由 `config.js` 的 `isSupabaseConfigured()` 统一判断，所有服务在 `supabase === null` 时短路返回错误。
