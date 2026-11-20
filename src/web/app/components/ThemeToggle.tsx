"use client";

import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "theme";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  // Re-render when the <html> class changes (set by this toggle or the init script).
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (e.g. privacy mode); the toggle still works for this page.
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="mb-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
