import { useState } from 'react';
import { useActiveCentre } from '@/hooks/useActiveCentre';
import { useExamens } from '@/hooks/queries/useExamens';
import { useAffecter } from '@/hooks/queries/useLots';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { ReleveNotesModal } from '@/components/releves/ReleveNotesModal';
import { useAuth } from '@/hooks/useAuth';
import { Users, CheckCircle, FileText } from 'lucide-react';
import type { ExamenRow } from '@/types/domain';

const STATUTS_RELEVES: ExamenRow['status'][] = ['DELIBERATION', 'DELIBERE', 'PUBLIE', 'CLOS'];

export default function AffectationPage() {
    const { activeId: centreId, centres, isMulti, setActiveId } = useActiveCentre();
    const { role } = useAuth();

    const { data: examens, isLoading: examensLoading } = useExamens();
    const [examenId, setExamenId] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [lastResult, setLastResult] = useState<number | null>(null);
    const [releveOpen, setReleveOpen] = useState(false);

    const affecter = useAffecter(centreId);

    const examenSelectionne = examens?.find((e: ExamenRow) => e.id === examenId);
    const peutVoirReleves = examenSelectionne ? STATUTS_RELEVES.includes(examenSelectionne.status) : false;

    const handleAffecter = async () => {
        const nb = await affecter.mutateAsync(examenId);
        setLastResult(nb);
        setConfirmOpen(false);
    };

    const examensAffectables = (examens ?? []).filter(
        (e: ExamenRow) => e.status === 'COMPOSITION' || e.status === 'INSCRIPTIONS'
    );

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Affectation des candidats
                </h1>
                <p className="text-secondary">
                    Répartissez automatiquement les candidats dans les salles de votre centre (F04).
                </p>
            </div>

            {isMulti && (
                <EntitySelector
                    entities={centres}
                    activeId={centreId}
                    onSelect={setActiveId}
                    label="Centre actif"
                />
            )}

            <div className="rounded-lg border border-border bg-surface p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Examen
                    </label>
                    <Select
                        className="max-w-md"
                        value={examenId}
                        onChange={(e) => {
                            setExamenId(e.target.value);
                            setLastResult(null);
                        }}
                        disabled={examensLoading}
                    >
                        <option value="">Sélectionner un examen...</option>
                        {examensAffectables.map((ex: ExamenRow) => (
                            <option key={ex.id} value={ex.id}>
                                {ex.code} — {ex.libelle} ({ex.annee})
                            </option>
                        ))}
                    </Select>
                    {examensAffectables.length === 0 && !examensLoading && (
                        <p className="mt-1 text-xs text-slate-400">
                            Aucun examen en phase Inscriptions ou Composition.
                        </p>
                    )}
                </div>

                {examenSelectionne && (
                    <div className="flex items-center gap-4 rounded-md bg-slate-50 p-4">
                        <div className="flex-1">
                            <p className="font-medium">{examenSelectionne.libelle}</p>
                            <p className="text-sm text-slate-500">{examenSelectionne.annee}</p>
                        </div>
                        <StatusBadge status={examenSelectionne.status} />
                    </div>
                )}

                <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm text-amber-800">
                        <strong>Important :</strong> L'affectation répartit les candidats selon la
                        règle définie pour chaque salle (alphabétique, par numéro anonyme, ou par
                        établissement). Cette opération peut être relancée si des candidats sont
                        ajoutés après coup.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => setConfirmOpen(true)}
                        disabled={!examenId || !centreId}
                        className="flex items-center gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Affecter les candidats aux salles
                    </Button>

                    {peutVoirReleves && centreId && (
                        <Button
                            variant="outline"
                            onClick={() => setReleveOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            Relevés de notes
                        </Button>
                    )}
                </div>
            </div>

            {lastResult !== null && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6">
                    <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-success">Affectation réussie</p>
                        <p className="text-sm text-secondary">
                            {lastResult} candidat(s) affecté(s) aux salles.
                        </p>
                    </div>
                </div>
            )}

            <Modal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirmer l'affectation"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleAffecter} isLoading={affecter.isPending}>
                            Confirmer l'affectation
                        </Button>
                    </div>
                }
            >
                <p className="text-secondary">
                    Vous allez affecter les candidats de l'examen{' '}
                    <strong>{examenSelectionne?.libelle}</strong> aux salles de votre centre.
                    Cette opération est sûre et peut être relancée.
                </p>
            </Modal>

            {examenSelectionne && centreId && role && (
                <ReleveNotesModal
                    open={releveOpen}
                    onOpenChange={setReleveOpen}
                    examenId={examenSelectionne.id}
                    examenLibelle={examenSelectionne.libelle}
                    examenAnnee={examenSelectionne.annee}
                    userRole={role}
                    centres={centres}
                    defaultCentreId={centreId}
                />
            )}
        </div>
    );
}
