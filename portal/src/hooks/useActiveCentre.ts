import { useState } from 'react';
import { useMyCentres } from '@/hooks/queries/useProfiles';

/**
 * Gère le centre actif pour les utilisateurs pouvant être rattachés à plusieurs centres (N:M).
 *
 * Comportement :
 * - Si 1 seul centre : activeId se résout automatiquement sur celui-ci
 * - Si 0 ou plusieurs : expose manualId selection + isMulti flag
 *
 * Validation : activeId ne retourne jamais une ID qui n'existe pas dans centres.
 * Si manualId pointe vers un centre supprimé, on fallback au premier centre.
 */
export function useActiveCentre() {
    const { data: centres, isLoading } = useMyCentres();
    const [manualId, setManualId] = useState<string | null>(null);

    // activeId : manualId (si valide) → premier centre → undefined
    // Validation inline pour éviter setState dans effect (linter warning)
    const activeId = manualId && centres?.some((c) => c.id === manualId)
        ? manualId
        : centres?.[0]?.id ?? '';

    return {
        activeId,
        setActiveId: setManualId,
        centres: centres ?? [],
        isMulti: (centres?.length ?? 0) > 1,
        isLoading,
    };
}
