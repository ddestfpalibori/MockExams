import * as XLSX from 'xlsx';
import type { PreparationCentreImportRow } from '@/services/preparationCentreTypes';

export interface ParsedPreparationCentreExcel {
    rows: PreparationCentreImportRow[];
}

type ColMap = {
    matricule?: number;
    numero_table?: number;
    numero_anonyme?: number;
    salle?: number;
};

const HEADER_ALIASES: Record<string, keyof ColMap> = {
    matricule: 'matricule',
    num_matricule: 'matricule',
    numero_table: 'numero_table',
    num_table: 'numero_table',
    numero_anonyme: 'numero_anonyme',
    num_anonyme: 'numero_anonyme',
    anonymat: 'numero_anonyme',
    salle: 'salle',
    salle_nom: 'salle',
    nom_salle: 'salle',
};

function normalizeHeader(h: string): string {
    return h
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '_');
}

function detectColumns(headers: string[]): ColMap {
    const map: ColMap = {};
    headers.forEach((h, i) => {
        const key = HEADER_ALIASES[normalizeHeader(h)];
        if (key && !(key in map)) {
            (map[key] as number) = i;
        }
    });
    return map;
}

function cellStr(row: unknown[], col: number | undefined): string {
    if (col === undefined || row[col] == null) return '';
    return String(row[col]).trim();
}

export async function parsePreparationCentreExcel(file: File): Promise<ParsedPreparationCentreExcel> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error('Fichier Excel vide ou corrompu.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
        throw new Error('Fichier Excel vide (aucune ligne de donnees).');
    }

    const headerRow = rows[0].map(String);
    const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== '' && c != null));

    if (dataRows.length === 0) {
        throw new Error('Aucune ligne exploitable trouvee dans le fichier.');
    }

    if (dataRows.length > 1000) {
        throw new Error(`Trop de lignes (${dataRows.length} > 1000).`);
    }

    const cols = detectColumns(headerRow);
    const missingCols: string[] = [];
    if (cols.matricule === undefined) missingCols.push('MATRICULE');
    if (cols.numero_table === undefined) missingCols.push('NUMERO_TABLE');
    if (missingCols.length > 0) {
        throw new Error(`Colonnes manquantes : ${missingCols.join(', ')}.`);
    }

    const seenMatricules = new Set<string>();
    const seenNumeroTables = new Set<number>();
    const seenNumeroAnonymes = new Set<string>();

    const parsedRows: PreparationCentreImportRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowIndex = i + 2;
        const matricule = cellStr(row, cols.matricule);
        const numeroTableRaw = cellStr(row, cols.numero_table);
        const numeroAnonyme = cellStr(row, cols.numero_anonyme).toUpperCase();
        const salleNom = cellStr(row, cols.salle);

        if (!matricule) {
            throw new Error(`Ligne ${rowIndex} : matricule manquant.`);
        }

        const numeroTable = Number(numeroTableRaw);
        if (!numeroTableRaw || !Number.isInteger(numeroTable) || numeroTable <= 0) {
            throw new Error(`Ligne ${rowIndex} : numero_table invalide.`);
        }

        if (seenMatricules.has(matricule)) {
            throw new Error(`Ligne ${rowIndex} : matricule en doublon dans le fichier.`);
        }
        seenMatricules.add(matricule);

        if (seenNumeroTables.has(numeroTable)) {
            throw new Error(`Ligne ${rowIndex} : numero_table en doublon dans le fichier.`);
        }
        seenNumeroTables.add(numeroTable);

        if (numeroAnonyme) {
            if (seenNumeroAnonymes.has(numeroAnonyme)) {
                throw new Error(`Ligne ${rowIndex} : numero_anonyme en doublon dans le fichier.`);
            }
            seenNumeroAnonymes.add(numeroAnonyme);
        }

        parsedRows.push({
            row_index: rowIndex,
            matricule,
            numero_table: numeroTable,
            ...(numeroAnonyme && { numero_anonyme: numeroAnonyme }),
            ...(salleNom && { salle_nom: salleNom }),
        });
    }

    return { rows: parsedRows };
}
