import { supabase } from '@/lib/supabase';
import type {
    ExamenRow,
    ExamStatus,
    ExamenDisciplineDetail,
    ExamenDetailStats,
    CentreRow,
    DisciplineType,
} from '@/types/domain';
import type { Database } from '@/lib/database.types';

export type CreateExamenInput = Database['public']['Tables']['examens']['Insert'];
export type UpdateExamenInput = Database['public']['Tables']['examens']['Update'];

export interface AddDisciplineInput {
    examen_id: string;
    discipline_id: string;
    type: DisciplineType;
    coefficient: number;
    bareme: number;
}

// ── Conversion centièmes ↔ valeurs directes ─────────────────────────────────
// La DB stocke les seuils en centièmes (900 = 9.00/20) pour que F01/F02
// comparent directement avec note_centimes. Le frontend travaille en 0–20.

const toCentimes = (v: number): number => Math.round(v * 100);
const fromCentimes = (v: number): number => v / 100;

function seuilsFromDb(row: ExamenRow): ExamenRow {
    return {
        ...row,
        seuil_phase1: fromCentimes(row.seuil_phase1),
        seuil_phase2: fromCentimes(row.seuil_phase2),
        seuil_rattrapage: row.seuil_rattrapage != null ? fromCentimes(row.seuil_rattrapage) : null,
    };
}

function seuilsToDb<T extends { seuil_phase1?: number | null; seuil_phase2?: number | null; seuil_rattrapage?: number | null }>(input: T): T {
    return {
        ...input,
        ...(input.seuil_phase1 != null && { seuil_phase1: toCentimes(input.seuil_phase1) }),
        ...(input.seuil_phase2 != null && { seuil_phase2: toCentimes(input.seuil_phase2) }),
        // Utilise !== undefined (strict) pour distinguer "absent" (undefined) de "effacer" (null)
        ...(input.seuil_rattrapage !== undefined && {
            seuil_rattrapage: input.seuil_rattrapage != null ? toCentimes(input.seuil_rattrapage) : null,
        }),
    };
}

/**
 * Service pour la gestion des examens (M02)
 */
export const examenService = {
    /** Récupère la liste des examens accessibles à l'utilisateur */
    async fetchExamens(): Promise<ExamenRow[]> {
        const { data, error } = await supabase
            .from('examens')
            .select('*')
            .order('annee', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as ExamenRow[]).map(seuilsFromDb);
    },

    /** Récupère un examen par son ID */
    async fetchExamenById(id: string): Promise<ExamenRow> {
        const { data, error } = await supabase
            .from('examens')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return seuilsFromDb(data as ExamenRow);
    },

    /** Crée un nouvel examen */
    async createExamen(input: CreateExamenInput): Promise<ExamenRow> {
        const { data, error } = await supabase
            .from('examens')
            .insert(seuilsToDb(input))
            .select()
            .single();

        if (error) throw error;
        return seuilsFromDb(data as ExamenRow);
    },

    /** Met à jour un examen existant */
    async updateExamen(id: string, input: UpdateExamenInput): Promise<ExamenRow> {
        const { data, error } = await supabase
            .from('examens')
            .update(seuilsToDb(input))
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return seuilsFromDb(data as ExamenRow);
    },

    /** Change le statut (phase) d'un examen */
    async transitionnerPhase(id: string, phase: ExamStatus): Promise<void> {
        const { error } = await supabase
            .from('examens')
            .update({ status: phase })
            .eq('id', id);

        if (error) throw error;
    },

    /** Récupère les statistiques globales pour le Dashboard Admin */
    async fetchExamenStats() {
        const results = await Promise.all([
            supabase.from('examens').select('*', { count: 'exact', head: true }),
            supabase.from('examens').select('*', { count: 'exact', head: true }).not('status', 'in', '("PUBLIE","CLOS")'),
            supabase.from('centres').select('*', { count: 'exact', head: true }),
            supabase.from('candidats').select('*', { count: 'exact', head: true }),
        ]);

        for (const r of results) {
            if (r.error) throw r.error;
        }

        const [total, actifs, centres, candidats] = results;
        return {
            total_examens: total.count ?? 0,
            examens_actifs: actifs.count ?? 0,
            total_centres: centres.count ?? 0,
            total_candidats: candidats.count ?? 0,
        };
    },

    /** Statistiques rapides pour un examen donné (counts temps réel) */
    async fetchExamenDetailStats(examenId: string): Promise<ExamenDetailStats> {
        const [
            { count: nb_candidats },
            { count: nb_centres },
            { count: nb_disciplines },
        ] = await Promise.all([
            supabase.from('candidats').select('*', { count: 'exact', head: true }).eq('examen_id', examenId),
            supabase.from('examen_centres').select('*', { count: 'exact', head: true }).eq('examen_id', examenId),
            supabase.from('examen_disciplines').select('*', { count: 'exact', head: true }).eq('examen_id', examenId),
        ]);

        return {
            nb_candidats: nb_candidats ?? 0,
            nb_centres: nb_centres ?? 0,
            nb_disciplines: nb_disciplines ?? 0,
        };
    },

    /** Disciplines associées à un examen (avec jointure catalogue) */
    async fetchExamenDisciplines(examenId: string): Promise<ExamenDisciplineDetail[]> {
        const { data, error } = await supabase
            .from('examen_disciplines')
            .select('id, examen_id, discipline_id, type, coefficient, bareme, ordre_affichage, seuil_facultatif, discipline:disciplines(id, code, libelle)')
            .eq('examen_id', examenId)
            .order('ordre_affichage');

        if (error) throw error;
        return data as ExamenDisciplineDetail[];
    },

    /** Ajoute une discipline à un examen */
    async addExamenDiscipline(input: AddDisciplineInput): Promise<void> {
        const { error } = await supabase
            .from('examen_disciplines')
            .insert(input);

        if (error) throw error;
    },

    /** Retire une discipline d'un examen */
    async removeExamenDiscipline(id: string): Promise<void> {
        const { error } = await supabase
            .from('examen_disciplines')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /** Centres associés à un examen */
    async fetchExamenCentres(examenId: string): Promise<CentreRow[]> {
        const { data, error } = await supabase
            .from('examen_centres')
            .select('centres(*)')
            .eq('examen_id', examenId);

        if (error) throw error;
        return (data as Array<{ centres: CentreRow | null }>)
            .filter((d): d is { centres: CentreRow } => d.centres !== null)
            .map((d) => d.centres)
            .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
    },

    /** Associe un centre à un examen */
    async addExamenCentre(examenId: string, centreId: string): Promise<void> {
        const { error } = await supabase
            .from('examen_centres')
            .insert({ examen_id: examenId, centre_id: centreId });

        if (error) throw error;
    },

    /** Dissocie un centre d'un examen */
    async removeExamenCentre(examenId: string, centreId: string): Promise<void> {
        const { error } = await supabase
            .from('examen_centres')
            .delete()
            .eq('examen_id', examenId)
            .eq('centre_id', centreId);

        if (error) throw error;
    },

    /** Lancement de la délibération (RPC F03) */
    async delibererExamen(id: string, userId: string) {
        const { data, error } = await supabase.rpc('deliberer_examen', {
            p_examen_id: id,
            p_delibere_par: userId
        });

        if (error) throw error;
        return data;
    },
};
