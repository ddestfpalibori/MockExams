import { useExamenStats, useExamens } from '@/hooks/queries/useExamens';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ClipboardList, Users, School, LayoutDashboard, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ExamenRow } from '@/types/domain';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { data: stats, isLoading: statsLoading } = useExamenStats();
    const { data: examens, isLoading: examensLoading } = useExamens();

    const columns = [
        {
            key: 'code',
            header: 'Code',
            cell: (row: ExamenRow) => <span className="font-medium">{row.code}</span>
        },
        {
            key: 'libelle',
            header: 'Libellé',
            cell: (row: ExamenRow) => row.libelle
        },
        {
            key: 'annee',
            header: 'Année',
            cell: (row: ExamenRow) => row.annee
        },
        {
            key: 'status',
            header: 'Statut',
            cell: (row: ExamenRow) => <StatusBadge status={row.status} />
        },
        {
            key: 'actions',
            header: '',
            cell: (row: ExamenRow) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/examens/${row.id}`)}
                >
                    Voir
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de Bord Admin</h1>
                    <p className="text-slate-500">
                        Bienvenue ! Voici un aperçu global de la session d'examens.
                    </p>
                </div>
                <Button onClick={() => navigate('/admin/examens/nouveau')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvel Examen
                </Button>
            </div>

            {/* KPIs */}
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
                    icon={<LayoutDashboard className="h-4 w-4" />}
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

            {/* Recent Examens */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Examens Récents</h2>
                    <Button variant="ghost" onClick={() => navigate('/admin/examens')}>
                        Voir tout
                    </Button>
                </div>
                <DataTable
                    columns={columns}
                    data={examens?.slice(0, 5) || []}
                    rowKey={(row) => row.id}
                    isLoading={examensLoading}
                    emptyMessage="Aucun examen configuré pour le moment."
                />
            </div>
        </div>
    );
}
