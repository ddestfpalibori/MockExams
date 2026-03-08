import { useState } from 'react';
import { useExamens } from '@/hooks/queries/useExamens';
import { useMyEtablissements, useImportPreview, useImportCandidats } from '@/hooks/queries/useEtablissements';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExamenRow } from '@/types/domain';

type Step = 1 | 2 | 3 | 4;

interface PreviewResult {
    nb_valides: number;
    nb_erreurs: number;
    warnings: string[];
}

interface ImportResult {
    nb_succes: number;
    nb_erreurs: number;
    rapport: string[];
}

export default function ImportPage() {
    const [step, setStep] = useState<Step>(1);
    const [examenId, setExamenId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [legalConfirmed, setLegalConfirmed] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState('');

    const { data: examens } = useExamens();
    const { data: etablissements } = useMyEtablissements();
    const etablissementId = etablissements?.[0]?.id ?? '';

    const importPreview = useImportPreview();
    const importCandidats = useImportCandidats();

    const examensInscriptions = (examens ?? []).filter(
        (e: ExamenRow) => e.status === 'INSCRIPTIONS'
    );

    const handleFileChange = (f: File) => {
        if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
            alert('Format invalide. Seuls les fichiers Excel (.xlsx, .xls) sont acceptés.');
            return;
        }
        setFile(f);
    };

    const handlePreview = async () => {
        if (!file || !examenId || !etablissementId) return;
        const data = await importPreview.mutateAsync({ file, examenId, etablissementId });
        setPreview(data ?? { nb_valides: 0, nb_erreurs: 0, warnings: [] });
        // Générer une clé d'idempotence pour l'import (anti-doublons)
        const key = `${etablissementId}-${examenId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setIdempotencyKey(key);
        setStep(3);
    };

    const handleImport = async () => {
        if (!file || !examenId || !etablissementId || !legalConfirmed || !idempotencyKey) return;
        const data = await importCandidats.mutateAsync({ file, examenId, etablissementId, idempotencyKey });
        setResult(data ?? { nb_succes: 0, nb_erreurs: 0, rapport: [] });
        setStep(4);
    };

    const reset = () => {
        setStep(1);
        setFile(null);
        setPreview(null);
        setResult(null);
        setLegalConfirmed(false);
        setExamenId('');
    };

    const steps: { label: string; num: Step }[] = [
        { label: 'Fichier', num: 1 },
        { label: 'Validation', num: 2 },
        { label: 'Confirmation', num: 3 },
        { label: 'Résumé', num: 4 },
    ];

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Importer des candidats
                </h1>
                <p className="text-slate-500">
                    Importez la liste des candidats via fichier Excel (format DDEST-FP).
                </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-0">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                                    step >= s.num
                                        ? 'bg-brand-primary text-white'
                                        : 'bg-slate-100 text-slate-400'
                                )}
                            >
                                {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
                            </div>
                            <span
                                className={cn(
                                    'mt-1 text-xs',
                                    step >= s.num ? 'text-brand-primary font-medium' : 'text-slate-400'
                                )}
                            >
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className={cn(
                                    'h-0.5 w-16 mb-4',
                                    step > s.num ? 'bg-brand-primary' : 'bg-slate-100'
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1 — Upload */}
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Examen cible
                        </label>
                        <select
                            className="h-10 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            value={examenId}
                            onChange={(e) => setExamenId(e.target.value)}
                        >
                            <option value="">Sélectionner un examen...</option>
                            {examensInscriptions.map((ex: ExamenRow) => (
                                <option key={ex.id} value={ex.id}>
                                    {ex.code} — {ex.libelle} ({ex.annee})
                                </option>
                            ))}
                        </select>
                        {examensInscriptions.length === 0 && (
                            <p className="mt-1 text-xs text-slate-400">
                                Aucun examen en phase Inscriptions disponible.
                            </p>
                        )}
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            const f = e.dataTransfer.files[0];
                            if (f) handleFileChange(f);
                        }}
                        className={cn(
                            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer',
                            dragOver
                                ? 'border-brand-primary bg-brand-primary/5'
                                : 'border-slate-200 hover:border-brand-primary/50 hover:bg-slate-50'
                        )}
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        <Upload className="h-10 w-10 text-slate-300 mb-3" />
                        {file ? (
                            <div className="text-center">
                                <p className="font-medium text-slate-700">{file.name}</p>
                                <p className="text-sm text-slate-400">
                                    {(file.size / 1024).toFixed(0)} Ko
                                </p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="font-medium text-slate-700">
                                    Glissez votre fichier ici
                                </p>
                                <p className="text-sm text-slate-400">ou cliquez pour parcourir</p>
                                <p className="text-xs text-slate-300 mt-1">.xlsx, .xls uniquement</p>
                            </div>
                        )}
                        <input
                            id="file-input"
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileChange(f);
                            }}
                        />
                    </div>

                    <Button
                        onClick={() => setStep(2)}
                        disabled={!file || !examenId}
                    >
                        Suivant
                    </Button>
                </div>
            )}

            {/* Step 2 — Validation */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-slate-400" />
                            <div>
                                <p className="font-medium text-slate-900">{file?.name}</p>
                                <p className="text-sm text-slate-500">
                                    {((file?.size ?? 0) / 1024).toFixed(0)} Ko
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600">
                            Cliquez sur "Analyser" pour vérifier le fichier avant import.
                            L'analyse détecte les erreurs de format sans modifier les données.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour
                        </Button>
                        <Button
                            onClick={handlePreview}
                            isLoading={importPreview.isPending}
                        >
                            Analyser le fichier
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3 — Confirmation légale */}
            {step === 3 && preview && (
                <div className="space-y-6">
                    <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Résultat de l'analyse</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 rounded-md bg-green-50 p-4">
                                <CheckCircle className="h-5 w-5 text-success" />
                                <div>
                                    <p className="text-2xl font-bold text-success">
                                        {preview.nb_valides}
                                    </p>
                                    <p className="text-sm text-slate-600">lignes valides</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-md bg-red-50 p-4">
                                <AlertCircle className="h-5 w-5 text-danger" />
                                <div>
                                    <p className="text-2xl font-bold text-danger">
                                        {preview.nb_erreurs}
                                    </p>
                                    <p className="text-sm text-slate-600">erreurs</p>
                                </div>
                            </div>
                        </div>

                        {preview.warnings.length > 0 && (
                            <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                                <p className="text-sm font-medium text-amber-800 mb-2">
                                    Avertissements ({preview.warnings.length})
                                </p>
                                <ul className="text-xs text-amber-700 space-y-1 max-h-32 overflow-y-auto">
                                    {preview.warnings.map((w, i) => (
                                        <li key={i}>• {w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {preview.nb_erreurs === 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 space-y-4">
                            <h3 className="font-semibold text-amber-900">Confirmation légale requise</h3>
                            <p className="text-sm text-amber-800">
                                En soumettant ce fichier, vous certifiez que les données sont exactes,
                                complètes et conformes aux instructions de la DDEST-FP Alibori.
                                Cette action est irréversible sans intervention administrative.
                            </p>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={legalConfirmed}
                                    onChange={(e) => setLegalConfirmed(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-primary"
                                />
                                <span className="text-sm font-medium text-amber-900">
                                    Je certifie l'exactitude des données et assume la responsabilité
                                    de cet import.
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(2)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour
                        </Button>
                        {preview.nb_erreurs > 0 ? (
                            <Button variant="danger" onClick={() => setStep(1)}>
                                Corriger le fichier
                            </Button>
                        ) : (
                            <Button
                                onClick={handleImport}
                                disabled={!legalConfirmed}
                                isLoading={importCandidats.isPending}
                            >
                                Lancer l'import
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Step 4 — Résumé */}
            {step === 4 && result && (
                <div className="space-y-6">
                    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4">
                        <CheckCircle className="h-16 w-16 text-success mx-auto" />
                        <h2 className="text-2xl font-bold text-slate-900">Import terminé</h2>

                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <div className="rounded-md bg-green-50 p-4">
                                <p className="text-3xl font-bold text-success">{result.nb_succes}</p>
                                <p className="text-sm text-slate-600">importés</p>
                            </div>
                            <div className="rounded-md bg-red-50 p-4">
                                <p className="text-3xl font-bold text-danger">{result.nb_erreurs}</p>
                                <p className="text-sm text-slate-600">erreurs</p>
                            </div>
                        </div>

                        {result.rapport.length > 0 && (
                            <div className="rounded-md bg-slate-50 border border-slate-200 p-4 text-left">
                                <p className="text-sm font-medium text-slate-700 mb-2">Rapport d'erreurs</p>
                                <ul className="text-xs text-slate-600 space-y-1 max-h-40 overflow-y-auto">
                                    {result.rapport.map((r, i) => (
                                        <li key={i} className="font-mono">• {r}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <Button onClick={reset} variant="outline">
                        Nouvel import
                    </Button>
                </div>
            )}
        </div>
    );
}
