import type { CentreRow, EtablissementRow } from '@/types/domain';

type Entity = CentreRow | EtablissementRow;

interface EntitySelectorProps {
    entities: Entity[];
    activeId: string;
    onSelect: (id: string) => void;
    label: string;
}

/**
 * Sélecteur d'entité active (centre ou établissement).
 * Visible uniquement quand l'utilisateur est rattaché à plusieurs entités.
 *
 * Ne rend rien si 0 ou 1 seule entité (selector inutile si choix unique).
 */
export function EntitySelector({ entities, activeId, onSelect, label }: EntitySelectorProps) {
    if (entities.length <= 1) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-sm font-medium text-amber-800 flex-shrink-0">{label} :</span>
            <select
                value={activeId}
                onChange={(e) => onSelect(e.target.value)}
                className="h-8 min-w-0 max-w-full flex-1 rounded border border-amber-300 bg-white pl-2 pr-8 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
                {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                        {e.nom} ({e.code})
                    </option>
                ))}
            </select>
        </div>
    );
}
