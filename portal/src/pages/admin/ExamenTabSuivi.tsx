/**
 * Onglet Suivi Longitudinal — ExamenDetailPage (Sprint 6C)
 *
 * Affiche la chaîne A→B→C pour chaque candidat hérité de cet examen.
 * KPIs : progression, régression, maintenu, en cours.
 * Table : une ligne par candidat, une colonne par examen de la chaîne.
 */

import { useMemo, useState } from 'react';
import { useSuiviLongitudinal } from '@/hooks/queries/useSuiviLongitudinal';
import { computeKpisSuivi } from '@/services/suiviLongitudinal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/FormField';
import { cn } from '@/lib/utils';
import {
    TrendingUp, TrendingDown, Minus, Clock, Users, AlertCircle,
} from 'lucide-react';
import type { SuiviLongitudinalRow, EtapeLongitudinale, ResultatStatus } from '@/types/domain';

interface Props { examenId: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function moyenneLabel(centimes: number | null) {
    if (centimes === null) return '—';
    return (centimes / 100).toFixed(2);
}

const STATUS_STYLES: Record<ResultatStatus, string> = {
    ADMIS:      'bg-green-100 text-success',
    RATTRAPAGE: 'bg-amber-100 text-amber-700',
    NON_ADMIS:  'bg-red-100 text-danger',
};

function StatusCell({ status, moyenne }: { status: ResultatStatus | null; moyenne: number | null }) {
    if (!status) return <span className="text-slate-300 text-xs">en attente</span>;
    return (
        <div className="flex flex-col items-center gap-0.5">
            <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                STATUS_STYLES[status]
            )}>
                {status === 'ADMIS' ? 'Admis' : status === 'RATTRAPAGE' ? 'Rattrap.' : 'Non adm.'}
            </span>
            <span className="font-mono text-xs text-slate-500">{moyenneLabel(moyenne)}</span>
        </div>
    );
}

function EvolutionIcon({ row }: { row: SuiviLongitudinalRow }) {
    if (row.etapes.length < 2) return null;
    const source = row.etapes[row.etapes.length - 2];
    const cible  = row.etapes[row.etapes.length - 1];
    if (!source.status || !cible.status) return null;

    const echouait = source.status !== 'ADMIS';
    const admisNow = cible.status === 'ADMIS';
    const admisAvant = source.status === 'ADMIS';
    const echoueNow = cible.status !== 'ADMIS';

    if (echouait && admisNow) return <TrendingUp className="h-4 w-4 text-success" />;
    if (admisAvant && echoueNow) return <TrendingDown className="h-4 w-4 text-danger" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ExamenTabSuivi({ examenId }: Props) {
    const { data: rows, isLoading, isError } = useSuiviLongitudinal(examenId);
    const [filtreEtab, setFiltreEtab] = useState('');
    const [filtreSerie, setFiltreSerie] = useState('');

    const kpis = useMemo(() => computeKpisSuivi(rows ?? []), [rows]);

    // Colonnes dynamiques : tous les examens présents dans les chaînes
    const colonnesExamens = useMemo(() => {
        const map = new Map<string, { code: string; annee: number; libelle: string }>();
        for (const row of rows ?? []) {
            for (const etape of row.etapes) {
                if (!map.has(etape.examen_id)) {
                    map.set(etape.examen_id, {
                        code: etape.code, annee: etape.annee, libelle: etape.libelle,
                    });
                }
            }
        }
        // Ordonner par annee puis code
        return Array.from(map.entries())
            .sort(([, a], [, b]) => a.annee - b.annee || a.code.localeCompare(b.code))
            .map(([id, meta]) => ({ examen_id: id, ...meta }));
    }, [rows]);

    // Options de filtres
    const etablissements = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of rows ?? []) m.set(r.etablissement_id, r.etablissement_nom);
        return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [rows]);

    const series = useMemo(() => {
        const codes = [...new Set((rows ?? []).map(r => r.serie_code).filter(Boolean))];
        return (codes as string[]).sort();
    }, [rows]);

    const filtered = useMemo(() =>
        (rows ?? []).filter(r =>
            (!filtreEtab || r.etablissement_id === filtreEtab) &&
            (!filtreSerie || r.serie_code === filtreSerie)
        ), [rows, filtreEtab, filtreSerie]);

    if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

    if (isError) return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="font-medium text-red-700">Impossible de charger le suivi longitudinal</p>
        </div>
    );

    if ((rows ?? []).length === 0) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-14 text-center">
                <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="font-medium text-slate-500">Aucun candidat hérité</p>
                <p className="text-sm text-slate-400 mt-1">
                    Configurez un lien inter-examen et importez les candidats depuis l'onglet "Lien".
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={<Users className="h-4 w-4 text-slate-400" />}
                    label="Candidats hérités" value={kpis.total} />
                <KpiCard icon={<TrendingUp className="h-4 w-4 text-success" />}
                    label="Progression" value={kpis.progression} className="border-green-200 bg-green-50"
                    valueClass="text-success" />
                <KpiCard icon={<TrendingDown className="h-4 w-4 text-danger" />}
                    label="Régression" value={kpis.regression} className="border-red-200 bg-red-50"
                    valueClass="text-danger" />
                <KpiCard icon={<Clock className="h-4 w-4 text-slate-400" />}
                    label="Sans résultat" value={kpis.enCours} />
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 items-center">
                {etablissements.length > 1 && (
                    <Select value={filtreEtab} onChange={e => setFiltreEtab(e.target.value)} className="w-56">
                        <option value="">Tous les établissements</option>
                        {etablissements.map(([id, nom]) => (
                            <option key={id} value={id}>{nom}</option>
                        ))}
                    </Select>
                )}
                {series.length > 0 && (
                    <Select value={filtreSerie} onChange={e => setFiltreSerie(e.target.value)} className="w-32">
                        <option value="">Toutes séries</option>
                        {series.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                )}
                <span className="text-sm text-slate-400 ml-auto">
                    {filtered.length} candidat{filtered.length > 1 ? 's' : ''}
                </span>
            </div>

            {/* Tableau chaîne dynamique */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">
                                Établissement
                            </th>
                            <th className="px-3 py-3 text-left font-medium text-slate-600">Série</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-600">Classe</th>
                            <th className="px-3 py-3 text-center font-medium text-slate-600 whitespace-nowrap">
                                N° Anonyme
                            </th>
                            {/* Une colonne par examen dans la chaîne */}
                            {colonnesExamens.map(col => (
                                <th key={col.examen_id}
                                    className="px-3 py-3 text-center font-medium text-slate-600 whitespace-nowrap min-w-[100px]">
                                    <div className="text-xs font-semibold text-slate-700">{col.code}</div>
                                    <div className="text-xs text-slate-400 font-normal">{col.annee}</div>
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center font-medium text-slate-600">Évol.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(row => (
                            <CandidatRow
                                key={row.candidat_id}
                                row={row}
                                colonnesExamens={colonnesExamens}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({
    icon, label, value, className, valueClass,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    className?: string;
    valueClass?: string;
}) {
    return (
        <div className={cn('rounded-xl border border-slate-200 bg-white p-4 text-center', className)}>
            <div className="flex justify-center mb-1">{icon}</div>
            <p className={cn('text-2xl font-bold text-slate-900', valueClass)}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
    );
}

function CandidatRow({
    row,
    colonnesExamens,
}: {
    row: SuiviLongitudinalRow;
    colonnesExamens: Array<{ examen_id: string; code: string; annee: number }>;
}) {
    // Index des étapes par examen_id pour accès O(1)
    const etapeByExamen = useMemo(() => {
        const m = new Map<string, EtapeLongitudinale>();
        for (const e of row.etapes) m.set(e.examen_id, e);
        return m;
    }, [row.etapes]);

    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={row.etablissement_nom}>
                {row.etablissement_nom}
            </td>
            <td className="px-3 py-3">
                {row.serie_code
                    ? <Badge variant="secondary">{row.serie_code}</Badge>
                    : <span className="text-slate-400">—</span>}
            </td>
            <td className="px-3 py-3 text-slate-500 text-xs">
                {row.classe_libelle ?? <span className="text-slate-400">—</span>}
            </td>
            <td className="px-3 py-3 text-center font-mono text-slate-800">
                {row.numero_anonyme ?? '—'}
            </td>
            {colonnesExamens.map(col => {
                const etape = etapeByExamen.get(col.examen_id);
                return (
                    <td key={col.examen_id} className="px-3 py-3 text-center">
                        {etape
                            ? <StatusCell status={etape.status} moyenne={etape.moyenne_centimes} />
                            : <span className="text-slate-200">—</span>}
                    </td>
                );
            })}
            <td className="px-3 py-3 text-center">
                <div className="flex justify-center"><EvolutionIcon row={row} /></div>
            </td>
        </tr>
    );
}
