import * as XLSX from 'xlsx';
import { downloadExcel } from './excelLot';
import type {
    ExportResultatsData,
    DisciplineExport,
    CandidatExport,
    ResultatAnonymeExport,
} from './exportService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoyenne(centimes: number | null): string {
    if (centimes == null) return '—';
    return (centimes / 100).toFixed(2);
}

function formatNote(centimes: number | null, codeSpecial: string | null): string {
    if (codeSpecial) return codeSpecial;
    if (centimes == null) return '—';
    return (centimes / 100).toFixed(2);
}

function formatDecision(status: string): string {
    switch (status) {
        case 'ADMIS': return 'Admis(e)';
        case 'RATTRAPAGE': return 'Rattrapage';
        case 'NON_ADMIS': return 'Non admis(e)';
        default: return status;
    }
}

function buildCandidatRow(
    candidat: CandidatExport,
    disciplines: DisciplineExport[],
    includeNom: boolean,
): Record<string, string> {
    const row: Record<string, string> = {};

    if (includeNom) {
        row['Nom'] = candidat.nom;
        row['Prénom'] = candidat.prenom;
    }
    row['N° Anonyme'] = candidat.numero_anonyme ?? '—';

    for (const disc of disciplines) {
        const note = candidat.notes.find((n) => n.discipline_id === disc.id);
        row[`${disc.libelle} (${disc.coefficient})`] = note
            ? formatNote(note.note_centimes, note.code_special)
            : '—';
    }

    row['Moyenne'] = formatMoyenne(candidat.moyenne_centimes);
    row['Décision'] = formatDecision(candidat.status);

    return row;
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]): void {
    ws['!cols'] = widths.map((w) => ({ wch: w }));
}

// ── Export Modèle B (nominatif — admin/chef_etab) ─────────────────────────────

/**
 * Génère un classeur Excel avec une feuille par établissement.
 * Colonnes : Nom | Prénom | N° Anonyme | [disciplines] | Moyenne | Décision
 * Accessible : admin uniquement (données nominatives PII).
 */
export function generateExcelModelB(data: ExportResultatsData): Uint8Array {
    const wb = XLSX.utils.book_new();

    for (const etab of data.etablissements) {
        const rows = etab.candidats.map((c) =>
            buildCandidatRow(c, data.disciplines, true)
        );

        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);

        // Largeurs colonnes : Nom(20) Prénom(20) N°Anon(15) disciplines(18 each) Moyenne(10) Décision(14)
        const widths = [20, 20, 15, ...data.disciplines.map(() => 18), 10, 14];
        setColWidths(ws, widths);

        // Nom de feuille : max 31 chars (limite Excel)
        const sheetName = etab.nom.substring(0, 28).replace(/[\\/:?*[\]]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    if (wb.SheetNames.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), 'Résultats');
    }

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

// ── Export Modèle A (anonyme — tutelle/admin) ─────────────────────────────────

/**
 * Génère un classeur Excel avec une feuille par établissement.
 * Colonnes : N° Anonyme | [disciplines] | Moyenne | Décision
 * Accessible : admin + tutelle + chef_etablissement.
 */
export function generateExcelModelA(data: ExportResultatsData): Uint8Array {
    const wb = XLSX.utils.book_new();

    for (const etab of data.etablissements) {
        const rows = etab.candidats.map((c) =>
            buildCandidatRow(c, data.disciplines, false)
        );

        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);

        const widths = [15, ...data.disciplines.map(() => 18), 10, 14];
        setColWidths(ws, widths);

        const sheetName = etab.nom.substring(0, 28).replace(/[\\/:?*[\]]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    if (wb.SheetNames.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), 'Résultats');
    }

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

// ── Export Modèle A simplifié (sans notes détaillées — depuis résultats simples) ──

/**
 * Export rapide depuis résultats anonymes (sans Edge Function).
 * Colonnes : N° Anonyme | Moyenne | Décision
 * Pour tutelle quand les notes par discipline ne sont pas requises.
 */
export function generateExcelAnonymeSimple(
    resultats: ResultatAnonymeExport[],
): Uint8Array {
    // Grouper par établissement
    const grouped = new Map<string, ResultatAnonymeExport[]>();
    for (const r of resultats) {
        const list = grouped.get(r.etablissement_nom) ?? [];
        list.push(r);
        grouped.set(r.etablissement_nom, list);
    }

    const wb = XLSX.utils.book_new();

    // Feuille récapitulatif
    const allRows = resultats.map((r) => ({
        'Établissement': r.etablissement_nom,
        'N° Anonyme': r.numero_anonyme ?? '—',
        'Moyenne': formatMoyenne(r.moyenne_centimes),
        'Décision': formatDecision(r.status),
        'Phase': r.phase,
    }));
    const wsAll = XLSX.utils.json_to_sheet(allRows);
    setColWidths(wsAll, [30, 15, 10, 14, 8]);
    XLSX.utils.book_append_sheet(wb, wsAll, 'Tous');

    // Une feuille par établissement
    for (const [etabNom, rows] of grouped) {
        const etabRows = rows.map((r) => ({
            'N° Anonyme': r.numero_anonyme ?? '—',
            'Moyenne': formatMoyenne(r.moyenne_centimes),
            'Décision': formatDecision(r.status),
            'Phase': r.phase,
        }));
        const ws = XLSX.utils.json_to_sheet(etabRows);
        setColWidths(ws, [15, 10, 14, 8]);
        const sheetName = etabNom.substring(0, 28).replace(/[\\/:?*[\]]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

// ── Téléchargement ────────────────────────────────────────────────────────────

export function downloadExcelResultats(
    data: Uint8Array,
    examenCode: string,
    modele: 'A' | 'B',
): void {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadExcel(data, `resultats_${examenCode}_modele${modele}_${date}.xlsx`);
}
