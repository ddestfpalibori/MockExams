import * as XLSX from 'xlsx';
import { downloadExcel } from './excelLot';
import type {
    ExportResultatsData,
    DisciplineExport,
    CandidatExport,
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

function uniqueSheetName(nom: string, used: Set<string>): string {
    const base = nom.substring(0, 28).replace(/[\\/:?*[\]]/g, '_');
    if (!used.has(base)) {
        used.add(base);
        return base;
    }
    for (let i = 2; i <= 99; i++) {
        const candidate = `${base.substring(0, 25)}_${i}`;
        if (!used.has(candidate)) {
            used.add(candidate);
            return candidate;
        }
    }
    const fallback = `Etab_${used.size}`;
    used.add(fallback);
    return fallback;
}

// ── Export Modèle B (nominatif — admin uniquement) ────────────────────────────

/**
 * Génère un classeur Excel avec une feuille par établissement.
 * Colonnes : Nom | Prénom | N° Anonyme | [disciplines] | Moyenne | Décision
 * Accessible : admin uniquement (données nominatives PII).
 */
export function generateExcelModelB(data: ExportResultatsData): Uint8Array {
    const wb = XLSX.utils.book_new();
    const usedNames = new Set<string>();

    for (const etab of data.etablissements) {
        const rows = etab.candidats.map((c) =>
            buildCandidatRow(c, data.disciplines, true)
        );

        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);

        // Largeurs colonnes : Nom(20) Prénom(20) N°Anon(15) disciplines(18 each) Moyenne(10) Décision(14)
        const widths = [20, 20, 15, ...data.disciplines.map(() => 18), 10, 14];
        setColWidths(ws, widths);

        XLSX.utils.book_append_sheet(wb, ws, uniqueSheetName(etab.nom, usedNames));
    }

    if (wb.SheetNames.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), 'Résultats');
    }

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

// ── Export Modèle A (anonyme — tutelle/admin/chef_etablissement) ──────────────

/**
 * Génère un classeur Excel avec une feuille par établissement.
 * Colonnes : N° Anonyme | [disciplines] | Moyenne | Décision
 */
export function generateExcelModelA(data: ExportResultatsData): Uint8Array {
    const wb = XLSX.utils.book_new();
    const usedNames = new Set<string>();

    for (const etab of data.etablissements) {
        const rows = etab.candidats.map((c) =>
            buildCandidatRow(c, data.disciplines, false)
        );

        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);

        const widths = [15, ...data.disciplines.map(() => 18), 10, 14];
        setColWidths(ws, widths);

        XLSX.utils.book_append_sheet(wb, ws, uniqueSheetName(etab.nom, usedNames));
    }

    if (wb.SheetNames.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), 'Résultats');
    }

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

/**
 * Téléchargement du fichier Excel des résultats.
 */
export function downloadExcelResultats(
    data: Uint8Array,
    examenCode: string,
    type: 'anonyme' | 'nominal',
): void {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadExcel(data, `resultats_${examenCode}_${type}_${date}.xlsx`);
}
