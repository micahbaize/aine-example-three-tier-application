'use client';

import { useTheme } from '../providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 p-1">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
        }`}
        title="Light mode"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
        }`}
        title="System preference"
      >
        🖥️
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
        }`}
        title="Dark mode"
      >
        🌙
      </button>
    </div>
  );
}
