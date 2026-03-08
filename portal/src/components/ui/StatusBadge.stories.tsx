import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge, LotStatusBadge, ResultatStatusBadge } from './StatusBadge';
import type { ExamStatus, LotStatus, ResultatStatus } from '@/types/domain';

const meta: Meta = {
    title: 'UI/StatusBadge',
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
};

export default meta;

const EXAM_STATUSES: ExamStatus[] = [
    'CONFIG', 'INSCRIPTIONS', 'COMPOSITION', 'CORRECTION',
    'DELIBERATION', 'DELIBERE', 'CORRECTION_POST_DELIBERATION', 'PUBLIE', 'CLOS',
];

const LOT_STATUSES: LotStatus[] = ['EN_ATTENTE', 'EN_COURS', 'TERMINE', 'VERIFIE'];
const RESULTAT_STATUSES: ResultatStatus[] = ['ADMIS', 'NON_ADMIS', 'RATTRAPAGE'];

export const AllExamStatuses: StoryObj = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {EXAM_STATUSES.map((s) => <StatusBadge key={s} status={s} />)}
        </div>
    ),
};

export const AllLotStatuses: StoryObj = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {LOT_STATUSES.map((s) => <LotStatusBadge key={s} status={s} />)}
        </div>
    ),
};

export const AllResultatStatuses: StoryObj = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {RESULTAT_STATUSES.map((s) => <ResultatStatusBadge key={s} status={s} />)}
        </div>
    ),
};
