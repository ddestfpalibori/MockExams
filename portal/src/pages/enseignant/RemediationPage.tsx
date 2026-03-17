/**
 * Tableau de bord Remédiation — Page Enseignant (Sprint 6B)
 *
 * Liste les candidats en difficulté (NON_ADMIS / RATTRAPAGE) post-délibération.
 * Filtres : statut, série, classe.
 */

import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRemediation } from '@/hooks/queries/useEnseignant';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/FormField';
import { cn } from '@/lib/utils';
import { ArrowLeft, AlertCircle, TrendingDown, Users } from 'lucide-react';
import type { RemediationCandidat } from '@/services/enseignant';

function moyenneLabel(centimes: number | null): string {
    if (centimes === null) return '—';
    return (centimes / 100).toFixed(2);
}

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
    NON_ADMIS: { label: 'Non admis', className: 'text-danger bg-red-100' },
    RATTRAPAGE: { label: 'Rattrapage', className: 'text-amber-700 bg-amber-100' },
};

export default function RemediationPage() {
    const { id: examenId } = useParams<{ id: string }>();
    const { data: candidats, isLoading } = useRemediation(examenId ?? '');

    const [filtreStatut, setFiltreStatut] = useState<'tous' | 'NON_ADMIS' | 'RATTRAPAGE'>('tous');
    const [filtreSerie, setFiltreSerie] = useState('');
    const [filtreClasse, setFiltreClasse] = useState('');

    // Options de filtre dynamiques
    const series = useMemo(() => {
        const codes = [...new Set((candidats ?? []).map((c) => c.serie_code).filter(Boolean))];
        return codes.sort() as string[];
    }, [candidats]);

    const classes = useMemo(() => {
        const libelles = [...new Set((candidats ?? []).map((c) => c.classe_libelle).filter(Boolean))];
        return libelles.sort() as string[];
    }, [candidats]);

    // Candidats filtrés
    const filtered = useMemo(() => {
        return (candidats ?? []).filter((c: RemediationCandidat) => {
            if (filtreStatut !== 'tous' && c.statut !== filtreStatut) return false;
            if (filtreSerie && c.serie_code !== filtreSerie) return false;
            if (filtreClasse && c.classe_libelle !== filtreClasse) return false;
            return true;
        });
    }, [candidats, filtreStatut, filtreSerie, filtreClasse]);

    // Statistiques
    const stats = useMemo(() => {
        const total = (candidats ?? []).length;
        const nonAdmis = (candidats ?? []).filter((c) => c.statut === 'NON_ADMIS').length;
        const rattrapage = (candidats ?? []).filter((c) => c.statut === 'RATTRAPAGE').length;
        return { total, nonAdmis, rattrapage };
    }, [candidats]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            {/* En-tête */}
            <div className="flex items-start gap-4">
                <Link
                    to="/enseignant"
                    className="mt-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Remédiation
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Candidats en difficulté — résultats post-délibération.
                    </p>
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                    <div className="flex justify-center mb-2">
                        <Users className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                    <p className="text-sm text-slate-500 mt-1">En difficulté (total)</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                    <div className="flex justify-center mb-2">
                        <TrendingDown className="h-5 w-5 text-danger" />
                    </div>
                    <p className="text-3xl font-bold text-danger">{stats.nonAdmis}</p>
                    <p className="text-sm text-red-600 mt-1">Non admis</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                    <div className="flex justify-center mb-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold text-amber-700">{stats.rattrapage}</p>
                    <p className="text-sm text-amber-700 mt-1">Rattrapage</p>
                </div>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 items-center">
                <Select
                    value={filtreStatut}
                    onChange={(e) => setFiltreStatut(e.target.value as typeof filtreStatut)}
                    className="w-40"
                >
                    <option value="tous">Tous statuts</option>
                    <option value="NON_ADMIS">Non admis</option>
                    <option value="RATTRAPAGE">Rattrapage</option>
                </Select>

                {series.length > 0 && (
                    <Select
                        value={filtreSerie}
                        onChange={(e) => setFiltreSerie(e.target.value)}
                        className="w-36"
                    >
                        <option value="">Toutes séries</option>
                        {series.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </Select>
                )}

                {classes.length > 0 && (
                    <Select
                        value={filtreClasse}
                        onChange={(e) => setFiltreClasse(e.target.value)}
                        className="w-40"
                    >
                        <option value="">Toutes classes</option>
                        {classes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                )}

                <span className="text-sm text-slate-400 ml-auto">
                    {filtered.length} candidat{filtered.length > 1 ? 's' : ''}
                </span>
            </div>

            {/* Tableau */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500">
                        {(candidats ?? []).length === 0
                            ? 'Aucun candidat en difficulté — les résultats ne sont peut-être pas encore délibérés.'
                            : 'Aucun candidat ne correspond aux filtres.'}
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-left font-medium text-slate-600">N° Anonyme</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Établissement</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Série</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Classe</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-600">Moyenne</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((c: RemediationCandidat) => {
                                const config = STATUT_CONFIG[c.statut] ?? {
                                    label: c.statut,
                                    className: 'text-slate-500 bg-slate-100',
                                };
                                return (
                                    <tr key={c.candidat_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-800">
                                            {c.numero_anonyme ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{c.etablissement_nom}</td>
                                        <td className="px-4 py-3">
                                            {c.serie_code ? (
                                                <Badge variant="secondary">
                                                    {c.serie_code}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {c.classe_libelle ?? <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn(
                                                'font-mono font-semibold',
                                                c.moyenne_centimes !== null && c.moyenne_centimes < 1000
                                                    ? 'text-danger'
                                                    : 'text-amber-600'
                                            )}>
                                                {moyenneLabel(c.moyenne_centimes)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                                config.className
                                            )}>
                                                {config.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
