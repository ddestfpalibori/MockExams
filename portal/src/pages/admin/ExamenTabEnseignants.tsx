/**
 * Onglet Enseignants — ExamenDetailPage (Sprint 6B)
 *
 * Affecte des enseignants aux disciplines d'un examen,
 * avec filtre optionnel par classe physique.
 */

import { useState } from 'react';
import { useExamenEnseignants, useAssignEnseignantDiscipline, useRemoveEnseignantDiscipline } from '@/hooks/queries/useEnseignant';
import { useProfiles } from '@/hooks/queries/useProfiles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select } from '@/components/ui/FormField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GraduationCap, Plus, X, User } from 'lucide-react';
import type { ExamenDisciplineWithEnseignants, ClasseRow, ProfileRow } from '@/types/domain';

interface Props {
    examenId: string;
}

// Toutes les classes (pour le sélecteur du modal)
function useAllClasses() {
    return useQuery({
        queryKey: QUERY_KEYS.classes.all,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, etablissement_id, serie_id, libelle, created_at, etablissements(nom)')
                .order('libelle');
            if (error) throw error;
            return data as Array<ClasseRow & { etablissements: { nom: string } }>;
        },
        ...CACHE_STRATEGY.catalogue,
    });
}

interface AssignModalState {
    discipline: ExamenDisciplineWithEnseignants;
}

export function ExamenTabEnseignants({ examenId }: Props) {
    const { data: disciplines, isLoading } = useExamenEnseignants(examenId);
    const { data: profiles } = useProfiles();
    const { data: classes } = useAllClasses();
    const assignMutation = useAssignEnseignantDiscipline(examenId);
    const removeMutation = useRemoveEnseignantDiscipline(examenId);

    const [assignModal, setAssignModal] = useState<AssignModalState | null>(null);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedClasseId, setSelectedClasseId] = useState('');

    const enseignants = (profiles ?? []).filter((p: ProfileRow) => p.role === 'enseignant');

    const openAssign = (discipline: ExamenDisciplineWithEnseignants) => {
        setSelectedUserId(enseignants[0]?.id ?? '');
        setSelectedClasseId('');
        setAssignModal({ discipline });
    };

    const handleAssign = async () => {
        if (!assignModal || !selectedUserId) return;

        await assignMutation.mutateAsync({
            userId: selectedUserId,
            examenDisciplineId: assignModal.discipline.id,
            classeId: selectedClasseId || null,
        });
        setAssignModal(null);
    };

    const handleRemove = async (userDisciplineId: string) => {
        await removeMutation.mutateAsync(userDisciplineId);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Enseignants par discipline</h2>
                    <p className="text-sm text-slate-500">
                        Affectez des enseignants aux disciplines. La classe est optionnelle —
                        sans classe, l'enseignant voit tous les candidats de la discipline.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {(disciplines ?? []).map((disc) => (
                    <div
                        key={disc.id}
                        className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                        <div className="flex items-start justify-between gap-4">
                            {/* Discipline info */}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900">
                                        {disc.discipline.libelle}
                                    </span>
                                    <Badge variant="secondary">
                                        coef. {disc.coefficient}
                                    </Badge>
                                </div>

                                {/* Enseignants affectés */}
                                {disc.enseignants.length === 0 ? (
                                    <p className="mt-2 text-sm text-slate-400 italic">
                                        Aucun enseignant affecté
                                    </p>
                                ) : (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {disc.enseignants.map((e) => (
                                            <div
                                                key={e.user_discipline_id}
                                                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 pl-2 pr-1 py-0.5 text-sm"
                                            >
                                                <User className="h-3 w-3 text-slate-400 shrink-0" />
                                                <span className="text-slate-700">
                                                    {e.profile.prenom} {e.profile.nom}
                                                </span>
                                                {e.classe_libelle && (
                                                    <span className="text-xs text-slate-500">
                                                        — {e.classe_libelle}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleRemove(e.user_discipline_id)}
                                                    disabled={removeMutation.isPending}
                                                    className="ml-1 rounded-full p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                                    title="Retirer"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bouton Affecter */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAssign(disc)}
                                disabled={enseignants.length === 0}
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Affecter
                            </Button>
                        </div>
                    </div>
                ))}

                {(disciplines ?? []).length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-10 text-center">
                        <GraduationCap className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500">Aucune discipline configurée pour cet examen.</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Ajoutez des disciplines dans l'onglet "Disciplines" d'abord.
                        </p>
                    </div>
                )}

                {enseignants.length === 0 && (disciplines ?? []).length > 0 && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                        Aucun enseignant n'est encore créé. Créez des comptes enseignants dans
                        la page <span className="font-medium">Utilisateurs</span> avant d'effectuer des affectations.
                    </div>
                )}
            </div>

            {/* Modal affectation */}
            <Modal
                open={!!assignModal}
                onOpenChange={(o) => { if (!o) setAssignModal(null); }}
                title={`Affecter un enseignant — ${assignModal?.discipline.discipline.libelle ?? ''}`}
            >
                <div className="space-y-4">
                    <FormField label="Enseignant" required>
                        <Select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            {enseignants.map((p: ProfileRow) => (
                                <option key={p.id} value={p.id}>
                                    {p.prenom} {p.nom}
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <FormField
                        label="Classe (optionnelle)"
                        hint="Laissez vide pour que l'enseignant voit toute la discipline."
                    >
                        <Select
                            value={selectedClasseId}
                            onChange={(e) => setSelectedClasseId(e.target.value)}
                        >
                            <option value="">— Toutes les classes —</option>
                            {(classes ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.libelle}{' '}
                                    {c.etablissements ? `(${c.etablissements.nom})` : ''}
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setAssignModal(null)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={!selectedUserId}
                            isLoading={assignMutation.isPending}
                        >
                            Affecter
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
