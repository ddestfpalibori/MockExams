import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchInputProps {
    placeholder?: string;
    onSearch: (value: string) => void;
    debounceMs?: number;
    className?: string;
    defaultValue?: string;
}

export function SearchInput({
    placeholder = 'Rechercher…',
    onSearch,
    debounceMs = 300,
    className,
    defaultValue = '',
}: SearchInputProps) {
    const [value, setValue] = useState(defaultValue);
    const debouncedValue = useDebounce(value, debounceMs);

    useEffect(() => {
        onSearch(debouncedValue);
    }, [debouncedValue, onSearch]);

    return (
        <div className={cn('relative flex items-center', className)}>
            <Search
                size={16}
                className="absolute left-3 text-muted pointer-events-none"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    'w-full h-9 pl-9 pr-8 text-sm rounded-md border border-border bg-surface',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                    'placeholder:text-muted transition-colors'
                )}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => setValue('')}
                    className="absolute right-2 text-muted hover:text-primary transition-colors"
                    aria-label="Effacer la recherche"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
