'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className="fixed top-3 right-3 z-10 rounded-full border border-gray-300 bg-white/90 px-3 h-9 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100"
    >
      {isDark ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
}
