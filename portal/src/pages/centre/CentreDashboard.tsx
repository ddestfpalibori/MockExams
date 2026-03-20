import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useExamens } from '@/hooks/queries/useExamens';
import { useActiveCentre } from '@/hooks/useActiveCentre';
import { useCentreStats } from '@/hooks/queries/useLots';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { DoorOpen, Users, ClipboardList, FileCheck, Upload } from 'lucide-react';
import type { ExamenRow } from '@/types/domain';

export default function CentreDashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { activeId: centreId, centres, isMulti, setActiveId } = useActiveCentre();
    const activeCentre = centres.find((c) => c.id === centreId) ?? centres[0];

    // Invalider les stats quand le centre change (force un refetch)
    useEffect(() => {
        if (centreId) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.centres.stats(centreId) });
        }
    }, [centreId, queryClient]);

    const { data: stats, isLoading: statsLoading } = useCentreStats(centreId);
    const { data: examens, isLoading: examensLoading } = useExamens();

    const examensActifs = examens?.filter(
        (e) => e.status !== 'CLOS' && e.status !== 'CONFIG'
    ) ?? [];

    const columns: Column<ExamenRow>[] = [
        {
            key: 'code',
            header: 'Code',
            cell: (row) => <span className="font-mono font-bold text-sm">{row.code}</span>,
        },
        {
            key: 'libelle',
            header: 'Libellé / Année',
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
            header: 'Actions disponibles',
            cell: (row) => (
                <div className="flex flex-wrap items-center gap-1">
                            {row.status === 'COMPOSITION' && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate('/centre/affectation')}
                                    >
                                        Affecter
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate('/centre/reprise-preparation')}
                                    >
                                        Reprise centre
                                    </Button>
                                </>
                            )}
                    {(row.status === 'COMPOSITION' || row.status === 'INSCRIPTIONS') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/centre/anonymats')}
                        >
                            Anonymats
                        </Button>
                    )}
                    {row.status === 'CORRECTION' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/centre/lots')}
                            >
                                Lots
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/centre/saisie')}
                            >
                                Saisie notes
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Tableau de Bord Centre
                    </h1>
                    <p className="text-secondary">
                        {activeCentre
                            ? `${activeCentre.nom} (${activeCentre.code})`
                            : 'Chargement...'}
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/centre/salles')}>
                    <DoorOpen className="mr-2 h-4 w-4" />
                    Gérer les salles
                </Button>
            </div>

            {isMulti && (
                <EntitySelector
                    entities={centres}
                    activeId={centreId}
                    onSelect={setActiveId}
                    label="Centre actif"
                />
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Examens actifs"
                    value={examensActifs.length}
                    icon={<ClipboardList className="h-4 w-4" />}
                    variant="warning"
                    isLoading={examensLoading}
                />
                <StatCard
                    title="Salles configurées"
                    value={stats?.nb_salles ?? 0}
                    icon={<DoorOpen className="h-4 w-4" />}
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Candidats affectés"
                    value={stats?.nb_candidats ?? 0}
                    icon={<Users className="h-4 w-4" />}
                    variant="success"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Lots de correction"
                    value="—"
                    icon={<FileCheck className="h-4 w-4" />}
                    isLoading={false}
                />
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Examens en cours</h2>
                <DataTable
                    columns={columns}
                    data={examensActifs}
                    rowKey={(row) => row.id}
                    isLoading={examensLoading}
                    emptyMessage="Aucun examen actif pour votre centre."
                />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {[
                    { label: 'Salles', path: '/centre/salles', icon: DoorOpen },
                    { label: 'Affectation', path: '/centre/affectation', icon: Users },
                    { label: 'Reprise centre', path: '/centre/reprise-preparation', icon: Upload },
                    { label: 'Anonymats', path: '/centre/anonymats', icon: FileCheck },
                    { label: 'Lots', path: '/centre/lots', icon: ClipboardList },
                ].map(({ label, path, icon: Icon }) => (
                    <button
                        key={path}
                        onClick={() => navigate(path)}
                        className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
                    >
                        <Icon className="h-6 w-6 text-brand-primary" />
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
