'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', dark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem('lumenfi.theme') as Theme | null) ?? 'system';
    setTheme(stored);
    applyTheme(stored);
    setMounted(true);

    if (stored === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => applyTheme('system');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
  }, []);

  function set(t: Theme) {
    setTheme(t);
    localStorage.setItem('lumenfi.theme', t);
    applyTheme(t);
  }

  if (!mounted) return null;

  const opts: { v: Theme; icon: typeof Sun; label: string }[] = [
    { v: 'light', icon: Sun, label: 'Light' },
    { v: 'dark', icon: Moon, label: 'Dark' },
    { v: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = theme === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => set(o.v)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={o.label}
            title={o.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

// Inline script that sets theme class BEFORE hydration to avoid flash
export function ThemeScript() {
  const code = `
(function(){try{
  var t = localStorage.getItem('lumenfi.theme') || 'system';
  var dark = t==='dark' || (t==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
