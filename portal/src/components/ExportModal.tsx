import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { fetchExportData } from '@/services/exportService';
import { generateExcelModelA, generateExcelModelB, downloadExcelResultats } from '@/services/excelExport';
import { printPvDeliberationAnonyme, printPvDeliberationNominatif } from '@/services/pdfExport';
import type { UserRole } from '@/types/domain';

interface ExportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    examenId: string;
    examenCode: string;
    etablissementId?: string;
    userRole: UserRole;
}

type ExportType = 'excel_a' | 'excel_b' | 'pdf_a' | 'pdf_b';

export function ExportModal({
    open,
    onOpenChange,
    examenId,
    examenCode,
    etablissementId,
    userRole,
}: ExportModalProps) {
    const [loading, setLoading] = useState<ExportType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = userRole === 'admin';

    const handleExport = useCallback(async (type: ExportType) => {
        setLoading(type);
        setError(null);

        try {
            const includeNominatif = type === 'excel_b' || type === 'pdf_b';
            const data = await fetchExportData(examenId, etablissementId, includeNominatif);

            if (data.etablissements.length === 0) {
                setError('Aucun résultat à exporter pour cet examen.');
                return;
            }

            switch (type) {
                case 'excel_a': {
                    const buffer = generateExcelModelA(data);
                    downloadExcelResultats(buffer, examenCode, 'A');
                    break;
                }
                case 'excel_b': {
                    const buffer = generateExcelModelB(data);
                    downloadExcelResultats(buffer, examenCode, 'B');
                    break;
                }
                case 'pdf_a':
                    printPvDeliberationAnonyme(data);
                    break;
                case 'pdf_b':
                    printPvDeliberationNominatif(data);
                    break;
            }

            onOpenChange(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setLoading(null);
        }
    }, [examenId, examenCode, etablissementId, onOpenChange]);

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Exporter les résultats"
            description="Choisissez le format et le type d'export."
        >
            <div className="space-y-3">
                {isAdmin && (
                    <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                        Par défaut : Modèle B (nominatif). Le Modèle A reste optionnel.
                    </div>
                )}
                {/* Excel Modèle B — admin uniquement (par défaut) */}
                {isAdmin && (
                    <ExportOption
                        icon={<FileSpreadsheet size={20} className="text-blue-600" />}
                        label="Excel — Modèle B (nominatif, par défaut)"
                        description="Nom, prénom, notes par discipline, moyenne, décision. Admin uniquement."
                        onClick={() => handleExport('excel_b')}
                        loading={loading === 'excel_b'}
                        disabled={loading !== null}
                    />
                )}

                {/* Excel Modèle A */}
                <ExportOption
                    icon={<FileSpreadsheet size={20} className="text-emerald-600" />}
                    label="Excel — Modèle A (anonyme)"
                    description="Optionnel. N° anonyme, notes par discipline, moyenne, décision. Une feuille par établissement."
                    onClick={() => handleExport('excel_a')}
                    loading={loading === 'excel_a'}
                    disabled={loading !== null}
                />

                {/* PDF PV Modèle B — admin uniquement (par défaut) */}
                {isAdmin && (
                    <ExportOption
                        icon={<FileText size={20} className="text-purple-600" />}
                        label="PDF — PV nominatif (par défaut)"
                        description="PV avec noms et prénoms des candidats. Admin uniquement."
                        onClick={() => handleExport('pdf_b')}
                        loading={loading === 'pdf_b'}
                        disabled={loading !== null}
                    />
                )}

                {/* PDF PV Modèle A */}
                <ExportOption
                    icon={<FileText size={20} className="text-red-600" />}
                    label="PDF — PV de délibération (anonyme)"
                    description="Optionnel. Document officiel avec entête DDEST-FP, résultats par établissement."
                    onClick={() => handleExport('pdf_a')}
                    loading={loading === 'pdf_a'}
                    disabled={loading !== null}
                />

                {error && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ── Sous-composant ────────────────────────────────────────────────────────────

interface ExportOptionProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
    loading: boolean;
    disabled: boolean;
}

function ExportOption({ icon, label, description, onClick, loading, disabled }: ExportOptionProps) {
    return (
        <button
            type="button"
            className="w-full flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50 hover:border-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClick}
            disabled={disabled}
        >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{description}</div>
            </div>
            <div className="flex-shrink-0 mt-0.5">
                {loading ? (
                    <Loader2 size={18} className="animate-spin text-brand-primary" />
                ) : (
                    <Download size={18} className="text-slate-400" />
                )}
            </div>
        </button>
    );
}
