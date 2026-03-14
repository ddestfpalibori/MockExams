import { useExamens } from '@/hooks/queries/useExamens';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Plus, Eye, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ExamenRow } from '@/types/domain';

export default function ExamensPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const { data: examens, isLoading } = useExamens();

    // Filtre local pour la liste globale (le nombre d'examens reste faible par rapport aux candidats)
    const filteredExamens = examens?.filter(ex =>
        ex.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.code.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const columns = [
        {
            key: 'code',
            header: 'Code',
            cell: (row: ExamenRow) => <span className="font-mono font-bold">{row.code}</span>
        },
        {
            key: 'libelle',
            header: 'Libellé',
            cell: (row: ExamenRow) => (
                <div className="flex flex-col">
                    <span>{row.libelle}</span>
                    <span className="text-xs text-slate-400 font-mono">{row.annee}</span>
                </div>
            )
        },
        {
            key: 'annee',
            header: 'Session',
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
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(`/admin/examens/${row.id}`)}
                        title="Détails"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {row.status === 'CONFIG' && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/admin/examens/${row.id}/edit`)}
                            title="Modifier"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Examens</h1>
                    <p className="text-secondary">
                        Configurez et suivez le cycle de vie de vos sessions d'examens.
                    </p>
                </div>
                <Button onClick={() => navigate('/admin/examens/nouveau')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvel Examen
                </Button>
            </div>

            <div className="flex items-center py-4">
                <SearchInput
                    placeholder="Filtrer par code ou libellé..."
                    className="max-w-sm"
                    onSearch={setSearchTerm}
                />
            </div>

            <div>
                <DataTable
                    columns={columns}
                    data={filteredExamens}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage="Aucun examen trouvé."
                />
            </div>
        </div>
    );
}
