import { useState } from 'react';
import { useActiveCentre } from '@/hooks/useActiveCentre';
import { useExamens } from '@/hooks/queries/useExamens';
import { useGenererAnonymats } from '@/hooks/queries/useLots';
import { centreService } from '@/services/centres';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { Hash, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ExamenRow } from '@/types/domain';

export default function AnonymatsPage() {
    const { activeId: centreId, centres, isMulti, setActiveId } = useActiveCentre();

    const { data: examens, isLoading: examensLoading } = useExamens();
    const [examenId, setExamenId] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [lastResult, setLastResult] = useState<number | null>(null);

    const generer = useGenererAnonymats(centreId);

    const examenSelectionne = examens?.find((e: ExamenRow) => e.id === examenId);

    const handleGenerer = async () => {
        const nb = await generer.mutateAsync(examenId);
        setLastResult(nb);
        setConfirmOpen(false);
    };

    const openConfirm = async () => {
        if (!examenId || !centreId) return;
        if (!anonymatActif) {
            try {
                const missing = await centreService.countMissingTableNumbers(centreId, examenId);
                if (missing > 0) {
                    toast.error(`Numéros de table manquants pour ${missing} candidat(s).`);
                    return;
                }
            } catch {
                toast.error('Vérification des numéros de table impossible.');
                return;
            }
        }
        setConfirmOpen(true);
    };

    const examensEligibles = (examens ?? []).filter(
        (e: ExamenRow) =>
            e.status === 'INSCRIPTIONS' ||
            e.status === 'COMPOSITION' ||
            e.status === 'CORRECTION'
    );

    const anonymatActif = examenSelectionne?.anonymat_actif ?? true;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {anonymatActif ? 'Numéros anonymes' : 'Identifiants de saisie'}
                </h1>
                <p className="text-slate-500">
                    {anonymatActif
                        ? 'Générez les numéros d\'anonymat pour les candidats de votre centre (F05).'
                        : 'Générez les identifiants basés sur les numéros de table pour les candidats de votre centre (F05).'}
                    {' '}
                    Cette opération est idempotente : sûre à relancer.
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
                        {examensEligibles.map((ex: ExamenRow) => (
                            <option key={ex.id} value={ex.id}>
                                {ex.code} — {ex.libelle} ({ex.annee})
                            </option>
                        ))}
                    </select>
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

                <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Idempotent :</strong> Les candidats qui ont déjà un identifiant
                        ne sont pas modifiés. Seuls les candidats sans identifiant reçoivent un
                        nouveau numéro dans la plage de l'examen.
                    </p>
                    {!anonymatActif && (
                        <p className="text-sm text-blue-800 mt-2">
                            <strong>Pré-requis :</strong> les numéros de table doivent déjà être affectés.
                        </p>
                    )}
                </div>

                <Button
                    onClick={openConfirm}
                    disabled={!examenId || !centreId}
                >
                    <Hash className="mr-2 h-4 w-4" />
                    {anonymatActif ? 'Générer les numéros anonymes' : 'Générer les identifiants'}
                </Button>
            </div>

            {lastResult !== null && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6">
                    <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-success">Génération réussie</p>
                        <p className="text-sm text-slate-600">
                            {lastResult} {anonymatActif ? 'numéro(s) anonyme(s)' : 'identifiant(s)'} généré(s).
                        </p>
                    </div>
                </div>
            )}

            <Modal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={anonymatActif ? 'Générer les numéros anonymes' : 'Générer les identifiants'}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleGenerer} isLoading={generer.isPending}>
                            Générer
                        </Button>
                    </div>
                }
            >
                <p className="text-slate-600">
                    Vous allez générer {anonymatActif ? 'les numéros anonymes' : 'les identifiants'}
                    {' '}pour les candidats de l'examen <strong>{examenSelectionne?.libelle}</strong>
                    {' '}dans votre centre. Les candidats déjà numérotés ne sont pas affectés.
                </p>
            </Modal>
        </div>
    );
}
