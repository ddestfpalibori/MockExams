import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { exportAnalyticsToExcel } from '@/services/analyticsExcelExport';
import { exportAnalyticsToPdf } from '@/services/analyticsPdfExport';
import type { AnalyticsData } from '@/services/analyticsService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: AnalyticsData;
    scopeLabel: string;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function ExportAnalyticsModal({ open, onOpenChange, data, scopeLabel }: Props) {
    const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null);

    const handleExcel = async () => {
        if (loading) return;
        setLoading('excel');
        try {
            exportAnalyticsToExcel(data, scopeLabel);
            toast.success('Export Excel généré avec succès');
            onOpenChange(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur lors de l\'export Excel';
            toast.error(msg);
        } finally {
            setLoading(null);
        }
    };

    const handlePdf = async () => {
        if (loading) return;
        setLoading('pdf');
        try {
            await exportAnalyticsToPdf(data, scopeLabel);
            toast.success('Export PDF généré avec succès');
            onOpenChange(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur lors de l\'export PDF';
            toast.error(msg);
        } finally {
            setLoading(null);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Exporter les analyses"
            description={`${data.examen_libelle} — Session ${data.examen_annee}${scopeLabel ? ` — ${scopeLabel}` : ''}`}
        >
            <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-500 mb-1">
                    Choisissez le format d'export souhaité.
                </p>

                {/* Bouton Excel */}
                <button
                    onClick={() => void handleExcel()}
                    disabled={loading !== null}
                    className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                        'border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        loading === 'excel' && 'animate-pulse',
                    )}
                >
                    <FileSpreadsheet className="text-emerald-600 shrink-0" size={28} />
                    <div>
                        <p className="font-semibold text-emerald-800">Excel (.xlsx)</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                            Classeur multi-feuilles — vue globale, disciplines, séries, centres…
                        </p>
                    </div>
                    {loading === 'excel' && (
                        <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    )}
                </button>

                {/* Bouton PDF */}
                <button
                    onClick={() => void handlePdf()}
                    disabled={loading !== null}
                    className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                        'border-rose-200 bg-rose-50 hover:border-rose-400 hover:bg-rose-100',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        loading === 'pdf' && 'animate-pulse',
                    )}
                >
                    <FileText className="text-rose-600 shrink-0" size={28} />
                    <div>
                        <p className="font-semibold text-rose-800">PDF (.pdf)</p>
                        <p className="text-xs text-rose-600 mt-0.5">
                            Rapport complet A4 paysage — toutes les dimensions analytiques
                        </p>
                    </div>
                    {loading === 'pdf' && (
                        <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                    )}
                </button>

                {/* Annuler */}
                <div className="flex justify-end mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={loading !== null}
                    >
                        Annuler
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
