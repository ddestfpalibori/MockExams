import type { BadgeProps } from './Badge';
import { Badge } from './Badge';
import type { ExamStatus, LotStatus, ResultatStatus } from '@/types/domain';

type BadgeVariant = BadgeProps['variant'];

// ─── Machine d'états examen (9 phases) ─────────────────────────────────────
const EXAM_STATUS_CONFIG: Record<ExamStatus, { label: string; variant: BadgeVariant }> = {
    CONFIG: { label: 'Configuration', variant: 'outline' },
    INSCRIPTIONS: { label: 'Inscriptions', variant: 'secondary' },
    COMPOSITION: { label: 'Composition', variant: 'warning' },
    CORRECTION: { label: 'Correction', variant: 'warning' },
    DELIBERATION: { label: 'Délibération', variant: 'warning' },
    DELIBERE: { label: 'Délibéré', variant: 'subtle' },
    CORRECTION_POST_DELIBERATION: { label: 'Corr. post-délib.', variant: 'danger' },
    PUBLIE: { label: 'Publié', variant: 'success' },
    CLOS: { label: 'Clos', variant: 'default' },
};

const LOT_STATUS_CONFIG: Record<LotStatus, { label: string; variant: BadgeVariant }> = {
    EN_ATTENTE: { label: 'En attente', variant: 'outline' },
    EN_COURS: { label: 'En cours', variant: 'warning' },
    TERMINE: { label: 'Terminé', variant: 'success' },
    VERIFIE: { label: 'Vérifié', variant: 'subtle' },
};

const RESULTAT_STATUS_CONFIG: Record<ResultatStatus, { label: string; variant: BadgeVariant }> = {
    ADMIS: { label: 'Admis', variant: 'success' },
    NON_ADMIS: { label: 'Non admis', variant: 'danger' },
    RATTRAPAGE: { label: 'Rattrapage', variant: 'warning' },
};

// ─── Composants spécialisés ──────────────────────────────────────────────────
export function StatusBadge({ status }: { status: ExamStatus }) {
    const config = EXAM_STATUS_CONFIG[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function LotStatusBadge({ status }: { status: LotStatus }) {
    const config = LOT_STATUS_CONFIG[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ResultatStatusBadge({ status }: { status: ResultatStatus }) {
    const config = RESULTAT_STATUS_CONFIG[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
}
