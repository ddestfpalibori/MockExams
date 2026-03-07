import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitaire pour fusionner les classes Tailwind proprement (DRY)
 * Combine clsx pour la logique conditionnelle et twMerge pour gérer les conflits CSS.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
