import { useState } from 'react';
import { useExamenCentres, useAddExamenCentre, useRemoveExamenCentre } from '@/hooks/queries/useExamens';
import { useCentres, useUpdateCentre } from '@/hooks/queries/useProfiles';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select, Input } from '@/components/ui/FormField';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import type { CentreRow } from '@/types/domain';

interface Props {
    examenId: string;
    isEditable: boolean;
}

export function ExamenTabCentres({ examenId, isEditable }: Props) {
    const { data: centresExamen, isLoading } = useExamenCentres(examenId);
    const { data: tousLesCentres } = useCentres();
    const addMutation = useAddExamenCentre(examenId);
    const removeMutation = useRemoveExamenCentre(examenId);
    const updateCentreMutation = useUpdateCentre();

    const [addOpen, setAddOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<CentreRow | null>(null);
    const [editTarget, setEditTarget] = useState<CentreRow | null>(null);
    const [selectedCentreId, setSelectedCentreId] = useState('');

    // Centres actifs non encore associés
    const linkedIds = new Set(centresExamen?.map((c) => c.id) ?? []);
    const available = tousLesCentres?.filter((c) => c.is_active && !linkedIds.has(c.id)) ?? [];

    const openAdd = () => {
        setSelectedCentreId(available[0]?.id ?? '');
        setAddOpen(true);
    };

    const handleAdd = async () => {
        if (!selectedCentreId) return;
        await addMutation.mutateAsync(selectedCentreId);
        setAddOpen(false);
    };

    const handleRemove = async (centre: CentreRow) => {
        await removeMutation.mutateAsync(centre.id);
        setRemoveTarget(null);
    };

    const handleUpdateCentre = async () => {
        if (!editTarget) return;
        await updateCentreMutation.mutateAsync({
            id: editTarget.id,
            input: {
                code_departement: editTarget.code_departement,
                code_commune: editTarget.code_commune,
            },
        });
        setEditTarget(null);
    };

    const columns: Column<CentreRow>[] = [
        {
            key: 'code',
            header: 'Code',
            cell: (row) => <span className="font-mono text-sm font-semibold text-slate-700">{row.code}</span>,
        },
        {
            key: 'nom',
            header: 'Centre',
            cell: (row) => <span className="font-medium text-slate-900">{row.nom}</span>,
        },
        {
            key: 'ville',
            header: 'Ville',
            cell: (row) => <span className="text-sm text-slate-500">{row.ville ?? '—'}</span>,
        },
        {
            key: 'is_active',
            header: 'Statut',
            cell: (row) =>
                row.is_active
                    ? <Badge variant="success">Actif</Badge>
                    : <Badge variant="danger">Inactif</Badge>,
        },
        {
            key: 'codes',
            header: 'Dept / Com',
            cell: (row) => (
                <span className="text-xs font-mono text-slate-500">
                    {row.code_departement || '—'} / {row.code_commune || '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (row) => (
                <div className="flex items-center gap-1 justify-end">
                    {isEditable && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditTarget(row)}
                            className="text-slate-400 hover:text-brand-primary"
                            title="Configurer les codes"
                        >
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    )}
                    {isEditable && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRemoveTarget(row)}
                            className="text-danger hover:bg-danger/10"
                            title="Dissocier"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    {centresExamen?.length ?? 0} centre{(centresExamen?.length ?? 0) > 1 ? 's' : ''} associé{(centresExamen?.length ?? 0) > 1 ? 's' : ''}
                </p>
                {isEditable && (
                    <Button
                        size="sm"
                        onClick={openAdd}
                        disabled={available.length === 0}
                        title={available.length === 0 ? 'Tous les centres actifs sont déjà associés' : undefined}
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Associer un centre
                    </Button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={centresExamen ?? []}
                rowKey={(row) => row.id}
                isLoading={isLoading}
                emptyMessage="Aucun centre associé à cet examen."
            />

            {/* Modal ajout */}
            <Modal
                open={addOpen}
                onOpenChange={setAddOpen}
                title="Associer un centre"
                description="Le centre sera habilité à organiser cet examen."
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
                        <Button onClick={handleAdd} isLoading={addMutation.isPending}>
                            Associer
                        </Button>
                    </div>
                }
            >
                <FormField label="Centre" required>
                    <Select
                        value={selectedCentreId}
                        onChange={(e) => setSelectedCentreId(e.target.value)}
                    >
                        <option value="" disabled>Sélectionner un centre...</option>
                        {available.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.nom} ({c.code}){c.ville ? ` — ${c.ville}` : ''}
                            </option>
                        ))}
                    </Select>
                </FormField>
            </Modal>

            {/* Modal dissociation */}
            <Modal
                open={!!removeTarget}
                onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}
                title="Dissocier le centre"
                variant="danger"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRemoveTarget(null)}>Annuler</Button>
                        <Button
                            variant="danger"
                            onClick={() => removeTarget && handleRemove(removeTarget)}
                            isLoading={removeMutation.isPending}
                        >
                            Dissocier
                        </Button>
                    </div>
                }
            >
                <p className="text-slate-600">
                    Dissocier <strong>{removeTarget?.nom}</strong> de cet examen ?
                    Les salles et affectations existantes pour ce centre seront conservées.
                </p>
            </Modal>

            {/* Modal édition codes */}
            <Modal
                open={!!editTarget}
                onOpenChange={(o) => { if (!o) setEditTarget(null); }}
                title="Configurer le centre"
                description={`Définir les codes administratifs pour ${editTarget?.nom}`}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditTarget(null)}>Annuler</Button>
                        <Button
                            onClick={handleUpdateCentre}
                            isLoading={updateCentreMutation.isPending}
                        >
                            Enregistrer
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <FormField label="Code Département" hint="Ex: 01, 02, LITTORAL...">
                        <Input
                            value={editTarget?.code_departement || ''}
                            onChange={(e) => setEditTarget(curr => curr ? { ...curr, code_departement: e.target.value } : null)}
                            placeholder="01"
                        />
                    </FormField>
                    <FormField label="Code Commune" hint="Ex: 05, COTONOU...">
                        <Input
                            value={editTarget?.code_commune || ''}
                            onChange={(e) => setEditTarget(curr => curr ? { ...curr, code_commune: e.target.value } : null)}
                            placeholder="05"
                        />
                    </FormField>
                </div>
            </Modal>
        </div>
    );
}
