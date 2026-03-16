import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCandidats } from '@/hooks/queries/useCandidats';
import { useExamens } from '@/hooks/queries/useExamens';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/FormField';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { ReleveNotesModal } from '@/components/releves/ReleveNotesModal';
import { useAuth } from '@/hooks/useAuth';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { FileText } from 'lucide-react';
import type { CandidatRow, ExamenRow } from '@/types/domain';

const PAGE_SIZE = 50;

const STATUTS_RELEVES: ExamenRow['status'][] = ['DELIBERATION', 'DELIBERE', 'PUBLIE', 'CLOS'];

export default function CandidatsPage() {
    const [searchParams] = useSearchParams();
    const defaultExamenId = searchParams.get('examen') ?? '';

    const [examenId, setExamenId] = useState(defaultExamenId);
    const [search, setSearch] = useState('');
    const [releveOpen, setReleveOpen] = useState(false);

    const { role } = useAuth();
    const { activeId: etablissementId, etablissements } = useActiveEtablissement();

    const { data: examens } = useExamens();

    const {
        data: candidats,
        total,
        page,
        setPage,
        isLoading,
    } = useCandidats({ examenId, pageSize: PAGE_SIZE, search });

    const examenSelectionne = (examens ?? []).find((ex: ExamenRow) => ex.id === examenId);
    const peutVoirReleves = examenSelectionne ? STATUTS_RELEVES.includes(examenSelectionne.status) : false;

    const columns: Column<CandidatRow>[] = [
        {
            key: 'numero_anonyme',
            header: 'N° Anonyme',
            cell: (row) => (
                <span className="font-mono font-semibold text-brand-primary">
                    {row.numero_anonyme ?? '—'}
                </span>
            ),
        },
        {
            key: 'serie_id',
            header: 'Série',
            cell: (row) => <span className="text-sm text-secondary">{row.serie_id ?? '—'}</span>,
        },
        {
            key: 'numero_table',
            header: 'Table',
            cell: (row) => (
                <span className="text-sm font-medium">
                    {row.numero_table_formate || row.numero_table || '—'}
                </span>
            ),
        },
        {
            key: 'salle_id',
            header: 'Salle',
            cell: (row) => <span className="text-sm text-secondary">{row.salle_id ?? '—'}</span>,
        },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Candidats</h1>
                <p className="text-secondary">
                    Consultation des candidats inscrits (données non-sensibles uniquement).
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                    className="sm:w-64"
                    value={examenId}
                    onChange={(e) => {
                        setExamenId(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Sélectionner un examen...</option>
                    {(examens ?? []).map((ex: ExamenRow) => (
                        <option key={ex.id} value={ex.id}>
                            {ex.code} — {ex.libelle} ({ex.annee})
                        </option>
                    ))}
                </Select>

                <SearchInput
                    placeholder="Filtrer par n° anonyme..."
                    className="max-w-xs"
                    onSearch={(v) => {
                        setSearch(v);
                        setPage(1);
                    }}
                />

                {peutVoirReleves && etablissementId && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReleveOpen(true)}
                        className="flex items-center gap-1.5"
                    >
                        <FileText className="h-4 w-4" />
                        Relevés de notes
                    </Button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={candidats}
                rowKey={(row) => row.id}
                isLoading={isLoading}
                emptyMessage={
                    examenId
                        ? 'Aucun candidat trouvé.'
                        : 'Sélectionnez un examen pour afficher les candidats.'
                }
            />

            {total > PAGE_SIZE && (
                <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onPageChange={setPage}
                />
            )}

            {examenSelectionne && etablissementId && role && (
                <ReleveNotesModal
                    open={releveOpen}
                    onOpenChange={setReleveOpen}
                    examenId={examenSelectionne.id}
                    examenLibelle={examenSelectionne.libelle}
                    examenAnnee={examenSelectionne.annee}
                    userRole={role}
                    etablissements={etablissements}
                    defaultEtablissementId={etablissementId}
                />
            )}
        </div>
    );
}
