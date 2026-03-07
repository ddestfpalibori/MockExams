import React, { createContext, useEffect, useState } from 'react';

type ThemeConfig = {
    primary?: string;
    secondary?: string;
    subtle?: string;
};

interface ThemeContextType {
    config: ThemeConfig;
    updateTheme: (config: ThemeConfig) => void;
    resetTheme: () => void;
}

const DEFAULT_THEME: ThemeConfig = {
    primary: '#1e40af',   // blue-800
    secondary: '#0f172a', // slate-900 
    subtle: '#f8fafc',    // slate-50
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [config, setConfig] = useState<ThemeConfig>(() => {
        const saved = localStorage.getItem('mockexams_theme');
        return saved ? JSON.parse(saved) : DEFAULT_THEME;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (config.primary) root.style.setProperty('--brand-primary', config.primary);
        if (config.secondary) root.style.setProperty('--brand-secondary', config.secondary);
        if (config.subtle) root.style.setProperty('--brand-subtle', config.subtle);
    }, [config]);

    const updateTheme = (newConfig: ThemeConfig) => {
        const merged = { ...config, ...newConfig };
        setConfig(merged);
        localStorage.setItem('mockexams_theme', JSON.stringify(merged));
    };

    const resetTheme = () => {
        setConfig(DEFAULT_THEME);
        localStorage.removeItem('mockexams_theme');
    };

    return (
        <ThemeContext.Provider value={{ config, updateTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Export du contexte pour le hook séparé
export { ThemeContext };
