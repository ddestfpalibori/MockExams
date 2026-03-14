import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import type { DistributionBucket } from '@/services/analyticsService';

interface Props {
    distribution: DistributionBucket[];
}

export function DistributionChart({ distribution }: Props) {
    // 21 entrées : tranches 0–1, 1–2, ..., 19–20, plus le bucket 20/20 exact
    // bucket_centimes = i * 100 (0..2000 inclus)
    const data = Array.from({ length: 21 }, (_, i) => {
        const bucket_centimes = i * 100;
        const found = distribution.find((b) => b.bucket_centimes === bucket_centimes);
        return {
            label: i < 20 ? `${i}–${i + 1}` : '20',
            note: i,
            count: found?.count ?? 0,
        };
    });

    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
                Distribution des moyennes (candidats par tranche de 1 point)
            </h4>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, maxCount]}
                    />
                    <Tooltip
                        formatter={(value: unknown) => [`${value} candidat(s)`, 'Effectif']}
                        labelFormatter={(label: unknown) => `Tranche ${label}/20`}
                        contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            fontSize: '12px',
                        }}
                    />
                    {/* Ligne de passage à 10 */}
                    <ReferenceLine
                        x="10–11"
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{ value: 'Seuil', position: 'top', fontSize: 10, fill: '#10b981' }}
                    />
                    <Bar
                        dataKey="count"
                        radius={[3, 3, 0, 0]}
                        fill="#6366f1"
                        // Colorer en rouge les barres < 10
                        label={false}
                    />
                </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 text-center mt-1">
                Moyenne finale par candidat (phase 2 si rattrapage effectué)
            </p>
        </div>
    );
}
