import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import type { SerieStats } from '@/services/analyticsService';

interface Props {
    series: SerieStats[];
}

export function SeriePanel({ series }: Props) {
    if (series.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">
                Aucune donnée par série.
            </div>
        );
    }

    const data = series.map((s) => ({
        name: s.code,
        libelle: s.libelle,
        admis: s.taux_reussite,
        rattrapage: s.rattrapage > 0 ? ((s.rattrapage / s.total) * 100).toFixed(1) : 0,
        non_admis: s.non_admis > 0 ? ((s.non_admis / s.total) * 100).toFixed(1) : 0,
        moyenne: s.moyenne,
        total: s.total,
    }));

    return (
        <div className="space-y-4">
            {/* Graphique */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Taux de réussite par série</h4>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v: number) => `${v}%`}
                        />
                        <Tooltip
                            formatter={(value: unknown, name: unknown) => {
                                const labels: Record<string, string> = {
                                    admis: 'Admis',
                                    rattrapage: 'Rattrapage',
                                    non_admis: 'Non admis',
                                };
                                const nameStr = String(name);
                                return [`${value} %`, labels[nameStr] ?? nameStr];
                            }}
                            labelFormatter={(label: unknown) => {
                                const s = data.find((d) => d.name === label);
                                return s ? `${s.libelle} (${s.total} candidats)` : String(label);
                            }}
                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="admis" name="Admis" fill="#10b981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="rattrapage" name="Rattrapage" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="non_admis" name="Non admis" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Tableau récapitulatif */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Série</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Admis</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Rattrapage</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Taux</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 hidden md:table-cell">Moy.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {series.map((s) => (
                            <tr key={s.serie_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-gray-800">{s.code}</p>
                                    <p className="text-xs text-gray-400">{s.libelle}</p>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{s.total}</td>
                                <td className="px-4 py-3 text-right text-emerald-700 font-medium">{s.admis}</td>
                                <td className="px-4 py-3 text-right text-amber-600 hidden sm:table-cell">{s.rattrapage}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-800">{s.taux_reussite} %</td>
                                <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                                    {s.moyenne != null ? s.moyenne.toFixed(2) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
