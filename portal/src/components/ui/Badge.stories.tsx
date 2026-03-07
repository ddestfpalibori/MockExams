import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
    title: 'UI/Badge',
    component: Badge,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: { type: 'select' },
            options: ['default', 'secondary', 'outline', 'success', 'danger', 'warning', 'subtle'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {
        children: 'Badge Défaut',
        variant: 'default',
    },
};

export const Success: Story = {
    args: {
        children: 'Admis',
        variant: 'success',
    },
};

export const Danger: Story = {
    args: {
        children: 'Échoué',
        variant: 'danger',
    },
};

export const Warning: Story = {
    args: {
        children: 'En attente',
        variant: 'warning',
    },
};

export const Subtle: Story = {
    args: {
        children: 'Info subtile',
        variant: 'subtle',
    },
};
