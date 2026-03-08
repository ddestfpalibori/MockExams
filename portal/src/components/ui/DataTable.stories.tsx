import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTable, type Column } from './DataTable';
import { Badge } from './Badge';

interface ExamenMock {
    id: string;
    code: string;
    libelle: string;
    annee: number;
    statut: string;
}

const mockExamens: ExamenMock[] = [
    { id: '1', code: 'BEPC-2026', libelle: 'BEPC Session 2026', annee: 2026, statut: 'INSCRIPTIONS' },
    { id: '2', code: 'BAC-2026', libelle: 'Baccalauréat Session 2026', annee: 2026, statut: 'CONFIG' },
    { id: '3', code: 'BEPC-2025', libelle: 'BEPC Session 2025', annee: 2025, statut: 'PUBLIE' },
    { id: '4', code: 'BAC-2025', libelle: 'Baccalauréat Session 2025', annee: 2025, statut: 'CLOS' },
];

const columns: Column<ExamenMock>[] = [
    { key: 'code', header: 'Code', cell: (row) => <span className="font-mono font-medium">{row.code}</span> },
    { key: 'libelle', header: 'Libellé', cell: (row) => row.libelle },
    { key: 'annee', header: 'Année', cell: (row) => row.annee },
    {
        key: 'statut', header: 'Statut', cell: (row) => (
            <Badge variant="outline">{row.statut}</Badge>
        )
    },
    {
        key: 'actions', header: 'Actions', cell: () => (
            <button className="text-brand-primary hover:underline text-xs">Voir</button>
        )
    },
];

const meta: Meta = {
    title: 'UI/DataTable',
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
};

export default meta;

export const WithData: StoryObj = {
    render: () => (
        <DataTable
            columns={columns}
            data={mockExamens}
            rowKey={(row) => row.id}
        />
    ),
};

export const Loading: StoryObj = {
    render: () => (
        <DataTable
            columns={columns}
            data={[]}
            isLoading
            rowKey={(row) => row.id}
        />
    ),
};

export const Empty: StoryObj = {
    render: () => (
        <DataTable
            columns={columns}
            data={[]}
            emptyMessage="Aucun examen trouvé"
            rowKey={(row) => row.id}
        />
    ),
};
