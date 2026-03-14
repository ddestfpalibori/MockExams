import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useExamens } from '@/hooks/queries/useExamens';
import { useResultats } from '@/hooks/queries/useResultats';
import { useAuth } from '@/hooks/useAuth';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { ResultatStatusBadge } from '@/components/ui/StatusBadge';
import { ExportModal } from '@/components/ExportModal';
import { Download } from 'lucide-react';
import type { ExamenRow, ResultatStatus, UserRole } from '@/types/domain';
import type { ResultatRow } from '@/services/resultats';

const PAGE_SIZE = 50;

const STATUS_OPTIONS: { value: ResultatStatus | ''; label: string }[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'ADMIS', label: 'Admis' },
    { value: 'RATTRAPAGE', label: 'Rattrapage' },
    { value: 'NON_ADMIS', label: 'Non admis' },
];

export default function ResultatsPage() {
    const [searchParams] = useSearchParams();
    const defaultExamenId = searchParams.get('examen') ?? '';

    const [examenId, setExamenId] = useState(defaultExamenId);
    const [statusFilter, setStatusFilter] = useState<ResultatStatus | ''>('');
    const [exportOpen, setExportOpen] = useState(false);

    const { role } = useAuth();
    const { data: examens } = useExamens();
    const selectedExamen = (examens ?? []).find((e: ExamenRow) => e.id === examenId);

    const { data: resultats, total, page, setPage, isLoading } = useResultats({
        examenId,
        pageSize: PAGE_SIZE,
        statusFilter: statusFilter || undefined,
    });

    const columns: Column<ResultatRow>[] = [
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
            key: 'status',
            header: 'Décision',
            cell: (row) => <ResultatStatusBadge status={row.status} />,
        },
        {
            key: 'moyenne',
            header: 'Moyenne',
            cell: (row) =>
                row.moyenne_centimes != null ? (
                    <span className="font-mono font-semibold">
                        {(row.moyenne_centimes / 100).toFixed(2)}
                    </span>
                ) : (
                    <span className="text-slate-300">—</span>
                ),
        },
        {
            key: 'phase',
            header: 'Phase',
            cell: (row) => (
                <span className="text-sm text-secondary">Phase {row.phase}</span>
            ),
        },
        {
            key: 'delibere_at',
            header: 'Délibéré le',
            cell: (row) =>
                row.delibere_at ? (
                    <span className="text-sm text-secondary">
                        {new Date(row.delibere_at).toLocaleDateString('fr-FR')}
                    </span>
                ) : (
                    <span className="text-slate-300">—</span>
                ),
        },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Résultats</h1>
                <p className="text-secondary">
                    Consultation des résultats de délibération (lecture seule).
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                    className="h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:w-72"
                    value={examenId}
                    onChange={(e) => {
                        setExamenId(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Sélectionner un examen...</option>
                    {(examens ?? [])
                        .filter((e: ExamenRow) =>
                            e.status === 'DELIBERE' ||
                            e.status === 'PUBLIE' ||
                            e.status === 'CLOS'
                        )
                        .map((ex: ExamenRow) => (
                            <option key={ex.id} value={ex.id}>
                                {ex.code} — {ex.libelle} ({ex.annee})
                            </option>
                        ))}
                </select>

                <select
                    className="h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value as ResultatStatus | '');
                        setPage(1);
                    }}
                    disabled={!examenId}
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {total > 0 && (
                    <span className="text-sm text-slate-500">
                        {total.toLocaleString('fr-FR')} résultats
                    </span>
                )}

                {examenId && total > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExportOpen(true)}
                        className="ml-auto"
                    >
                        <Download size={16} className="mr-1.5" />
                        Exporter
                    </Button>
                )}
            </div>

            {examenId && selectedExamen && (
                <ExportModal
                    open={exportOpen}
                    onOpenChange={setExportOpen}
                    examenId={examenId}
                    examenCode={selectedExamen.code}
                    userRole={(role ?? 'tutelle') as UserRole}
                />
            )}

            <DataTable
                columns={columns}
                data={resultats}
                rowKey={(row) => row.id}
                isLoading={isLoading}
                emptyMessage={
                    examenId
                        ? 'Aucun résultat pour cet examen.'
                        : 'Sélectionnez un examen délibéré pour voir les résultats.'
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
