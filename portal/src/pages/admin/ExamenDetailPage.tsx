import { useParams } from 'react-router-dom';
import { useExamenDetail, useTransitionPhase } from '@/hooks/queries/useExamens';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
    Settings,
    Users,
    School,
    BookOpen,
    Calculator,
    Play,
    CheckCircle2,
    Lock,
    PenLine,
    History
} from 'lucide-react';
import { useState } from 'react';
import type { ExamStatus } from '@/types/domain';

export default function ExamenDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
    const [targetPhase, setTargetPhase] = useState<ExamStatus | null>(null);

    const { data: examen, isLoading } = useExamenDetail(id!);
    const transitionMutation = useTransitionPhase(id!);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
    if (!examen) return <div className="p-6 text-slate-500">Examen non trouvé.</div>;

    const handleTransition = async () => {
        if (!targetPhase) return;
        try {
            await transitionMutation.mutateAsync(targetPhase);
            setIsTransitionModalOpen(false);
        } catch {
            // Erreur gérée par le MutationCache (toast global)
        }
    };

    const openTransitionModal = (phase: ExamStatus) => {
        setTargetPhase(phase);
        setIsTransitionModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">{examen.libelle}</h1>
                            <StatusBadge status={examen.status} />
                        </div>
                        <p className="text-slate-500 text-sm">Session {examen.annee} — {examen.code}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {examen.status === 'CONFIG' && (
                        <Button onClick={() => openTransitionModal('INSCRIPTIONS')}>
                            <Play className="mr-2 h-4 w-4" />
                            Ouvrir Inscriptions
                        </Button>
                    )}
                    {examen.status === 'INSCRIPTIONS' && (
                        <Button onClick={() => openTransitionModal('COMPOSITION')}>
                            <Lock className="mr-2 h-4 w-4" />
                            Lancer Composition
                        </Button>
                    )}
                    {examen.status === 'COMPOSITION' && (
                        <Button onClick={() => openTransitionModal('CORRECTION')}>
                            <PenLine className="mr-2 h-4 w-4" />
                            Démarrer Correction
                        </Button>
                    )}
                    {examen.status === 'CORRECTION' && (
                        <Button onClick={() => openTransitionModal('DELIBERATION')}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Lancer Délibération
                        </Button>
                    )}
                    {examen.status === 'DELIBERATION' && (
                        <Button variant="success" onClick={() => openTransitionModal('DELIBERE')}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Valider Délibération
                        </Button>
                    )}
                    {examen.status === 'DELIBERE' && (
                        <Button variant="primary" onClick={() => openTransitionModal('PUBLIE')}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Publier Résultats
                        </Button>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Candidats</p>
                        <p className="text-2xl font-bold text-slate-900">--</p>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                        <School className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Centres</p>
                        <p className="text-2xl font-bold text-slate-900">--</p>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                        <Calculator className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Moyenne Générale</p>
                        <p className="text-2xl font-bold text-slate-900">--</p>
                    </div>
                </div>
            </div>

            {/* Contenu */}
            <div className="grid gap-6 lg:grid-cols-4">
                <nav className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start font-semibold bg-slate-100">
                        <Settings className="mr-3 h-4 w-4" /> Résumé
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-slate-500">
                        <BookOpen className="mr-3 h-4 w-4" /> Disciplines
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-slate-500">
                        <Users className="mr-3 h-4 w-4" /> Candidats
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-slate-500">
                        <History className="mr-3 h-4 w-4" /> Audit Log
                    </Button>
                </nav>

                <div className="lg:col-span-3 space-y-6">
                    <div className="rounded-lg border border-slate-200 p-6 bg-white shadow-sm">
                        <h3 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 text-slate-900">
                            Paramètres de Délibération
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-slate-500">Mode de Délibération</p>
                                <p className="font-medium text-slate-800">{examen.mode_deliberation}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Seuil Admissibilité</p>
                                <p className="font-medium text-slate-800">{examen.seuil_phase1} / 20</p>
                            </div>
                            {examen.seuil_phase2 !== null && (
                                <div>
                                    <p className="text-sm text-slate-500">Seuil Phase 2</p>
                                    <p className="font-medium text-slate-800">{examen.seuil_phase2} / 20</p>
                                </div>
                            )}
                            {examen.seuil_rattrapage !== null && (
                                <div>
                                    <p className="text-sm text-slate-500">Seuil Rattrapage</p>
                                    <p className="font-medium text-slate-800">{examen.seuil_rattrapage} / 20</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transition Modal */}
            <Modal
                open={isTransitionModalOpen}
                onOpenChange={setIsTransitionModalOpen}
                title="Confirmer le changement de phase"
                description={`Cette action est irréversible. L'examen passera en phase "${targetPhase}".`}
                variant="danger"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsTransitionModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleTransition}
                            isLoading={transitionMutation.isPending}
                        >
                            Confirmer
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Une fois confirmée, cette transition ne peut pas être annulée.
                    Assurez-vous que toutes les conditions préalables sont remplies.
                </p>
            </Modal>
        </div>
    );
}
