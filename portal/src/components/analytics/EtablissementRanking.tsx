import type { EtablissementStats } from '@/services/analyticsService';

interface Props {
    etablissements: EtablissementStats[];
    globalTaux: number;
}

const MILIEU_LABELS: Record<string, string> = {
    urbain: 'Urbain',
    semi_urbain: 'Semi-urbain',
    rural: 'Rural',
};

const MILIEU_COLORS: Record<string, string> = {
    urbain: 'bg-blue-100 text-blue-700',
    semi_urbain: 'bg-purple-100 text-purple-700',
    rural: 'bg-amber-100 text-amber-700',
};

export function EtablissementRanking({ etablissements, globalTaux }: Props) {
    if (etablissements.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">
                Aucun établissement.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">
                    Classement des établissements
                </h4>
                <span className="text-xs text-gray-400">Référence nationale : {globalTaux} %</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-8">Rg.</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Établissement</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Candidats</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Admis</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden md:table-cell">Moyenne</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 min-w-[140px]">Taux réussite</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {etablissements.map((e, i) => {
                            const diff = e.taux_reussite - globalTaux;
                            const barColor =
                                e.taux_reussite >= 70
                                    ? 'bg-emerald-500'
                                    : e.taux_reussite >= 50
                                    ? 'bg-blue-500'
                                    : e.taux_reussite >= 30
                                    ? 'bg-amber-400'
                                    : 'bg-red-500';

                            return (
                                <tr key={e.etablissement_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                                                i === 0
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : i === 1
                                                    ? 'bg-gray-200 text-gray-600'
                                                    : i === 2
                                                    ? 'bg-orange-100 text-orange-600'
                                                    : 'bg-gray-50 text-gray-400'
                                            }`}
                                        >
                                            {i + 1}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-800">{e.nom}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {e.ville && (
                                                <span className="text-xs text-gray-400">{e.ville}</span>
                                            )}
                                            {e.type_milieu && (
                                                <span
                                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                                        MILIEU_COLORS[e.type_milieu] ?? 'bg-gray-100 text-gray-500'
                                                    }`}
                                                >
                                                    {MILIEU_LABELS[e.type_milieu] ?? e.type_milieu}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                                        {e.total}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                                        {e.admis}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                                        {e.moyenne != null ? e.moyenne.toFixed(2) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${barColor}`}
                                                    style={{ width: `${e.taux_reussite}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 w-10 text-right">
                                                {e.taux_reussite} %
                                            </span>
                                            <span
                                                className={`text-xs w-12 text-right ${
                                                    diff >= 0 ? 'text-emerald-600' : 'text-red-500'
                                                }`}
                                            >
                                                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
