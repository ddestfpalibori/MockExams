import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useWatch, Controller, type SubmitHandler, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useExamenDetail, useCreateExamen, useUpdateExamen } from '@/hooks/queries/useExamens';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Check, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const schema = z.object({
    // Étape 1 — Identification
    code: z.string().min(2, 'Minimum 2 caractères').max(30, 'Maximum 30 caractères'),
    libelle: z.string().min(3, 'Minimum 3 caractères'),
    annee: z.number().int().min(2000, 'Année invalide').max(2100, 'Année invalide'),

    // Étape 2 — Composition
    anonymat_actif: z.boolean(),
    anonymat_prefixe: z.string().max(10, 'Max 10 caractères'),
    anonymat_debut: z.number().int().min(1, 'Minimum 1'),
    anonymat_bon: z.number().int().refine((v) => [1, 3, 5].includes(v), 'Valeurs autorisées : 1, 3 ou 5'),
    taille_salle_ref: z.number().int().min(1, 'Minimum 1 place'),
    distribution_model: z.enum(['A', 'B'] as const),
    hmac_window_days: z.number().int().min(1, 'Minimum 1').max(365, 'Maximum 365 jours'),
    date_composition_debut: z.string().nullable(),
    date_composition_fin: z.string().nullable(),

    // Configuration Numéros de Table
    table_prefix_type: z.enum(['AUCUN', 'FIXE', 'CENTRE', 'COMMUNE', 'DEPARTEMENT'] as const),
    table_prefix_valeur: z.string().nullable(),
    table_separator: z.string().min(1, 'Requis'),
    table_padding: z.number().int().min(1).max(10),
    table_continuity_scope: z.enum(['CENTRE', 'DEPARTEMENT', 'EXAMEN'] as const),

    // Étape 3 — Délibération & Options
    mode_deliberation: z.enum(['unique', 'deux_phases'] as const),
    seuil_phase1: z.number().min(0, 'Entre 0 et 20').max(20, 'Entre 0 et 20'),
    seuil_phase2: z.number().min(0, 'Entre 0 et 20').max(20, 'Entre 0 et 20'),
    seuil_rattrapage: z.number().min(0, 'Entre 0 et 20').max(20, 'Entre 0 et 20').nullable().optional(),
    rattrapage_actif: z.boolean(),
    oral_actif: z.boolean(),
    eps_active: z.boolean(),
    facultatif_actif: z.boolean(),
})
    // Dates cohérentes : début <= fin
    .refine(
        (v) => !v.date_composition_debut || !v.date_composition_fin
            || v.date_composition_debut <= v.date_composition_fin,
        { message: 'La date de fin doit être postérieure ou égale au début', path: ['date_composition_fin'] }
    )
    // Seuil phase 1 <= phase 2 (si deux phases)
    .refine(
        (v) => v.mode_deliberation !== 'deux_phases' || v.seuil_phase1 <= v.seuil_phase2,
        { message: 'Le seuil phase 1 doit être inférieur ou égal au seuil phase 2', path: ['seuil_phase1'] }
    )
    // Seuil rattrapage strictement inférieur au seuil phase 2 (contrainte DB)
    .refine(
        (v) => !v.rattrapage_actif || v.seuil_rattrapage == null
            || v.seuil_rattrapage < v.seuil_phase2,
        { message: 'Le seuil rattrapage doit être inférieur au seuil phase 2', path: ['seuil_rattrapage'] }
    )
    // Valeur fixe requise si mode FIXE
    .refine(
        (v) => v.table_prefix_type !== 'FIXE'
            || (v.table_prefix_valeur != null && v.table_prefix_valeur.trim().length > 0),
        { message: 'La valeur fixe est requise en mode FIXE', path: ['table_prefix_valeur'] }
    )
    // Préfixe anonymat requis seulement si anonymat activé
    .refine(
        (v) => !v.anonymat_actif || v.anonymat_prefixe.trim().length >= 1,
        { message: 'Requis', path: ['anonymat_prefixe'] }
    );

type FormValues = z.infer<typeof schema>;

// ── Constantes ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Identification', 'Composition', 'Délibération', 'Confirmation'] as const;

const DEFAULT_VALUES: FormValues = {
    code: '',
    libelle: '',
    annee: new Date().getFullYear(),
    anonymat_actif: true,
    anonymat_prefixe: 'AN',
    anonymat_debut: 1,
    anonymat_bon: 1,
    taille_salle_ref: 50,
    distribution_model: 'A',
    hmac_window_days: 30,
    date_composition_debut: null,
    date_composition_fin: null,
    table_prefix_type: 'CENTRE',
    table_prefix_valeur: null,
    table_separator: '-',
    table_padding: 4,
    table_continuity_scope: 'CENTRE',
    mode_deliberation: 'unique',
    seuil_phase1: 10,
    seuil_phase2: 12,
    seuil_rattrapage: 8,
    rattrapage_actif: false,
    oral_actif: false,
    eps_active: false,
    facultatif_actif: false,
};

// ── Sous-composants ───────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
    return (
        <nav aria-label="Étapes du formulaire" className="flex items-start justify-center">
            {STEP_LABELS.map((label, i) => {
                const step = i + 1;
                const done = step < current;
                const active = step === current;
                return (
                    <div key={step} className="flex items-center">
                        {i > 0 && (
                            <div className={cn(
                                'h-px w-8 sm:w-16 mt-4 flex-shrink-0',
                                done ? 'bg-brand-primary' : 'bg-slate-200',
                            )} />
                        )}
                        <div className="flex flex-col items-center gap-1.5">
                            <div className={cn(
                                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                                done && 'bg-brand-primary border-brand-primary text-white',
                                active && 'border-brand-primary text-brand-primary bg-brand-primary/5',
                                !done && !active && 'border-border text-muted bg-surface',
                            )}>
                                {done ? <Check className="h-4 w-4" /> : step}
                            </div>
                            <span className={cn(
                                'text-xs font-medium text-center hidden sm:block',
                                active && 'text-brand-primary',
                                done && 'text-slate-600',
                                !done && !active && 'text-slate-400',
                            )}>
                                {label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </nav>
    );
}

interface ToggleFieldProps {
    control: Control<FormValues>;
    name: keyof Pick<FormValues, 'rattrapage_actif' | 'oral_actif' | 'eps_active' | 'facultatif_actif' | 'anonymat_actif'>;
    label: string;
    hint?: string;
}

function ToggleField({ control, name, label, hint }: ToggleFieldProps) {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative flex-shrink-0">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={field.value as boolean}
                            onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <div className={cn(
                            'w-10 h-6 rounded-full transition-colors',
                            field.value ? 'bg-brand-primary' : 'bg-slate-200 group-hover:bg-slate-300',
                        )} />
                        <div className={cn(
                            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                            field.value && 'translate-x-4',
                        )} />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-primary">{label}</span>
                        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
                    </div>
                </label>
            )}
        />
    );
}

function ConfirmationStep({ control }: { control: Control<FormValues> }) {
    const values = useWatch({ control });

    const rows: { label: string; value: string }[] = [
        { label: 'Code', value: values.code ?? '' },
        { label: 'Intitulé', value: values.libelle ?? '' },
        { label: 'Année de session', value: String(values.annee ?? '') },
        { label: 'Anonymat', value: values.anonymat_actif ? 'Activé' : 'Désactivé (identifiant = numéro de table)' },
        ...(values.anonymat_actif ? [
            { label: 'Préfixe anonymat', value: values.anonymat_prefixe ?? '' },
            { label: 'N° de départ', value: String(values.anonymat_debut ?? '') },
            { label: 'Bon de correction', value: String(values.anonymat_bon ?? '') },
        ] : []),
        { label: 'Taille salle référence', value: `${values.taille_salle_ref ?? ''} places` },
        { label: 'Modèle distribution', value: values.distribution_model ?? '' },
        { label: 'Validité de la signature', value: `${values.hmac_window_days ?? ''} jours` },
        { label: 'Début composition', value: values.date_composition_debut || '—' },
        { label: 'Fin composition', value: values.date_composition_fin || '—' },
        { label: 'Préfixe Table', value: values.table_prefix_type ?? '—' },
        { label: 'Continuité Table', value: values.table_continuity_scope ?? '—' },
        { label: 'Mode délibération', value: values.mode_deliberation === 'deux_phases' ? 'Deux phases' : 'Phase unique' },
        { label: 'Seuil admissibilité', value: `${values.seuil_phase1 ?? ''} / 20` },
        ...(values.mode_deliberation === 'deux_phases'
            ? [{ label: 'Seuil phase 2', value: `${values.seuil_phase2 ?? ''} / 20` }]
            : []),
        ...(values.rattrapage_actif
            ? [{ label: 'Seuil rattrapage', value: `${values.seuil_rattrapage ?? ''} / 20` }]
            : []),
        {
            label: 'Options actives', value: [
                values.oral_actif ? 'Oral' : null,
                values.eps_active ? 'EPS' : null,
                values.facultatif_actif ? 'Facultatif' : null,
                values.rattrapage_actif ? 'Rattrapage' : null,
            ].filter(Boolean).join(', ') || 'Aucune',
        },
    ];

    return (
        <>
            <h2 className="text-lg font-semibold border-b border-slate-100 pb-3">
                Récapitulatif avant validation
            </h2>
            <p className="text-sm text-secondary mb-4">
                Vérifiez les paramètres ci-dessous avant de confirmer.
            </p>
            <dl className="space-y-0 divide-y divide-border/50">
                {rows.map((row) => (
                    <div key={row.label} className="flex justify-between py-2.5">
                        <dt className="text-sm text-secondary w-48 flex-shrink-0">{row.label}</dt>
                        <dd className="text-sm font-medium text-primary text-right">{row.value}</dd>
                    </div>
                ))}
            </dl>
        </>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ExamenFormPage() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = !!id;

    const [step, setStep] = useState(1);

    const { data: examen, isLoading: loadingExamen } = useExamenDetail(id ?? '');
    const createMutation = useCreateExamen();
    const updateMutation = useUpdateExamen(id ?? '');

    const {
        register,
        handleSubmit,
        trigger,
        reset,
        control,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: DEFAULT_VALUES,
    });

    // Champs conditionnels (réactifs)
    const modeDelib = useWatch({ control, name: 'mode_deliberation' });
    const rattrapageActif = useWatch({ control, name: 'rattrapage_actif' });
    const anonymatActif = useWatch({ control, name: 'anonymat_actif' });

    // Préremplissage en mode édition
    useEffect(() => {
        if (isEdit && examen) {
            reset({
                code: examen.code,
                libelle: examen.libelle,
                annee: examen.annee,
                anonymat_actif: examen.anonymat_actif ?? true,
                anonymat_prefixe: examen.anonymat_prefixe,
                anonymat_debut: examen.anonymat_debut,
                anonymat_bon: examen.anonymat_bon,
                taille_salle_ref: examen.taille_salle_ref,
                distribution_model: examen.distribution_model,
                hmac_window_days: examen.hmac_window_days,
                date_composition_debut: examen.date_composition_debut,
                date_composition_fin: examen.date_composition_fin,
                mode_deliberation: examen.mode_deliberation,
                seuil_phase1: examen.seuil_phase1,
                seuil_phase2: examen.seuil_phase2,
                seuil_rattrapage: examen.seuil_rattrapage ?? null,
                rattrapage_actif: examen.rattrapage_actif,
                oral_actif: examen.oral_actif,
                eps_active: examen.eps_active,
                facultatif_actif: examen.facultatif_actif,
                table_prefix_type: examen.table_prefix_type ?? 'CENTRE',
                table_prefix_valeur: examen.table_prefix_valeur ?? null,
                table_separator: examen.table_separator ?? '-',
                table_padding: examen.table_padding ?? 4,
                table_continuity_scope: examen.table_continuity_scope ?? 'CENTRE',
            });
        }
    }, [isEdit, examen, reset]);

    // Validation partielle par étape (uniquement les champs visibles)
    const handleNext = async () => {
        let valid = false;
        if (step === 1) {
            valid = await trigger(['code', 'libelle', 'annee']);
        } else if (step === 2) {
            valid = await trigger([
                'anonymat_prefixe', 'anonymat_debut', 'anonymat_bon',
                'taille_salle_ref', 'distribution_model', 'hmac_window_days',
                'table_prefix_type', 'table_prefix_valeur', 'table_separator', 'table_padding', 'table_continuity_scope',
                'date_composition_debut', 'date_composition_fin',
            ]);
        } else if (step === 3) {
            const fields: (keyof FormValues)[] = ['mode_deliberation', 'seuil_phase1'];
            if (modeDelib === 'deux_phases') fields.push('seuil_phase2');
            if (rattrapageActif) fields.push('seuil_rattrapage');
            valid = await trigger(fields);
        } else {
            valid = true;
        }
        if (valid) setStep((s) => s + 1);
    };

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        const payload = {
            ...values,
            seuil_phase2: values.mode_deliberation === 'deux_phases' ? values.seuil_phase2 : values.seuil_phase1,
            seuil_rattrapage: values.rattrapage_actif ? values.seuil_rattrapage : null,
            date_composition_debut: values.date_composition_debut || null,
            date_composition_fin: values.date_composition_fin || null,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync(payload);
                navigate(`/admin/examens/${id}`);
            } else {
                const created = await createMutation.mutateAsync({
                    ...payload,
                    created_by: user?.id ?? null,
                });
                navigate(`/admin/examens/${created.id}`);
            }
        } catch {
            // Erreur capturée par le MutationCache global (toast)
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (isEdit && loadingExamen) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* En-tête */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {isEdit ? 'Modifier l\'examen' : 'Nouvel examen'}
                </h1>
                <p className="text-secondary mt-1">
                    {isEdit
                        ? `Modification de « ${examen?.libelle} »`
                        : 'Configurez les paramètres de la session d\'examens en 4 étapes.'}
                </p>
            </div>

            {/* Stepper */}
            <Stepper current={step} />

            {/* Formulaire */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-5">

                    {/* ── Étape 1 — Identification ─────────────────────────────── */}
                    {step === 1 && (
                        <>
                            <h2 className="text-base font-semibold border-b border-slate-100 pb-3">
                                Identification de l'examen
                            </h2>
                            <FormField label="Code examen" required error={errors.code?.message}
                                hint="Court identifiant unique. Ex: BEPC-2026">
                                <Input
                                    {...register('code')}
                                    placeholder="BEPC-2026"
                                />
                            </FormField>
                            <FormField label="Intitulé complet" required error={errors.libelle?.message}>
                                <Input
                                    {...register('libelle')}
                                    placeholder="Brevet d'Études du Premier Cycle"
                                />
                            </FormField>
                            <FormField label="Année de session" required error={errors.annee?.message}>
                                <Input
                                    type="number"
                                    {...register('annee', { valueAsNumber: true })}
                                    placeholder={String(new Date().getFullYear())}
                                    min={2000}
                                    max={2100}
                                    className="max-w-xs"
                                />
                            </FormField>
                        </>
                    )}

                    {/* ── Étape 2 — Paramètres de composition ──────────────────── */}
                    {step === 2 && (
                        <>
                            <h2 className="text-base font-semibold border-b border-slate-100 pb-3">
                                Paramètres de composition
                            </h2>

                            <div className="pt-2 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Numérotation des tables
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Portée du préfixe" required hint="Origine du code préfixe">
                                        <Select {...register('table_prefix_type')}>
                                            <option value="AUCUN">Aucun (Numéro pur)</option>
                                            <option value="FIXE">Texte fixe personnalisé</option>
                                            <option value="CENTRE">Code du Centre</option>
                                            <option value="COMMUNE">Code de la Commune</option>
                                            <option value="DEPARTEMENT">Code du Département</option>
                                        </Select>
                                    </FormField>

                                    <FormField label="Continuité" required hint="Étendue de la suite de numéros">
                                        <Select {...register('table_continuity_scope')}>
                                            <option value="CENTRE">Par Centre (repart à 1)</option>
                                            <option value="DEPARTEMENT">Par Département</option>
                                            <option value="EXAMEN">Tout l'Examen</option>
                                        </Select>
                                    </FormField>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <FormField label="Valeur fixe" hint="Si mode 'FIXE'">
                                        <Input {...register('table_prefix_valeur')} placeholder="Ex: BAC-" />
                                    </FormField>
                                    <FormField label="Séparateur" required>
                                        <Input {...register('table_separator')} placeholder="-" maxLength={2} />
                                    </FormField>
                                    <FormField label="Zéro padding" required hint="Nb de chiffres (ex: 4)">
                                        <Input
                                            type="number"
                                            {...register('table_padding', { valueAsNumber: true })}
                                            min={1}
                                            max={10}
                                        />
                                    </FormField>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Anonymat
                                </p>
                                <ToggleField
                                    control={control}
                                    name="anonymat_actif"
                                    label="Anonymat activé"
                                    hint="Si désactivé, l'identifiant est basé sur le numéro de table"
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <FormField label="Préfixe anonymat" required error={errors.anonymat_prefixe?.message}
                                        hint="Ex: AN, BEPC">
                                        <Input
                                            {...register('anonymat_prefixe')}
                                            placeholder="AN"
                                            disabled={!anonymatActif}
                                        />
                                    </FormField>
                                    <FormField label="N° de départ" required error={errors.anonymat_debut?.message}
                                        hint="Premier numéro">
                                        <Input
                                            type="number"
                                            {...register('anonymat_debut', { valueAsNumber: true })}
                                            min={1}
                                            disabled={!anonymatActif}
                                        />
                                    </FormField>
                                    <FormField label="Bon de correction" required error={errors.anonymat_bon?.message}
                                        hint="Copies par correcteur">
                                        <Select
                                            {...register('anonymat_bon', { valueAsNumber: true })}
                                            disabled={!anonymatActif}
                                        >
                                            <option value={1}>1 copie</option>
                                            <option value={3}>3 copies</option>
                                            <option value={5}>5 copies</option>
                                        </Select>
                                    </FormField>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Paramètres d'organisation
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Capacité salle référence" required error={errors.taille_salle_ref?.message}
                                        hint="Nb de places par salle type">
                                        <Input
                                            type="number"
                                            {...register('taille_salle_ref', { valueAsNumber: true })}
                                            min={1}
                                        />
                                    </FormField>
                                    <FormField label="Durée de validité de la signature (jours)" required error={errors.hmac_window_days?.message}
                                        hint="Signature du fichier Excel de saisie des notes (lot)">
                                        <Input
                                            type="number"
                                            {...register('hmac_window_days', { valueAsNumber: true })}
                                            min={1}
                                            max={365}
                                        />
                                    </FormField>
                                </div>
                                <FormField
                                    label="Modèle de distribution des copies"
                                    required
                                    hint="Définit comment les copies sont regroupées par lot"
                                >
                                    <Select {...register('distribution_model')}>
                                        <option value="A">Modèle A — Anonyme par lot (pas d’établissement)</option>
                                        <option value="B">Modèle B — Nominatif par établissement</option>
                                    </Select>
                                </FormField>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Début de composition">
                                        <Input type="date" {...register('date_composition_debut')} />
                                    </FormField>
                                    <FormField label="Fin de composition">
                                        <Input type="date" {...register('date_composition_fin')} />
                                    </FormField>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Étape 3 — Délibération & Options ─────────────────────── */}
                    {step === 3 && (
                        <>
                            <h2 className="text-base font-semibold border-b border-slate-100 pb-3">
                                Délibération &amp; Options d'épreuves
                            </h2>
                            <FormField label="Mode de délibération" required>
                                <Select {...register('mode_deliberation')}>
                                    <option value="unique">Phase unique</option>
                                    <option value="deux_phases">Deux phases (rattrapage académique)</option>
                                </Select>
                            </FormField>
                            <div className={cn(
                                'grid gap-3',
                                modeDelib === 'deux_phases' ? 'grid-cols-2' : 'grid-cols-1 max-w-xs',
                            )}>
                                <FormField label="Seuil admissibilité (/ 20)" required error={errors.seuil_phase1?.message}>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...register('seuil_phase1', { valueAsNumber: true })}
                                        min={0}
                                        max={20}
                                    />
                                </FormField>
                                {modeDelib === 'deux_phases' && (
                                    <FormField label="Seuil phase 2 (/ 20)" required error={errors.seuil_phase2?.message}>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...register('seuil_phase2', { valueAsNumber: true })}
                                            min={0}
                                            max={20}
                                        />
                                    </FormField>
                                )}
                            </div>

                            <div className="space-y-4 pt-2 border-t border-slate-100">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Options d'épreuves
                                </p>
                                <ToggleField
                                    control={control}
                                    name="rattrapage_actif"
                                    label="Épreuves de rattrapage"
                                    hint="Les candidats entre les deux seuils passent un rattrapage"
                                />
                                {rattrapageActif && (
                                    <div className="pl-[52px]">
                                        <FormField
                                            label="Seuil rattrapage (/ 20)"
                                            required
                                            error={errors.seuil_rattrapage?.message}
                                            className="max-w-xs"
                                        >
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...register('seuil_rattrapage', { valueAsNumber: true })}
                                                min={0}
                                                max={20}
                                            />
                                        </FormField>
                                    </div>
                                )}
                                <ToggleField control={control} name="oral_actif" label="Épreuves orales" />
                                <ToggleField control={control} name="eps_active" label="Épreuve d'EPS (sport)" />
                                <ToggleField control={control} name="facultatif_actif" label="Épreuves facultatives" />
                            </div>
                        </>
                    )}

                    {/* ── Étape 4 — Confirmation ───────────────────────────────── */}
                    {step === 4 && <ConfirmationStep control={control} />}
                </div>

                {/* Navigation entre étapes */}
                <div className="flex items-center justify-between mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => (step === 1 ? navigate('/admin/examens') : setStep((s) => s - 1))}
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        {step === 1 ? 'Annuler' : 'Précédent'}
                    </Button>

                    {step < 4 ? (
                        <Button type="button" onClick={handleNext}>
                            Suivant
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit" isLoading={isPending}>
                            <Send className="mr-2 h-4 w-4" />
                            {isEdit ? 'Enregistrer les modifications' : 'Créer l\'examen'}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
