import { useState } from 'react';
import { useExamenDisciplines, useAddExamenDiscipline, useRemoveExamenDiscipline } from '@/hooks/queries/useExamens';
import { useDisciplines } from '@/hooks/queries/useCatalogue';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Plus, Trash2 } from 'lucide-react';
import type { ExamenDisciplineDetail, DisciplineType } from '@/types/domain';

const DISCIPLINE_TYPE_LABELS: Record<DisciplineType, string> = {
    ecrit_obligatoire: 'Écrit obligatoire',
    oral: 'Oral',
    eps: 'EPS',
    facultatif: 'Facultatif',
};

const DISCIPLINE_TYPE_VARIANTS: Record<DisciplineType, 'default' | 'secondary' | 'warning' | 'subtle'> = {
    ecrit_obligatoire: 'default',
    oral: 'secondary',
    eps: 'warning',
    facultatif: 'subtle',
};

interface AddForm {
    discipline_id: string;
    type: DisciplineType;
    coefficient: string;
    bareme: string;
}

const EMPTY_FORM: AddForm = {
    discipline_id: '',
    type: 'ecrit_obligatoire',
    bareme: '20',
    coefficient: '1',
};

interface Props {
    examenId: string;
    isEditable: boolean;
}

export function ExamenTabDisciplines({ examenId, isEditable }: Props) {
    const { data: disciplines, isLoading } = useExamenDisciplines(examenId);
    const { data: catalogue } = useDisciplines();
    const addMutation = useAddExamenDiscipline(examenId);
    const removeMutation = useRemoveExamenDiscipline(examenId);

    const [addOpen, setAddOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<ExamenDisciplineDetail | null>(null);
    const [form, setForm] = useState<AddForm>(EMPTY_FORM);

    // Disciplines du catalogue non encore associées à cet examen
    const linkedIds = new Set(disciplines?.map((d) => d.discipline_id) ?? []);
    const available = catalogue?.filter((d) => !linkedIds.has(d.id)) ?? [];

    const openAdd = () => {
        const first = available[0];
        setForm({
            ...EMPTY_FORM,
            discipline_id: first?.id ?? '',
            type: first?.type_defaut ?? 'ecrit_obligatoire',
        });
        setAddOpen(true);
    };

    // Synchronise le type par défaut quand la discipline change
    const handleDisciplineChange = (id: string) => {
        const d = catalogue?.find((c) => c.id === id);
        setForm((f) => ({ ...f, discipline_id: id, type: d?.type_defaut ?? f.type }));
    };

    const handleAdd = async () => {
        if (!form.discipline_id) return;
        const coeff = parseFloat(form.coefficient);
        const bar = parseFloat(form.bareme);
        if (isNaN(coeff) || coeff <= 0 || isNaN(bar) || bar <= 0) return;

        await addMutation.mutateAsync({
            examen_id: examenId,
            discipline_id: form.discipline_id,
            type: form.type,
            coefficient: coeff,
            bareme: bar,
        });
        setAddOpen(false);
    };

    const handleRemove = async (row: ExamenDisciplineDetail) => {
        await removeMutation.mutateAsync(row.id);
        setRemoveTarget(null);
    };

    const columns: Column<ExamenDisciplineDetail>[] = [
        {
            key: 'ordre',
            header: '#',
            cell: (row) => <span className="text-sm text-slate-400">{row.ordre_affichage}</span>,
        },
        {
            key: 'discipline',
            header: 'Discipline',
            cell: (row) => (
                <div>
                    <p className="font-medium text-slate-900">{row.discipline.libelle}</p>
                    <p className="text-xs text-slate-400 font-mono">{row.discipline.code}</p>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            cell: (row) => (
                <Badge variant={DISCIPLINE_TYPE_VARIANTS[row.type]}>
                    {DISCIPLINE_TYPE_LABELS[row.type]}
                </Badge>
            ),
        },
        {
            key: 'coefficient',
            header: 'Coeff.',
            cell: (row) => <span className="text-sm font-semibold">{row.coefficient}</span>,
        },
        {
            key: 'bareme',
            header: 'Barème',
            cell: (row) => <span className="text-sm text-slate-600">/ {row.bareme}</span>,
        },
        {
            key: 'actions',
            header: '',
            cell: (row) =>
                isEditable ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoveTarget(row)}
                        className="text-danger hover:bg-danger/10"
                        title="Retirer"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ) : null,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    {disciplines?.length ?? 0} discipline{(disciplines?.length ?? 0) > 1 ? 's' : ''} associée{(disciplines?.length ?? 0) > 1 ? 's' : ''}
                </p>
                {isEditable && (
                    <Button
                        size="sm"
                        onClick={openAdd}
                        disabled={available.length === 0}
                        title={available.length === 0 ? 'Toutes les disciplines sont déjà associées' : undefined}
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Ajouter
                    </Button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={disciplines ?? []}
                rowKey={(row) => row.id}
                isLoading={isLoading}
                emptyMessage="Aucune discipline associée à cet examen."
            />

            {/* Modal ajout */}
            <Modal
                open={addOpen}
                onOpenChange={setAddOpen}
                title="Associer une discipline"
                description="La discipline sera ajoutée à la configuration de cet examen."
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
                        <Button onClick={handleAdd} isLoading={addMutation.isPending}>
                            Ajouter
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <FormField label="Discipline" required>
                        <Select
                            value={form.discipline_id}
                            onChange={(e) => handleDisciplineChange(e.target.value)}
                        >
                            <option value="" disabled>Sélectionner...</option>
                            {available.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.libelle} ({d.code})
                                </option>
                            ))}
                        </Select>
                    </FormField>
                    <FormField label="Type d'épreuve" required>
                        <Select
                            value={form.type}
                            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DisciplineType }))}
                        >
                            {(Object.entries(DISCIPLINE_TYPE_LABELS) as [DisciplineType, string][]).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </Select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Coefficient" required hint="Ex: 1, 2, 3">
                            <Input
                                type="number"
                                step="0.5"
                                min={0.5}
                                value={form.coefficient}
                                onChange={(e) => setForm((f) => ({ ...f, coefficient: e.target.value }))}
                            />
                        </FormField>
                        <FormField label="Barème" required hint="Note maximale">
                            <Input
                                type="number"
                                min={1}
                                value={form.bareme}
                                onChange={(e) => setForm((f) => ({ ...f, bareme: e.target.value }))}
                            />
                        </FormField>
                    </div>
                </div>
            </Modal>

            {/* Modal suppression */}
            <Modal
                open={!!removeTarget}
                onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}
                title="Retirer la discipline"
                variant="danger"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRemoveTarget(null)}>Annuler</Button>
                        <Button
                            variant="danger"
                            onClick={() => removeTarget && handleRemove(removeTarget)}
                            isLoading={removeMutation.isPending}
                        >
                            Retirer
                        </Button>
                    </div>
                }
            >
                <p className="text-slate-600">
                    Retirer <strong>{removeTarget?.discipline.libelle}</strong> de cet examen ?
                    Les saisies de notes existantes pour cette discipline seront conservées.
                </p>
            </Modal>
        </div>
    );
}
