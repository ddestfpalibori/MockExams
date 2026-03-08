import { useState } from 'react';
import { useMyEtablissements } from '@/hooks/queries/useEtablissements';

/**
 * Gère l'établissement actif pour les utilisateurs pouvant être rattachés à plusieurs (N:M).
 * Si un seul établissement : activeId se résout automatiquement sur le premier.
 * Si plusieurs : expose setActiveId + isMulti pour afficher un sélecteur.
 */
export function useActiveEtablissement() {
    const { data: etablissements, isLoading } = useMyEtablissements();
    const [manualId, setManualId] = useState<string | null>(null);

    const activeId = manualId ?? etablissements?.[0]?.id ?? '';

    return {
        activeId,
        setActiveId: setManualId,
        etablissements: etablissements ?? [],
        isMulti: (etablissements?.length ?? 0) > 1,
        isLoading,
    };
}
