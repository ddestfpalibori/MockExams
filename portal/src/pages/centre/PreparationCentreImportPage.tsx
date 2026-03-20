import { useState } from 'react';
import { toast } from 'sonner';
import { Upload, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useActiveCentre } from '@/hooks/useActiveCentre';
import { useExamens } from '@/hooks/queries/useExamens';
import { useReprendrePreparationCentre } from '@/hooks/queries/useLots';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/preparationCentreErrors';
import { parsePreparationCentreExcel, type ParsedPreparationCentreExcel } from '@/services/preparationCentreImport';
import type {
    PreparationCentreImportMode,
    PreparationCentreImportResult,
} from '@/services/preparationCentreTypes';
import type { ExamenRow } from '@/types/domain';

export default function PreparationCentreImportPage() {
    const { activeId: centreId, centres, isMulti, setActiveId } = useActiveCentre();
    const { data: examens } = useExamens();
    const [examenId, setExamenId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [parsed, setParsed] = useState<ParsedPreparationCentreExcel | null>(null);
    const [result, setResult] = useState<PreparationCentreImportResult | null>(null);
    const [overwriteOpen, setOverwriteOpen] = useState(false);
    const [pendingMode, setPendingMode] = useState<PreparationCentreImportMode | null>(null);
    const reprendrePreparation = useReprendrePreparationCentre(centreId, examenId);

    const examensComposition = (examens ?? []).filter(
        (e: ExamenRow) => e.status === 'COMPOSITION'
    );

    const handleAnalyze = async () => {
        if (!file || !centreId || !examenId || reprendrePreparation.isPending) return;

        let parsedFile: ParsedPreparationCentreExcel;

        try {
            setPendingMode('validate_only');
            parsedFile = await parsePreparationCentreExcel(file);
        } catch (error) {
            toast.error(getErrorMessage(error, "Le fichier n'a pas pu etre analyse."));
            setPendingMode(null);
            return;
        }

        setParsed(parsedFile);

        try {
            const data = await reprendrePreparation.mutateAsync({
                examenId,
                centreId,
                mode: 'validate_only',
                rows: parsedFile.rows,
            });
            setResult(data);
        } catch {
            // Le toast global React Query affiche deja l'erreur RPC.
        } finally {
            setPendingMode(null);
        }
    };

    const handleExecute = async (mode: Extract<PreparationCentreImportMode, 'fill_only' | 'overwrite_confirmed'>) => {
        if (!parsed || !centreId || !examenId || reprendrePreparation.isPending) return;

        try {
            setPendingMode(mode);
            const data = await reprendrePreparation.mutateAsync({
                examenId,
                centreId,
                mode,
                rows: parsed.rows,
            });
            setResult(data);
            if (mode === 'overwrite_confirmed') {
                setOverwriteOpen(false);
            }
        } catch {
            // Le toast global React Query affiche deja l'erreur RPC.
        } finally {
            setPendingMode(null);
        }
    };

    const reset = () => {
        setFile(null);
        setParsed(null);
        setResult(null);
        setOverwriteOpen(false);
        setPendingMode(null);
    };

    const canExecute =
        !!result &&
        result.mode === 'validate_only' &&
        result.errors === 0 &&
        result.conflicts === 0 &&
        !!parsed &&
        !reprendrePreparation.isPending;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Reprise preparation centre
                </h1>
                <p className="text-secondary">
                    Reprenez des numeros de table, anonymats et salles deja prepares hors application.
                </p>
            </div>

            {isMulti && (
                <EntitySelector
                    entities={centres}
                    activeId={centreId}
                    onSelect={setActiveId}
                    label="Centre actif"
                />
            )}

            <div className="rounded-lg border border-border bg-surface p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Examen
                    </label>
                    <Select
                        className="max-w-md"
                        value={examenId}
                        onChange={(e) => {
                            setExamenId(e.target.value);
                            setParsed(null);
                            setResult(null);
                            setPendingMode(null);
                        }}
                    >
                        <option value="">Selectionner un examen...</option>
                        {examensComposition.map((ex: ExamenRow) => (
                            <option key={ex.id} value={ex.id}>
                                {ex.code} - {ex.libelle} ({ex.annee})
                            </option>
                        ))}
                    </Select>
                </div>

                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile) {
                            setFile(droppedFile);
                            setParsed(null);
                            setResult(null);
                            setPendingMode(null);
                        }
                    }}
                    onClick={() => document.getElementById('prep-centre-file-input')?.click()}
                    className={cn(
                        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
                        dragOver
                            ? 'border-brand-primary bg-brand-primary/5'
                            : 'border-border hover:border-brand-primary/50 hover:bg-surface-hover'
                    )}
                >
                    <Upload className="h-8 w-8 text-slate-300 mb-2" />
                    {file ? (
                        <div className="text-center">
                            <p className="font-medium text-primary">{file.name}</p>
                            <p className="text-xs text-secondary">Cliquez pour remplacer le fichier</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm text-secondary">Glissez le fichier Excel ici</p>
                            <p className="text-xs text-slate-400 mt-1">Colonnes: MATRICULE, NUMERO_TABLE, NUMERO_ANONYME, SALLE</p>
                        </div>
                    )}
                    <input
                        id="prep-centre-file-input"
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                                setFile(selectedFile);
                                setParsed(null);
                                setResult(null);
                                setPendingMode(null);
                            }
                        }}
                    />
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={handleAnalyze}
                        disabled={!file || !centreId || !examenId || reprendrePreparation.isPending}
                        isLoading={pendingMode === 'validate_only'}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Analyser le fichier
                    </Button>
                    <Button variant="outline" onClick={reset} disabled={!file && !result}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reinitialiser
                    </Button>
                </div>
            </div>

            {result && (
                <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
                        <div className="flex flex-wrap gap-4">
                            <div className="rounded-md bg-green-50 p-4 min-w-32">
                                <p className="text-2xl font-bold text-success">{result.updated}</p>
                                <p className="text-xs text-slate-600">mises a jour</p>
                            </div>
                            <div className="rounded-md bg-slate-50 p-4 min-w-32">
                                <p className="text-2xl font-bold text-slate-700">{result.ignored}</p>
                                <p className="text-xs text-slate-600">ignorees</p>
                            </div>
                            <div className="rounded-md bg-red-50 p-4 min-w-32">
                                <p className="text-2xl font-bold text-danger">{result.errors}</p>
                                <p className="text-xs text-slate-600">erreurs</p>
                            </div>
                            <div className="rounded-md bg-amber-50 p-4 min-w-32">
                                <p className="text-2xl font-bold text-amber-700">{result.conflicts}</p>
                                <p className="text-xs text-slate-600">conflits</p>
                            </div>
                        </div>

                        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                            <p className="text-sm text-blue-800">
                                Le mode d'execution revalide toujours les donnees. Le rapport final d'execution fait foi, meme apres une analyse reussie.
                            </p>
                            <p className="mt-2 text-sm text-blue-800">
                                L'analyse estime le resultat maximal. Le mode de completion peut appliquer moins de lignes si certaines valeurs existent deja.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() => handleExecute('fill_only')}
                                disabled={!canExecute}
                                isLoading={pendingMode === 'fill_only'}
                            >
                                Completer les donnees manquantes
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => setOverwriteOpen(true)}
                                disabled={!canExecute}
                                isLoading={pendingMode === 'overwrite_confirmed'}
                            >
                                Remplacer les donnees existantes
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface p-6 space-y-3">
                        <h2 className="font-semibold text-primary">Rapport ligne par ligne</h2>
                        <div className="max-h-96 overflow-y-auto rounded-md border border-border divide-y divide-border">
                            {result.lines.map((line) => (
                                <div key={`${line.row_index}-${line.matricule ?? 'na'}`} className="px-4 py-3 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium text-primary">
                                            Ligne {line.row_index} - {line.matricule ?? 'Sans matricule'}
                                        </div>
                                        <span className={cn(
                                            'text-xs font-semibold px-2 py-1 rounded-full',
                                            line.status === 'ok' && 'bg-green-100 text-green-700',
                                            line.status === 'ignored' && 'bg-slate-100 text-slate-700',
                                            line.status === 'conflict' && 'bg-amber-100 text-amber-800',
                                            line.status === 'error' && 'bg-red-100 text-red-700',
                                        )}>
                                            {line.status}
                                        </span>
                                    </div>
                                    <p className="text-secondary mt-1">{line.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={overwriteOpen}
                onOpenChange={setOverwriteOpen}
                title="Confirmer l'ecrasement"
                variant="danger"
                footer={(
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOverwriteOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => handleExecute('overwrite_confirmed')}
                            isLoading={pendingMode === 'overwrite_confirmed'}
                            disabled={reprendrePreparation.isPending}
                        >
                            Confirmer l'ecrasement
                        </Button>
                    </div>
                )}
            >
                <div className="flex items-start gap-3 rounded-md bg-red-50 border border-red-200 p-4">
                    <AlertCircle className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800">
                        Ce mode peut remplacer des numeros de table, anonymats ou salles deja renseignes. Le centre du candidat ne sera jamais change par ce flux.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
