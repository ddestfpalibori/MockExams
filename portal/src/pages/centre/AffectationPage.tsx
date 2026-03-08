import { useState } from 'react';
import { useMyCentres } from '@/hooks/queries/useProfiles';
import { useExamens } from '@/hooks/queries/useExamens';
import { useAffecter } from '@/hooks/queries/useLots';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Users, CheckCircle } from 'lucide-react';
import type { ExamenRow } from '@/types/domain';

export default function AffectationPage() {
    const { data: centres } = useMyCentres();
    const centreId = centres?.[0]?.id ?? '';

    const { data: examens, isLoading: examensLoading } = useExamens();
    const [examenId, setExamenId] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [lastResult, setLastResult] = useState<number | null>(null);

    const affecter = useAffecter(centreId);

    const examenSelectionne = examens?.find((e: ExamenRow) => e.id === examenId);

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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Affectation des candidats
                </h1>
                <p className="text-slate-500">
                    Répartissez automatiquement les candidats dans les salles de votre centre (F04).
                </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Examen
                    </label>
                    <select
                        className="h-10 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                    </select>
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

                <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={!examenId || !centreId}
                    className="flex items-center gap-2"
                >
                    <Users className="h-4 w-4" />
                    Affecter les candidats aux salles
                </Button>
            </div>

            {lastResult !== null && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6">
                    <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-success">Affectation réussie</p>
                        <p className="text-sm text-slate-600">
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
                <p className="text-slate-600">
                    Vous allez affecter les candidats de l'examen{' '}
                    <strong>{examenSelectionne?.libelle}</strong> aux salles de votre centre.
                    Cette opération est sûre et peut être relancée.
                </p>
            </Modal>
        </div>
    );
}
