/**
 * Service Suivi Longitudinal Inter-Examens (Sprint 6C)
 *
 * Appelle la fonction PostgreSQL get_suivi_longitudinal()
 * qui reconstruit la chaîne A→B→C via CTE récursive sur source_candidat_id.
 */

import { supabase } from '@/lib/supabase';
import type { SuiviLongitudinalRow, EtapeLongitudinale, ResultatStatus } from '@/types/domain';

/** Récupère la chaîne longitudinale complète pour tous les candidats hérités
 *  d'un examen cible. Filtre établissement appliqué côté DB pour chef_etablissement. */
export async function fetchSuiviLongitudinal(examenCibleId: string): Promise<SuiviLongitudinalRow[]> {
    const { data, error } = await supabase.rpc('get_suivi_longitudinal', {
        p_examen_cible_id: examenCibleId,
    });

    if (error) throw error;
    if (!data) return [];

    // Typer le champ etapes (retourné comme Json par Supabase)
    return (data as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        const etapesRaw = (r.etapes as unknown[]) ?? [];

        const etapes: EtapeLongitudinale[] = etapesRaw.map((e) => {
            const step = e as Record<string, unknown>;
            return {
                examen_id:       step.examen_id as string,
                code:            step.code as string,
                annee:           step.annee as number,
                libelle:         step.libelle as string,
                status:          (step.status ?? null) as ResultatStatus | null,
                moyenne_centimes: (step.moyenne_centimes ?? null) as number | null,
                numero_anonyme:  (step.numero_anonyme ?? null) as string | null,
                depth:           step.depth as number,
            };
        });

        return {
            candidat_id:      r.candidat_id as string,
            racine_id:        (r.racine_id ?? null) as string | null,
            etablissement_id: r.etablissement_id as string,
            etablissement_nom: r.etablissement_nom as string,
            serie_id:         (r.serie_id ?? null) as string | null,
            serie_code:       (r.serie_code ?? null) as string | null,
            classe_id:        (r.classe_id ?? null) as string | null,
            classe_libelle:   (r.classe_libelle ?? null) as string | null,
            numero_anonyme:   (r.numero_anonyme ?? null) as string | null,
            nb_etapes:        r.nb_etapes as number,
            etapes,
        };
    });
}

/** Calcule les KPIs agrégés à partir des lignes du suivi */
export function computeKpisSuivi(rows: SuiviLongitudinalRow[]) {
    let progression = 0;  // NON_ADMIS/RATTRAPAGE → ADMIS
    let regression  = 0;  // ADMIS → NON_ADMIS/RATTRAPAGE
    let maintenu    = 0;  // ADMIS → ADMIS
    let enCours     = 0;  // pas encore de résultat dans l'examen cible

    for (const row of rows) {
        // Étape source = avant-dernière (index length-2), cible = dernière (index length-1)
        if (row.etapes.length < 2) {
            enCours++;
            continue;
        }
        const source = row.etapes[row.etapes.length - 2];
        const cible  = row.etapes[row.etapes.length - 1];

        if (!cible.status) {
            enCours++;
            continue;
        }

        const echouait = source.status === 'NON_ADMIS' || source.status === 'RATTRAPAGE';
        const admisNow = cible.status === 'ADMIS';
        const admisAvant = source.status === 'ADMIS';
        const echoueNow = cible.status === 'NON_ADMIS' || cible.status === 'RATTRAPAGE';

        if (echouait && admisNow) progression++;
        else if (admisAvant && echoueNow) regression++;
        else if (admisAvant && admisNow) maintenu++;
    }

    return {
        total: rows.length,
        progression,
        regression,
        maintenu,
        enCours,
    };
}
