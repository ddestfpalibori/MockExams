import type { GlobalStats } from '@/services/analyticsService';

interface Props {
    stats: GlobalStats;
}

function KpiCard({
    label,
    value,
    sub,
    color,
}: {
    label: string;
    value: string;
    sub?: string;
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

export function GlobalKpis({ stats }: Props) {
    const fmt = (v: number | null) => (v == null ? '—' : v.toFixed(2));

    return (
        <div className="space-y-4">
            {/* KPIs principaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                    label="Total candidats"
                    value={stats.total.toLocaleString('fr')}
                    color="text-gray-800"
                />
                <KpiCard
                    label="Admis"
                    value={stats.admis.toLocaleString('fr')}
                    sub={`${stats.taux_reussite} % de réussite`}
                    color="text-emerald-600"
                />
                <KpiCard
                    label="Rattrapage"
                    value={stats.rattrapage_initial.toLocaleString('fr')}
                    sub={`${stats.taux_rattrapage} % du total`}
                    color="text-amber-600"
                />
                <KpiCard
                    label="Non admis"
                    value={stats.non_admis.toLocaleString('fr')}
                    sub={`${stats.total > 0 ? (stats.non_admis / stats.total * 100).toFixed(1) : 0} % du total`}
                    color="text-red-600"
                />
            </div>

            {/* Stats statistiques */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Statistiques des moyennes
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                        <p className="text-lg font-bold text-gray-800">{fmt(stats.moyenne)}</p>
                        <p className="text-xs text-gray-400">Moyenne</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-800">{fmt(stats.mediane)}</p>
                        <p className="text-xs text-gray-400">Médiane</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-800">{fmt(stats.ecart_type)}</p>
                        <p className="text-xs text-gray-400">Écart-type</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-800">{fmt(stats.note_min)}</p>
                        <p className="text-xs text-gray-400">Note min</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-800">{fmt(stats.note_max)}</p>
                        <p className="text-xs text-gray-400">Note max</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
