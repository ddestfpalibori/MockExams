import { useState } from 'react';
import { useExamens } from '@/hooks/queries/useExamens';
import {
    useExamenLien,
    useEtablissementsCommuns,
    useCreateExamenLien,
    useUpdateExamenLien,
    useDeleteExamenLien,
    useCopierCandidats,
} from '@/hooks/queries/useExamenLien';
import { Button } from '@/components/ui/Button';
import { FormField, Select } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';
import { Link2, Download, Trash2, PencilLine, Info } from 'lucide-react';
import type { ExamenRow } from '@/types/domain';
import type { UpdateLienInput } from '@/services/examenLiens';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
    examenId: string;
    isEditable: boolean;
}

interface LienFormState {
    examen_source_id: string;
    mode_heritage: 'tous' | 'non_admis_uniquement';
    etablissement_ids: string[];
}

const MODE_LABELS: Record<'tous' | 'non_admis_uniquement', string> = {
    tous: 'Tous les candidats',
    non_admis_uniquement: 'Candidats non admis uniquement',
};

// ── Composant principal ────────────────────────────────────────────────────────

export function ExamenTabLien({ examenId, isEditable }: Props) {
    const { data: lien, isLoading: lienLoading } = useExamenLien(examenId);
    const { data: tousExamens } = useExamens();

    // Examens PUBLIE ou CLOS filtrés — exclure l'examen courant
    const examensCandidats: ExamenRow[] = (tousExamens ?? []).filter(
        (e) => (e.status === 'PUBLIE' || e.status === 'CLOS') && e.id !== examenId,
    );

    const createMutation = useCreateExamenLien(examenId);
    const updateMutation = useUpdateExamenLien(examenId);
    const deleteMutation = useDeleteExamenLien(examenId);
    const copierMutation = useCopierCandidats(examenId);

    // Formulaire création
    const [createForm, setCreateForm] = useState<LienFormState>({
        examen_source_id: '',
        mode_heritage: 'tous',
        etablissement_ids: [],
    });
    // Formulaire édition (state séparé, pré-rempli à l'ouverture)
    const [editForm, setEditForm] = useState<LienFormState>({
        examen_source_id: '',
        mode_heritage: 'tous',
        etablissement_ids: [],
    });
    const [isEditing, setIsEditing] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [copierOpen, setCopierOpen] = useState(false);

    // Formulaire actif selon le mode
    const formState = isEditing ? editForm : createForm;
    const setFormState = isEditing ? setEditForm : setCreateForm;

    const { data: etablissementsCommuns, isLoading: etabLoading } = useEtablissementsCommuns(
        formState.examen_source_id || null,
        examenId,
    );

    const handleToggleEtablissement = (id: string) => {
        setFormState((prev) => {
            const exists = prev.etablissement_ids.includes(id);
            return {
                ...prev,
                etablissement_ids: exists
                    ? prev.etablissement_ids.filter((e) => e !== id)
                    : [...prev.etablissement_ids, id],
            };
        });
    };

    const handleToggleTous = () => {
        setFormState((prev) => ({ ...prev, etablissement_ids: [] }));
    };

    const handleCreate = async () => {
        if (!formState.examen_source_id) return;
        try {
            await createMutation.mutateAsync({
                examen_cible_id: examenId,
                examen_source_id: formState.examen_source_id,
                mode_heritage: formState.mode_heritage,
                etablissement_ids: formState.etablissement_ids,
            });
            toast.success('Lien créé avec succès');
        } catch {
            // Erreur gérée par MutationCache (toast global)
        }
    };

    const handleUpdate = async () => {
        if (!lien) return;
        const data: UpdateLienInput = {
            mode_heritage: formState.mode_heritage,
            etablissement_ids: formState.etablissement_ids,
        };
        try {
            await updateMutation.mutateAsync({ id: lien.id, data });
            setIsEditing(false);
            toast.success('Lien mis à jour');
        } catch {
            // Erreur gérée par MutationCache (toast global)
        }
    };

    const handleDelete = async () => {
        if (!lien) return;
        try {
            await deleteMutation.mutateAsync(lien.id);
            setDeleteOpen(false);
            toast.success('Lien supprimé');
        } catch {
            // Erreur gérée par MutationCache (toast global)
        }
    };

    const handleCopier = async () => {
        if (!lien) return;
        try {
            const result = await copierMutation.mutateAsync(lien.id);
            setCopierOpen(false);
            toast.success(
                `${result.copies} candidat${result.copies > 1 ? 's' : ''} importé${result.copies > 1 ? 's' : ''}` +
                (result.ignores > 0
                    ? `, ${result.ignores} ignoré${result.ignores > 1 ? 's' : ''} (déjà présents)`
                    : ''),
            );
        } catch {
            // Erreur gérée par MutationCache (toast global)
        }
    };

    if (lienLoading) {
        return (
            <div className="flex h-32 items-center justify-center">
                <LoadingSpinner size="md" />
            </div>
        );
    }

    // ── Formulaire partagé création / modification ─────────────────────────────

    const renderForm = (mode: 'create' | 'edit') => {
        const isModeCreate = mode === 'create';
        const isPending = isModeCreate ? createMutation.isPending : updateMutation.isPending;
        const canSubmit = !!formState.examen_source_id;
        const allChecked = formState.etablissement_ids.length === 0;

        return (
            <div className="space-y-5">
                {/* Examen source — non modifiable en mode édition */}
                {isModeCreate ? (
                    <FormField label="Examen source" required>
                        <Select
                            value={formState.examen_source_id}
                            onChange={(e) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    examen_source_id: e.target.value,
                                    etablissement_ids: [],
                                }))
                            }
                        >
                            <option value="" disabled>
                                Sélectionner un examen source…
                            </option>
                            {examensCandidats.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.libelle} ({e.annee}) — {e.status}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                ) : (
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-primary">Examen source</span>
                        <span className="text-sm text-secondary">
                            {lien?.examen_source?.libelle ?? '—'} ({lien?.examen_source?.annee})
                        </span>
                    </div>
                )}

                {/* Mode d'héritage */}
                <FormField label="Mode d'héritage" required>
                    <Select
                        value={formState.mode_heritage}
                        onChange={(e) =>
                            setFormState((prev) => ({
                                ...prev,
                                mode_heritage: e.target.value as 'tous' | 'non_admis_uniquement',
                            }))
                        }
                    >
                        <option value="tous">{MODE_LABELS.tous}</option>
                        <option value="non_admis_uniquement">
                            {MODE_LABELS.non_admis_uniquement}
                        </option>
                    </Select>
                </FormField>

                {/* Checklist établissements communs */}
                {formState.examen_source_id && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">
                            Établissements concernés
                            <span className="ml-1 text-xs font-normal text-secondary">
                                (liste vide = tous)
                            </span>
                        </p>

                        {etabLoading ? (
                            <div className="flex items-center gap-2 text-sm text-secondary">
                                <LoadingSpinner size="sm" />
                                Chargement des établissements communs…
                            </div>
                        ) : (etablissementsCommuns ?? []).length === 0 ? (
                            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                Aucun établissement commun entre les deux examens.
                            </p>
                        ) : (
                            <div className="rounded-md border border-border divide-y divide-border max-h-48 overflow-y-auto">
                                {/* Option "Tous" */}
                                <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface/80">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={handleToggleTous}
                                        className="h-4 w-4 rounded border-border text-brand-primary"
                                    />
                                    <span className="text-sm font-medium text-primary">
                                        Tous les établissements
                                    </span>
                                </label>
                                {(etablissementsCommuns ?? []).map((etab) => (
                                    <label
                                        key={etab.id}
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface/80"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formState.etablissement_ids.includes(etab.id)}
                                            onChange={() => handleToggleEtablissement(etab.id)}
                                            className="h-4 w-4 rounded border-border text-brand-primary"
                                        />
                                        <span className="text-sm text-primary">
                                            {etab.nom}
                                            {etab.ville ? (
                                                <span className="text-secondary"> — {etab.ville}</span>
                                            ) : null}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    {mode === 'edit' && (
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Annuler
                        </Button>
                    )}
                    <Button
                        onClick={isModeCreate ? handleCreate : handleUpdate}
                        disabled={!canSubmit}
                        isLoading={isPending}
                    >
                        {isModeCreate ? 'Créer le lien' : 'Enregistrer'}
                    </Button>
                </div>
            </div>
        );
    };

    // ── Aucun lien existant → formulaire de création ───────────────────────────

    if (!lien) {
        if (!isEditable) {
            return (
                <div className="flex flex-col items-center gap-3 py-10 text-secondary">
                    <Info className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Aucun lien source configuré pour cet examen.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-secondary" />
                    <h3 className="text-sm font-semibold text-primary">
                        Configurer un lien source
                    </h3>
                </div>
                <p className="text-sm text-secondary">
                    Un lien source permet d'importer des candidats depuis un examen précédent
                    (PUBLIE ou CLOS).
                </p>
                {examensCandidats.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                        Aucun examen PUBLIE ou CLOS disponible comme source.
                    </p>
                ) : (
                    renderForm('create')
                )}
            </div>
        );
    }

    // ── Lien existant ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-brand-primary" />
                    <h3 className="text-sm font-semibold text-primary">Lien source configuré</h3>
                    <Badge variant="success">Actif</Badge>
                </div>

                {isEditable && !isEditing && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (lien) {
                                    setEditForm({
                                        examen_source_id: lien.examen_source_id,
                                        mode_heritage: lien.mode_heritage,
                                        etablissement_ids: lien.etablissement_ids,
                                    });
                                }
                                setIsEditing(true);
                            }}
                        >
                            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                            Modifier
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setCopierOpen(true)}
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Importer les candidats
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                        >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Supprimer
                        </Button>
                    </div>
                )}
            </div>

            {/* Mode édition inline */}
            {isEditing ? (
                renderForm('edit')
            ) : (
                /* Affichage lecture seule */
                <dl className="divide-y divide-slate-50 rounded-md border border-border">
                    <div className="flex justify-between px-4 py-3">
                        <dt className="text-sm text-secondary w-44 flex-shrink-0">Examen source</dt>
                        <dd className="text-sm font-medium text-primary text-right">
                            {lien.examen_source?.libelle ?? '—'}{' '}
                            <span className="text-secondary font-normal">
                                ({lien.examen_source?.annee})
                            </span>
                        </dd>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                        <dt className="text-sm text-secondary w-44 flex-shrink-0">Mode d'héritage</dt>
                        <dd className="text-sm font-medium text-primary text-right">
                            {MODE_LABELS[lien.mode_heritage]}
                        </dd>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                        <dt className="text-sm text-secondary w-44 flex-shrink-0">Établissements</dt>
                        <dd className="text-sm font-medium text-primary text-right">
                            {lien.etablissement_ids.length === 0
                                ? 'Tous (communs aux deux examens)'
                                : `${lien.etablissement_ids.length} sélectionné${lien.etablissement_ids.length > 1 ? 's' : ''}`}
                        </dd>
                    </div>
                </dl>
            )}

            {/* Modal confirmation import */}
            <Modal
                open={copierOpen}
                onOpenChange={(o) => { if (!o) setCopierOpen(false); }}
                title="Importer les candidats"
                description={`Copier les candidats depuis « ${lien.examen_source?.libelle ?? 'examen source'} » vers cet examen.`}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setCopierOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleCopier}
                            isLoading={copierMutation.isPending}
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Importer
                        </Button>
                    </div>
                }
            >
                <p className="text-sm text-slate-600">
                    Mode : <strong>{MODE_LABELS[lien.mode_heritage]}</strong>.
                    Les candidats déjà présents (même fingerprint) seront ignorés automatiquement.
                </p>
            </Modal>

            {/* Modal confirmation suppression */}
            <Modal
                open={deleteOpen}
                onOpenChange={(o) => { if (!o) setDeleteOpen(false); }}
                title="Supprimer le lien source"
                variant="danger"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDelete}
                            isLoading={deleteMutation.isPending}
                        >
                            Supprimer
                        </Button>
                    </div>
                }
            >
                <p className="text-sm text-slate-600">
                    Supprimer le lien vers <strong>{lien.examen_source?.libelle ?? 'examen source'}</strong> ?
                    Les candidats déjà importés ne seront pas supprimés.
                </p>
            </Modal>
        </div>
    );
}
