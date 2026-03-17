/**
 * Suivi des notes — Page Enseignant (Sprint 6B)
 *
 * Visualise la progression de saisie des notes pour une discipline.
 * Disponible en phase CORRECTION et DELIBERATION.
 */

import { useParams, Link } from 'react-router-dom';
import { useSuiviNotes } from '@/hooks/queries/useEnseignant';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
    const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
    return (
        <div className={cn('h-1.5 w-full rounded-full bg-slate-100', className)}>
            <div
                className={cn(
                    'h-full rounded-full transition-all',
                    pct === 100 ? 'bg-success' : pct > 50 ? 'bg-brand-primary' : 'bg-amber-400'
                )}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

const LOT_STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    EN_ATTENTE: {
        label: 'En attente',
        icon: <Clock className="h-3.5 w-3.5" />,
        className: 'text-slate-500 bg-slate-100',
    },
    EN_COURS: {
        label: 'En cours',
        icon: <Clock className="h-3.5 w-3.5" />,
        className: 'text-amber-700 bg-amber-100',
    },
    TERMINE: {
        label: 'Terminé',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        className: 'text-success bg-green-100',
    },
    VERIFIE: {
        label: 'Vérifié',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        className: 'text-brand-primary bg-brand-primary/10',
    },
};

export default function SuiviNotesPage() {
    const { id: examenDisciplineId } = useParams<{ id: string }>();
    const { data: lots, isLoading } = useSuiviNotes(examenDisciplineId ?? '');

    const totaux = (lots ?? []).reduce(
        (acc, lot) => ({
            copies: acc.copies + lot.nb_copies,
            saisies: acc.saisies + lot.nb_saisies,
            abs: acc.abs + lot.nb_abs,
        }),
        { copies: 0, saisies: 0, abs: 0 }
    );

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
                        Suivi des notes
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Progression de la saisie par lot de correction.
                    </p>
                </div>
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                    <p className="text-3xl font-bold text-slate-900">{totaux.copies}</p>
                    <p className="text-sm text-slate-500 mt-1">Copies totales</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                    <p className={cn(
                        'text-3xl font-bold',
                        totaux.saisies === totaux.copies ? 'text-success' : 'text-brand-primary'
                    )}>
                        {totaux.saisies}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Notes saisies</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                    <p className="text-3xl font-bold text-amber-600">{totaux.abs}</p>
                    <p className="text-sm text-slate-500 mt-1">Absents / Abandons</p>
                </div>
            </div>

            {/* Barre de progression globale */}
            {totaux.copies > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Progression globale</span>
                        <span className="text-sm font-bold text-slate-900">
                            {Math.round((totaux.saisies / totaux.copies) * 100)}%
                        </span>
                    </div>
                    <ProgressBar value={totaux.saisies} max={totaux.copies} className="h-3" />
                    <p className="text-xs text-slate-400 mt-2">
                        {totaux.copies - totaux.saisies} copie(s) restante(s)
                    </p>
                </div>
            )}

            {/* Tableau des lots */}
            {(lots ?? []).length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500">Aucun lot généré pour cette discipline.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Lot</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Centre</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Série</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-600">Copies</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-600">Saisies</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-600">ABS</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Progression</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(lots ?? []).map((lot) => {
                                const statusInfo = LOT_STATUS_LABELS[lot.status] ?? {
                                    label: lot.status,
                                    icon: null,
                                    className: 'text-slate-500 bg-slate-100',
                                };
                                const pct = lot.nb_copies === 0
                                    ? 0
                                    : Math.round((lot.nb_saisies / lot.nb_copies) * 100);

                                return (
                                    <tr key={lot.lot_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                                            #{lot.lot_numero}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{lot.centre_nom}</td>
                                        <td className="px-4 py-3">
                                            {lot.serie_code ? (
                                                <Badge variant="secondary">
                                                    {lot.serie_code}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-700">
                                            {lot.nb_copies}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-slate-900">
                                            {lot.nb_saisies}
                                        </td>
                                        <td className="px-4 py-3 text-center text-amber-600">
                                            {lot.nb_abs || '—'}
                                        </td>
                                        <td className="px-4 py-3 min-w-[120px]">
                                            <div className="flex items-center gap-2">
                                                <ProgressBar
                                                    value={lot.nb_saisies}
                                                    max={lot.nb_copies}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs text-slate-500 w-8 text-right">
                                                    {pct}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                                statusInfo.className
                                            )}>
                                                {statusInfo.icon}
                                                {statusInfo.label}
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
