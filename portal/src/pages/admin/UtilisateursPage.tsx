import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/queries/useProfiles';
import { profileService } from '@/services/profiles';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Plus, UserX } from 'lucide-react';
import { toast } from 'sonner';
import type { ProfileRow, UserRole } from '@/types/domain';

const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrateur',
    chef_centre: 'Chef de Centre',
    chef_etablissement: 'Chef d\'Établissement',
    tutelle: 'Tutelle',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: 'chef_etablissement', label: 'Chef d\'Établissement' },
    { value: 'chef_centre', label: 'Chef de Centre' },
    { value: 'tutelle', label: 'Tutelle' },
    { value: 'admin', label: 'Administrateur' },
];

interface CreateForm {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    telephone: string;
    role: UserRole;
}

const EMPTY_FORM: CreateForm = {
    email: '',
    password: '',
    nom: '',
    prenom: '',
    telephone: '',
    role: 'chef_etablissement',
};

export default function UtilisateursPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: profiles, isLoading } = useProfiles();

    const [createOpen, setCreateOpen] = useState(false);
    const [disableTarget, setDisableTarget] = useState<ProfileRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!form.email || !form.password || !form.nom || !form.prenom) {
            toast.error('Tous les champs sont requis');
            return;
        }
        if (form.password.length < 8) {
            toast.error('Mot de passe trop court (8 caractères minimum)');
            return;
        }
        setSaving(true);
        try {
            await profileService.createUser({
                email: form.email,
                password: form.password,
                nom: form.nom,
                prenom: form.prenom,
                role: form.role,
                telephone: form.telephone || undefined,
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profiles.all });
            toast.success('Utilisateur créé avec succès');
            setCreateOpen(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async (profile: ProfileRow) => {
        setSaving(true);
        try {
            await profileService.disableUser(profile.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profiles.all });
            toast.success(`${profile.prenom} ${profile.nom} désactivé`);
            setDisableTarget(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const columns: Column<ProfileRow>[] = [
        {
            key: 'nom',
            header: 'Nom',
            cell: (row) => (
                <span className="font-medium text-slate-900">
                    {row.prenom} {row.nom}
                </span>
            ),
        },
        {
            key: 'role',
            header: 'Rôle',
            cell: (row) => (
                <Badge variant="secondary">
                    {ROLE_LABELS[row.role]}
                </Badge>
            ),
        },
        {
            key: 'telephone',
            header: 'Téléphone',
            cell: (row) => (
                <span className="text-sm text-slate-500">
                    {row.telephone ?? '—'}
                </span>
            ),
        },
        {
            key: 'is_active',
            header: 'Statut',
            cell: (row) => (
                row.is_active
                    ? <Badge variant="success">Actif</Badge>
                    : <Badge variant="danger">Désactivé</Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (row) => {
                const isSelf = row.id === user?.id;
                if (!row.is_active || isSelf) return null;
                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDisableTarget(row)}
                        title="Désactiver"
                        className="text-danger hover:bg-danger/10"
                    >
                        <UserX className="h-4 w-4" />
                    </Button>
                );
            },
        },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Utilisateurs</h1>
                    <p className="text-slate-500">Gérez les comptes et les rôles d'accès à la plateforme.</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvel utilisateur
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={profiles ?? []}
                rowKey={(row) => row.id}
                isLoading={isLoading}
                emptyMessage="Aucun utilisateur trouvé."
            />

            {/* Modal création */}
            <Modal
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Nouvel utilisateur"
                description="Créez un compte avec accès à la plateforme."
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreate} isLoading={saving}>
                            Créer
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Prénom" required>
                            <Input
                                value={form.prenom}
                                onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                                placeholder="Jean"
                                autoComplete="off"
                            />
                        </FormField>
                        <FormField label="Nom" required>
                            <Input
                                value={form.nom}
                                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                                placeholder="Dupont"
                                autoComplete="off"
                            />
                        </FormField>
                    </div>
                    <FormField label="Adresse email" required>
                        <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="jean.dupont@education.bj"
                            autoComplete="off"
                        />
                    </FormField>
                    <FormField label="Mot de passe provisoire" required>
                        <Input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                            placeholder="8 caractères minimum"
                            autoComplete="new-password"
                        />
                    </FormField>
                    <FormField label="Téléphone">
                        <Input
                            type="tel"
                            value={form.telephone}
                            onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                            placeholder="+229 97 000 000"
                            autoComplete="off"
                        />
                    </FormField>
                    <FormField label="Rôle" required>
                        <Select
                            value={form.role}
                            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                        >
                            {ROLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                </div>
            </Modal>

            {/* Modal désactivation */}
            <Modal
                open={!!disableTarget}
                onOpenChange={(o) => { if (!o) setDisableTarget(null); }}
                title="Désactiver l'utilisateur"
                variant="danger"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDisableTarget(null)}>
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => disableTarget && handleDisable(disableTarget)}
                            isLoading={saving}
                        >
                            Désactiver
                        </Button>
                    </div>
                }
            >
                <p className="text-slate-600">
                    Êtes-vous sûr de vouloir désactiver le compte de{' '}
                    <strong>{disableTarget?.prenom} {disableTarget?.nom}</strong> ?
                    L'utilisateur ne pourra plus se connecter.
                </p>
            </Modal>
        </div>
    );
}
