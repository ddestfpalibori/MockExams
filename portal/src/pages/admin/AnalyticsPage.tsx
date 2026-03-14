import { useState, useMemo } from 'react';
import { useAnalytics } from '@/hooks/queries/useAnalytics';
import { useExamens } from '@/hooks/queries/useExamens';
import { Select } from '@/components/ui/FormField';
import { computeRemediations } from '@/services/analyticsService';
import { GlobalKpis } from '@/components/analytics/GlobalKpis';
import { DistributionChart } from '@/components/analytics/DistributionChart';
import { DisciplinePanel } from '@/components/analytics/DisciplinePanel';
import { EtablissementRanking } from '@/components/analytics/EtablissementRanking';
import { SeriePanel } from '@/components/analytics/SeriePanel';
import { SexePanel } from '@/components/analytics/SexePanel';
import { CentrePanel } from '@/components/analytics/CentrePanel';
import { RemediationPanel } from '@/components/analytics/RemediationPanel';

// ── Onglets ───────────────────────────────────────────────────────────────────

type Tab =
    | 'global'
    | 'disciplines'
    | 'etablissements'
    | 'series'
    | 'genre'
    | 'centres'
    | 'remediations';

interface TabDef {
    id: Tab;
    label: string;
}

const TABS: TabDef[] = [
    { id: 'global', label: 'Vue globale' },
    { id: 'disciplines', label: 'Disciplines' },
    { id: 'series', label: 'Séries' },
    { id: 'etablissements', label: 'Établissements' },
    { id: 'centres', label: 'Centres' },
    { id: 'genre', label: 'Genre' },
    { id: 'remediations', label: 'Remédiations' },
];

const STATUTS_ANALYSABLES = ['DELIBERE', 'PUBLIE', 'CLOS', 'CORRECTION_POST_DELIBERATION'];

// ── Composant ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const [selectedExamenId, setSelectedExamenId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<Tab>('global');

    const { data: examens, isLoading: examensLoading } = useExamens();
    const { data, isLoading, error } = useAnalytics(selectedExamenId || null);

    const examensAnalysables = useMemo(
        () => (examens ?? []).filter((e) => STATUTS_ANALYSABLES.includes(e.status)),
        [examens],
    );

    const remediations = useMemo(
        () => (data ? computeRemediations(data) : []),
        [data],
    );

    const critiqueCount = remediations.filter((r) => r.severity === 'critique').length;

    // ── Contournement faux positif TS5.9 + React19 ──────────────────────────
    // L'annotation explicite React.ReactNode sur des variables pré-JSX évite
    // la limite de complexité d'inférence TypeScript sur les enfants JSX.

    const emptyState: React.ReactNode = !selectedExamenId ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-lg font-medium text-gray-700">
                Sélectionnez un examen pour accéder aux analyses
            </p>
            <p className="text-sm text-gray-400 mt-1">
                Seuls les examens délibérés ou publiés sont disponibles.
            </p>
            {examensAnalysables.length === 0 && !examensLoading ? (
                <p className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block">
                    Aucun examen délibéré disponible pour l'instant.
                </p>
            ) : null}
        </div>
    ) : null;

    const loadingState: React.ReactNode = selectedExamenId && isLoading ? (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                    <div className="h-8 bg-gray-100 rounded w-1/2" />
                </div>
            ))}
        </div>
    ) : null;

    const errorState: React.ReactNode = selectedExamenId && error && !isLoading ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">Erreur lors du chargement des analyses.</p>
            <p className="text-red-500 text-sm mt-1">
                {error instanceof Error ? error.message : 'Erreur inconnue'}
            </p>
        </div>
    ) : null;

    const dataContent: React.ReactNode = data && !isLoading ? (
        <>
            {/* Sous-titre examen */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 flex items-center justify-between">
                <div>
                    <p className="font-semibold text-indigo-900">{data.examen_libelle}</p>
                    <p className="text-xs text-indigo-500">Session {data.examen_annee}</p>
                </div>
                <div className="flex gap-3 text-center text-sm">
                    <div>
                        <p className="font-bold text-indigo-800">{data.global.total}</p>
                        <p className="text-xs text-indigo-400">candidats</p>
                    </div>
                    <div className="border-l border-indigo-200 pl-3">
                        <p className="font-bold text-emerald-700">{data.global.taux_reussite} %</p>
                        <p className="text-xs text-indigo-400">réussite</p>
                    </div>
                    {critiqueCount > 0 && (
                        <div className="border-l border-indigo-200 pl-3">
                            <p className="font-bold text-red-600">{critiqueCount}</p>
                            <p className="text-xs text-indigo-400">critique(s)</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Onglets */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1 overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const showBadge = tab.id === 'remediations' && critiqueCount > 0;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
                                    border-b-2 -mb-px
                                    ${isActive
                                        ? 'border-indigo-600 text-indigo-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.label}
                                {showBadge && (
                                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold">
                                        {critiqueCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Contenu onglet */}
            <div className="pb-8">
                {activeTab === 'global' && (
                    <div className="space-y-6">
                        <GlobalKpis stats={data.global} />
                        <DistributionChart distribution={data.distribution} />
                    </div>
                )}

                {activeTab === 'disciplines' && (
                    <DisciplinePanel disciplines={data.par_discipline} />
                )}

                {activeTab === 'series' && (
                    <SeriePanel series={data.par_serie} />
                )}

                {activeTab === 'etablissements' && (
                    <div className="space-y-6">
                        <EtablissementRanking
                            etablissements={data.par_etablissement}
                            globalTaux={data.global.taux_reussite}
                        />
                        {/* Milieux */}
                        {data.par_milieu.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        Analyse par milieu géographique
                                    </h4>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {data.par_milieu.map((m) => {
                                        const labels: Record<string, string> = {
                                            urbain: 'Urbain',
                                            semi_urbain: 'Semi-urbain',
                                            rural: 'Rural',
                                            non_renseigne: 'Non renseigné',
                                        };
                                        const colors: Record<string, string> = {
                                            urbain: 'bg-blue-500',
                                            semi_urbain: 'bg-purple-500',
                                            rural: 'bg-amber-500',
                                            non_renseigne: 'bg-gray-300',
                                        };
                                        return (
                                            <div
                                                key={m.type_milieu}
                                                className="px-5 py-3 flex items-center gap-4"
                                            >
                                                <span className="text-sm font-medium text-gray-700 w-28 shrink-0">
                                                    {labels[m.type_milieu] ?? m.type_milieu}
                                                </span>
                                                <span className="text-xs text-gray-400 w-16 text-right">{m.total} cand.</span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${colors[m.type_milieu] ?? 'bg-gray-400'}`}
                                                        style={{ width: `${m.taux_reussite}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                                                    {m.taux_reussite} %
                                                </span>
                                                <span className="text-xs text-gray-400 w-10 text-right">
                                                    {m.moyenne != null ? m.moyenne.toFixed(1) : '—'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'centres' && (
                    <CentrePanel
                        centres={data.par_centre}
                        globalTaux={data.global.taux_reussite}
                    />
                )}

                {activeTab === 'genre' && (
                    <SexePanel sexe={data.par_sexe} />
                )}

                {activeTab === 'remediations' && (
                    <RemediationPanel suggestions={remediations} />
                )}
            </div>
        </>
    ) : null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* ── En-tête ────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analyses des résultats</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Désagrégation multidimensionnelle — détection des inégalités et remédiations
                    </p>
                </div>

                {/* Sélecteur d'examen */}
                <div className="shrink-0">
                    {examensLoading ? (
                        <div className="h-10 w-64 bg-gray-100 animate-pulse rounded-lg" />
                    ) : (
                        <Select
                            value={selectedExamenId}
                            onChange={(e) => {
                                setSelectedExamenId(e.target.value);
                                setActiveTab('global');
                            }}
                            className="min-w-[260px] md:w-80"
                        >
                            <option value="">— Sélectionner un examen —</option>
                            {examensAnalysables.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.libelle} ({e.annee})
                                </option>
                            ))}
                        </Select>
                    )}
                </div>
            </div>

            {emptyState}
            {loadingState}
            {errorState}
            {dataContent}
        </div>
    );
}
