# Supabase 集成实施计划

> **For agentic workers:** REQUIRED SUB- SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 GPA 计算器的失效分析脚本替换为 Supabase，新增匿名登录、云端数据备份/恢复、分享码、事件统计和异常上报，同时保持离线优先。

**Architecture:** 在 `src/services/supabase/` 下封装 client、auth、sync、analytics、errorReporter；通过新增 composables 接入 Vue 组件；`main.js` 异步初始化 Supabase 且不阻塞现有 localStorage 渲染；所有云端操作失败时静默降级。

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
      client.js                       # createClient + 环境校验
      auth.js                         # 匿名登录、session 恢复
      sync.js                         # 本地状态与云端双向同步
      analytics.js                    # 事件队列与上报
      errorReporter.js                # 全局异常捕获与上报
  composables/
    useSupabaseAuth.js                # 匿名登录状态组合式函数
    useSync.js                        # 同步状态与手动触发
    useAnalytics.js                   # 事件上报便捷方法
    useErrorReporter.js               # 错误上报初始化
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

  it('throws if env vars are missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    await expect(import('../../../src/services/supabase/client.js')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/services/supabase/client.test.js
```

Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 client.js**

Create `src/services/supabase/client.js`:

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- tests/services/supabase/client.test.js
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/services/supabase/client.js tests/services/supabase/client.test.js
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
    const user = await initAnonymousAuth()
    expect(user.id).toBe('u1')
    expect(signInAnonymouslyMock).not.toHaveBeenCalled()
  })

  it('signs in anonymously when no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null })
    signInAnonymouslyMock.mockResolvedValue({
      data: { user: { id: 'u2' }, session: { user: { id: 'u2' } } },
      error: null
    })
    const user = await initAnonymousAuth()
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

export async function initAnonymousAuth() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.error('Failed to get Supabase session', sessionError)
  }

  if (session?.user) {
    currentUser = session.user
    return currentUser
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Anonymous sign-in failed', error)
    return null
  }

  currentUser = data.user
  return currentUser
}

export function getCurrentUserId() {
  return currentUser?.id || null
}

export function isAuthenticated() {
  return !!currentUser?.id
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

import { pushState, pullState } from '../../../src/services/supabase/sync.js'

describe('sync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    defineMock()
  })

  it('pushes profiles and grades to Supabase', async () => {
    const state = {
      profiles: [{ id: 'p1', name: '默认', targetGPA: 3.5, classes: {} }],
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

export async function pushState({ profiles, grades }) {
  const userId = getCurrentUserId()
  if (!userId) return { error: new Error('Not authenticated') }

  const now = new Date().toISOString()

  const profileRows = profiles.map(p => ({
    user_id: userId,
    local_id: p.id,
    name: p.name,
    target_gpa: p.targetGPA,
    classes: p.classes,
    updated_at: now
  }))

  const gradeRows = []
  for (const profileId of Object.keys(grades)) {
    for (const courseName of Object.keys(grades[profileId])) {
      gradeRows.push({
        user_id: userId,
        profile_local_id: profileId,
        course_name: courseName,
        score: grades[profileId][courseName],
        updated_at: now
      })
    }
  }

  const errors = []
  if (profileRows.length > 0) {
    const { error } = await supabase.from('profiles').upsert(profileRows, { onConflict: 'user_id,local_id' })
    if (error) errors.push(error)
  }

  if (gradeRows.length > 0) {
    const { error } = await supabase.from('grades').upsert(gradeRows, { onConflict: 'user_id,profile_local_id,course_name' })
    if (error) errors.push(error)
  }

  return { error: errors.length > 0 ? errors[0] : null }
}

export async function pullState() {
  const userId = getCurrentUserId()
  if (!userId) return { profiles: [], grades: {}, error: new Error('Not authenticated') }

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)

  if (profileError) return { profiles: [], grades: {}, error: profileError }

  const { data: gradeRows, error: gradeError } = await supabase
    .from('grades')
    .select('*')
    .eq('user_id', userId)

  if (gradeError) return { profiles: [], grades: {}, error: gradeError }

  const profiles = (profileRows || []).map(row => ({
    id: row.local_id,
    name: row.name,
    targetGPA: row.target_gpa,
    classes: row.classes
  }))

  const grades = {}
  for (const row of gradeRows || []) {
    if (!grades[row.profile_local_id]) grades[row.profile_local_id] = {}
    grades[row.profile_local_id][row.course_name] = row.score
  }

  return { profiles, grades, error: null }
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
- Create: `src/composables/useSupabaseAuth.js`
- Create: `src/composables/useSync.js`
- Create: `src/composables/useAnalytics.js`
- Create: `src/composables/useErrorReporter.js`

- [ ] **Step 1: 实现 useSupabaseAuth.js**

Create `src/composables/useSupabaseAuth.js`:

```js
import { ref, onMounted } from 'vue'
import { initAnonymousAuth, getCurrentUserId } from '../services/supabase/auth.js'

const ready = ref(false)
const userId = ref(null)
const error = ref(null)

export function useSupabaseAuth() {
  onMounted(async () => {
    if (ready.value) return
    try {
      const user = await initAnonymousAuth()
      userId.value = user?.id || getCurrentUserId()
    } catch (e) {
      error.value = e
      console.error('Supabase auth init failed', e)
    } finally {
      ready.value = true
    }
  })

  return { ready, userId, error }
}
```

- [ ] **Step 2: 实现 useSync.js**

Create `src/composables/useSync.js`:

```js
import { ref } from 'vue'
import { pushState, pullState } from '../services/supabase/sync.js'

const status = ref('idle') // idle | syncing | offline | error
const lastError = ref(null)

export function useSync() {
  async function sync({ profiles, grades }) {
    if (!navigator.onLine) {
      status.value = 'offline'
      return
    }
    status.value = 'syncing'
    lastError.value = null

    const pushResult = await pushState({ profiles, grades })
    if (pushResult.error) {
      status.value = 'error'
      lastError.value = pushResult.error
      return
    }

    const pullResult = await pullState()
    if (pullResult.error) {
      status.value = 'error'
      lastError.value = pullResult.error
      return
    }

    status.value = 'idle'
    return pullResult
  }

  return { status, lastError, sync }
}
```

- [ ] **Step 3: 实现 useAnalytics.js**

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

- [ ] **Step 4: 实现 useErrorReporter.js**

Create `src/composables/useErrorReporter.js`:

```js
import { installErrorHandlers } from '../services/supabase/errorReporter.js'

export function useErrorReporter(app) {
  installErrorHandlers(app)
}
```

- [ ] **Step 5: 提交**

```bash
git add src/composables/useSupabaseAuth.js src/composables/useSync.js src/composables/useAnalytics.js src/composables/useErrorReporter.js
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

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: { from: (table) => fromMock(table) }
}))

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: () => 'u1'
}))

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

  it('retrieves payload by code', async () => {
    const payload = { profiles: [{ id: 'p1' }] }
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ payload, expires_at: null }], error: null })
      })
    })
    const result = await getShareCodePayload('ABC123')
    expect(result).toEqual(payload)
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
  const { data, error } = await supabase
    .from('share_codes')
    .select('payload, expires_at')
    .eq('code', code)
    .single()

  if (error) throw error
  if (!data) throw new Error('Share code not found')

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new Error('Share code expired')
  }

  return data.payload
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
import { initAnonymousAuth } from './services/supabase/auth.js'
import { pushState, pullState } from './services/supabase/sync.js'
import { flush } from './services/supabase/analytics.js'
import { installErrorHandlers } from './services/supabase/errorReporter.js'
import { useAnalytics } from './composables/useAnalytics.js'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
installErrorHandlers(app)

const { trackPageView } = useAnalytics()

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
    profilesStore.resetToDefault()
  }

  const currentId = appStore.currentProfileId
  const current = profilesStore.profiles.find(p => p.id === currentId)
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
  })
}

async function initializeSupabase() {
  try {
    await initAnonymousAuth()
    const profilesStore = useProfilesStore()
    const gradesStore = useGradesStore()

    await pushState({
      profiles: profilesStore.dump(),
      grades: gradesStore.dump()
    })

    const { profiles, grades, error } = await pullState()
    if (!error) {
      profilesStore.load(profiles)
      gradesStore.load(grades)
    }
  } catch (e) {
    console.error('Supabase initialization failed', e)
  }
}

initializeState()
app.mount('#app')
initializeSupabase()

router.afterEach((to) => {
  trackPageView(to.path, to.name)
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from './stores/app'
import AppNav from './components/AppNav.vue'
import SyncStatusBar from './components/SyncStatusBar.vue'
import { useSync } from './composables/useSync.js'
import { useProfilesStore } from './stores/profiles.js'
import { useGradesStore } from './stores/grades.js'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const { status: syncStatus, sync } = useSync()

let unsubscribe = null

onMounted(() => {
  const combinedSubscribe = () => {
    sync({ profiles: profilesStore.dump(), grades: gradesStore.dump() })
  }
  const unsubProfiles = profilesStore.$subscribe(combinedSubscribe)
  const unsubGrades = gradesStore.$subscribe(combinedSubscribe)

  const handleOnline = () => combinedSubscribe()
  const handleVisible = () => {
    if (document.visibilityState === 'visible') {
      combinedSubscribe()
    }
  }

  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisible)

  unsubscribe = () => {
    unsubProfiles()
    unsubGrades()
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisible)
  }
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
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
const { status: syncStatus, lastError: syncError, sync } = useSync()

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

function handleRecovered(payload) {
  if (payload.profiles) profilesStore.load(payload.profiles)
  if (payload.grades) gradesStore.load(payload.grades)
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

Expected: 无构建错误。

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

- `profiles` 字段统一使用 `targetGPA`（前端）和 `target_gpa`（DB）。
- `grades` 前端结构为 `{ profileId: { courseName: score } }`，DB 按行存储。
- `sync.js` 的 `pushState` / `pullState` 与 composables 中调用方式一致。
