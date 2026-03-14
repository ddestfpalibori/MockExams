import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import type { SexeStats } from '@/services/analyticsService';

interface Props {
    sexe: Partial<SexeStats>;
}

export function SexePanel({ sexe }: Props) {
    const m = sexe['M'];
    const f = sexe['F'];

    if (!m && !f) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">
                Données de genre non disponibles.
            </div>
        );
    }

    const data = [
        ...(m ? [{ name: 'Garçons', taux: m.taux_reussite, fill: '#6366f1', total: m.total, admis: m.admis, moyenne: m.moyenne }] : []),
        ...(f ? [{ name: 'Filles', taux: f.taux_reussite, fill: '#ec4899', total: f.total, admis: f.admis, moyenne: f.moyenne }] : []),
    ];

    const ecart =
        m && f ? Math.abs(m.taux_reussite - f.taux_reussite).toFixed(1) : null;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700">Parité de réussite par genre</h4>
                {ecart !== null && (
                    <p className="text-xs text-gray-400 mt-0.5">Écart M/F : {ecart} pts</p>
                )}
            </div>
            <div className="flex flex-col md:flex-row gap-6 p-5">
                {data.map((d) => (
                    <div key={d.name} className="flex-1 text-center">
                        <p
                            className="text-4xl font-bold mb-1"
                            style={{ color: d.fill }}
                        >
                            {d.taux} %
                        </p>
                        <p className="text-sm font-medium text-gray-700">{d.name}</p>
                        <div className="mt-3 space-y-1 text-xs text-gray-500">
                            <p>
                                <span className="font-medium">{d.total.toLocaleString('fr')}</span> candidats
                            </p>
                            <p>
                                <span className="font-medium text-emerald-600">{d.admis.toLocaleString('fr')}</span> admis
                            </p>
                            <p>
                                Moyenne :{' '}
                                <span className="font-medium">
                                    {d.moyenne != null ? d.moyenne.toFixed(2) : '—'}
                                </span>
                            </p>
                        </div>
                        {/* Mini jauge */}
                        <div className="mt-4 h-36">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="100%"
                                    innerRadius="60%"
                                    outerRadius="100%"
                                    startAngle={180}
                                    endAngle={0}
                                    data={[{ name: d.name, value: d.taux, fill: d.fill }]}
                                >
                                    <RadialBar dataKey="value" background={{ fill: '#f3f4f6' }} cornerRadius={6} />
                                    <Tooltip
                                        formatter={(v: unknown) => [`${v} %`, 'Taux de réussite']}
                                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
