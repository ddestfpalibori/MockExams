import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormField, Input } from './FormField';

const meta: Meta = {
    title: 'UI/Modal',
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
};

export default meta;

export const Default: StoryObj = {
    render: () => {
        const [open, setOpen] = useState(false);
        return (
            <>
                <Button onClick={() => setOpen(true)}>Ouvrir modal</Button>
                <Modal
                    open={open}
                    onOpenChange={setOpen}
                    title="Créer un utilisateur"
                    description="Remplissez les informations du nouvel utilisateur."
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button variant="primary" onClick={() => setOpen(false)}>Créer</Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <FormField label="Nom" required>
                            <Input placeholder="Dupont" />
                        </FormField>
                        <FormField label="Email" required>
                            <Input type="email" placeholder="dupont@example.com" />
                        </FormField>
                    </div>
                </Modal>
            </>
        );
    },
};

export const DangerConfirmation: StoryObj = {
    render: () => {
        const [open, setOpen] = useState(false);
        return (
            <>
                <Button variant="danger" onClick={() => setOpen(true)}>Désactiver l'utilisateur</Button>
                <Modal
                    open={open}
                    onOpenChange={setOpen}
                    title="Désactiver l'utilisateur ?"
                    description="Cette action est irréversible. L'utilisateur ne pourra plus se connecter."
                    variant="danger"
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button variant="danger" onClick={() => setOpen(false)}>Confirmer la désactivation</Button>
                        </>
                    }
                >
                    <p className="text-sm text-slate-600">
                        L'utilisateur <strong>Jean Dupont</strong> sera immédiatement désactivé.
                        Ses données seront conservées mais son accès sera révoqué.
                    </p>
                </Modal>
            </>
        );
    },
};

export const IrreversibleTransition: StoryObj = {
    render: () => {
        const [open, setOpen] = useState(false);
        return (
            <>
                <Button onClick={() => setOpen(true)}>Ouvrir inscriptions</Button>
                <Modal
                    open={open}
                    onOpenChange={setOpen}
                    title="Ouvrir les inscriptions ?"
                    description="Cette transition est irréversible."
                    variant="danger"
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button variant="danger" onClick={() => setOpen(false)}>
                                Confirmer — Ouvrir les inscriptions
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-3 text-sm text-slate-600">
                        <p>
                            Une fois les inscriptions ouvertes, il ne sera plus possible de revenir
                            en phase de configuration.
                        </p>
                        <p className="font-medium text-slate-700">
                            Les établissements pourront alors soumettre leurs listes de candidats.
                        </p>
                    </div>
                </Modal>
            </>
        );
    },
};
