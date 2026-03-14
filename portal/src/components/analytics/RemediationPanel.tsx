import type { RemediationSuggestion, RemediationSeverity } from '@/services/analyticsService';

interface Props {
    suggestions: RemediationSuggestion[];
}

const SEVERITY_STYLES: Record<RemediationSeverity, { badge: string; icon: string; border: string }> = {
    critique: {
        badge: 'bg-red-100 text-red-700 border-red-200',
        icon: '🔴',
        border: 'border-l-4 border-red-400',
    },
    attention: {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: '🟡',
        border: 'border-l-4 border-amber-400',
    },
    info: {
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: '🔵',
        border: 'border-l-4 border-blue-300',
    },
};

const SEVERITY_LABELS: Record<RemediationSeverity, string> = {
    critique: 'Critique',
    attention: 'Attention',
    info: 'Info',
};

export function RemediationPanel({ suggestions }: Props) {
    if (suggestions.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-medium text-gray-700">Aucune action corrective prioritaire identifiée.</p>
                <p className="text-xs text-gray-400 mt-1">Les indicateurs de cet examen sont dans les normes attendues.</p>
            </div>
        );
    }

    const critiques = suggestions.filter((s) => s.severity === 'critique');
    const attentions = suggestions.filter((s) => s.severity === 'attention');
    const infos = suggestions.filter((s) => s.severity === 'info');

    return (
        <div className="space-y-4">
            {/* Résumé */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 shadow-sm">
                <div className="text-sm font-medium text-gray-700 self-center mr-2">
                    {suggestions.length} action(s) recommandée(s) :
                </div>
                {critiques.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium border border-red-200">
                        🔴 {critiques.length} critique{critiques.length > 1 ? 's' : ''}
                    </span>
                )}
                {attentions.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
                        🟡 {attentions.length} attention{attentions.length > 1 ? 's' : ''}
                    </span>
                )}
                {infos.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                        🔵 {infos.length} info{infos.length > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Liste des suggestions */}
            <div className="space-y-3">
                {suggestions.map((s) => {
                    const style = SEVERITY_STYLES[s.severity];
                    return (
                        <div
                            key={s.id}
                            className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm ${style.border}`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${style.badge}`}
                                    >
                                        {style.icon} {SEVERITY_LABELS[s.severity]}
                                    </span>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {s.categorie}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0 bg-gray-50 px-2 py-1 rounded">
                                    {s.indicateur}
                                </span>
                            </div>
                            <h5 className="font-semibold text-gray-800 mb-1">{s.titre}</h5>
                            <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
