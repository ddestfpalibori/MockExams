import { useState } from 'react';
import { useMyEtablissements } from '@/hooks/queries/useEtablissements';

/**
 * Gère l'établissement actif pour les utilisateurs pouvant être rattachés à plusieurs (N:M).
 *
 * Comportement :
 * - Si 1 seul établissement : activeId se résout automatiquement sur celui-ci
 * - Si 0 ou plusieurs : expose manualId selection + isMulti flag
 *
 * Validation : activeId ne retourne jamais une ID qui n'existe pas dans etablissements.
 * Si manualId pointe vers un établissement supprimé, on fallback au premier établissement.
 */
export function useActiveEtablissement() {
    const { data: etablissements, isLoading } = useMyEtablissements();
    const [manualId, setManualId] = useState<string | null>(null);

    // activeId : manualId (si valide) → premier établissement → undefined
    // Validation inline pour éviter setState dans effect (linter warning)
    const activeId = manualId && etablissements?.some((e) => e.id === manualId)
        ? manualId
        : etablissements?.[0]?.id ?? '';

    return {
        activeId,
        setActiveId: setManualId,
        etablissements: etablissements ?? [],
        isMulti: (etablissements?.length ?? 0) > 1,
        isLoading,
    };
}
