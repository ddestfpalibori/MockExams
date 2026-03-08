import { useState } from 'react';
import { useMyCentres } from '@/hooks/queries/useProfiles';

/**
 * Gère le centre actif pour les utilisateurs pouvant être rattachés à plusieurs centres (N:M).
 * Si un seul centre : activeId se résout automatiquement sur le premier.
 * Si plusieurs : expose setActiveId + isMulti pour afficher un sélecteur.
 */
export function useActiveCentre() {
    const { data: centres, isLoading } = useMyCentres();
    const [manualId, setManualId] = useState<string | null>(null);

    const activeId = manualId ?? centres?.[0]?.id ?? '';

    return {
        activeId,
        setActiveId: setManualId,
        centres: centres ?? [],
        isMulti: (centres?.length ?? 0) > 1,
        isLoading,
    };
}
