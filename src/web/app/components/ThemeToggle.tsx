'use client';

import { useTheme } from 'next-themes';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
    >
      <span aria-hidden="true" className="dark:hidden">
        🌙 Dark
      </span>
      <span aria-hidden="true" className="hidden dark:inline">
        ☀️ Light
      </span>
    </button>
  );
}
