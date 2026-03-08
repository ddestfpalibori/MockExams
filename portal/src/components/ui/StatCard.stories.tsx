import type { Meta, StoryObj } from '@storybook/react-vite';
import { Users, BookOpen, Building2, AlertTriangle } from 'lucide-react';
import { StatCard } from './StatCard';

const meta: Meta<typeof StatCard> = {
    title: 'UI/StatCard',
    component: StatCard,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
        variant: {
            control: { type: 'select' },
            options: ['default', 'success', 'warning', 'danger'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
    args: {
        title: 'Total examens',
        value: 12,
        subtitle: '3 en cours',
        icon: <BookOpen size={18} />,
        variant: 'default',
    },
};

export const Success: Story = {
    args: {
        title: 'Candidats admis',
        value: '4 821',
        subtitle: '78% de réussite',
        icon: <Users size={18} />,
        variant: 'success',
    },
};

export const Warning: Story = {
    args: {
        title: 'Notes manquantes',
        value: 142,
        subtitle: 'Avant délibération',
        icon: <AlertTriangle size={18} />,
        variant: 'warning',
    },
};

export const Danger: Story = {
    args: {
        title: 'Erreurs import',
        value: 8,
        subtitle: 'À corriger',
        icon: <AlertTriangle size={18} />,
        variant: 'danger',
    },
};

export const AllVariants: Story = {
    render: () => (
        <div className="grid grid-cols-2 gap-4 w-[600px]">
            <StatCard
                title="Total examens"
                value={12}
                subtitle="3 en cours"
                icon={<BookOpen size={18} />}
                variant="default"
            />
            <StatCard
                title="Centres actifs"
                value={21}
                subtitle="Sur 25 centres"
                icon={<Building2 size={18} />}
                variant="success"
            />
            <StatCard
                title="Notes manquantes"
                value={142}
                subtitle="Avant délibération"
                icon={<AlertTriangle size={18} />}
                variant="warning"
            />
            <StatCard
                title="Erreurs import"
                value={8}
                subtitle="À corriger"
                icon={<AlertTriangle size={18} />}
                variant="danger"
            />
        </div>
    ),
};

export const WithoutIcon: Story = {
    args: {
        title: 'Total candidats',
        value: '8 247',
        variant: 'default',
    },
};
