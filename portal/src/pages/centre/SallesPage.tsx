import { useState } from 'react';
import { useMyCentres } from '@/hooks/queries/useProfiles';
import { useExamens } from '@/hooks/queries/useExamens';
import { useSalles } from '@/hooks/queries/useSalles';
import { centreService } from '@/services/centres';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SalleRow, ExamenRow, AffectationRule } from '@/types/domain';
import type { Database } from '@/lib/database.types';

type SalleInsert = Database['public']['Tables']['salles']['Insert'];

const AFFECTATION_LABELS: Record<AffectationRule, string> = {
    alphabetique: 'Alphabétique',
    numero_anonyme: 'Numéro anonyme',
    par_etablissement: 'Par établissement',
};

export default function SallesPage() {
    const queryClient = useQueryClient();
    const { data: centres } = useMyCentres();
    const centreId = centres?.[0]?.id ?? '';

    const { data: examens } = useExamens();
    const [examenId, setExamenId] = useState('');

    const { data: salles, isLoading } = useSalles(centreId, examenId || undefined);

    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<SalleRow | null>(null);
    const [editTarget, setEditTarget] = useState<SalleRow | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({ nom: '', capacite: '', regle_affectation: 'alphabetique' as AffectationRule });

    const openCreate = () => {
        setEditTarget(null);
        setForm({ nom: '', capacite: '', regle_affectation: 'alphabetique' });
        setModalOpen(true);
    };

    const openEdit = (salle: SalleRow) => {
        setEditTarget(salle);
        setForm({ nom: salle.nom, capacite: String(salle.capacite), regle_affectation: salle.regle_affectation });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.nom || !form.capacite || !examenId || !centreId) return;
        setSaving(true);
        try {
            if (editTarget) {
                await centreService.updateSalle(editTarget.id, {
                    nom: form.nom,
                    capacite: Number(form.capacite),
                    regle_affectation: form.regle_affectation,
                });
                toast.success('Salle mise à jour');
            } else {
                const insert: SalleInsert = {
                    nom: form.nom,
                    capacite: Number(form.capacite),
                    regle_affectation: form.regle_affectation,
                    centre_id: centreId,
                    examen_id: examenId,
                };
                await centreService.createSalle(insert);
                toast.success('Salle créée');
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.centres.salles(centreId, examenId) });
            setModalOpen(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (salle: SalleRow) => {
        setSaving(true);
        try {
            await centreService.deleteSalle(salle.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.centres.salles(centreId, examenId) });
            toast.success('Salle supprimée');
            setDeleteModal(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const columns: Column<SalleRow>[] = [
        {
            key: 'ordre',
            header: '#',
            cell: (row) => <span className="text-sm text-slate-400">{row.ordre}</span>,
        },
        {
            key: 'nom',
            header: 'Nom',
            cell: (row) => <span className="font-medium">{row.nom}</span>,
        },
        {
            key: 'capacite',
            header: 'Capacité',
            cell: (row) => <span>{row.capacite} places</span>,
        },
        {
            key: 'regle_affectation',
            header: 'Règle affectation',
            cell: (row) => (
                <span className="text-sm text-slate-600">
                    {AFFECTATION_LABELS[row.regle_affectation]}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteModal(row)}
                        title="Supprimer"
                        className="text-danger hover:bg-danger/10"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Salles</h1>
                    <p className="text-slate-500">Gérez les salles de composition de votre centre.</p>
                </div>
                <Button onClick={openCreate} disabled={!examenId}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle salle
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Examen :</label>
                <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary w-64"
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

            <DataTable
                columns={columns}
                data={salles ?? []}
                rowKey={(row) => row.id}
                isLoading={isLoading}
                emptyMessage={examenId ? 'Aucune salle configurée.' : 'Sélectionnez un examen.'}
            />

            {/* Modal créer/modifier */}
            <Modal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editTarget ? 'Modifier la salle' : 'Nouvelle salle'}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave} isLoading={saving}>
                            {editTarget ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <FormField label="Nom de la salle" required>
                        <Input
                            value={form.nom}
                            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                            placeholder="Ex: Salle A, Amphi 1..."
                        />
                    </FormField>
                    <FormField label="Capacité (places)" required>
                        <Input
                            type="number"
                            min={1}
                            value={form.capacite}
                            onChange={(e) => setForm((f) => ({ ...f, capacite: e.target.value }))}
                            placeholder="Ex: 50"
                        />
                    </FormField>
                    <FormField label="Règle d'affectation">
                        <Select
                            value={form.regle_affectation}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    regle_affectation: e.target.value as AffectationRule,
                                }))
                            }
                        >
                            {Object.entries(AFFECTATION_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </Select>
                    </FormField>
                </div>
            </Modal>

            {/* Modal suppression */}
            <Modal
                open={!!deleteModal}
                onOpenChange={(o) => { if (!o) setDeleteModal(null); }}
                title="Supprimer la salle"
                variant="danger"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDeleteModal(null)}>
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => deleteModal && handleDelete(deleteModal)}
                            isLoading={saving}
                        >
                            Supprimer
                        </Button>
                    </div>
                }
            >
                <p className="text-slate-600">
                    Êtes-vous sûr de vouloir supprimer la salle{' '}
                    <strong>{deleteModal?.nom}</strong> ? Cette action est irréversible.
                </p>
            </Modal>
        </div>
    );
}
