import { Task, ApiKeyItem, ProviderItem, AuditRecord } from '../types/delegate';

export const INITIAL_TASKS: Task[] = [
  {
    id: 't_b4d778d1b112',
    title: '修复 Python 异步连接池在极端网络超时下的死锁问题',
    prompt: `在高并发请求突发时，database pool 的 acquire() 会在 timeout_s 触发后依然持有底层 socket 锁，导致后续所有协程挂起。
请在沙箱中重现该问题，编写重现测试用例 test_pool_deadlock.py，修复 connection_pool.py 中的锁释放逻辑，确保 pytest 全部通过并生成 patch。`,
    source: 'mcp',
    status: 'succeeded',
    agent: 'anthropic',
    model: 'claude-3-7-sonnet',
    sandbox: 'docker',
    harness: 'sdk',
    timeout_s: 1800,
    max_turns: 12,
    created_at: '2026-11-08 05:12:10',
    started_at: '2026-11-08 05:12:14',
    finished_at: '2026-11-08 05:15:32',
    duration_s: 198,
    repo_url: 'https://github.com/acme-corp/core-data-service',
    repo_ref: 'main (commit: 7f8c12a)',
    container_id: 'd9e8f7a6b5c41234567890abcdef1234567890abcdef',
    container_name: 'delegate-sandbox-t_b4d778d1b112',
    sandbox_image: 'delegate-sandbox:sdk-v0.2.0',
    sandbox_limits: {
      memory: '4096MB',
      cpus: '2.0',
      pids: 256,
      network: 'egress-allow-github-pypi',
    },
    exit_code: 0,
    client_info: {
      client: 'Claude Code 1.0.12 (darwin-arm64)',
      ip: '192.168.1.42',
      version: 'v0.2.0',
    },
    api_key_prefix: 'dlg_9a2b',
    api_key_name: 'MacBook Pro Claude Code',
    result_text: `### 诊断与修复报告

1. **根因定位**：
   在 \`src/database/pool.py\` 的 \`acquire()\` 方法中，当 \`asyncio.wait_for()\` 抛出 \`TimeoutError\` 时，虽然连接本身未返回给调用者，但内部状态机未将该连接从 \`_active_leases\` 集合中移除，且未触发底层 TCP socket 的 \`reset_nowait()\`，导致 socket 处于悬挂状态。

2. **代码修改**：
   - 增加 \`finally\` 块强制清理超时连接，并在异常时执行安全析构。
   - 在连接池析构守卫中增加自愈检查机制。
   - 新增单元测试 \`tests/test_deadlock.py\`，模拟 200 个并发连接在 10ms 抖动超时的极限场景。

3. **测试验证**：
   执行 \`pytest -v tests/test_deadlock.py\`，5/5 测试用例全部通过，未发生协程挂起。`,
    raw_patch: `diff --git a/src/database/pool.py b/src/database/pool.py
index a1b2c3d..e4f5g6h 100644
--- a/src/database/pool.py
+++ b/src/database/pool.py
@@ -48,12 +48,18 @@ class ConnectionPool:
         try:
             async with asyncio.timeout(self.timeout_s):
                 conn = await self._queue.get()
-                self._active_leases.add(conn)
+                try:
+                    self._active_leases.add(conn)
+                    return conn
+                except BaseException:
+                    await self._release_internal(conn)
+                    raise
         except TimeoutError:
-            logger.warning("Connection pool acquisition timed out")
+            logger.warning("Connection pool acquisition timed out, clearing pending waiters")
+            self._cleanup_stale_waiters()
             raise PoolTimeout("Timed out acquiring connection from pool")
-        return conn
 
     async def release(self, conn: Connection) -> None:
diff --git a/tests/test_deadlock.py b/tests/test_deadlock.py
new file mode 100644
index 0000000..7c8d9e0
--- /dev/null
+++ b/tests/test_deadlock.py
@@ -0,0 +1,18 @@
+import pytest
+import asyncio
+from src.database.pool import ConnectionPool, PoolTimeout
+
+@pytest.mark.asyncio
+async def test_concurrent_timeout_no_deadlock():
+    pool = ConnectionPool(max_size=5, timeout_s=0.05)
+    async def worker():
+        try:
+            conn = await pool.acquire()
+            await asyncio.sleep(0.1)
+            await pool.release(conn)
+        except PoolTimeout:
+            pass
+    
+    tasks = [asyncio.create_task(worker()) for _ in range(50)]
+    await asyncio.gather(*tasks)
+    assert len(pool._active_leases) == 0
`,
    patch_stats: {
      files: 2,
      insertions: 26,
      deletions: 4,
      bytes: 1420,
      paths: ['src/database/pool.py', 'tests/test_deadlock.py'],
    },
    outputs: [
      {
        path: 'test_report.json',
        size: 3420,
        sha256: '9f83a45c6123e4b5...',
      },
      {
        path: 'profile_memory.svg',
        size: 45120,
        sha256: '8e72c1094ba32e12...',
      },
    ],
    agent_usage: {
      agent: 'anthropic',
      input_tokens: 14280,
      output_tokens: 2840,
      cache_read_tokens: 41200,
      cache_write_tokens: 1820,
      turns: 4,
    },
    events: [
      {
        id: 'ev-1',
        ts: '05:12:14',
        kind: 'runner',
        phase: 'setup',
        summary: 'Docker 沙箱容器已就绪 (ID: d9e8f7a6b5c4)',
        data: { image: 'delegate-sandbox:sdk-v0.2.0', limits: 'RAM 4GB, CPU 2.0' },
      },
      {
        id: 'ev-2',
        ts: '05:12:16',
        kind: 'runner',
        phase: 'clone',
        summary: '克隆仓库 https://github.com/acme-corp/core-data-service',
        data: { commit: '7f8c12a', files: 142 },
      },
      {
        id: 'ev-3',
        ts: '05:12:20',
        kind: 'thinking',
        summary: '分析需求：并发 acquisition 超时死锁。先通过 glob 探索连接池相关源码并运行测试。',
      },
      {
        id: 'ev-4',
        ts: '05:12:24',
        kind: 'tool_call',
        tool_name: 'read_file',
        summary: '读取 src/database/pool.py 文件',
        tool_args: { file_path: 'src/database/pool.py', line_start: 1, line_end: 80 },
      },
      {
        id: 'ev-5',
        ts: '05:12:35',
        kind: 'thinking',
        summary: '定位到 acquire() 捕获 TimeoutError 处存在异常泄露。开始编写复现测试 tests/test_deadlock.py。',
      },
      {
        id: 'ev-6',
        ts: '05:12:45',
        kind: 'tool_call',
        tool_name: 'write_file',
        summary: '创建测试用例 tests/test_deadlock.py',
        tool_args: { file_path: 'tests/test_deadlock.py', lines: 18 },
      },
      {
        id: 'ev-7',
        ts: '05:13:02',
        kind: 'tool_call',
        tool_name: 'bash',
        summary: '运行 pytest tests/test_deadlock.py 确认复现',
        tool_args: { command: 'pytest -v tests/test_deadlock.py' },
        tool_result: 'FAILED tests/test_deadlock.py::test_concurrent_timeout_no_deadlock - AssertionError: assert 5 == 0',
      },
      {
        id: 'ev-8',
        ts: '05:13:40',
        kind: 'tool_call',
        tool_name: 'edit_file',
        summary: '更新 src/database/pool.py 增加超时释放与守卫逻辑',
        tool_args: { file_path: 'src/database/pool.py' },
      },
      {
        id: 'ev-9',
        ts: '05:14:15',
        kind: 'tool_call',
        tool_name: 'bash',
        summary: '二次运行完整测试套件验证修复',
        tool_args: { command: 'pytest tests/' },
        tool_result: 'tests/test_pool.py ..... [ 80%]\ntests/test_deadlock.py . [100%]\n6 passed in 1.42s',
      },
      {
        id: 'ev-10',
        ts: '05:15:28',
        kind: 'runner',
        phase: 'finish',
        summary: '任务完成，生成 patch (1.4 KB) 并收集 /outputs 产物',
        data: { files_changed: 2, outputs_count: 2 },
      },
    ],
  },
  {
    id: 't_f1082a93c841',
    title: 'Docker 沙箱内跑 Playwright 端到端测试并排查 Flaky 测试用例',
    prompt: `运行 e2e/checkout_spec.ts 测试，发现偶发由于订单创建确认动画卡顿引起的元素未定位错误。
请将重试机制改为 waitForResponse + 显式 locator state，保证 10 次并发测试无一报错。`,
    source: 'mcp',
    status: 'running',
    agent: 'openai',
    model: 'gpt-4o',
    sandbox: 'docker',
    harness: 'sdk',
    timeout_s: 1200,
    max_turns: 8,
    created_at: '2026-11-08 05:42:01',
    started_at: '2026-11-08 05:42:05',
    duration_s: 74,
    repo_url: 'https://github.com/acme-corp/web-shop',
    repo_ref: 'feat/checkout-v2',
    container_id: 'a8b7c6d5e4f3210987654321fedcba0987654321fedc',
    container_name: 'delegate-sandbox-t_f1082a93c841',
    sandbox_image: 'delegate-sandbox:sdk-v0.2.0',
    sandbox_limits: {
      memory: '4096MB',
      cpus: '2.0',
      pids: 256,
      network: 'egress-allow-all',
    },
    client_info: {
      client: 'Claude Code 1.0.12 (linux-x64)',
      ip: '10.0.4.12',
      version: 'v0.2.0',
    },
    api_key_prefix: 'dlg_c3e1',
    api_key_name: 'CI Pipeline Worker 03',
    agent_usage: {
      agent: 'openai',
      input_tokens: 8450,
      output_tokens: 1210,
      cache_read_tokens: 19400,
      cache_write_tokens: 890,
      turns: 2,
    },
    events: [
      {
        id: 'ev-201',
        ts: '05:42:05',
        kind: 'runner',
        phase: 'setup',
        summary: '容器初始化完毕，挂载独立网络与卷 /workspace',
      },
      {
        id: 'ev-202',
        ts: '05:42:15',
        kind: 'tool_call',
        tool_name: 'bash',
        summary: '安装依赖并执行一次 flaky 测试',
        tool_args: { command: 'npx playwright test e2e/checkout_spec.ts --repeat-each 3' },
        tool_result: 'Running 3 tests using 1 worker\n[1/3] passed\n[2/3] failed (Timeout 5000ms exceeded waiting for locator("button#confirm"))\n[3/3] passed',
      },
      {
        id: 'ev-203',
        ts: '05:42:48',
        kind: 'thinking',
        summary: '复现成功：第 2 次由于 DOM 元素重渲染导致 locator 丢失引用。正在修改 selector 等待模式为 page.waitForURL + locator.toBeVisible()。',
      },
      {
        id: 'ev-204',
        ts: '05:43:10',
        kind: 'tool_call',
        tool_name: 'edit_file',
        summary: '修改 e2e/checkout_spec.ts 等待逻辑',
        tool_args: { file_path: 'e2e/checkout_spec.ts' },
      },
    ],
  },
  {
    id: 't_c8e91024ab77',
    title: '重构 Fastify REST 路由模块至 Hono 并输出 OpenAPI 类型规范',
    prompt: `将原有 legacy-api 模块中的 14 个 Fastify handler 改写为 Hono 驱动，并将输出模式从 Joi schema 换成 Zod + @hono/zod-openapi。
确保中间件兼容，并在 /outputs 目录中生成 openapi.json 与 client-types.d.ts。`,
    source: 'web',
    status: 'succeeded',
    agent: 'gemini',
    model: 'gemini-2.5-pro',
    sandbox: 'docker',
    harness: 'sdk',
    timeout_s: 2400,
    max_turns: 15,
    created_at: '2026-11-08 03:15:00',
    started_at: '2026-11-08 03:15:06',
    finished_at: '2026-11-08 03:22:45',
    duration_s: 459,
    exit_code: 0,
    result_text: `### 迁移完成

1. 已将全部 14 个 endpoint 迁移至 Hono 规范。
2. 抽离了公共 Auth 中间件与 RateLimiter。
3. \`/outputs/openapi.json\` 与 \`/outputs/client-types.d.ts\` 已生成完毕并通过 tsc 静态类型校验。`,
    raw_patch: `diff --git a/src/routes/users.ts b/src/routes/users.ts
index b111aaa..c222bbb 100644
--- a/src/routes/users.ts
+++ b/src/routes/users.ts
@@ -1,15 +1,18 @@
-import { FastifyPluginAsync } from 'fastify';
-export const userRoutes: FastifyPluginAsync = async (app) => {
-  app.get('/users/:id', async (req, reply) => {
-    const user = await getUser(req.params.id);
-    return reply.send(user);
-  });
-};
+import { Hono } from 'hono';
+import { zValidator } from '@hono/zod-validator';
+import { z } from 'zod';
+
+export const userRoutes = new Hono()
+  .get('/:id', zValidator('param', z.object({ id: z.string() })), async (c) => {
+    const { id } = c.req.valid('param');
+    const user = await getUser(id);
+    return c.json(user);
+  });
`,
    patch_stats: {
      files: 4,
      insertions: 84,
      deletions: 52,
      bytes: 4120,
      paths: ['src/routes/users.ts', 'src/routes/auth.ts', 'src/app.ts', 'package.json'],
    },
    outputs: [
      { path: 'openapi.json', size: 14200, sha256: 'a1b2c3d4...' },
      { path: 'client-types.d.ts', size: 6800, sha256: 'f5e4d3c2...' },
    ],
    agent_usage: {
      agent: 'gemini',
      input_tokens: 28400,
      output_tokens: 6100,
      cache_read_tokens: 58200,
      cache_write_tokens: 3400,
      turns: 7,
    },
  },
  {
    id: 't_a77bc334ef90',
    title: '分析 PostgreSQL 慢查询并在沙箱中执行 Explain 索引压测',
    prompt: `针对 tenant_events 表按 (tenant_id, created_at, event_type) 的聚合查询在 1000 万条数据下的性能瓶颈进行 EXPLAIN ANALYZE 评估，
给出最佳复合 B-Tree 或 BRIN 索引设计方案。`,
    source: 'mcp',
    status: 'failed',
    status_reason: '沙箱内执行脚本超时：未在 600 秒内完成 mock 数据集灌入。',
    agent: 'anthropic',
    model: 'claude-3-7-sonnet',
    sandbox: 'docker',
    harness: 'claude-code',
    timeout_s: 600,
    max_turns: 5,
    created_at: '2026-11-07 23:10:00',
    started_at: '2026-11-07 23:10:04',
    finished_at: '2026-11-07 23:20:04',
    duration_s: 600,
    exit_code: 124,
    agent_usage: {
      agent: 'anthropic',
      input_tokens: 9200,
      output_tokens: 1400,
      cache_read_tokens: 12000,
      cache_write_tokens: 0,
      turns: 3,
    },
    events: [
      {
        id: 'ev-301',
        ts: '23:10:04',
        kind: 'runner',
        phase: 'setup',
        summary: '拉取 Docker 镜像 delegate-sandbox:claude-code',
      },
      {
        id: 'ev-302',
        ts: '23:11:00',
        kind: 'tool_call',
        tool_name: 'bash',
        summary: '生成 1000 万行 mock 数据',
        tool_args: { command: 'python scripts/seed_db.py --rows 10000000' },
      },
      {
        id: 'ev-303',
        ts: '23:20:04',
        kind: 'stderr',
        summary: 'Command timed out after 600s (SIGTERM emitted to container)',
      },
    ],
  },
];

export const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: 1,
    name: 'MacBook Pro Claude Code',
    prefix: 'dlg_9a2b',
    created_at: '2026-11-01 10:24:00',
    last_used_at: '2026-11-08 05:12:10',
    last_used_ip: '192.168.1.42',
    active: true,
  },
  {
    id: 2,
    name: 'CI/CD Pipeline Runner (GitHub Actions)',
    prefix: 'dlg_c3e1',
    created_at: '2026-11-03 14:10:00',
    last_used_at: '2026-11-08 05:42:01',
    last_used_ip: '10.0.4.12',
    active: true,
  },
  {
    id: 3,
    name: 'Cursor Local MCP Integration',
    prefix: 'dlg_77fa',
    created_at: '2026-11-05 09:00:00',
    last_used_at: null,
    last_used_ip: null,
    active: true,
  },
];

export const INITIAL_PROVIDERS: ProviderItem[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    pythonPackage: 'anthropic',
    envKeyVar: 'ANTHROPIC_API_KEY',
    envBaseUrlVar: 'ANTHROPIC_BASE_URL',
    configured: true,
    apiKeyMasked: 'sk-ant-api03-••••••••••••••••••••••••k9A',
    baseUrl: '',
    models: ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku'],
    defaultModel: 'claude-3-7-sonnet',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    pythonPackage: 'openai',
    envKeyVar: 'OPENAI_API_KEY',
    envBaseUrlVar: 'OPENAI_BASE_URL',
    configured: true,
    apiKeyMasked: 'sk-proj-••••••••••••••••••••••••x7Z',
    baseUrl: '',
    models: ['gpt-4o', 'o3-mini', 'gpt-4o-mini', 'o1'],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    pythonPackage: 'google-genai',
    envKeyVar: 'GEMINI_API_KEY',
    envBaseUrlVar: 'GEMINI_BASE_URL',
    configured: true,
    apiKeyMasked: 'AIzaSy••••••••••••••••••••••••w9B',
    baseUrl: '',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    defaultModel: 'gemini-2.5-flash',
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    pythonPackage: 'openai',
    envKeyVar: 'GROK_API_KEY',
    envBaseUrlVar: 'GROK_BASE_URL',
    configured: true,
    apiKeyMasked: 'xai-••••••••••••••••••••••••g8K',
    baseUrl: 'https://api.x.ai/v1',
    models: ['grok-2-1212', 'grok-2-vision-1212', 'grok-beta'],
    defaultModel: 'grok-2-1212',
  },
];

export const INITIAL_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'aud_01',
    ts: '2026-11-08 05:42:01',
    action: 'task.create',
    actor: 'dlg_c3e1… (CI Pipeline)',
    ip: '10.0.4.12',
    detail: { task_id: 't_f1082a93c841', harness: 'sdk', model: 'gpt-4o' },
  },
  {
    id: 'aud_02',
    ts: '2026-11-08 05:15:32',
    action: 'task.succeeded',
    actor: 'worker-node-02',
    ip: '10.244.0.18',
    detail: { task_id: 't_b4d778d1b112', duration_s: 198, files_changed: 2 },
  },
  {
    id: 'aud_03',
    ts: '2026-11-08 05:12:10',
    action: 'task.create',
    actor: 'dlg_9a2b… (MacBook Pro)',
    ip: '192.168.1.42',
    detail: { task_id: 't_b4d778d1b112', harness: 'sdk', model: 'claude-3-7-sonnet' },
  },
  {
    id: 'aud_04',
    ts: '2026-11-08 04:30:15',
    action: 'key.create',
    actor: 'liruiyang2016@outlook.com',
    ip: '192.168.1.42',
    detail: { name: 'Cursor Local MCP Integration', prefix: 'dlg_77fa' },
  },
  {
    id: 'aud_05',
    ts: '2026-11-08 03:22:45',
    action: 'task.succeeded',
    actor: 'worker-node-01',
    ip: '10.244.0.17',
    detail: { task_id: 't_c8e91024ab77', duration_s: 459, outputs: 2 },
  },
];
