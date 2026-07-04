import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' && systemDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') setTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const options: { value: Theme; icon: any; label: string }[] = [
    { value: 'light', icon: Sun, label: '라이트' },
    { value: 'dark', icon: Moon, label: '다크' },
    { value: 'system', icon: Monitor, label: '시스템' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg" role="radiogroup" aria-label="테마 선택">
      {options.map(opt => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`p-1.5 rounded-md transition-all duration-200 ${isActive ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            role="radio"
            aria-checked={isActive}
            aria-label={opt.label}
            title={opt.label}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
          </button>
        );
      })}
    </div>
  );
}
