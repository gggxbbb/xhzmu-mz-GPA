# GPA 计算器 Supabase 集成设计文档

## 1. 项目概述

### 1.1 目标
将项目当前失效的自部署分析服务 `analysis.gxb.icu` 替换为 **Supabase**，同时引入云端数据备份与恢复能力，在保留现有离线使用体验的前提下，实现匿名跨设备数据迁移和基础统计分析。

### 1.2 现状
- 应用为 Vue 3 + Vite + Pinia 的 PWA，数据持久化在 `localStorage`。
- `index.html` 中引用 `https://analysis.gxb.icu/script.js`，该域名已无法解析，导致控制台报错和埋点丢失。
- 用户无账号体系，所有数据仅存于本地浏览器。
- 已有导入/导出 JSON 能力，但跨设备迁移依赖用户手动拷贝文件。

### 1.3 成功标准
- 移除失效的 `analysis.gxb.icu` 脚本，控制台不再报错。
- 接入 Supabase 匿名登录，用户无需注册即可使用云端能力。
- 核心 GPA 计算、成绩输入、导入导出等功能在离线或 Supabase 不可用时仍可正常使用。
- 提供一次性分享/恢复码，用于数据迁移或课表模板分享。
- 实现页面访问、核心功能使用的匿名事件统计和全局异常上报。
- 不上报任何个人成绩、课程名等敏感信息。

---

## 2. 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| BaaS | Supabase | 匿名 Auth、Postgres、RLS、REST API |
| 客户端 SDK | `@supabase/supabase-js` | Vue 应用中直接调用 |
| 认证方式 | Anonymous Sign-In | 无需邮箱/密码，自动生成匿名用户 |
| 同步策略 | last-write-wins + `updated_at` | 本地优先，后台合并 |
| 离线支持 | `localStorage` + Pinia | 无网时仍可完整使用 |
| 埋点 | Supabase `events` 表 | 替代原 Umami 脚本 |
| 异常上报 | Supabase `errors` 表 | Vue errorHandler + window error 事件 |
| 迁移工具 | Supabase CLI (`npx supabase`) | 本地生成/推送 migrations |

---

## 3. 架构设计

### 3.1 新增模块结构

```
src/
├── services/
│   └── supabase/
│       ├── client.js          # Supabase 客户端初始化
│       ├── auth.js            # 匿名登录 / session 恢复
│       ├── sync.js            # 本地状态与云端双向同步
│       ├── analytics.js       # 事件上报封装
│       └── errorReporter.js   # 异常捕获与上报
├── composables/
│   ├── useSupabaseAuth.js     # 匿名登录状态
│   ├── useSync.js             # 同步状态与手动触发
│   ├── useAnalytics.js        # 事件上报便捷方法
│   └── useErrorReporter.js    # 错误上报初始化
└── components/
    ├── SyncStatusBar.vue      # 在线/同步/离线状态
    ├── ShareCodeDialog.vue    # 生成分享码
    └── RecoverDialog.vue      # 通过分享码恢复数据
```

### 3.2 启动流程

1. `main.js` 按现有逻辑从 `localStorage` 加载 `gpa_v2`，立即渲染页面。
2. 异步初始化 Supabase 匿名登录：
   - 若 `localStorage` 存有 `refresh_token`，尝试恢复 session。
   - 否则调用 `supabase.auth.signInAnonymously()` 创建新匿名用户。
3. 登录成功后触发首次同步：以本地数据为基准，向云端 `push`；然后 `pull` 合并云端较新的数据。
4. 注册 Pinia store 订阅，数据变化后 debounce 3 秒自动 `push`。

### 3.3 数据流

```
用户操作 → Pinia stores → localStorage（立即）
                     ↓
            debounce 3s / 切回前台
                     ↓
              Supabase sync (后台)
                     ↓
              events / errors (异步上报)
```

---

## 4. 数据库 Schema

### 4.1 `profiles`

云端档案表，与本地 `profiles` 一一对应。

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  local_id text not null,
  name text not null,
  target_gpa numeric not null,
  classes jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, local_id)
);
```

### 4.2 `grades`

单科成绩表，按 `profile_local_id` + `course_name` 唯一。

```sql
create table grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_local_id text not null,
  course_name text not null,
  score numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, profile_local_id, course_name)
);
```

### 4.3 `share_codes`

分享/恢复码表，保存一次性数据快照。

```sql
create table share_codes (
  code text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz
);
```

`payload` 结构：
```json
{
  "profiles": [...],
  "grades": { "profileLocalId": { "courseName": score } },
  "createdAt": "2026-07-11T00:00:00Z"
}
```

### 4.4 `events`

分析事件表，替代原 Umami 埋点。

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  properties jsonb default '{}',
  created_at timestamptz default now()
);
```

### 4.5 `errors`

异常上报表。

```sql
create table errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  component text,
  url text,
  created_at timestamptz default now()
);
```

---

## 5. 匿名用户生命周期

### 5.1 登录与恢复

- Supabase 客户端默认启用 `persistSession`，session 会自动持久化到 `localStorage`。
- 应用启动时调用 `supabase.auth.getSession()` 检查是否存在有效 session。
- 若存在有效匿名 session，直接使用该身份。
- 若不存在，调用 `supabase.auth.signInAnonymously()` 创建新匿名用户。
- session 过期时，Supabase 客户端会自动刷新；刷新失败则重新匿名登录。

### 5.2 换浏览器 / 清缓存

- 匿名身份丢失，应用创建新匿名用户。
- 用户可通过恢复码把旧数据快照导入到新身份。
- 导入后数据归属新用户，两边不再自动同步。

### 5.3 升级为正式账号（本期不做）

- 设计预留 `supabase.auth.updateUser({ email })` 或 `linkIdentity()` 扩展点。
- 当前 UI 不实现邮箱绑定、密码重置等流程。

---

## 6. 同步策略

### 6.1 冲突解决

采用 **last-write-wins**，以 `updated_at` 时间戳为准：
- 上传时，本地 `updated_at` 较新的记录覆盖云端。
- 下载时，云端 `updated_at` 较新的记录覆盖本地。
- 同一秒冲突时，以云端为准（保守策略）。

### 6.2 自动同步时机

- Pinia store 订阅检测到变化后，debounce 3 秒触发 `sync.push()`。
- 应用从后台切回前台（`visibilitychange`）时触发 `sync.pull()`。
- Profile 页提供“立即同步”手动按钮。

### 6.3 离线处理

- 使用 `navigator.onLine` 和 `online/offline` 事件检测网络。
- 离线时 `sync.push()` 加入内存队列，恢复网络后批量执行。
- 单次同步失败最多重试 3 次，之后标记为“同步失败”，提示用户手动重试。

### 6.4 降级策略

- Supabase 完全不可用时，应用核心功能不受影响。
- Analytics 和异常上报静默丢弃。
- `SyncStatusBar` 显示“离线模式”。

---

## 7. 分享码机制

### 7.1 生成

1. 用户在 Profile 页点击“生成分享码”。
2. 把当前所有 `profiles` 和 `grades` 序列化为 `payload`。
3. 生成 6 位大小写字母+数字短码，写入 `share_codes`。
4. 默认 7 天过期；可选项“不过期”。
5. 返回短码供用户复制。

### 7.2 恢复

1. 用户在目标设备输入短码。
2. 查询 `share_codes` 表，校验未过期。
3. 将 `payload` 合并到当前匿名用户的 localStorage/Pinia。
4. 合并完成后触发一次 `sync.push()`，把数据同步到该用户的云端。

### 7.3 安全

- `share_codes` 允许任何人通过 `code` 查询（anon + authenticated 可读）。
- 只有所有者能创建或删除自己的分享码。
- 分享码含完整数据快照，用户应谨慎分享。

---

## 8. Analytics 与异常上报

### 8.1 PII 处理原则

- 不上报任何个人成绩、课程名、档案名。
- `events.properties` 仅包含聚合信息：数量、操作类型、结果状态等。
- 异常上报的 `message`、`stack`、`component`、`url` 可包含，但过滤掉用户输入值。

### 8.2 Analytics 事件列表

| 事件名 | 触发时机 | 属性示例 |
|--------|----------|----------|
| `page_view` | 路由切换 | `{ path: '/stats', name: 'stats' }` |
| `grade_entered` | 输入单科成绩后 debounce | `{ courseCount: 42 }` |
| `profile_switched` | 切换档案 | `{ profileCount: 3 }` |
| `profile_created` | 创建新档案 | — |
| `profile_imported` | 导入数据 | `{ format: 'json' }` |
| `profile_exported` | 导出数据 | `{ format: 'json' }` |
| `share_code_generated` | 生成分享码 | — |
| `share_code_recovered` | 使用分享码恢复 | — |
| `theme_changed` | 切换主题 | `{ theme: 'dark' }` |
| `sync_completed` | 同步成功 | `{ direction: 'push' }` |
| `sync_failed` | 同步失败 | `{ errorCode: 'network' }` |

### 8.3 批量与节流

- 事件本地队列批量插入，每 5 秒或满 10 条触发一次。
- 若匿名登录尚未完成，事件暂存在内存队列，登录成功后批量发送。
- 同类错误 1 分钟内最多上报 3 条。

### 8.4 异常捕获来源

| 来源 | 捕获方式 |
|------|----------|
| Vue render error | `app.config.errorHandler` |
| JS runtime error | `window.addEventListener('error')` |
| Unhandled Promise | `window.addEventListener('unhandledrejection')` |
| Supabase 操作错误 | 手动 `try/catch` 后调用 reporter |

---

## 9. 安全与 RLS

### 9.1 业务表 RLS

```sql
-- profiles / grades / events / errors
create policy "Users can only access their own data"
on <table> for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### 9.2 share_codes RLS

```sql
create policy "Anyone can read by code"
on share_codes for select
to anon, authenticated
using (true);

create policy "Owners can manage their codes"
on share_codes for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### 9.3 API Key 管理

- `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 通过 `.env` 注入构建。
- `ANON_KEY` 可公开，因为 RLS 已限制数据访问。
- `service_role_key` 绝不暴露给客户端。

---

## 10. 前端组件变更

### 10.1 新增组件

- `SyncStatusBar.vue`：显示在线/同步中/离线/同步失败状态。
- `ShareCodeDialog.vue`：生成、展示、复制分享码。
- `RecoverDialog.vue`：输入分享码并恢复数据。

### 10.2 修改组件

- `ProfileView.vue`：增加“立即同步”、“生成分享码”、“通过分享码恢复”入口。
- `main.js`：在现有 localStorage 加载后异步初始化 Supabase；注册全局错误处理。
- `index.html`：删除失效的 `analysis.gxb.icu` 脚本。

### 10.3 新增 Composables

- `useSupabaseAuth()`：匿名登录状态和初始化。
- `useSync()`：同步状态、手动触发、错误提示。
- `useAnalytics()`：事件上报便捷方法。
- `useErrorReporter()`：全局错误捕获注册。

---

## 11. 测试策略

### 11.1 单元测试

使用 Vitest + jsdom，mock `@supabase/supabase-js`：
- `auth.js`：匿名登录、session 恢复、token 持久化。
- `sync.js`：本地变化触发 upsert、离线队列、冲突合并。
- `analytics.js`：事件队列、批量发送、敏感信息过滤。
- `errorReporter.js`：错误捕获、节流、递归上报防护。

### 11.2 组件测试

- `SyncStatusBar`：不同网络/同步状态渲染。
- `ShareCodeDialog`：生成、复制、过期提示。
- `RecoverDialog`：输入短码后正确导入数据。

### 11.3 端到端验证

- 离线输入成绩 → 恢复网络 → 数据出现在 Supabase Dashboard。
- 生成分享码 → 另一浏览器无痕窗口恢复 → 数据正确导入。
- 断开 Supabase 服务 → 应用核心功能仍可用。

### 11.4 CI

- GitHub Actions 跑 `npm test` 和 `npm run build`。
- 不依赖真实 Supabase 项目运行单元测试。

---

## 12. 部署、迁移与环境变量

### 12.1 新增项目结构

```
supabase/
├── config.toml
├── migrations/
│   └── 20260711000000_initial_schema.sql
└── seed.sql（可选）
.env
.env.example
.github/workflows/
└── supabase-migrations.yml（可选）
```

### 12.2 环境变量

```bash
# .env / .env.example
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 12.3 本地开发流程

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db diff -f initial_schema
npx supabase db push
```

### 12.4 CI 自动迁移（可选）

- `main` 分支 push 时，GitHub Actions 执行 `supabase db push`。
- 需要配置 `SUPABASE_ACCESS_TOKEN` 和 `SUPABASE_PROJECT_ID` secrets。

### 12.5 前端构建

- 构建命令不变：`npm run build`。
- 构建时读取 `VITE_SUPABASE_*` 变量。
- 静态文件继续部署到原托管平台。

---

## 13. 风险与注意事项

| 风险 | 缓解措施 |
|------|----------|
| Supabase 项目删除后匿名用户数据丢失 | 用户通过分享码做本地备份；未来支持升级正式账号 |
| 分享码泄露导致数据被他人查看 | 短码设默认 7 天过期；UI 提示谨慎分享 |
| 匿名用户 session 被清除（清浏览器数据） | 创建新匿名用户，用户可手动用分享码恢复 |
| 大量事件写入导致免费额度耗尽 | 批量插入 + 错误节流；监控后调整采样 |
| 旧 `analysis.gxb.icu` 脚本被缓存 | 从 `index.html` 移除，并更新缓存策略 |
