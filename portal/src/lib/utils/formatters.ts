import type { ExamenRow, CentreRow } from '@/types/domain';

/**
 * Formate un numéro de table selon la configuration de l'examen et les infos du centre.
 * ex: formatTableNumber(1, centre, examen) => "C102-0001"
 */
export function formatTableNumber(
    numero: number | string | null,
    examen: Partial<ExamenRow> | null,
    centre: Partial<CentreRow> | null
): string {
    if (numero == null) return '—';
    if (!examen) return String(numero);

    const {
        table_prefix_type = 'AUCUN',
        table_prefix_valeur = '',
        table_separator = '-',
        table_padding = 4
    } = examen;

    if (table_prefix_type === 'AUCUN') return String(numero);

    let prefix = '';
    switch (table_prefix_type) {
        case 'FIXE':
            prefix = table_prefix_valeur || '';
            break;
        case 'CENTRE':
            prefix = centre?.code || '';
            break;
        case 'COMMUNE':
            prefix = centre?.code_commune || '';
            break;
        case 'DEPARTEMENT':
            prefix = centre?.code_departement || '';
            break;
    }

    const paddedNum = String(numero).padStart(table_padding, '0');

    if (!prefix) return paddedNum;

    return `${prefix}${table_separator}${paddedNum}`;
}
