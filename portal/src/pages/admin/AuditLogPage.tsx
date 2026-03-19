import { useState, useCallback } from 'react';
import { Shield, FileSearch, Unlock, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog, useConsultationsBloquees, useDebloquerConsultation } from '@/hooks/queries/useAuditLog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/FormField';
import { cn } from '@/lib/utils';
import {
    AUDIT_PAGE_SIZE,
    type AuditLogEntry,
    type AuditFilters,
    type CodeAccesBloque,
} from '@/services/auditService';

// ── Constantes ────────────────────────────────────────────────────────────────

const AUDITED_TABLES = [
    'examens', 'candidats', 'saisies', 'resultats',
    'lots', 'imports_log', 'codes_acces',
] as const;

const OPERATION_STYLES: Record<AuditLogEntry['operation'], string> = {
    INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    UPDATE: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
    DELETE: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const EMPTY_FILTERS: AuditFilters = {};

// ── Sous-composants ───────────────────────────────────────────────────────────

function OperationBadge({ op }: { op: AuditLogEntry['operation'] }) {
    return (
        <span className={cn(
            'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
            OPERATION_STYLES[op],
        )}>
            {op}
        </span>
    );
}

interface DetailModalProps {
    entry: AuditLogEntry | null;
    onOpenChange: (open: boolean) => void;
}

function DetailModal({ entry, onOpenChange }: DetailModalProps) {
    return (
        <Modal
            open={!!entry}
            onOpenChange={onOpenChange}
            title="Détail de l'action"
            className="max-w-2xl"
        >
            {entry && (
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-secondary mb-0.5">Table</p>
                            <code className="font-mono font-medium">{entry.table_name}</code>
                        </div>
                        <div>
                            <p className="text-xs text-secondary mb-0.5">Opération</p>
                            <OperationBadge op={entry.operation} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary mb-0.5">Date / heure</p>
                            <p className="font-medium">
                                {new Date(entry.performed_at).toLocaleString('fr-FR', {
                                    dateStyle: 'medium',
                                    timeStyle: 'medium',
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-secondary mb-0.5">Effectué par</p>
                            <p className={entry.performer_email ? 'font-medium' : 'italic text-secondary'}>
                                {entry.performer_email ?? 'Système (Edge Function)'}
                            </p>
                        </div>
                        {entry.record_id && (
                            <div className="col-span-2">
                                <p className="text-xs text-secondary mb-0.5">Enregistrement (ID)</p>
                                <p className="font-mono text-xs break-all">{entry.record_id}</p>
                            </div>
                        )}
                    </div>

                    {entry.old_data && (
                        <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                                Données avant
                            </p>
                            <pre className="rounded-md bg-surface-hover p-3 text-xs overflow-auto max-h-52 border border-border">
                                {JSON.stringify(entry.old_data, null, 2)}
                            </pre>
                        </div>
                    )}
                    {entry.new_data && (
                        <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                                Données après
                            </p>
                            <pre className="rounded-md bg-surface-hover p-3 text-xs overflow-auto max-h-52 border border-border">
                                {JSON.stringify(entry.new_data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AuditLogPage() {
    const { role } = useAuth();
    const isAdmin = role === 'admin';

    const [activeTab, setActiveTab] = useState<'journal' | 'consultations'>('journal');
    const [filters, setFilters]     = useState<AuditFilters>(EMPTY_FILTERS);
    const [page, setPage]           = useState(1);
    const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null);

    const { data, isLoading, isError } = useAuditLog(filters, page);
    const { data: bloquees, isLoading: bloqueeLoading } = useConsultationsBloquees(isAdmin);
    const { mutate: debloquer, isPending: isDebloquerPending } = useDebloquerConsultation();

    const handleFilterChange = useCallback(
        <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
            setFilters((prev) => ({ ...prev, [key]: value }));
            setPage(1);
        },
        [],
    );

    const handleReset = useCallback(() => {
        setFilters(EMPTY_FILTERS);
        setPage(1);
    }, []);

    const hasFilters = Object.values(filters).some(Boolean);

    // ── Colonnes du journal ──────────────────────────────────────────────────

    const journalColumns: Column<AuditLogEntry>[] = [
        {
            key: 'performed_at',
            header: 'Date / heure',
            cell: (row) => (
                <span className="whitespace-nowrap text-sm text-secondary">
                    {new Date(row.performed_at).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                    })}
                </span>
            ),
        },
        {
            key: 'table_name',
            header: 'Table',
            cell: (row) => <code className="text-xs font-mono">{row.table_name}</code>,
        },
        {
            key: 'operation',
            header: 'Opération',
            cell: (row) => <OperationBadge op={row.operation} />,
        },
        {
            key: 'record_id',
            header: 'Enregistrement',
            cell: (row) =>
                row.record_id ? (
                    <span className="font-mono text-xs text-secondary" title={row.record_id}>
                        {row.record_id.slice(0, 8)}…
                    </span>
                ) : (
                    <span className="text-muted">—</span>
                ),
        },
        {
            key: 'performer',
            header: 'Effectué par',
            cell: (row) => (
                <span className={row.performer_email ? '' : 'italic text-secondary'}>
                    {row.performer_email ?? 'Système'}
                </span>
            ),
        },
        {
            key: 'detail',
            header: '',
            cell: (row) => (
                <Button variant="ghost" size="sm" onClick={() => setDetailEntry(row)}>
                    <ChevronRight size={14} />
                </Button>
            ),
        },
    ];

    // ── Colonnes consultations bloquées ──────────────────────────────────────

    const consultationColumns: Column<CodeAccesBloque>[] = [
        {
            key: 'numero_anonyme',
            header: 'N° anonyme',
            cell: (row) => (
                <span className="font-mono font-medium">
                    {row.candidat_numero_anonyme ?? <span className="text-muted italic">non attribué</span>}
                </span>
            ),
        },
        {
            key: 'etablissement',
            header: 'Établissement',
            cell: (row) => row.etablissement_nom ?? <span className="text-muted">—</span>,
        },
        {
            key: 'tentatives',
            header: 'Tentatives',
            cell: (row) => (
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {row.tentatives}
                </span>
            ),
        },
        {
            key: 'lockout_until',
            header: 'Bloqué jusqu\'au',
            cell: (row) => (
                <span className="whitespace-nowrap text-sm">
                    {new Date(row.lockout_until).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                    })}
                </span>
            ),
        },
        {
            key: 'action',
            header: '',
            cell: (row) => (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => debloquer(row.id)}
                    disabled={isDebloquerPending}
                >
                    <Unlock size={12} className="mr-1" />
                    Débloquer
                </Button>
            ),
        },
    ];

    // ── Rendu ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* En-tête */}
            <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-brand-primary" />
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Journal d'audit</h1>
                    <p className="text-sm text-secondary">
                        Traçabilité des actions sensibles — lecture seule
                    </p>
                </div>
            </div>

            {/* Onglets */}
            <div className="flex gap-0 border-b border-border">
                <button
                    onClick={() => setActiveTab('journal')}
                    className={cn(
                        'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'journal'
                            ? 'border-brand-primary text-brand-primary'
                            : 'border-transparent text-secondary hover:text-primary',
                    )}
                >
                    Journal d'audit
                </button>

                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('consultations')}
                        className={cn(
                            'relative px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                            activeTab === 'consultations'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-secondary hover:text-primary',
                        )}
                    >
                        Consultations bloquées
                        {bloquees && bloquees.length > 0 && (
                            <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {bloquees.length}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* ── Tab : Journal ─────────────────────────────────────────────── */}
            {activeTab === 'journal' && (
                <div className="space-y-4">

                    {/* Filtres */}
                    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-secondary">Table</label>
                            <Select
                                value={filters.table_name ?? ''}
                                onChange={(e) =>
                                    handleFilterChange('table_name', e.target.value || undefined)
                                }
                            >
                                <option value="">Toutes les tables</option>
                                {AUDITED_TABLES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-secondary">Opération</label>
                            <Select
                                value={filters.operation ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value as AuditFilters['operation'] | '';
                                    handleFilterChange('operation', val || undefined);
                                }}
                            >
                                <option value="">Toutes</option>
                                <option value="INSERT">INSERT</option>
                                <option value="UPDATE">UPDATE</option>
                                <option value="DELETE">DELETE</option>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-secondary">Du</label>
                            <input
                                type="date"
                                value={filters.date_from ?? ''}
                                onChange={(e) =>
                                    handleFilterChange('date_from', e.target.value || undefined)
                                }
                                className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-secondary">Au</label>
                            <input
                                type="date"
                                value={filters.date_to ?? ''}
                                onChange={(e) =>
                                    handleFilterChange('date_to', e.target.value || undefined)
                                }
                                className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>

                        {hasFilters && (
                            <Button variant="ghost" size="sm" onClick={handleReset}>
                                <X size={14} className="mr-1" />
                                Réinitialiser
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    {isError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                            Erreur lors du chargement du journal. Vérifiez vos droits d'accès.
                        </div>
                    ) : (
                        <>
                            <DataTable
                                columns={journalColumns}
                                data={data?.entries ?? []}
                                rowKey={(row) => row.id}
                                isLoading={isLoading}
                                emptyMessage="Aucune entrée dans le journal"
                                emptyDescription="Les actions sur les données apparaîtront ici."
                                emptyIcon={FileSearch}
                            />
                            {data && (
                                <Pagination
                                    page={page}
                                    pageSize={AUDIT_PAGE_SIZE}
                                    total={data.total}
                                    onPageChange={setPage}
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── Tab : Consultations bloquées (admin seulement) ─────────────── */}
            {activeTab === 'consultations' && isAdmin && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                        <strong>Procédure de déblocage :</strong> Les candidats ci-dessous ont
                        dépassé le nombre maximum de tentatives de consultation. Le bouton{' '}
                        <em>Débloquer</em> réinitialise leurs tentatives et lève le blocage.
                    </div>

                    {bloqueeLoading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <DataTable
                            columns={consultationColumns}
                            data={bloquees ?? []}
                            rowKey={(row) => row.id}
                            emptyMessage="Aucune consultation bloquée"
                            emptyDescription="Tous les candidats peuvent actuellement consulter leurs résultats."
                            emptyIcon={Shield}
                        />
                    )}
                </div>
            )}

            {/* Modal détail */}
            <DetailModal
                entry={detailEntry}
                onOpenChange={(open) => { if (!open) setDetailEntry(null); }}
            />
        </div>
    );
}
