import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField, Input, Textarea, Select } from './FormField';

const meta: Meta = {
    title: 'UI/FormField',
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
};

export default meta;

export const Default: StoryObj = {
    render: () => (
        <div className="w-80 space-y-4">
            <FormField label="Libellé de l'examen" required>
                <Input placeholder="Ex: BEPC Session 2026" />
            </FormField>
        </div>
    ),
};

export const WithHint: StoryObj = {
    render: () => (
        <div className="w-80">
            <FormField label="Code examen" hint="Format: TYPE-ANNEE (ex: BEPC-2026)">
                <Input placeholder="BEPC-2026" />
            </FormField>
        </div>
    ),
};

export const WithError: StoryObj = {
    render: () => (
        <div className="w-80">
            <FormField label="Email" error="Format email invalide" required>
                <Input type="email" defaultValue="invalide" />
            </FormField>
        </div>
    ),
};

export const WithSelect: StoryObj = {
    render: () => (
        <div className="w-80">
            <FormField label="Mode de délibération" required>
                <Select>
                    <option value="">Choisir…</option>
                    <option value="unique">Phase unique</option>
                    <option value="deux_phases">Deux phases</option>
                </Select>
            </FormField>
        </div>
    ),
};

export const WithTextarea: StoryObj = {
    render: () => (
        <div className="w-80">
            <FormField label="Observations" hint="Optionnel — max 500 caractères">
                <Textarea placeholder="Remarques particulières…" />
            </FormField>
        </div>
    ),
};

export const CompleteForm: StoryObj = {
    render: () => (
        <div className="w-96 space-y-4 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Créer un examen</h3>
            <FormField label="Code" required hint="Format: TYPE-ANNEE">
                <Input placeholder="BEPC-2026" />
            </FormField>
            <FormField label="Libellé" required>
                <Input placeholder="BEPC Session 2026" />
            </FormField>
            <FormField label="Année" required>
                <Input type="number" placeholder="2026" />
            </FormField>
            <FormField label="Mode délibération" required error="Champ requis">
                <Select>
                    <option value="">Choisir…</option>
                    <option value="unique">Phase unique</option>
                    <option value="deux_phases">Deux phases</option>
                </Select>
            </FormField>
        </div>
    ),
};
