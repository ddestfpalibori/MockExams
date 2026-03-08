import { useState, useEffect } from 'react';
import { useActiveCentre } from '@/hooks/useActiveCentre';
import { useExamens } from '@/hooks/queries/useExamens';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { useLots } from '@/hooks/queries/useLots';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { LotStatusBadge } from '@/components/ui/StatusBadge';
import { Upload, CheckCircle, AlertCircle, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ExamenRow } from '@/types/domain';
import type { LotWithDetails } from '@/services/lots';

interface SaisieResult {
    nb_succes: number;
    nb_erreurs: number;
    warnings: string[];
}

export default function SaisieNotesPage() {
    const queryClient = useQueryClient();
    const { activeId: centreId, centres, isMulti, setActiveId } = useActiveCentre();

    const { data: examens } = useExamens();
    const [examenId, setExamenId] = useState('');
    const [selectedLot, setSelectedLot] = useState<LotWithDetails | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<SaisieResult | null>(null);
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const { data: lots, isLoading: lotsLoading } = useLots(centreId, examenId);

    // Realtime : écoute les changements de lots pour ce centre
    useEffect(() => {
        if (!centreId || !examenId) return;

        const channel = supabase
            .channel(`lots-centre-${centreId}-${examenId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'lots',
                    filter: `centre_id=eq.${centreId}`,
                },
                () => {
                    queryClient.invalidateQueries({
                        queryKey: QUERY_KEYS.centres.lots(centreId, examenId),
                    });
                }
            )
            .subscribe((status) => {
                setRealtimeConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [centreId, examenId, queryClient]);

    const handleUpload = async () => {
        if (!file || !selectedLot) return;
        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('lot_id', selectedLot.id);
            formData.append('centre_id', centreId);
            formData.append('examen_id', examenId);

            const { data, error } = await supabase.functions.invoke<SaisieResult>(
                'verify-import',
                { body: formData }
            );

            if (error) throw error;
            setResult(data ?? { nb_succes: 0, nb_erreurs: 0, warnings: [] });
            toast.success('Notes importées avec succès');
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.centres.lots(centreId, examenId),
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur lors de l\'import';
            toast.error(msg);
        } finally {
            setUploading(false);
        }
    };

    const lotsSignes = (lots ?? []).filter((l) => l.hmac_signature);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Saisie des notes
                    </h1>
                    <p className="text-slate-500">
                        Importez les bons de correction remplis par les correcteurs.
                    </p>
                </div>
                <div className={cn(
                    'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                    realtimeConnected
                        ? 'bg-green-50 text-success'
                        : 'bg-slate-100 text-slate-400'
                )}>
                    <Wifi className="h-3 w-3" />
                    {realtimeConnected ? 'Temps réel actif' : 'Connexion...'}
                </div>
            </div>

            {isMulti && (
                <EntitySelector
                    entities={centres}
                    activeId={centreId}
                    onSelect={setActiveId}
                    label="Centre actif"
                />
            )}

            {/* Sélection examen */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Examen
                    </label>
                    <select
                        className="h-10 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        value={examenId}
                        onChange={(e) => {
                            setExamenId(e.target.value);
                            setSelectedLot(null);
                            setFile(null);
                            setResult(null);
                        }}
                    >
                        <option value="">Sélectionner un examen...</option>
                        {(examens ?? [])
                            .filter((e: ExamenRow) => e.status === 'CORRECTION')
                            .map((ex: ExamenRow) => (
                                <option key={ex.id} value={ex.id}>
                                    {ex.code} — {ex.libelle} ({ex.annee})
                                </option>
                            ))}
                    </select>
                </div>

                {/* Sélection lot */}
                {examenId && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Lot de correction
                        </label>
                        {lotsLoading ? (
                            <div className="h-10 w-full max-w-md bg-slate-100 animate-pulse rounded-md" />
                        ) : lotsSignes.length === 0 ? (
                            <p className="text-sm text-slate-400">
                                Aucun lot signé disponible. Signez d'abord les lots dans la page Lots.
                            </p>
                        ) : (
                            <div className="grid gap-2 max-w-lg">
                                {lotsSignes.map((lot) => (
                                    <button
                                        key={lot.id}
                                        onClick={() => {
                                            setSelectedLot(lot);
                                            setFile(null);
                                            setResult(null);
                                        }}
                                        className={cn(
                                            'flex items-center justify-between rounded-md border p-3 text-left transition-colors',
                                            selectedLot?.id === lot.id
                                                ? 'border-brand-primary bg-brand-primary/5'
                                                : 'border-slate-200 hover:border-brand-primary/50'
                                        )}
                                    >
                                        <div>
                                            <p className="font-medium text-sm">
                                                Lot #{lot.lot_numero} — {lot.discipline_libelle}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {lot.nb_copies} copies
                                                {lot.serie_code ? ` · Série ${lot.serie_code}` : ''}
                                            </p>
                                        </div>
                                        <LotStatusBadge status={lot.status} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Upload */}
            {selectedLot && (
                <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
                    <h2 className="font-semibold text-slate-900">
                        Importer les notes — Lot #{selectedLot.lot_numero}
                    </h2>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            const f = e.dataTransfer.files[0];
                            if (f) setFile(f);
                        }}
                        onClick={() => document.getElementById('notes-file-input')?.click()}
                        className={cn(
                            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
                            dragOver
                                ? 'border-brand-primary bg-brand-primary/5'
                                : 'border-slate-200 hover:border-brand-primary/50 hover:bg-slate-50'
                        )}
                    >
                        <Upload className="h-8 w-8 text-slate-300 mb-2" />
                        {file ? (
                            <p className="font-medium text-slate-700">{file.name}</p>
                        ) : (
                            <p className="text-sm text-slate-500">
                                Glissez le bon de correction Excel ici
                            </p>
                        )}
                        <input
                            id="notes-file-input"
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setFile(f);
                            }}
                        />
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={!file}
                        isLoading={uploading}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Importer les notes
                    </Button>
                </div>
            )}

            {/* Résultat */}
            {result && (
                <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
                    <h2 className="font-semibold text-slate-900">Résultat de l'import</h2>
                    <div className="grid grid-cols-2 gap-4 max-w-sm">
                        <div className="flex items-center gap-3 rounded-md bg-green-50 p-4">
                            <CheckCircle className="h-5 w-5 text-success" />
                            <div>
                                <p className="text-2xl font-bold text-success">{result.nb_succes}</p>
                                <p className="text-xs text-slate-600">notes saisies</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-md bg-red-50 p-4">
                            <AlertCircle className="h-5 w-5 text-danger" />
                            <div>
                                <p className="text-2xl font-bold text-danger">{result.nb_erreurs}</p>
                                <p className="text-xs text-slate-600">erreurs</p>
                            </div>
                        </div>
                    </div>

                    {result.warnings.length > 0 && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                            <p className="text-sm font-medium text-amber-800 mb-2">
                                Avertissements ({result.warnings.length})
                            </p>
                            <ul className="text-xs text-amber-700 space-y-1 max-h-32 overflow-y-auto">
                                {result.warnings.map((w, i) => (
                                    <li key={i}>• {w}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
