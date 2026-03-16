import * as XLSX from 'xlsx';
import type { AnalyticsData } from './analyticsService';

// ── Helper : création de feuille à partir de tableaux ────────────────────────

function makeSheet(headers: string[], rows: (string | number | null)[][]): XLSX.WorkSheet {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    return ws;
}

// ── Export principal ──────────────────────────────────────────────────────────

/**
 * Génère et télécharge un classeur Excel multi-feuilles avec les analytics.
 */
export function exportAnalyticsToExcel(data: AnalyticsData, scopeLabel: string): void {
    const wb = XLSX.utils.book_new();

    // ── Feuille 1 : Vue globale ──────────────────────────────────────────────
    const g = data.global;
    const globalHeaders = ['Indicateur', 'Valeur'];
    const globalRows: (string | number | null)[][] = [
        ['Total candidats', g.total],
        ['Admis', g.admis],
        ['Rattrapage initial', g.rattrapage_initial],
        ['Non admis', g.non_admis],
        ['Taux de réussite (%)', g.taux_reussite],
        ['Taux rattrapage (%)', g.taux_rattrapage],
        ['Moyenne', g.moyenne],
        ['Médiane', g.mediane],
        ['Écart-type', g.ecart_type],
        ['Note min', g.note_min],
        ['Note max', g.note_max],
    ];
    const wsGlobal = makeSheet(globalHeaders, globalRows);
    wsGlobal['!cols'] = [{ wch: 28 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsGlobal, 'Vue globale');

    // ── Feuille 2 : Par discipline ───────────────────────────────────────────
    const discHeaders = [
        'Discipline', 'Code', 'Coefficient', 'Notes saisies',
        'Absents', 'Sous la moyenne', "Taux d'échec %", 'Moyenne',
    ];
    const discRows = data.par_discipline.map((d) => [
        d.libelle,
        d.code,
        d.coefficient,
        d.nb_notes,
        d.nb_absents,
        d.nb_sous_moyenne,
        d.taux_echec,
        d.moyenne ?? null,
    ] as (string | number | null)[]);
    XLSX.utils.book_append_sheet(wb, makeSheet(discHeaders, discRows), 'Par discipline');

    // ── Feuille 3 : Par série ────────────────────────────────────────────────
    const serieHeaders = [
        'Série', 'Code', 'Total', 'Admis', 'Rattrapage',
        'Non admis', 'Taux réussite %', 'Moyenne',
    ];
    const serieRows = data.par_serie.map((s) => [
        s.libelle,
        s.code,
        s.total,
        s.admis,
        s.rattrapage,
        s.non_admis,
        s.taux_reussite,
        s.moyenne ?? null,
    ] as (string | number | null)[]);
    XLSX.utils.book_append_sheet(wb, makeSheet(serieHeaders, serieRows), 'Par série');

    // ── Feuille 4 : Par genre ────────────────────────────────────────────────
    const genreHeaders = ['Genre', 'Total', 'Admis', 'Taux réussite %', 'Moyenne'];
    const genreRows: (string | number | null)[][] = [];
    const sexeM = data.par_sexe['M'];
    const sexeF = data.par_sexe['F'];
    if (sexeM) {
        genreRows.push(['Garçons', sexeM.total, sexeM.admis, sexeM.taux_reussite, sexeM.moyenne ?? null]);
    }
    if (sexeF) {
        genreRows.push(['Filles', sexeF.total, sexeF.admis, sexeF.taux_reussite, sexeF.moyenne ?? null]);
    }
    XLSX.utils.book_append_sheet(wb, makeSheet(genreHeaders, genreRows), 'Par genre');

    // ── Feuille 5 : Par établissement ────────────────────────────────────────
    const etabHeaders = [
        'Établissement', 'Ville', 'Milieu', 'Total', 'Admis',
        'Taux réussite %', 'Moyenne',
    ];
    const etabRows = data.par_etablissement.map((e) => [
        e.nom,
        e.ville ?? '—',
        e.type_milieu ?? '—',
        e.total,
        e.admis,
        e.taux_reussite,
        e.moyenne ?? null,
    ] as (string | number | null)[]);
    XLSX.utils.book_append_sheet(wb, makeSheet(etabHeaders, etabRows), 'Par établissement');

    // ── Feuille 6 : Par centre ───────────────────────────────────────────────
    const centreHeaders = [
        'Centre', 'Ville', 'Commune', 'Total', 'Admis',
        'Taux réussite %', 'Moyenne',
    ];
    const centreRows = data.par_centre.map((c) => [
        c.nom,
        c.ville ?? '—',
        c.code_commune ?? '—',
        c.total,
        c.admis,
        c.taux_reussite,
        c.moyenne ?? null,
    ] as (string | number | null)[]);
    XLSX.utils.book_append_sheet(wb, makeSheet(centreHeaders, centreRows), 'Par centre');

    // ── Feuille 7 : Par commune (conditionnelle) ─────────────────────────────
    if (data.par_commune.length > 0) {
        const communeHeaders = [
            'Commune (code)', 'Ville', 'Total', 'Admis',
            'Taux réussite %', 'Moyenne',
        ];
        const communeRows = data.par_commune.map((c) => [
            c.code_commune,
            c.ville ?? '—',
            c.total,
            c.admis,
            c.taux_reussite,
            c.moyenne ?? null,
        ] as (string | number | null)[]);
        XLSX.utils.book_append_sheet(wb, makeSheet(communeHeaders, communeRows), 'Par commune');
    }

    // ── Feuille 8 : Par milieu ───────────────────────────────────────────────
    const MILIEU_LABELS: Record<string, string> = {
        urbain: 'Urbain',
        semi_urbain: 'Semi-urbain',
        rural: 'Rural',
        non_renseigne: 'Non renseigné',
    };
    const milieuHeaders = ['Milieu', 'Total', 'Admis', 'Taux réussite %', 'Moyenne'];
    const milieuRows = data.par_milieu.map((m) => [
        MILIEU_LABELS[m.type_milieu] ?? m.type_milieu,
        m.total,
        m.admis,
        m.taux_reussite,
        m.moyenne ?? null,
    ] as (string | number | null)[]);
    XLSX.utils.book_append_sheet(wb, makeSheet(milieuHeaders, milieuRows), 'Par milieu');

    // ── Téléchargement ───────────────────────────────────────────────────────
    const suffix = scopeLabel ? `_${scopeLabel}` : '';
    const filename = `Analyses_${data.examen_libelle}_${data.examen_annee}${suffix}.xlsx`;

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
