import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlobalStats {
    total: number;
    admis: number;
    rattrapage_initial: number;
    non_admis: number;
    taux_reussite: number;
    taux_rattrapage: number;
    moyenne: number | null;
    mediane: number | null;
    ecart_type: number | null;
    note_min: number | null;
    note_max: number | null;
}

export interface DistributionBucket {
    bucket_centimes: number;
    count: number;
}

export interface DisciplineStats {
    discipline_id: string;
    examen_discipline_id: string;
    libelle: string;
    code: string;
    coefficient: number;
    nb_notes: number;
    nb_absents: number;
    nb_sous_moyenne: number;
    moyenne: number | null;
    taux_echec: number;
}

export interface SerieStats {
    serie_id: string;
    code: string;
    libelle: string;
    total: number;
    admis: number;
    rattrapage: number;
    non_admis: number;
    taux_reussite: number;
    moyenne: number | null;
}

export interface SexeStatItem {
    total: number;
    admis: number;
    taux_reussite: number;
    moyenne: number | null;
}

export type SexeStats = Record<'M' | 'F', SexeStatItem>;

export interface EtablissementStats {
    etablissement_id: string;
    nom: string;
    ville: string | null;
    type_milieu: 'urbain' | 'semi_urbain' | 'rural' | null;
    total: number;
    admis: number;
    taux_reussite: number;
    moyenne: number | null;
}

export interface CentreStats {
    centre_id: string;
    nom: string;
    ville: string | null;
    total: number;
    admis: number;
    taux_reussite: number;
    moyenne: number | null;
}

export interface MilieuStats {
    type_milieu: 'urbain' | 'semi_urbain' | 'rural' | 'non_renseigne';
    total: number;
    admis: number;
    taux_reussite: number;
    moyenne: number | null;
}

export interface AnalyticsData {
    examen_id: string;
    examen_libelle: string;
    examen_annee: number;
    global: GlobalStats;
    distribution: DistributionBucket[];
    par_discipline: DisciplineStats[];
    par_serie: SerieStats[];
    par_sexe: Partial<SexeStats>;
    par_etablissement: EtablissementStats[];
    par_centre: CentreStats[];
    par_milieu: MilieuStats[];
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchAnalytics(examenId: string): Promise<AnalyticsData> {
    const { data, error } = await supabase.functions.invoke('get-analytics', {
        body: { examen_id: examenId },
    });
    if (error) throw error;
    return data as AnalyticsData;
}

// ── Moteur de Remédiation ─────────────────────────────────────────────────────

export type RemediationSeverity = 'critique' | 'attention' | 'info';

export interface RemediationSuggestion {
    id: string;
    severity: RemediationSeverity;
    categorie: string;
    titre: string;
    description: string;
    indicateur: string;
}

/**
 * Calcule les suggestions de remédiation à partir des données analytics.
 * 7 règles dérivées des indicateurs clés.
 */
export function computeRemediations(data: AnalyticsData): RemediationSuggestion[] {
    const suggestions: RemediationSuggestion[] = [];
    const g = data.global;

    // ── R1 : Taux de réussite global faible ──────────────────────────────────
    if (g.taux_reussite < 30) {
        suggestions.push({
            id: 'r1-taux-global-critique',
            severity: 'critique',
            categorie: 'Performance globale',
            titre: 'Taux de réussite critique',
            description:
                `Moins de 30 % des candidats sont admis (${g.taux_reussite} %). ` +
                'Revoir les objectifs pédagogiques, la couverture des programmes et les conditions de préparation.',
            indicateur: `Taux de réussite : ${g.taux_reussite} %`,
        });
    } else if (g.taux_reussite < 50) {
        suggestions.push({
            id: 'r1-taux-global-attention',
            severity: 'attention',
            categorie: 'Performance globale',
            titre: 'Taux de réussite insuffisant',
            description:
                `Moins de la moitié des candidats réussissent (${g.taux_reussite} %). ` +
                'Analyser les disciplines les plus défaillantes et renforcer les révisions ciblées.',
            indicateur: `Taux de réussite : ${g.taux_reussite} %`,
        });
    }

    // ── R2 : Taux de rattrapage élevé ────────────────────────────────────────
    if (g.taux_rattrapage > 25) {
        suggestions.push({
            id: 'r2-rattrapage-eleve',
            severity: g.taux_rattrapage > 40 ? 'critique' : 'attention',
            categorie: 'Rattrapage',
            titre: 'Part de candidats en rattrapage élevée',
            description:
                `${g.taux_rattrapage} % des candidats se retrouvent en rattrapage. ` +
                'Identifier les matières frontières (moyenne proche de 10) et concentrer les révisions sur ces candidats.',
            indicateur: `Taux rattrapage : ${g.taux_rattrapage} %`,
        });
    }

    // ── R3 : Disciplines avec taux d'échec > 60 % ───────────────────────────
    const disciplinesCritiques = data.par_discipline
        .filter((d) => d.taux_echec > 60 && d.nb_notes >= 10)
        .sort((a, b) => b.taux_echec - a.taux_echec);

    if (disciplinesCritiques.length > 0) {
        const liste = disciplinesCritiques
            .slice(0, 3)
            .map((d) => `${d.libelle} (${d.taux_echec} %)`)
            .join(', ');
        suggestions.push({
            id: 'r3-disciplines-critiques',
            severity: 'critique',
            categorie: 'Disciplines',
            titre: 'Disciplines à fort taux d\'échec',
            description:
                `Plusieurs matières dépassent 60 % de notes sous la moyenne : ${liste}. ` +
                'Revoir la pédagogie, le volume horaire et la qualité des ressources dans ces disciplines.',
            indicateur: `${disciplinesCritiques.length} discipline(s) critique(s)`,
        });
    } else {
        const disciplinesAttention = data.par_discipline
            .filter((d) => d.taux_echec > 40 && d.nb_notes >= 10);
        if (disciplinesAttention.length > 0) {
            const liste = disciplinesAttention
                .slice(0, 3)
                .map((d) => `${d.libelle} (${d.taux_echec} %)`)
                .join(', ');
            suggestions.push({
                id: 'r3-disciplines-attention',
                severity: 'attention',
                categorie: 'Disciplines',
                titre: 'Disciplines nécessitant un renforcement',
                description:
                    `Des disciplines présentent un taux d'échec notable : ${liste}. ` +
                    'Prévoir des sessions de renforcement et des supports pédagogiques complémentaires.',
                indicateur: `${disciplinesAttention.length} discipline(s) à surveiller`,
            });
        }
    }

    // ── R4 : Écart de taux de réussite entre séries > 20 pts ────────────────
    if (data.par_serie.length >= 2) {
        // Tri défensif côté client — ne pas supposer l'ordre retourné par le backend
        const sortedSeries = [...data.par_serie].sort((a, b) => b.taux_reussite - a.taux_reussite);
        const tauxSeries = sortedSeries.map((s) => s.taux_reussite);
        const ecartSeries = Math.max(...tauxSeries) - Math.min(...tauxSeries);
        if (ecartSeries > 20) {
            const meilleures = sortedSeries[0];
            const faibles = sortedSeries[sortedSeries.length - 1];
            suggestions.push({
                id: 'r4-ecart-series',
                severity: ecartSeries > 40 ? 'critique' : 'attention',
                categorie: 'Séries',
                titre: 'Disparités importantes entre séries',
                description:
                    `Écart de ${ecartSeries.toFixed(1)} pts entre ${meilleures.code} (${meilleures.taux_reussite} %) ` +
                    `et ${faibles.code} (${faibles.taux_reussite} %). ` +
                    'Analyser les spécificités de la série la plus faible : ressources, encadrement, profil des candidats.',
                indicateur: `Écart inter-séries : ${ecartSeries.toFixed(1)} pts`,
            });
        }
    }

    // ── R5 : Inégalité de genre (écart taux réussite M/F > 10 pts) ──────────
    const sexeM = data.par_sexe['M'];
    const sexeF = data.par_sexe['F'];
    if (sexeM && sexeF && sexeM.total >= 10 && sexeF.total >= 10) {
        const ecartSexe = Math.abs(sexeM.taux_reussite - sexeF.taux_reussite);
        if (ecartSexe > 10) {
            const plusFaible = sexeM.taux_reussite < sexeF.taux_reussite ? 'les garçons' : 'les filles';
            const tauxPlusFaible = Math.min(sexeM.taux_reussite, sexeF.taux_reussite);
            suggestions.push({
                id: 'r5-inegalite-genre',
                severity: ecartSexe > 20 ? 'critique' : 'attention',
                categorie: 'Équité de genre',
                titre: 'Disparité de réussite entre filles et garçons',
                description:
                    `Écart de ${ecartSexe.toFixed(1)} pts entre garçons et filles. ` +
                    `${plusFaible.charAt(0).toUpperCase() + plusFaible.slice(1)} réussissent moins bien (${tauxPlusFaible} %). ` +
                    'Vérifier les conditions d\'accès à l\'éducation, le taux d\'absentéisme et les ressources selon le genre.',
                indicateur: `Écart M/F : ${ecartSexe.toFixed(1)} pts`,
            });
        }
    }

    // ── R6 : Établissements sous-performants (taux < taux global - 15 pts) ──
    if (data.par_etablissement.length >= 3) {
        const seuil = g.taux_reussite - 15;
        const etabsFaibles = data.par_etablissement
            .filter((e) => e.taux_reussite < seuil && e.total >= 5);
        if (etabsFaibles.length > 0) {
            // Critique si au moins un établissement est à 0 % (avec ≥ 10 candidats)
            const hasCritique = etabsFaibles.some((e) => e.taux_reussite === 0 && e.total >= 10);
            const liste = etabsFaibles
                .slice(0, 3)
                .map((e) => `${e.nom} (${e.taux_reussite} %)`)
                .join(', ');
            suggestions.push({
                id: 'r6-etablissements-faibles',
                severity: hasCritique ? 'critique' : 'attention',
                categorie: 'Établissements',
                titre: 'Établissements significativement sous la moyenne',
                description:
                    `${etabsFaibles.length} établissement(s) performent bien en dessous de la moyenne : ${liste}. ` +
                    'Cibler un accompagnement pédagogique renforcé, auditer l\'encadrement et les ressources matérielles.',
                indicateur: `${etabsFaibles.length} établissement(s) sous-performants`,
            });
        }
    }

    // ── R7 : Inégalité entre milieux géographiques ────────────────────────────
    // Compare le meilleur et le moins bon milieu renseigné (≥ 5 candidats),
    // quelle que soit la combinaison (rural/urbain, semi_urbain/urbain, etc.)
    const milieuxRenseignes = data.par_milieu.filter(
        (m) => m.type_milieu !== 'non_renseigne' && m.total >= 5,
    );
    if (milieuxRenseignes.length >= 2) {
        const sorted = [...milieuxRenseignes].sort((a, b) => b.taux_reussite - a.taux_reussite);
        const meilleur = sorted[0];
        const faible = sorted[sorted.length - 1];
        const ecartMilieux = meilleur.taux_reussite - faible.taux_reussite;
        if (ecartMilieux > 15) {
            const MILIEU_LABELS: Record<string, string> = {
                urbain: 'urbains',
                semi_urbain: 'semi-urbains',
                rural: 'ruraux',
            };
            const labelFaible = MILIEU_LABELS[faible.type_milieu] ?? faible.type_milieu;
            const labelMeilleur = MILIEU_LABELS[meilleur.type_milieu] ?? meilleur.type_milieu;
            suggestions.push({
                id: 'r7-inegalite-milieu',
                severity: ecartMilieux > 30 ? 'critique' : 'attention',
                categorie: 'Équité territoriale',
                titre: 'Inégalités entre milieux géographiques',
                description:
                    `Les établissements ${labelFaible} réussissent moins bien (${faible.taux_reussite} %) ` +
                    `que les ${labelMeilleur} (${meilleur.taux_reussite} %), soit ${ecartMilieux.toFixed(1)} pts d'écart. ` +
                    'Renforcer les dotations en ressources pédagogiques et le suivi des établissements défavorisés.',
                indicateur: `Écart milieux : ${ecartMilieux.toFixed(1)} pts`,
            });
        }
    }

    // Trier : critique d'abord, puis attention, puis info
    const order: RemediationSeverity[] = ['critique', 'attention', 'info'];
    suggestions.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));

    return suggestions;
}
