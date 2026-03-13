import * as XLSX from 'xlsx';
import type { LotWithDetails } from './lots';

// ── Types ────────────────────────────────────────────────────────────────────

/** Métadonnées HMAC intégrées dans la feuille _meta du classeur Excel */
export interface LotMetaExcel {
    centre_id: string;
    examen_id: string;
    matiere_id: string;
    serie_id: string;
    option_id: string;
    lot_numero: number;
    nb_copies: number;
    generation_timestamp: string;
    hmac_signature: string;
}

/** Une ligne de note extraite du fichier rempli par le correcteur */
export interface NoteRow {
    numero_anonyme: string;
    valeur: string | number;
}

/** Résultat du parsing d'un fichier Excel retourné par le correcteur */
export interface ParsedLotExcel {
    meta: LotMetaExcel;
    rows: NoteRow[];
}

// Clés dans l'ordre exact attendu par verify-import / hmac.ts
const META_KEYS: (keyof LotMetaExcel)[] = [
    'centre_id', 'examen_id', 'matiere_id', 'serie_id', 'option_id',
    'lot_numero', 'nb_copies', 'generation_timestamp', 'hmac_signature',
];

// ── Export : générer le classeur Excel pour un lot signé ─────────────────────

/**
 * Génère un fichier Excel (.xlsx) pour un lot de correction signé.
 * Le fichier contient :
 *  - Feuille `_meta` (masquée) : métadonnées HMAC clé/valeur
 *  - Feuille `Notes` : numéros anonymes + colonne Note vide
 */
export function generateLotExcel(
    lot: LotWithDetails,
    disciplineType: string,
    candidatAnonymats: string[],
): Uint8Array {
    const wb = XLSX.utils.book_new();

    // ── Feuille _meta (masquée) ──────────────────────────────────────────────
    const meta: LotMetaExcel = {
        centre_id: lot.centre_id,
        examen_id: lot.examen_id,
        matiere_id: lot.examen_discipline_id,
        serie_id: lot.serie_id ?? '',
        option_id: disciplineType === 'facultatif' ? lot.examen_discipline_id : '',
        lot_numero: lot.lot_numero,
        nb_copies: lot.nb_copies,
        generation_timestamp: lot.generation_timestamp ?? '',
        hmac_signature: lot.hmac_signature ?? '',
    };

    const metaData = META_KEYS.map((key) => ({ Champ: key, Valeur: String(meta[key]) }));
    const metaSheet = XLSX.utils.json_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, metaSheet, '_meta');
    // Masquer la feuille _meta (state 2 = very hidden, non accessible via UI Excel)
    wb.Workbook = wb.Workbook ?? {};
    wb.Workbook.Sheets = wb.Workbook.Sheets ?? [];
    wb.Workbook.Sheets[0] = { ...(wb.Workbook.Sheets[0] ?? {}), Hidden: 2 };

    // ── Feuille Notes ────────────────────────────────────────────────────────
    const notesData = candidatAnonymats.map((num) => ({
        'N° Anonyme': num,
        'Note': '',
    }));
    const notesSheet = XLSX.utils.json_to_sheet(notesData);

    // Largeurs de colonnes
    notesSheet['!cols'] = [{ wch: 18 }, { wch: 10 }];

    XLSX.utils.book_append_sheet(wb, notesSheet, 'Notes');

    // ── Générer le fichier ───────────────────────────────────────────────────
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

/** Déclenche le téléchargement d'un Uint8Array en tant que fichier .xlsx */
export function downloadExcel(data: Uint8Array, filename: string): void {
    const blob = new Blob([new Uint8Array(data)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Import : parser un fichier Excel rempli par le correcteur ────────────────

/**
 * Parse un fichier Excel (.xlsx) retourné par un correcteur.
 * Extrait les métadonnées _meta et les lignes de notes.
 *
 * @throws Error si la structure du fichier est invalide
 */
export async function parseLotExcel(file: File): Promise<ParsedLotExcel> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    // ── Extraire _meta ───────────────────────────────────────────────────────
    const metaSheet = wb.Sheets['_meta'];
    if (!metaSheet) {
        throw new Error('Fichier invalide : feuille _meta manquante. Utilisez un fichier généré par l\'application.');
    }

    const metaRows = XLSX.utils.sheet_to_json<{ Champ: string; Valeur: string }>(metaSheet);
    const metaMap = new Map(metaRows.map((r) => [r.Champ, r.Valeur]));

    // Vérifier que toutes les clés attendues sont présentes
    for (const key of META_KEYS) {
        if (!metaMap.has(key)) {
            throw new Error(`Fichier invalide : champ _meta manquant "${key}".`);
        }
    }

    const meta: LotMetaExcel = {
        centre_id: metaMap.get('centre_id')!,
        examen_id: metaMap.get('examen_id')!,
        matiere_id: metaMap.get('matiere_id')!,
        serie_id: metaMap.get('serie_id')!,
        option_id: metaMap.get('option_id')!,
        lot_numero: Number(metaMap.get('lot_numero')),
        nb_copies: Number(metaMap.get('nb_copies')),
        generation_timestamp: metaMap.get('generation_timestamp')!,
        hmac_signature: metaMap.get('hmac_signature')!,
    };

    // ── Extraire les notes ───────────────────────────────────────────────────
    const notesSheet = wb.Sheets['Notes'];
    if (!notesSheet) {
        throw new Error('Fichier invalide : feuille Notes manquante.');
    }

    const notesRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(notesSheet);
    const rows: NoteRow[] = [];

    for (const row of notesRows) {
        const numAnon = row['N° Anonyme'];
        const note = row['Note'];

        if (numAnon == null || String(numAnon).trim() === '') continue;

        const valeur = note == null || String(note).trim() === '' ? '' : note;
        rows.push({
            numero_anonyme: String(numAnon).trim(),
            valeur: typeof valeur === 'number' ? valeur : String(valeur).trim().toUpperCase(),
        });
    }

    if (rows.length === 0) {
        throw new Error('Aucune ligne de note trouvée dans la feuille Notes.');
    }

    // Filtrer les lignes sans note remplie (le correcteur n'a rien saisi)
    const filledRows = rows.filter((r) => r.valeur !== '');

    if (filledRows.length === 0) {
        throw new Error('Aucune note saisie dans le fichier. Remplissez la colonne Note avant d\'importer.');
    }

    return { meta, rows: filledRows };
}
