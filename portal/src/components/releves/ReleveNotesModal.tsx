import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { FileDown, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useReleveNotes } from '@/hooks/queries/useReleveNotes';
import { fetchReleve, type ReleveScope, type CandidatReleve } from '@/services/releveNotesService';
import { downloadRelevesPdf } from '@/services/releveNotesPdfExport';
import type { UserRole } from '@/types/domain';
import type { CentreRow, EtablissementRow } from '@/types/domain';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReleveNotesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    examenId: string;
    examenLibelle: string;
    examenAnnee: number;
    /** Rôle de l'utilisateur courant pour adapter le sélecteur de scope */
    userRole: UserRole;
    /** Pour admin/tutelle : liste des centres disponibles */
    centres?: CentreRow[];
    /** Pour admin/tutelle : liste des établissements disponibles */
    etablissements?: EtablissementRow[];
    /** Pré-sélection automatique pour chef_centre */
    defaultCentreId?: string;
    /** Pré-sélection automatique pour chef_etablissement */
    defaultEtablissementId?: string;
}

const LOT_SIZE = 50;
const MAX_TOTAL_DIRECT_DOWNLOAD = 500;

// ── Composant ─────────────────────────────────────────────────────────────────

export function ReleveNotesModal({
    open,
    onOpenChange,
    examenId,
    examenLibelle,
    examenAnnee,
    userRole,
    centres = [],
    etablissements = [],
    defaultCentreId,
    defaultEtablissementId,
}: ReleveNotesModalProps) {
    // ── Sélection scope selon le rôle ─────────────────────────────────────────
    const [scope, setScope] = useState<ReleveScope>(() => {
        if (userRole === 'chef_centre') return 'centre';
        if (userRole === 'chef_etablissement') return 'etablissement';
        return 'centre';
    });

    const [selectedCentreId, setSelectedCentreId] = useState(defaultCentreId ?? '');
    const [selectedEtabId, setSelectedEtabId] = useState(defaultEtablissementId ?? '');
    const [lotOffset, setLotOffset] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);

    // Calcul du scope_id effectif
    const scopeId =
        userRole === 'chef_centre' ? (defaultCentreId ?? '') :
        userRole === 'chef_etablissement' ? (defaultEtablissementId ?? '') :
        scope === 'centre' ? selectedCentreId :
        selectedEtabId;

    const isEnabled = open && !!examenId && !!scopeId;

    const { data, isLoading, isError } = useReleveNotes(
        isEnabled
            ? { examenId, scope, scopeId, lotSize: LOT_SIZE, lotOffset }
            : null,
    );

    const total = data?.total ?? 0;
    const nbLots = Math.ceil(total / LOT_SIZE);

    // ── Télécharger le lot courant ────────────────────────────────────────────
    const handleDownloadLot = useCallback(async () => {
        if (!data?.data.length) return;
        setIsDownloading(true);
        try {
            const lotNum = Math.floor(lotOffset / LOT_SIZE) + 1;
            const filename = `Releves_${examenLibelle}_${examenAnnee}_lot${lotNum}.pdf`;
            await downloadRelevesPdf(data.data, filename);
            toast.success(`Lot ${lotNum} téléchargé (${data.data.length} relevé(s))`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`Erreur lors de la génération PDF : ${msg}`);
        } finally {
            setIsDownloading(false);
        }
    }, [data, examenLibelle, examenAnnee, lotOffset]);

    // ── Télécharger tous les lots ─────────────────────────────────────────────
    const handleDownloadAll = useCallback(async () => {
        if (total === 0) return;
        setIsDownloadingAll(true);
        try {
            const allCandidats: CandidatReleve[] = [];
            const nbPages = Math.ceil(total / LOT_SIZE);

            for (let page = 0; page < nbPages; page++) {
                const response = await fetchReleve({
                    examenId,
                    scope,
                    scopeId,
                    lotSize: LOT_SIZE,
                    lotOffset: page * LOT_SIZE,
                });
                allCandidats.push(...response.data);
            }

            const filename = `Releves_${examenLibelle}_${examenAnnee}_complet.pdf`;
            await downloadRelevesPdf(allCandidats, filename);
            toast.success(`Tous les relevés téléchargés (${allCandidats.length} candidat(s))`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`Erreur lors du téléchargement complet : ${msg}`);
        } finally {
            setIsDownloadingAll(false);
        }
    }, [total, examenId, scope, scopeId, examenLibelle, examenAnnee]);

    // ── Changement de scope (admin/tutelle) ───────────────────────────────────
    const handleScopeChange = useCallback((newScope: ReleveScope) => {
        setScope(newScope);
        setLotOffset(0);
    }, []);

    const handleCentreChange = useCallback((centreId: string) => {
        setSelectedCentreId(centreId);
        setLotOffset(0);
    }, []);

    const handleEtabChange = useCallback((etabId: string) => {
        setSelectedEtabId(etabId);
        setLotOffset(0);
    }, []);

    const handleLotChange = useCallback((newOffset: number) => {
        setLotOffset(newOffset);
    }, []);

    // ── Sélecteur de lot (pagination) ─────────────────────────────────────────
    const currentLot = Math.floor(lotOffset / LOT_SIZE) + 1;

    const footer = (
        <div className="flex flex-wrap items-center gap-2">
            {nbLots > 1 && (
                <Select
                    className="w-36"
                    value={String(lotOffset)}
                    onChange={(e) => handleLotChange(Number(e.target.value))}
                    disabled={isLoading || isDownloading || isDownloadingAll}
                >
                    {Array.from({ length: nbLots }, (_, i) => (
                        <option key={i} value={String(i * LOT_SIZE)}>
                            Lot {i + 1} / {nbLots}
                        </option>
                    ))}
                </Select>
            )}
            <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadLot}
                disabled={!data?.data.length || isDownloading || isDownloadingAll}
                isLoading={isDownloading}
            >
                <FileDown className="mr-1.5 h-4 w-4" />
                Télécharger{nbLots > 1 ? ` Lot ${currentLot}` : ''}
            </Button>
            {total > 0 && total <= MAX_TOTAL_DIRECT_DOWNLOAD && nbLots > 1 && (
                <Button
                    size="sm"
                    onClick={handleDownloadAll}
                    disabled={isDownloading || isDownloadingAll}
                    isLoading={isDownloadingAll}
                >
                    <Download className="mr-1.5 h-4 w-4" />
                    Télécharger tout ({total})
                </Button>
            )}
        </div>
    );

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Relevés de notes"
            description={`${examenLibelle} — Session ${examenAnnee}`}
            footer={footer}
            className="max-w-lg"
        >
            <div className="space-y-4">
                {/* ── Sélecteur scope (admin / tutelle uniquement) ────────── */}
                {(userRole === 'admin' || userRole === 'tutelle') && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Périmètre
                            </label>
                            <Select
                                value={scope}
                                onChange={(e) => handleScopeChange(e.target.value as ReleveScope)}
                            >
                                <option value="centre">Par centre</option>
                                <option value="etablissement">Par établissement</option>
                            </Select>
                        </div>

                        {scope === 'centre' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Centre
                                </label>
                                <Select
                                    value={selectedCentreId}
                                    onChange={(e) => handleCentreChange(e.target.value)}
                                >
                                    <option value="">Sélectionner un centre...</option>
                                    {centres.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nom} ({c.code})
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        )}

                        {scope === 'etablissement' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Établissement
                                </label>
                                <Select
                                    value={selectedEtabId}
                                    onChange={(e) => handleEtabChange(e.target.value)}
                                >
                                    <option value="">Sélectionner un établissement...</option>
                                    {etablissements.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.nom} ({e.code})
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Info centre/étab pour chef (non modifiable) ─────────── */}
                {userRole === 'chef_centre' && defaultCentreId && (
                    <p className="text-sm text-secondary">
                        Centre : <span className="font-medium text-primary">
                            {centres.find((c) => c.id === defaultCentreId)?.nom ?? defaultCentreId}
                        </span>
                    </p>
                )}
                {userRole === 'chef_etablissement' && defaultEtablissementId && (
                    <p className="text-sm text-secondary">
                        Établissement : <span className="font-medium text-primary">
                            {etablissements.find((e) => e.id === defaultEtablissementId)?.nom ?? defaultEtablissementId}
                        </span>
                    </p>
                )}

                {/* ── Contenu principal ──────────────────────────────────── */}
                {!scopeId && (
                    <p className="text-sm text-muted text-center py-4">
                        Sélectionnez un périmètre pour afficher les relevés.
                    </p>
                )}

                {scopeId && isLoading && (
                    <div className="flex items-center justify-center py-6">
                        <LoadingSpinner size="md" />
                        <span className="ml-2 text-sm text-secondary">Chargement des relevés...</span>
                    </div>
                )}

                {scopeId && isError && (
                    <p className="text-sm text-danger text-center py-4">
                        Erreur lors du chargement des relevés. Vérifiez que l'examen est délibéré.
                    </p>
                )}

                {scopeId && !isLoading && !isError && data && (
                    <div className="rounded-md bg-slate-50 border border-border p-4 space-y-2">
                        <p className="text-sm font-medium">
                            {total === 0
                                ? 'Aucun candidat trouvé pour ce périmètre.'
                                : `${total} candidat(s) trouvé(s)`}
                        </p>
                        {total > 0 && (
                            <>
                                <p className="text-xs text-secondary">
                                    Lot actuel : {data.data.length} relevé(s)
                                    {nbLots > 1 ? ` (lot ${currentLot}/${nbLots})` : ''}
                                </p>
                                {total > MAX_TOTAL_DIRECT_DOWNLOAD && (
                                    <p className="text-xs text-amber-600">
                                        Plus de {MAX_TOTAL_DIRECT_DOWNLOAD} candidats — téléchargez par lots.
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
