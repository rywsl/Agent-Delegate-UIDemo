import React from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  CheckSquare,
  PlusCircle,
  KeyRound,
  Server,
  Network,
  ShieldAlert,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type SidebarTab = 'home' | 'tasks' | 'new-task' | 'keys' | 'providers' | 'mcp' | 'audit' | 'task-detail';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  taskCount?: number;
  userEmail?: string;
  userName?: string;
  isDark?: boolean;
  toggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  taskCount = 4,
  userName = 'li ruiyang',
  isDark = true,
  toggleTheme,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const navItems = [
    {
      id: 'home' as SidebarTab,
      label: '主页',
      icon: LayoutDashboard,
    },
    {
      id: 'tasks' as SidebarTab,
      label: '任务',
      icon: CheckSquare,
      badge: taskCount,
    },
    {
      id: 'new-task' as SidebarTab,
      label: '新建',
      icon: PlusCircle,
    },
    {
      id: 'keys' as SidebarTab,
      label: '密钥',
      icon: KeyRound,
    },
    {
      id: 'providers' as SidebarTab,
      label: '提供商',
      icon: Server,
    },
    {
      id: 'mcp' as SidebarTab,
      label: 'MCP 接入',
      icon: Network,
    },
    {
      id: 'audit' as SidebarTab,
      label: '审计',
      icon: ShieldAlert,
    },
  ];

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col border-r border-zinc-200 bg-[#f7f7f5] dark:border-zinc-800/80 dark:bg-[#0c0c0e] transition-all duration-150 select-none z-30 shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Top Bar */}
      <div className="flex h-13 items-center justify-between px-3.5">
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-left cursor-pointer focus:outline-none"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.2]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
            </svg>
          </div>
          {!collapsed && (
            <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 text-sm">
              Delegate
            </span>
          )}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded transition-colors cursor-pointer"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'tasks' && activeTab === 'task-detail');

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors text-left cursor-pointer',
                isActive
                  ? 'bg-zinc-200/80 text-zinc-950 font-medium dark:bg-zinc-800/90 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/40 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/40'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive
                    ? 'text-zinc-950 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Profile & Theme Toggle */}
      <div className="p-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-medium text-[11px] text-zinc-700 dark:text-zinc-300 font-mono shrink-0">
              LR
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {userName}
                </div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  Local · Docker
                </div>
              </div>
            )}
          </div>

          {!collapsed && toggleTheme && (
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isDark ? '浅色模式' : '深色模式'}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
