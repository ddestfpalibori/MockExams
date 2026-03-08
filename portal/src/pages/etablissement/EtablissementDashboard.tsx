import { useNavigate } from 'react-router-dom';
import { useExamens } from '@/hooks/queries/useExamens';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { useEtablissementStats } from '@/hooks/queries/useEtablissements';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Users, ClipboardList, Upload, Calendar } from 'lucide-react';
import type { ExamenRow } from '@/types/domain';

export default function EtablissementDashboard() {
    const navigate = useNavigate();
    const { activeId: etablissementId, etablissements, isMulti, setActiveId } = useActiveEtablissement();
    const activeEtablissement = etablissements.find((e) => e.id === etablissementId) ?? etablissements[0];

    const { data: stats, isLoading: statsLoading } = useEtablissementStats(etablissementId);
    const { data: examens, isLoading: examensLoading } = useExamens();

    const examensActifs = examens?.filter(
        (e) => e.status !== 'CLOS' && e.status !== 'CONFIG'
    ) ?? [];

    const lastImportDate = stats?.derniere_import_at
        ? new Date(stats.derniere_import_at).toLocaleDateString('fr-FR')
        : '—';

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
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/etablissement/candidats?examen=${row.id}`)}
                    >
                        Candidats
                    </Button>
                    {row.status === 'INSCRIPTIONS' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/etablissement/import')}
                        >
                            <Upload className="mr-1 h-3 w-3" />
                            Importer
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Tableau de Bord Établissement
                    </h1>
                    <p className="text-slate-500">
                        {activeEtablissement
                            ? `${activeEtablissement.nom} (${activeEtablissement.code})`
                            : 'Chargement...'}
                    </p>
                </div>
                <Button onClick={() => navigate('/etablissement/import')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer des candidats
                </Button>
            </div>

            {isMulti && (
                <EntitySelector
                    entities={etablissements}
                    activeId={etablissementId}
                    onSelect={setActiveId}
                    label="Établissement actif"
                />
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Candidats inscrits"
                    value={stats?.nb_candidats ?? 0}
                    icon={<Users className="h-4 w-4" />}
                    variant="success"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Examens actifs"
                    value={examensActifs.length}
                    icon={<ClipboardList className="h-4 w-4" />}
                    variant="warning"
                    isLoading={examensLoading}
                />
                <StatCard
                    title="Dernier import"
                    value={lastImportDate}
                    icon={<Calendar className="h-4 w-4" />}
                    isLoading={statsLoading}
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">Examens en cours</h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/etablissement/candidats')}>
                        Voir les candidats
                    </Button>
                </div>
                <DataTable
                    columns={columns}
                    data={examensActifs.slice(0, 5)}
                    rowKey={(row) => row.id}
                    isLoading={examensLoading}
                    emptyMessage="Aucun examen actif pour votre établissement."
                />
            </div>
        </div>
    );
}
