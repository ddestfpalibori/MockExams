import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCandidats } from '@/hooks/queries/useCandidats';
import { useExamens } from '@/hooks/queries/useExamens';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import type { CandidatRow, ExamenRow } from '@/types/domain';

const PAGE_SIZE = 50;

export default function CandidatsPage() {
    const [searchParams] = useSearchParams();
    const defaultExamenId = searchParams.get('examen') ?? '';

    const [examenId, setExamenId] = useState(defaultExamenId);
    const [search, setSearch] = useState('');

    const { data: examens } = useExamens();

    const {
        data: candidats,
        total,
        page,
        setPage,
        isLoading,
    } = useCandidats({ examenId, pageSize: PAGE_SIZE, search });

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
            cell: (row) => <span className="text-sm text-slate-600">{row.serie_id ?? '—'}</span>,
        },
        {
            key: 'numero_table',
            header: 'Table',
            cell: (row) => <span className="text-sm">{row.numero_table ?? '—'}</span>,
        },
        {
            key: 'salle_id',
            header: 'Salle',
            cell: (row) => <span className="text-sm text-slate-600">{row.salle_id ?? '—'}</span>,
        },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Candidats</h1>
                <p className="text-slate-500">
                    Consultation des candidats inscrits (données non-sensibles uniquement).
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:w-64"
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
                </select>

                <SearchInput
                    placeholder="Filtrer par n° anonyme..."
                    className="max-w-xs"
                    onSearch={(v) => {
                        setSearch(v);
                        setPage(1);
                    }}
                />
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
        </div>
    );
}
