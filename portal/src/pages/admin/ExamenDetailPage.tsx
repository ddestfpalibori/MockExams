import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ExamenRow } from '@/types/domain';
import {
    useExamenDetail,
    useExamenDetailStats,
    useTransitionPhase,
    useDeliberation,
    useExamenCentres,
} from '@/hooks/queries/useExamens';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ExamenTabDisciplines } from './ExamenTabDisciplines';
import { ExamenTabCentres } from './ExamenTabCentres';
import { ReleveNotesModal } from '@/components/releves/ReleveNotesModal';
import { cn } from '@/lib/utils';
import {
    Settings,
    Users,
    School,
    BookOpen,
    Play,
    CheckCircle2,
    Lock,
    PenLine,
    Edit,
    RotateCcw,
    Archive,
    FileText,
} from 'lucide-react';
import type { ExamStatus, CentreRow } from '@/types/domain';

const STATUTS_RELEVES: ExamStatus[] = ['DELIBERATION', 'DELIBERE', 'PUBLIE', 'CLOS'];

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'resume' | 'disciplines' | 'centres';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
    { id: 'resume', label: 'Résumé', icon: <Settings className="h-4 w-4" /> },
    { id: 'disciplines', label: 'Disciplines', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'centres', label: 'Centres', icon: <School className="h-4 w-4" /> },
];

// Libellés lisibles pour les valeurs d'enum
const DELIB_MODE_LABELS: Record<string, string> = {
    unique: 'Phase unique',
    deux_phases: 'Deux phases',
};

const PHASE_LABELS: Record<ExamStatus, string> = {
    CONFIG: 'Configuration',
    INSCRIPTIONS: 'Inscriptions ouvertes',
    COMPOSITION: 'Composition',
    CORRECTION: 'Correction',
    DELIBERATION: 'Délibération',
    DELIBERE: 'Délibéré',
    CORRECTION_POST_DELIBERATION: 'Correction post-délibération',
    PUBLIE: 'Résultats publiés',
    CLOS: 'Examen clos',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ExamenDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('resume');
    const [transitionTarget, setTransitionTarget] = useState<ExamStatus | null>(null);
    const [releveOpen, setReleveOpen] = useState(false);

    const { data: examen, isLoading } = useExamenDetail(id!);
    const { data: stats, isLoading: statsLoading } = useExamenDetailStats(id!);
    const { data: centresData } = useExamenCentres(id!);
    const transitionMutation = useTransitionPhase(id!);
    const delibererMutation = useDeliberation(id!);
    const { user, role } = useAuth();
    const [deliberationErrors, setDeliberationErrors] = useState<Array<{ candidat_id: string; message: string }>>([]);

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
    }
    if (!examen) {
        return <div className="p-6 text-slate-500">Examen non trouvé.</div>;
    }

    const isConfig = examen.status === 'CONFIG';
    const peutVoirReleves = STATUTS_RELEVES.includes(examen.status);
    const canOpenInscriptions = !statsLoading
        && (stats?.nb_disciplines ?? 0) > 0
        && (stats?.nb_centres ?? 0) > 0;

    const handleTransition = async () => {
        if (!transitionTarget) return;
        try {
            await transitionMutation.mutateAsync(transitionTarget);
            setTransitionTarget(null);
            setDeliberationErrors([]);
        } catch {
            // Erreur capturée par le MutationCache (toast global)
        }
    };

    // Délibération : F03 d'abord, puis modal de confirmation pour la transition DELIBERE
    const handleDeliberer = async () => {
        if (!user) return;
        try {
            const result = await delibererMutation.mutateAsync(user.id) as { erreurs?: Array<{ candidat_id: string; message: string }> } | null;
            setDeliberationErrors(result?.erreurs ?? []);
            setTransitionTarget('DELIBERE');
        } catch {
            // Erreur capturée par le MutationCache (toast global)
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── En-tête ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold">{examen.libelle}</h1>
                        <StatusBadge status={examen.status} />
                    </div>
                    <p className="text-secondary text-sm mt-0.5">
                        Session {examen.annee} — <span className="font-mono">{examen.code}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {peutVoirReleves && (
                        <Button variant="outline" size="sm" onClick={() => setReleveOpen(true)}>
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Relevés de notes
                        </Button>
                    )}
                    {isConfig && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/examens/${id}/edit`)}>
                            <Edit className="mr-1.5 h-3.5 w-3.5" />
                            Modifier
                        </Button>
                    )}
                    {examen.status === 'CONFIG' && (
                        <Button
                            onClick={() => setTransitionTarget('INSCRIPTIONS')}
                            disabled={!canOpenInscriptions}
                            title={
                                !canOpenInscriptions
                                    ? 'Configurez au moins une discipline et un centre avant d\'ouvrir les inscriptions'
                                    : undefined
                            }
                        >
                            <Play className="mr-2 h-4 w-4" />
                            Ouvrir Inscriptions
                        </Button>
                    )}
                    {examen.status === 'INSCRIPTIONS' && (
                        <Button onClick={() => setTransitionTarget('COMPOSITION')}>
                            <Lock className="mr-2 h-4 w-4" />
                            Lancer Composition
                        </Button>
                    )}
                    {examen.status === 'COMPOSITION' && (
                        <Button onClick={() => setTransitionTarget('CORRECTION')}>
                            <PenLine className="mr-2 h-4 w-4" />
                            Démarrer Correction
                        </Button>
                    )}
                    {examen.status === 'CORRECTION' && (
                        <Button onClick={() => setTransitionTarget('DELIBERATION')}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Lancer Délibération
                        </Button>
                    )}
                    {examen.status === 'DELIBERATION' && (
                        <Button variant="success" onClick={handleDeliberer} isLoading={delibererMutation.isPending}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Valider Délibération
                        </Button>
                    )}
                    {examen.status === 'DELIBERE' && (
                        <>
                            <Button variant="outline" onClick={() => setTransitionTarget('CORRECTION_POST_DELIBERATION')}>
                                <PenLine className="mr-2 h-4 w-4" />
                                Correction complémentaire
                            </Button>
                            <Button onClick={() => setTransitionTarget('PUBLIE')}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Publier Résultats
                            </Button>
                        </>
                    )}
                    {examen.status === 'CORRECTION_POST_DELIBERATION' && (
                        <>
                            <Button variant="success" onClick={handleDeliberer} isLoading={delibererMutation.isPending}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Re-délibérer
                            </Button>
                            <Button onClick={() => setTransitionTarget('PUBLIE')}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Publier Résultats
                            </Button>
                        </>
                    )}
                    {examen.status === 'PUBLIE' && (
                        <Button variant="outline" onClick={() => setTransitionTarget('CLOS')}>
                            <Archive className="mr-2 h-4 w-4" />
                            Clore l'examen
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Stats rapides ────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    title="Candidats inscrits"
                    value={stats?.nb_candidats ?? 0}
                    icon={<Users className="h-4 w-4" />}
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Centres associés"
                    value={stats?.nb_centres ?? 0}
                    icon={<School className="h-4 w-4" />}
                    variant="warning"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Disciplines configurées"
                    value={stats?.nb_disciplines ?? 0}
                    icon={<BookOpen className="h-4 w-4" />}
                    variant="success"
                    isLoading={statsLoading}
                />
            </div>

            {/* ── Onglets ──────────────────────────────────────────────────── */}
            <div className="space-y-4">
                {/* Barre de navigation */}
                <div className="flex gap-1 border-b border-border">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                                activeTab === tab.id
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-secondary hover:text-primary hover:border-border',
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Contenu */}
                <div className="rounded-lg border border-border bg-surface shadow-sm p-6">
                    {activeTab === 'resume' && (
                        <ResumeTab examen={examen} />
                    )}
                    {activeTab === 'disciplines' && (
                        <ExamenTabDisciplines examenId={id!} isEditable={isConfig} />
                    )}
                    {activeTab === 'centres' && (
                        <ExamenTabCentres examenId={id!} isEditable={isConfig} />
                    )}
                </div>
            </div>

            {/* ── Modal transition de phase ────────────────────────────────── */}
            <Modal
                open={!!transitionTarget}
                onOpenChange={(o) => { if (!o) { setTransitionTarget(null); setDeliberationErrors([]); } }}
                title="Confirmer le changement de phase"
                description={`L'examen passera en phase « ${transitionTarget ? PHASE_LABELS[transitionTarget] : ''} ». Cette action est irréversible.`}
                variant="danger"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setTransitionTarget(null); setDeliberationErrors([]); }}>
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleTransition}
                            isLoading={transitionMutation.isPending}
                        >
                            Confirmer
                        </Button>
                    </div>
                }
            >
                {deliberationErrors.length > 0 ? (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                            La délibération a été effectuée avec <strong>{deliberationErrors.length} anomalie(s)</strong>. Vérifiez les candidats concernés avant de confirmer la transition.
                        </p>
                        <ul className="max-h-40 overflow-y-auto rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1">
                            {deliberationErrors.map((e) => (
                                <li key={e.candidat_id} className="text-xs text-amber-800">
                                    Candidat {e.candidat_id} : {e.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-sm text-slate-600">
                        Assurez-vous que toutes les conditions préalables sont remplies avant de continuer.
                    </p>
                )}
            </Modal>

            {peutVoirReleves && role && (
                <ReleveNotesModal
                    open={releveOpen}
                    onOpenChange={setReleveOpen}
                    examenId={examen.id}
                    examenLibelle={examen.libelle}
                    examenAnnee={examen.annee}
                    userRole={role}
                    centres={(centresData ?? []) as CentreRow[]}
                />
            )}
        </div>
    );
}

// ── Onglet Résumé (inline — données statiques de l'examen) ────────────────────

function ResumeTab({ examen }: { examen: ExamenRow }) {
    const items: { label: string; value: string }[] = [
        { label: 'Mode de délibération', value: DELIB_MODE_LABELS[examen.mode_deliberation] ?? examen.mode_deliberation },
        { label: 'Seuil admissibilité', value: `${examen.seuil_phase1} / 20` },
        ...(examen.seuil_phase2 !== null
            ? [{ label: 'Seuil phase 2', value: `${examen.seuil_phase2} / 20` }]
            : []),
        ...(examen.seuil_rattrapage !== null
            ? [{ label: 'Seuil rattrapage', value: `${examen.seuil_rattrapage} / 20` }]
            : []),
        {
            label: 'Options actives', value: [
                examen.oral_actif ? 'Oral' : null,
                examen.eps_active ? 'EPS' : null,
                examen.facultatif_actif ? 'Facultatif' : null,
                examen.rattrapage_actif ? 'Rattrapage' : null,
            ].filter(Boolean).join(', ') || 'Aucune'
        },
    ];

    return (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold border-b border-slate-100 pb-3 mb-3">
                Paramètres de délibération
            </h3>
            <dl className="divide-y divide-slate-50">
                {items.map((item) => (
                    <div key={item.label} className="flex justify-between py-2.5">
                        <dt className="text-sm text-secondary w-52 flex-shrink-0">{item.label}</dt>
                        <dd className="text-sm font-medium text-primary text-right">{item.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

