import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('aurora_ems_theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('aurora_ems_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('aurora_ems_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
      title="Chuyển chế độ Giao diện Sáng / Tối"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Chế Độ Sáng</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden sm:inline">Giao Diện Sáng Sủa</span>
        </>
      )}
    </button>
  );
};
