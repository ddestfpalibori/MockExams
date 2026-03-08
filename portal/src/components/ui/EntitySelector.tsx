interface Entity {
    id: string;
    nom: string;
    code: string;
}

interface EntitySelectorProps {
    entities: Entity[];
    activeId: string;
    onSelect: (id: string) => void;
    label: string;
}

/**
 * Sélecteur d'entité active (centre ou établissement).
 * Visible uniquement quand l'utilisateur est rattaché à plusieurs entités.
 */
export function EntitySelector({ entities, activeId, onSelect, label }: EntitySelectorProps) {
    if (entities.length <= 1) return null;

    return (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-sm font-medium text-amber-800">{label} :</span>
            <select
                value={activeId}
                onChange={(e) => onSelect(e.target.value)}
                className="h-8 rounded border border-amber-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
