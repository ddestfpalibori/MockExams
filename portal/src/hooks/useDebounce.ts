import { useState, useEffect } from 'react';

/**
 * Retarde la mise à jour d'une valeur selon un délai donné.
 * Utile pour éviter des appels API à chaque frappe clavier.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
