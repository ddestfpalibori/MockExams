import { useState } from 'react';
import { useActiveCentre } from '@/hooks/useActiveCentre';
import { useExamens } from '@/hooks/queries/useExamens';
import { useLots, useSignerLot } from '@/hooks/queries/useLots';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { LotStatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { KeyRound, Package } from 'lucide-react';
import type { ExamenRow } from '@/types/domain';
import type { LotWithDetails } from '@/services/lots';

export default function LotsPage() {
    const { activeId: centreId, centres, isMulti, setActiveId } = useActiveCentre();

    const { data: examens } = useExamens();
    const [examenId, setExamenId] = useState('');

    const { data: lots, isLoading } = useLots(centreId, examenId);
    const signerLot = useSignerLot(centreId, examenId);

    const [signerTarget, setSignerTarget] = useState<LotWithDetails | null>(null);

    const handleSigner = async () => {
        if (!signerTarget) return;
        await signerLot.mutateAsync(signerTarget.id);
        setSignerTarget(null);
    };

    const columns: Column<LotWithDetails>[] = [
        {
            key: 'lot_numero',
            header: 'Lot #',
            cell: (row) => (
                <span className="font-mono font-bold text-brand-primary">
                    {String(row.lot_numero).padStart(3, '0')}
                </span>
            ),
        },
        {
            key: 'discipline',
            header: 'Discipline',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.discipline_libelle}</span>
                    <span className="text-xs text-slate-400 font-mono">{row.discipline_code}</span>
                </div>
            ),
        },
        {
            key: 'serie',
            header: 'Série',
            cell: (row) => (
                <span className="text-sm text-slate-600">{row.serie_code ?? '—'}</span>
            ),
        },
        {
            key: 'nb_copies',
            header: 'Copies',
            cell: (row) => <span className="text-sm">{row.nb_copies}</span>,
        },
        {
            key: 'status',
            header: 'Statut',
            cell: (row) => <LotStatusBadge status={row.status} />,
        },
        {
            key: 'hmac',
            header: 'HMAC',
            cell: (row) =>
                row.hmac_signature ? (
                    <span className="font-mono text-xs text-success truncate max-w-[100px] block">
                        {row.hmac_signature.slice(0, 12)}…
                    </span>
                ) : (
                    <span className="text-xs text-slate-300">—</span>
                ),
        },
        {
            key: 'actions',
            header: '',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    {!row.hmac_signature && row.status === 'EN_ATTENTE' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSignerTarget(row)}
                        >
                            <KeyRound className="mr-1 h-3 w-3" />
                            Signer
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Lots de correction
                    </h1>
                    <p className="text-slate-500">
                        Gérez les lots de copies par discipline et signez-les (HMAC).
                    </p>
                </div>
            </div>

            {isMulti && (
                <EntitySelector
                    entities={centres}
                    activeId={centreId}
                    onSelect={setActiveId}
                    label="Centre actif"
                />
            )}

            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Examen :</label>
                <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary w-72"
                    value={examenId}
                    onChange={(e) => setExamenId(e.target.value)}
                >
                    <option value="">Sélectionner un examen...</option>
                    {(examens ?? []).map((ex: ExamenRow) => (
                        <option key={ex.id} value={ex.id}>
                            {ex.code} — {ex.libelle} ({ex.annee})
                        </option>
                    ))}
                </select>
            </div>

            {examenId && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Workflow :</strong> Les lots sont créés via la fonction F06
                        (automatiquement depuis ExamenDetailPage). Signez chaque lot pour générer
                        son HMAC anti-replay avant de le distribuer aux correcteurs.
                    </p>
                </div>
            )}

            <DataTable
                columns={columns}
                data={lots ?? []}
                rowKey={(row) => row.id}
                isLoading={isLoading}
                emptyMessage={
                    examenId
                        ? 'Aucun lot créé pour cet examen. Utilisez ExamenDetailPage pour créer les lots (F06).'
                        : 'Sélectionnez un examen.'
                }
            />

            {lots && lots.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Package className="h-4 w-4" />
                    <span>
                        {lots.filter((l) => l.hmac_signature).length} / {lots.length} lots signés
                    </span>
                </div>
            )}

            {/* Modal signature */}
            <Modal
                open={!!signerTarget}
                onOpenChange={(o) => { if (!o) setSignerTarget(null); }}
                title="Signer le lot"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSignerTarget(null)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSigner} isLoading={signerLot.isPending}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Signer (HMAC)
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <p className="text-slate-600">
                        Vous allez signer le lot{' '}
                        <strong>#{signerTarget?.lot_numero}</strong> —{' '}
                        {signerTarget?.discipline_libelle}.
                    </p>
                    <p className="text-sm text-slate-500">
                        La signature génère un HMAC unique qui sera intégré dans le bon de
                        correction remis aux correcteurs. Il permet de vérifier l'intégrité des
                        notes lors de la saisie.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
