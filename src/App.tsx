import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { TasksView } from './components/TasksView';
import { NewTaskView } from './components/NewTaskView';
import { TaskTerminal } from './components/TaskTerminal';
import { ApiKeysView } from './components/ApiKeysView';
import { ProvidersView } from './components/ProvidersView';
import { McpGuideModal } from './components/McpGuideModal';
import { AuditView } from './components/AuditView';
import {
  INITIAL_TASKS,
  INITIAL_API_KEYS,
  INITIAL_PROVIDERS,
  INITIAL_AUDIT_LOGS,
} from './data/mock-data';
import { Task, ApiKeyItem, ProviderItem, AuditRecord } from './types/delegate';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_API_KEYS);
  const [providers, setProviders] = useState<ProviderItem[]>(INITIAL_PROVIDERS);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(INITIAL_AUDIT_LOGS);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('t_b4d778d1b112');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const [newTaskModel, setNewTaskModel] = useState<string>('claude-3-7-sonnet');
  const [newTaskHarness, setNewTaskHarness] = useState<string>('sdk');

  const handleSelectTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setActiveTab('task-detail');
  };

  const handleOpenNewTask = (config?: { model?: string; harness?: string }) => {
    if (config?.model) setNewTaskModel(config.model);
    if (config?.harness) setNewTaskHarness(config.harness);
    setActiveTab('new-task');
  };

  const handleLaunchTask = (taskData: Partial<Task>) => {
    const newId = `t_${Math.random().toString(16).slice(2, 14)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const newTask: Task = {
      id: newId,
      title: taskData.title || '新建任务',
      prompt: taskData.prompt || '',
      source: 'web',
      status: 'running',
      agent: taskData.agent || 'anthropic',
      model: taskData.model || newTaskModel || 'claude-3-7-sonnet',
      sandbox: 'docker',
      harness: taskData.harness || (newTaskHarness as any) || 'sdk',
      timeout_s: taskData.timeout_s || 1800,
      max_turns: taskData.max_turns || 12,
      created_at: nowStr,
      started_at: nowStr,
      duration_s: 4,
      repo_url: taskData.repo_url || 'https://github.com/delegate-org/runtime-core',
      repo_ref: taskData.repo_ref || 'main',
      container_id: `${Math.random().toString(16).slice(2, 26)}000000000000000000`,
      container_name: `sandbox-${newId}`,
      sandbox_image: 'delegate-sandbox:sdk-v0.2.0',
      sandbox_limits: {
        memory: '4096MB',
        cpus: '2.0',
        pids: 256,
        network: 'egress-allow-github-pypi',
      },
      agent_usage: {
        agent: taskData.agent || 'anthropic',
        input_tokens: 3850,
        output_tokens: 520,
        cache_read_tokens: 9200,
        cache_write_tokens: 310,
        turns: 1,
      },
      events: [
        {
          id: `ev-${Date.now()}-1`,
          ts: new Date().toTimeString().slice(0, 8),
          kind: 'runner',
          phase: 'setup',
          summary: '容器已启动并挂载工作区 /workspace',
          data: { memory: '4096MB', cpus: '2.0' },
        },
        {
          id: `ev-${Date.now()}-2`,
          ts: new Date().toTimeString().slice(0, 8),
          kind: 'thinking',
          summary: `解析任务指令: ${(taskData.prompt || '').slice(0, 60)}`,
        },
      ],
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newId);
    setActiveTab('task-detail');

    const auditRecord: AuditRecord = {
      id: `aud_${Date.now()}`,
      ts: nowStr,
      action: 'task.create',
      actor: 'li ruiyang',
      ip: '127.0.0.1',
      detail: { task_id: newId, harness: newTask.harness, model: newTask.model },
    };
    setAuditLogs((prev) => [auditRecord, ...prev]);

    setTimeout(() => {
      setTasks((currTasks) =>
        currTasks.map((t) => {
          if (t.id !== newId) return t;
          const nextEv: any = {
            id: `ev-${Date.now()}-3`,
            ts: new Date().toTimeString().slice(0, 8),
            kind: 'tool_call',
            tool_name: 'bash',
            summary: '运行测试套件',
            tool_args: { command: 'pytest tests/test_async.py -v' },
            tool_result: 'FAILED tests/test_async.py::test_timeout - TimeoutError: 5.0s elapsed',
          };
          return {
            ...t,
            duration_s: 24,
            events: [...(t.events || []), nextEv],
          };
        })
      );
    }, 2000);
  };

  const handleUpdateTaskConfig = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  const handleSimulateStep = (taskId: string) => {
    setTasks((currTasks) =>
      currTasks.map((t) => {
        if (t.id !== taskId) return t;
        const currentCount = t.events?.length || 0;

        if (currentCount >= 4) {
          const finalPatch = `diff --git a/src/worker.py b/src/worker.py
index 99fa123..88bc456 100644
--- a/src/worker.py
+++ b/src/worker.py
@@ -12,3 +12,7 @@
 def process_batch(items):
-    return [execute(x) for x in items]
+    results = []
+    for x in items:
+        with timeout_guard():
+            results.append(execute(x))
+    return results
`;
          return {
            ...t,
            status: 'succeeded',
            finished_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
            duration_s: 64,
            exit_code: 0,
            raw_patch: finalPatch,
            patch_stats: {
              files: 1,
              insertions: 5,
              deletions: 1,
              bytes: 380,
              paths: ['src/worker.py'],
            },
            result_text: `任务执行完成：已修复超时阻塞并生成补丁，单元测试通过。`,
            outputs: [{ path: 'summary.json', size: 1200, sha256: '998877665544332211' }],
            events: [
              ...(t.events || []),
              {
                id: `ev-${Date.now()}`,
                ts: new Date().toTimeString().slice(0, 8),
                kind: 'finish',
                summary: '测试用例通过，已导出补丁与产物。',
              },
            ],
          };
        } else {
          return {
            ...t,
            duration_s: (t.duration_s || 0) + 14,
            events: [
              ...(t.events || []),
              {
                id: `ev-${Date.now()}`,
                ts: new Date().toTimeString().slice(0, 8),
                kind: 'tool_call',
                tool_name: 'edit_file',
                summary: '更新 src/worker.py',
                tool_args: { file_path: 'src/worker.py' },
                tool_result: 'updated 1 file',
              },
            ],
          };
        }
      })
    );
  };

  const handleCancelTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'cancelled',
              status_reason: '任务已手动取消',
              finished_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
            }
          : t
      )
    );
  };

  const handleCreateKey = (name: string) => {
    const randomHex = Math.random().toString(16).slice(2, 10);
    const fullToken = `dlg_${randomHex}${Math.random().toString(16).slice(2, 18)}`;
    const prefix = `dlg_${randomHex.slice(0, 4)}`;

    const newKey: ApiKeyItem = {
      id: Date.now(),
      name,
      prefix,
      token: fullToken,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      last_used_at: null,
      last_used_ip: null,
      active: true,
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setNewlyCreatedToken(fullToken);

    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
        action: 'key.create',
        actor: 'li ruiyang',
        ip: '127.0.0.1',
        detail: { name, prefix },
      },
      ...prev,
    ]);
  };

  const handleRevokeKey = (id: number) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, active: false } : k))
    );

    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
        action: 'key.revoke',
        actor: 'li ruiyang',
        ip: '127.0.0.1',
        detail: { key_id: id },
      },
      ...prev,
    ]);
  };

  const handleUpdateProvider = (id: string, updates: Partial<ProviderItem>) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-zinc-900 dark:bg-[#0a0a0c] dark:text-zinc-100 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        taskCount={tasks.length}
        userEmail="liruiyang2016@outlook.com"
        userName="li ruiyang"
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto">
          {activeTab === 'home' && (
            <OverviewDashboard
              tasks={tasks}
              onSelectTask={handleSelectTask}
              onOpenNewTask={handleOpenNewTask}
              onNavigateTab={(tab) => setActiveTab(tab)}
              userName="li"
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onSelectTask={handleSelectTask}
              onOpenNewTask={() => setActiveTab('new-task')}
            />
          )}

          {activeTab === 'new-task' && (
            <NewTaskView
              onLaunch={handleLaunchTask}
              onCancel={() => setActiveTab('tasks')}
              initialModel={newTaskModel}
              initialHarness={newTaskHarness}
            />
          )}

          {activeTab === 'task-detail' && (
            <TaskTerminal
              task={selectedTask}
              onBack={() => setActiveTab('tasks')}
              onUpdateTaskConfig={handleUpdateTaskConfig}
              onSimulateStep={handleSimulateStep}
              onCancelTask={handleCancelTask}
            />
          )}

          {activeTab === 'keys' && (
            <ApiKeysView
              keys={apiKeys}
              onCreateKey={handleCreateKey}
              onRevokeKey={handleRevokeKey}
              newlyCreatedToken={newlyCreatedToken}
              onClearNewToken={() => setNewlyCreatedToken(null)}
            />
          )}

          {activeTab === 'providers' && (
            <ProvidersView
              providers={providers}
              onUpdateProvider={handleUpdateProvider}
            />
          )}

          {activeTab === 'mcp' && (
            <McpGuideModal
              activeKeyPrefix={apiKeys.find((k) => k.active)?.prefix || 'dlg_9a2b'}
            />
          )}

          {activeTab === 'audit' && (
            <AuditView logs={auditLogs} />
          )}
        </main>
      </div>
    </div>
  );
}
