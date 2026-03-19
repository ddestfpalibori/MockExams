import { supabase } from '@/lib/supabase';

export const AUDIT_PAGE_SIZE = 20;

export interface AuditFilters {
    table_name?: string;
    operation?: 'INSERT' | 'UPDATE' | 'DELETE';
    date_from?: string; // YYYY-MM-DD
    date_to?: string;   // YYYY-MM-DD
}

export interface AuditLogEntry {
    id: string;
    table_name: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    record_id: string | null;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    performed_by: string | null;
    performed_at: string;
    performer_email: string | null;
}

export interface AuditLogPage {
    entries: AuditLogEntry[];
    total: number;
}

export interface CodeAccesBloque {
    id: string;
    candidat_id: string | null;
    tentatives: number;
    lockout_until: string;
    candidat_numero_anonyme: string | null;
    etablissement_nom: string | null;
}

export async function fetchAuditLog(
    filters: AuditFilters,
    page: number,
): Promise<AuditLogPage> {
    const from = (page - 1) * AUDIT_PAGE_SIZE;
    const to = page * AUDIT_PAGE_SIZE - 1;

    let query = supabase
        .from('audit_log')
        .select('*, performer:profiles(email)', { count: 'exact' })
        .order('performed_at', { ascending: false })
        .range(from, to);

    if (filters.table_name) query = query.eq('table_name', filters.table_name);
    if (filters.operation)  query = query.eq('operation', filters.operation);
    if (filters.date_from)  query = query.gte('performed_at', filters.date_from + 'T00:00:00Z');
    if (filters.date_to)    query = query.lte('performed_at', filters.date_to   + 'T23:59:59Z');

    const { data, error, count } = await query;
    if (error) throw error;

    return {
        entries: (data ?? []).map((row) => ({
            id:             row.id,
            table_name:     row.table_name,
            operation:      row.operation as AuditLogEntry['operation'],
            record_id:      row.record_id,
            old_data:       row.old_data as Record<string, unknown> | null,
            new_data:       row.new_data as Record<string, unknown> | null,
            performed_by:   row.performed_by,
            performed_at:   row.performed_at,
            performer_email: (row.performer as { email: string } | null)?.email ?? null,
        })),
        total: count ?? 0,
    };
}

export async function fetchConsultationsBloquees(): Promise<CodeAccesBloque[]> {
    const { data, error } = await supabase
        .from('codes_acces')
        .select(`
            id,
            candidat_id,
            tentatives,
            lockout_until,
            candidat:candidats(
                numero_anonyme,
                etablissement:etablissements(nom)
            )
        `)
        .not('lockout_until', 'is', null)
        .gt('lockout_until', new Date().toISOString())
        .order('lockout_until', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row) => {
        const candidat = row.candidat as {
            numero_anonyme: string | null;
            etablissement: { nom: string } | null;
        } | null;
        return {
            id:                      row.id,
            candidat_id:             row.candidat_id,
            tentatives:              row.tentatives,
            lockout_until:           row.lockout_until as string,
            candidat_numero_anonyme: candidat?.numero_anonyme ?? null,
            etablissement_nom:       candidat?.etablissement?.nom ?? null,
        };
    });
}

export async function debloquerConsultation(codeAccesId: string): Promise<void> {
    const { error } = await supabase.rpc('debloquer_consultation', {
        p_code_acces_id: codeAccesId,
    });
    if (error) throw error;
}
