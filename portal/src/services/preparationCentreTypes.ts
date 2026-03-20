export type PreparationCentreImportMode =
    | 'validate_only'
    | 'fill_only'
    | 'overwrite_confirmed';

export interface PreparationCentreImportRow {
    row_index: number;
    matricule: string;
    numero_table: number;
    numero_anonyme?: string;
    salle_nom?: string;
}

export interface PreparationCentreImportLine {
    row_index: number;
    matricule: string | null;
    status: 'ok' | 'ignored' | 'error' | 'conflict';
    action: 'would_update' | 'updated' | 'ignored_existing_values' | 'none';
    message: string;
}

export interface PreparationCentreImportResult {
    mode: PreparationCentreImportMode;
    updated: number;
    ignored: number;
    errors: number;
    conflicts: number;
    lines: PreparationCentreImportLine[];
}
