import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { Task } from '../types/delegate';
import { formatBytes, formatDuration, calculateCacheEfficiency, parseGitDiff } from '../utils/task-parser';

export interface TaskTerminalProps {
  task?: Task;
  onBack: () => void;
  onUpdateTaskConfig?: (taskId: string, updates: Partial<Task>) => void;
  onSimulateStep?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
}

export const TaskTerminal: React.FC<TaskTerminalProps> = ({
  task,
  onBack,
  onUpdateTaskConfig,
  onSimulateStep,
  onCancelTask,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [tuiHistory, setTuiHistory] = useState<string[]>([]);
  const [tuiViewMode, setTuiViewMode] = useState<'stream' | 'diff' | 'outputs' | 'cost'>('stream');
  const [copiedPatch, setCopiedPatch] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.events, tuiHistory, tuiViewMode]);

  if (!task) {
    return null;
  }

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    setInputVal('');
    setTuiHistory((prev) => [...prev, `> ${cmd}`]);

    if (cmd.startsWith('/')) {
      handleSlashCommand(cmd);
      return;
    }

    if (onSimulateStep) {
      setTuiHistory((prev) => [...prev, `[exec] ${cmd}`]);
      onSimulateStep(task.id);
    }
  };

  const handleSlashCommand = (cmd: string) => {
    const lower = cmd.toLowerCase();
    if (lower === '/help') {
      setTuiHistory((prev) => [
        ...prev,
        `Commands: /stream  /diff  /outputs  /cost  /step  /cancel  /clear  /exit`,
      ]);
    } else if (lower === '/diff') {
      setTuiViewMode('diff');
    } else if (lower === '/outputs') {
      setTuiViewMode('outputs');
    } else if (lower === '/cost') {
      setTuiViewMode('cost');
    } else if (lower === '/stream') {
      setTuiViewMode('stream');
    } else if (lower === '/step' && onSimulateStep) {
      onSimulateStep(task.id);
      setTuiHistory((prev) => [...prev, `[step] advancing task execution...`]);
    } else if (lower === '/cancel' && onCancelTask) {
      onCancelTask(task.id);
      setTuiHistory((prev) => [...prev, `[signal] SIGTERM sent to container.`]);
    } else if (lower === '/clear') {
      setTuiHistory([]);
    } else if (lower === '/exit') {
      onBack();
    } else {
      setTuiHistory((prev) => [...prev, `unknown command: ${cmd} (type /help)`]);
    }
  };

  const copyPatch = () => {
    if (!task.raw_patch) return;
    navigator.clipboard.writeText(task.raw_patch);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const parsedDiff = task.raw_patch ? parseGitDiff(task.raw_patch) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* External Header & Navigation (Outside TUI) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>返回</span>
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {task.title}
          </span>
          <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
            {task.id}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.raw_patch && (
            <button
              onClick={copyPatch}
              className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer flex items-center gap-1"
            >
              {copiedPatch ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedPatch ? '已复制补丁' : '复制 Patch'}</span>
            </button>
          )}
          {task.status === 'running' && onSimulateStep && (
            <button
              onClick={() => onSimulateStep(task.id)}
              className="px-2.5 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              推进执行
            </button>
          )}
          {task.status === 'running' && onCancelTask && (
            <button
              onClick={() => onCancelTask(task.id)}
              className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              终止任务
            </button>
          )}
        </div>
      </div>

      {/* External Configuration Bar (Placed strictly outside the TUI) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-[#111113] text-xs">
        <div className="space-y-1">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">模型</span>
          <select
            value={task.model}
            onChange={(e) => onUpdateTaskConfig?.(task.id, { model: e.target.value })}
            className="w-full bg-transparent font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
          >
            <option value="claude-3-7-sonnet" className="bg-white dark:bg-zinc-900">claude-3-7-sonnet</option>
            <option value="claude-3-5-sonnet" className="bg-white dark:bg-zinc-900">claude-3-5-sonnet</option>
            <option value="gpt-4o" className="bg-white dark:bg-zinc-900">gpt-4o</option>
            <option value="gemini-2.5-pro" className="bg-white dark:bg-zinc-900">gemini-2.5-pro</option>
            <option value="grok-2-1212" className="bg-white dark:bg-zinc-900">grok-2-1212</option>
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">执行器</span>
          <select
            value={task.harness}
            onChange={(e) => onUpdateTaskConfig?.(task.id, { harness: e.target.value as any })}
            className="w-full bg-transparent font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
          >
            <option value="sdk" className="bg-white dark:bg-zinc-900">sdk</option>
            <option value="codex" className="bg-white dark:bg-zinc-900">codex</option>
            <option value="gemini" className="bg-white dark:bg-zinc-900">gemini</option>
            <option value="grok" className="bg-white dark:bg-zinc-900">grok</option>
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">沙箱配额</span>
          <div className="font-mono text-zinc-800 dark:text-zinc-200 truncate">
            {task.sandbox_limits?.cpus || '2.0'} CPU · {task.sandbox_limits?.memory || '4096MB'}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">耗时与轮次</span>
          <div className="font-mono text-zinc-800 dark:text-zinc-200">
            {formatDuration(task.duration_s)} · {task.agent_usage?.turns || 1}/{task.max_turns} 轮
          </div>
        </div>
      </div>

      {/* Monochrome Black & White Task Terminal (任务终端) */}
      <div className="rounded-lg border border-zinc-800 bg-[#000000] text-[#e4e4e7] font-mono text-xs overflow-hidden shadow-sm">
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-b border-zinc-800 select-none">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold tracking-tight">任务终端</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 text-[11px]">
              {task.container_name || `sandbox-${task.id}`}
            </span>
          </div>

          {/* TUI View Switcher (Pure Monochrome) */}
          <div className="flex items-center gap-1 text-[11px]">
            {(
              [
                { id: 'stream', label: '日志流' },
                { id: 'diff', label: '补丁' },
                { id: 'outputs', label: '产物' },
                { id: 'cost', label: '用量' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTuiViewMode(tab.id)}
                className={`px-2 py-0.5 cursor-pointer transition-colors ${
                  tuiViewMode === tab.id
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="ml-2 px-1.5 py-0.5 border border-zinc-700 text-zinc-300 uppercase text-[10px]">
              {task.status}
            </span>
          </div>
        </div>

        {/* Terminal Viewport (Pure Monochrome Text Stream) */}
        <div className="p-4 min-h-[440px] max-h-[560px] overflow-y-auto space-y-2 leading-relaxed bg-[#000000] text-zinc-200 select-text">
          {/* Session Header Line */}
          <div className="text-zinc-500 border-b border-zinc-900 pb-2">
            <div>$ task-runner attach --id {task.id} --workdir /workspace</div>
            <div className="text-zinc-400 mt-1">prompt: {task.prompt}</div>
          </div>

          {/* Mode 1: Execution Stream */}
          {tuiViewMode === 'stream' && (
            <div className="space-y-2 pt-1">
              {(task.events || []).map((ev) => (
                <div key={ev.id} className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-zinc-600 shrink-0">[{ev.ts}]</span>
                    <span className="text-zinc-400 uppercase shrink-0">
                      [{ev.kind}{ev.tool_name ? `:${ev.tool_name}` : ''}]
                    </span>
                    <span className="text-white">{ev.summary}</span>
                  </div>

                  {ev.tool_args && (
                    <div className="pl-16 text-zinc-400 whitespace-pre-wrap">
                      {typeof ev.tool_args === 'string'
                        ? `$ ${ev.tool_args}`
                        : ev.tool_args.command
                        ? `$ ${String(ev.tool_args.command)}`
                        : JSON.stringify(ev.tool_args)}
                    </div>
                  )}

                  {ev.tool_result && (
                    <div className="pl-16 text-zinc-500 whitespace-pre-wrap border-l border-zinc-800 ml-2">
                      {ev.tool_result}
                    </div>
                  )}
                </div>
              ))}

              {task.result_text && (
                <div className="pt-3 mt-3 border-t border-zinc-900 text-zinc-300 whitespace-pre-wrap">
                  {task.result_text}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Monochrome Diff */}
          {tuiViewMode === 'diff' && (
            <div className="space-y-2 pt-1">
              <div className="text-zinc-400">
                --- git diff ({parsedDiff?.files.length || 0} files, +{parsedDiff?.totalInsertions || 0} / -{parsedDiff?.totalDeletions || 0}) ---
              </div>
              {task.raw_patch ? (
                <div className="whitespace-pre overflow-x-auto leading-5">
                  {task.raw_patch.split(/\r?\n/).map((l, i) => {
                    const isAdd = l.startsWith('+') && !l.startsWith('+++');
                    const isDel = l.startsWith('-') && !l.startsWith('---');
                    const isHunk = l.startsWith('@@');

                    return (
                      <div
                        key={i}
                        className={
                          isAdd
                            ? 'text-white bg-zinc-900'
                            : isDel
                            ? 'text-zinc-500 line-through'
                            : isHunk
                            ? 'text-zinc-300 font-semibold pt-1'
                            : 'text-zinc-400'
                        }
                      >
                        {l}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-zinc-600">no diff output available.</div>
              )}
            </div>
          )}

          {/* Mode 3: Monochrome Outputs */}
          {tuiViewMode === 'outputs' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-zinc-400">--- /outputs directory ---</div>
              {task.outputs && task.outputs.length > 0 ? (
                task.outputs.map((out, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-zinc-900">
                    <span className="text-white">{out.path}</span>
                    <span className="text-zinc-500">{formatBytes(out.size)}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600">0 files in /outputs.</div>
              )}
            </div>
          )}

          {/* Mode 4: Monochrome Token Usage */}
          {tuiViewMode === 'cost' && (
            <div className="space-y-1 pt-1 text-zinc-300">
              <div className="text-zinc-400">--- token usage ---</div>
              <div>input_tokens      : {task.agent_usage?.input_tokens?.toLocaleString() || 0}</div>
              <div>output_tokens     : {task.agent_usage?.output_tokens?.toLocaleString() || 0}</div>
              <div>cache_read_tokens : {task.agent_usage?.cache_read_tokens?.toLocaleString() || 0}</div>
              <div>
                cache_hit_rate    :{' '}
                {task.agent_usage
                  ? `${calculateCacheEfficiency(task.agent_usage.cache_read_tokens, task.agent_usage.input_tokens)}%`
                  : '0%'}
              </div>
              <div>turns             : {task.agent_usage?.turns || 1} / {task.max_turns}</div>
            </div>
          )}

          {/* Interactive Command History */}
          {tuiHistory.map((h, i) => (
            <div key={i} className="text-zinc-300 whitespace-pre-wrap">
              {h}
            </div>
          ))}

          <div ref={terminalEndRef} />
        </div>

        {/* Monochrome Command Prompt Input */}
        <form
          onSubmit={handleCommandSubmit}
          className="flex items-center px-4 py-2.5 bg-[#050505] border-t border-zinc-800"
        >
          <span className="text-white mr-2 select-none">&gt;</span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="输入命令 (/diff, /outputs, /cost, /step, /cancel, /help)..."
            className="flex-1 bg-transparent text-white placeholder:text-zinc-600 focus:outline-none font-mono text-xs"
          />
        </form>
      </div>
    </div>
  );
};
