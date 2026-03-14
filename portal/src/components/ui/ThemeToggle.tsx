import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './Button';

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored !== null) return stored === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDark]);

    const toggleTheme = () => {
        const newDark = !isDark;
        localStorage.setItem('theme', newDark ? 'dark' : 'light');
        setIsDark(newDark);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
            title={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
            className="rounded-full text-secondary hover:text-primary hover:bg-surface-hover"
        >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
    );
}
