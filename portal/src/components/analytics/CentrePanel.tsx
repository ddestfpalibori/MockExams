import type { CentreStats } from '@/services/analyticsService';

interface Props {
    centres: CentreStats[];
    globalTaux: number;
}

export function CentrePanel({ centres, globalTaux }: Props) {
    if (centres.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">
                Aucune donnée par centre.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Performance par centre de composition</h4>
                <span className="text-xs text-gray-400">Référence : {globalTaux} %</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-8">Rg.</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Centre</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Candidats</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden md:table-cell">Moyenne</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 min-w-[140px]">Taux réussite</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {centres.map((c, i) => {
                            const diff = c.taux_reussite - globalTaux;
                            const barColor =
                                c.taux_reussite >= 70
                                    ? 'bg-emerald-500'
                                    : c.taux_reussite >= 50
                                    ? 'bg-blue-500'
                                    : c.taux_reussite >= 30
                                    ? 'bg-amber-400'
                                    : 'bg-red-500';

                            return (
                                <tr key={c.centre_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-center text-xs text-gray-400 font-medium">
                                        {i + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-800">{c.nom}</p>
                                        {c.ville && (
                                            <p className="text-xs text-gray-400">{c.ville}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                                        {c.total}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                                        {c.moyenne != null ? c.moyenne.toFixed(2) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${barColor}`}
                                                    style={{ width: `${c.taux_reussite}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 w-10 text-right">
                                                {c.taux_reussite} %
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
