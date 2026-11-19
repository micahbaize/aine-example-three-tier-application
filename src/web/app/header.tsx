'use client';

import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors duration-300">
      <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">aine</h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
