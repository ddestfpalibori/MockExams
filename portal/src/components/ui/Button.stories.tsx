import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: { type: 'select' },
            options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'warning'],
        },
        size: {
            control: { type: 'select' },
            options: ['default', 'sm', 'lg', 'icon'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
    args: {
        children: 'Bouton Principal',
        variant: 'primary',
    },
};

export const Secondary: Story = {
    args: {
        children: 'Bouton Secondaire',
        variant: 'secondary',
    },
};

export const Success: Story = {
    args: {
        children: 'Admis (Succès)',
        variant: 'success',
    },
};

export const Danger: Story = {
    args: {
        children: 'Non Admis (Danger)',
        variant: 'danger',
    },
};

export const Outline: Story = {
    args: {
        children: 'Bouton Outline',
        variant: 'outline',
    },
};

export const Small: Story = {
    args: {
        children: 'Petit Bouton',
        size: 'sm',
    },
};

export const Large: Story = {
    args: {
        children: 'Grand Bouton',
        size: 'lg',
    },
};
