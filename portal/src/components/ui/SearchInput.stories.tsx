import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
    title: 'UI/SearchInput',
    component: SearchInput,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
    render: () => {
        const [query, setQuery] = useState('');
        return (
            <div className="w-72 space-y-2">
                <SearchInput placeholder="Rechercher un candidat…" onSearch={setQuery} />
                <p className="text-sm text-slate-500">Valeur debouncée : «{query}»</p>
            </div>
        );
    },
};

export const WithDefaultValue: Story = {
    render: () => {
        const [query, setQuery] = useState('BEPC');
        return (
            <div className="w-72 space-y-2">
                <SearchInput
                    placeholder="Rechercher un examen…"
                    onSearch={setQuery}
                    defaultValue="BEPC"
                />
                <p className="text-sm text-slate-500">Valeur : «{query}»</p>
            </div>
        );
    },
};
