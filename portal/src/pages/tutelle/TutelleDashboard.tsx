import { useNavigate } from 'react-router-dom';
import { useExamens, useExamenStats } from '@/hooks/queries/useExamens';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ClipboardList, Users, School, BarChart2, TrendingUp, Shield } from 'lucide-react';
import type { ExamenRow } from '@/types/domain';

export default function TutelleDashboard() {
    const navigate = useNavigate();
    const { data: stats, isLoading: statsLoading } = useExamenStats();
    const { data: examens, isLoading: examensLoading } = useExamens();

    const columns: Column<ExamenRow>[] = [
        {
            key: 'code',
            header: 'Code',
            cell: (row) => <span className="font-mono font-bold text-sm">{row.code}</span>,
        },
        {
            key: 'libelle',
            header: 'Libellé',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.libelle}</span>
                    <span className="text-xs text-slate-400">{row.annee}</span>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Statut',
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            header: '',
            cell: (row) =>
                row.status === 'PUBLIE' || row.status === 'DELIBERE' ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/tutelle/resultats?examen=${row.id}`)}
                    >
                        <BarChart2 className="mr-1 h-3 w-3" />
                        Résultats
                    </Button>
                ) : null,
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Tableau de Bord Tutelle
                </h1>
                <p className="text-secondary">
                    Suivi global de toutes les sessions d'examens (lecture seule).
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Examens"
                    value={stats?.total_examens ?? 0}
                    icon={<ClipboardList className="h-4 w-4" />}
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Examens Actifs"
                    value={stats?.examens_actifs ?? 0}
                    icon={<BarChart2 className="h-4 w-4" />}
                    variant="warning"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Centres"
                    value={stats?.total_centres ?? 0}
                    icon={<School className="h-4 w-4" />}
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Candidats"
                    value={stats?.total_candidats ?? 0}
                    icon={<Users className="h-4 w-4" />}
                    variant="success"
                    isLoading={statsLoading}
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Tous les examens</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/tutelle/suivi-longitudinal')}
                        >
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Suivi longitudinal
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/tutelle/audit-log')}
                        >
                            <Shield className="mr-1 h-3 w-3" />
                            Journal d'audit
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/tutelle/resultats')}
                        >
                            Voir les résultats
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={examens ?? []}
                    rowKey={(row) => row.id}
                    isLoading={examensLoading}
                    emptyMessage="Aucun examen disponible."
                />
            </div>
        </div>
    );
}
