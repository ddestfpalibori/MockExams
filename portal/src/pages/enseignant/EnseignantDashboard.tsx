/**
 * Tableau de bord Enseignant — Sprint 6B
 *
 * Vue d'ensemble des disciplines affectées, groupées par examen.
 * Accès rapide au suivi des notes et à la remédiation.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMyDisciplines } from '@/hooks/queries/useEnseignant';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { BookOpen, BarChart2, GraduationCap, ChevronRight } from 'lucide-react';
import type { UserDisciplineDetail } from '@/types/domain';

// Phases où la remédiation est pertinente (post-délibération)
const PHASES_REMEDIATION = new Set(['DELIBERE', 'CORRECTION_POST_DELIBERATION', 'PUBLIE', 'CLOS']);
// Phases où le suivi des notes est pertinent
const PHASES_SUIVI = new Set(['CORRECTION', 'DELIBERATION']);

export default function EnseignantDashboard() {
    const { data: disciplines, isLoading } = useMyDisciplines();

    // Grouper par examen
    const byExamen = useMemo(() => {
        const map = new Map<string, {
            examenId: string;
            examenCode: string;
            examenLibelle: string;
            examenAnnee: number;
            examenStatus: string;
            disciplines: UserDisciplineDetail[];
        }>();

        for (const ud of disciplines ?? []) {
            const raw = ud as unknown as Record<string, unknown>;
            const ed = raw.examen_discipline as Record<string, unknown>;
            const examen = ed?.examen as Record<string, unknown>;

            if (!examen) continue;
            const examenId = examen.id as string;

            if (!map.has(examenId)) {
                map.set(examenId, {
                    examenId,
                    examenCode: examen.code as string,
                    examenLibelle: examen.libelle as string,
                    examenAnnee: examen.annee as number,
                    examenStatus: examen.status as string,
                    disciplines: [],
                });
            }
            map.get(examenId)!.disciplines.push(ud);
        }

        return Array.from(map.values());
    }, [disciplines]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Tableau de bord
                </h1>
                <p className="text-slate-500 mt-1">
                    Vos disciplines affectées par examen.
                </p>
            </div>

            {byExamen.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <GraduationCap className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Aucune discipline affectée</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Contactez l'administrateur pour être affecté à une discipline.
                    </p>
                </div>
            )}

            <div className="space-y-6">
                {byExamen.map((group) => {
                    const canSuivi = PHASES_SUIVI.has(group.examenStatus);
                    const canRemediation = PHASES_REMEDIATION.has(group.examenStatus);

                    return (
                        <div
                            key={group.examenId}
                            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                        >
                            {/* En-tête examen */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900">
                                                {group.examenCode}
                                            </span>
                                            <span className="text-slate-400">—</span>
                                            <span className="text-slate-700">{group.examenLibelle}</span>
                                            <span className="text-sm text-slate-400">({group.examenAnnee})</span>
                                        </div>
                                        <div className="mt-1">
                                            <StatusBadge status={group.examenStatus as never} />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions examen */}
                                <div className="flex items-center gap-2">
                                    {canRemediation && (
                                        <Link
                                            to={`/enseignant/remediation/${group.examenId}`}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <BarChart2 className="h-3.5 w-3.5" />
                                            Remédiation
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Disciplines */}
                            <div className="divide-y divide-slate-50">
                                {group.disciplines.map((ud) => {
                                    const raw = ud as unknown as Record<string, unknown>;
                                    const ed = raw.examen_discipline as Record<string, unknown>;
                                    const discipline = ed?.discipline as Record<string, unknown>;
                                    const classe = raw.classe as Record<string, unknown> | null;
                                    const edId = ed?.id as string;

                                    return (
                                        <div
                                            key={ud.id}
                                            className="flex items-center justify-between px-5 py-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                                                <div>
                                                    <span className="text-sm font-medium text-slate-800">
                                                        {discipline?.libelle as string}
                                                    </span>
                                                    {classe && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="ml-2"
                                                        >
                                                            {classe.libelle as string}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {canSuivi && (
                                                <Link
                                                    to={`/enseignant/suivi/${edId}`}
                                                    className={cn(
                                                        'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                                        'text-brand-primary hover:bg-brand-primary/5 border border-brand-primary/20'
                                                    )}
                                                >
                                                    Suivi des notes
                                                    <ChevronRight className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
