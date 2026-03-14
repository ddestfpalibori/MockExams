import type { DisciplineStats } from '@/services/analyticsService';

interface Props {
    disciplines: DisciplineStats[];
}

function TauxBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
            <span className="text-xs text-gray-600 w-10 text-right">{value} %</span>
        </div>
    );
}

export function DisciplinePanel({ disciplines }: Props) {
    if (disciplines.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">
                Aucune donnée de discipline disponible.
            </div>
        );
    }

    // Triées par taux_echec DESC (déjà fait par la fonction PG, mais on s'assure)
    const sorted = [...disciplines].sort((a, b) => b.taux_echec - a.taux_echec);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700">
                    Performance par discipline (triée par taux d'échec)
                </h4>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-6">#</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Discipline</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden md:table-cell">Coef.</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Moyenne</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Absents</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 min-w-[160px]">Taux d'échec</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sorted.map((d, i) => {
                            const color =
                                d.taux_echec >= 60
                                    ? 'bg-red-500'
                                    : d.taux_echec >= 40
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500';
                            return (
                                <tr key={d.discipline_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-800">{d.libelle}</p>
                                        <p className="text-xs text-gray-400">{d.code}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                                        {d.coefficient}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                                        {d.moyenne != null ? d.moyenne.toFixed(2) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                                        {d.nb_absents}
                                    </td>
                                    <td className="px-4 py-3">
                                        <TauxBar value={d.taux_echec} color={color} />
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
