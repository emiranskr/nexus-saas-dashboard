'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg border border-border bg-card/50 flex items-center justify-center text-muted-foreground" />
    );
  }

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/50 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      title={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
      aria-label="Tema Değiştir"
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
    </button>
  );
}
