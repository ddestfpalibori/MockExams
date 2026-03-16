import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import type { AnalyticsData } from './analyticsService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(value: number | null | undefined): string {
    return value != null ? String(value) : '—';
}

function fmtPct(value: number | null | undefined): string {
    return value != null ? `${value} %` : '—';
}

function fmtNum(value: number | null | undefined, decimals = 2): string {
    return value != null ? value.toFixed(decimals) : '—';
}

// ── Cellule d'en-tête tableau ─────────────────────────────────────────────────

function th(text: string): TableCell {
    return {
        text,
        style: 'tableHeader',
        noWrap: false,
    };
}

// ── Cellule de données ────────────────────────────────────────────────────────

function td(text: string, bold = false): TableCell {
    return { text, bold, fontSize: 8 };
}

// ── Section titre ─────────────────────────────────────────────────────────────

function sectionTitle(text: string): Content {
    return { text, style: 'sectionTitle' };
}

// ── Export principal ──────────────────────────────────────────────────────────

/**
 * Génère et télécharge un PDF analytique complet avec pdfmake.
 * Import dynamique pour éviter d'alourdir le bundle initial.
 */
export async function exportAnalyticsToPdf(data: AnalyticsData, scopeLabel: string): Promise<void> {
    // Import dynamique — pdfmake est lourd (~1 Mo), on le charge à la demande
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const vfsFonts = (await import('pdfmake/build/vfs_fonts')).default;
    // Dans pdfmake 0.3.x, vfs_fonts exporte directement l'objet vfs (pas { vfs: ... })
    pdfMake.vfs = vfsFonts as unknown as Record<string, string>;

    const now = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
    });

    const g = data.global;
    const scopeInfo = scopeLabel ? ` — ${scopeLabel}` : '';

    // ── Vue globale : grille 2 colonnes ──────────────────────────────────────
    const kpis: [string, string][] = [
        ['Total candidats', fmtVal(g.total)],
        ['Admis', fmtVal(g.admis)],
        ['Rattrapage initial', fmtVal(g.rattrapage_initial)],
        ['Non admis', fmtVal(g.non_admis)],
        ['Taux de réussite', fmtPct(g.taux_reussite)],
        ['Taux rattrapage', fmtPct(g.taux_rattrapage)],
        ['Moyenne générale', fmtNum(g.moyenne)],
        ['Médiane', fmtNum(g.mediane)],
        ['Écart-type', fmtNum(g.ecart_type)],
        ['Note minimale', fmtNum(g.note_min)],
        ['Note maximale', fmtNum(g.note_max)],
    ];

    const kpiTableBody: TableCell[][] = kpis.map(([label, val]) => [
        { text: label, bold: true, fontSize: 9 },
        { text: val, fontSize: 9 },
    ]);

    // ── Distribution des moyennes ────────────────────────────────────────────
    const total = g.total || 1;
    const distBody: TableCell[][] = [
        [th('Tranche'), th('Candidats'), th('% du total')],
        ...data.distribution.map((b) => [
            td(`${b.bucket_centimes / 100} — ${b.bucket_centimes / 100 + 1}`),
            td(String(b.count)),
            td(`${((b.count / total) * 100).toFixed(1)} %`),
        ]),
    ];

    // ── Par discipline ───────────────────────────────────────────────────────
    const discBody: TableCell[][] = [
        [
            th('Discipline'), th('Code'), th('Coeff.'), th('Notes'),
            th('Absents'), th('< Moy.'), th("Échec %"), th('Moyenne'),
        ],
        ...data.par_discipline.map((d) => [
            td(d.libelle),
            td(d.code),
            td(String(d.coefficient)),
            td(String(d.nb_notes)),
            td(String(d.nb_absents)),
            td(String(d.nb_sous_moyenne)),
            td(fmtPct(d.taux_echec)),
            td(fmtNum(d.moyenne)),
        ]),
    ];

    // ── Par série ────────────────────────────────────────────────────────────
    const serieBody: TableCell[][] = [
        [
            th('Série'), th('Code'), th('Total'), th('Admis'),
            th('Rattrapage'), th('Non admis'), th('Réussite %'), th('Moyenne'),
        ],
        ...data.par_serie.map((s) => [
            td(s.libelle),
            td(s.code),
            td(String(s.total)),
            td(String(s.admis)),
            td(String(s.rattrapage)),
            td(String(s.non_admis)),
            td(fmtPct(s.taux_reussite)),
            td(fmtNum(s.moyenne)),
        ]),
    ];

    // ── Par genre ────────────────────────────────────────────────────────────
    const genreBody: TableCell[][] = [
        [th('Genre'), th('Total'), th('Admis'), th('Réussite %'), th('Moyenne')],
    ];
    const sexeM = data.par_sexe['M'];
    const sexeF = data.par_sexe['F'];
    if (sexeM) {
        genreBody.push([
            td('Garçons'), td(String(sexeM.total)), td(String(sexeM.admis)),
            td(fmtPct(sexeM.taux_reussite)), td(fmtNum(sexeM.moyenne)),
        ]);
    }
    if (sexeF) {
        genreBody.push([
            td('Filles'), td(String(sexeF.total)), td(String(sexeF.admis)),
            td(fmtPct(sexeF.taux_reussite)), td(fmtNum(sexeF.moyenne)),
        ]);
    }

    // ── Par établissement (top par taux) ─────────────────────────────────────
    const etabBody: TableCell[][] = [
        [
            th('Établissement'), th('Ville'), th('Milieu'),
            th('Total'), th('Admis'), th('Réussite %'), th('Moyenne'),
        ],
        ...data.par_etablissement.map((e) => [
            td(e.nom),
            td(e.ville ?? '—'),
            td(e.type_milieu ?? '—'),
            td(String(e.total)),
            td(String(e.admis)),
            td(fmtPct(e.taux_reussite)),
            td(fmtNum(e.moyenne)),
        ]),
    ];

    // ── Par centre ───────────────────────────────────────────────────────────
    const centreBody: TableCell[][] = [
        [
            th('Centre'), th('Ville'), th('Commune'),
            th('Total'), th('Admis'), th('Réussite %'), th('Moyenne'),
        ],
        ...data.par_centre.map((c) => [
            td(c.nom),
            td(c.ville ?? '—'),
            td(c.code_commune ?? '—'),
            td(String(c.total)),
            td(String(c.admis)),
            td(fmtPct(c.taux_reussite)),
            td(fmtNum(c.moyenne)),
        ]),
    ];

    // ── Par milieu ───────────────────────────────────────────────────────────
    const MILIEU_LABELS: Record<string, string> = {
        urbain: 'Urbain',
        semi_urbain: 'Semi-urbain',
        rural: 'Rural',
        non_renseigne: 'Non renseigné',
    };
    const milieuBody: TableCell[][] = [
        [th('Milieu'), th('Total'), th('Admis'), th('Réussite %'), th('Moyenne')],
        ...data.par_milieu.map((m) => [
            td(MILIEU_LABELS[m.type_milieu] ?? m.type_milieu),
            td(String(m.total)),
            td(String(m.admis)),
            td(fmtPct(m.taux_reussite)),
            td(fmtNum(m.moyenne)),
        ]),
    ];

    // ── Construction du document ─────────────────────────────────────────────
    const content: Content[] = [
        // En-tête
        {
            text: 'DDEST-FP Alibori — Bénin',
            style: 'institution',
            alignment: 'center',
        },
        {
            text: data.examen_libelle,
            style: 'examTitle',
            alignment: 'center',
            margin: [0, 4, 0, 2],
        },
        {
            text: `Session ${data.examen_annee}   ·   ${now}${scopeInfo}`,
            style: 'examSubtitle',
            alignment: 'center',
            margin: [0, 0, 0, 16],
        },

        // Vue globale
        sectionTitle('Vue globale'),
        {
            table: {
                widths: [160, '*'],
                body: kpiTableBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8],
        },

        // Distribution
        sectionTitle('Distribution des moyennes'),
        distBody.length > 1
            ? {
                table: { widths: [80, 70, 70], body: distBody },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 8],
            } as Content
            : { text: 'Aucune donnée de distribution.', fontSize: 8, italics: true } as Content,

        // Par discipline
        sectionTitle('Par discipline'),
        {
            table: {
                widths: ['*', 35, 35, 35, 35, 35, 40, 40],
                body: discBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8],
        },

        // Par série
        sectionTitle('Par série'),
        {
            table: {
                widths: ['*', 30, 35, 35, 45, 45, 45, 40],
                body: serieBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8],
        },

        // Par genre
        sectionTitle('Par genre'),
        {
            table: {
                widths: [70, 50, 50, 60, 50],
                body: genreBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8],
        },

        // Par établissement
        sectionTitle('Par établissement'),
        {
            table: {
                widths: ['*', 60, 55, 35, 35, 45, 40],
                body: etabBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8],
        },

        // Par centre
        sectionTitle('Par centre'),
        {
            table: {
                widths: ['*', 60, 55, 35, 35, 45, 40],
                body: centreBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8],
        },
    ];

    // Par commune — conditionnel
    if (data.par_commune.length > 0) {
        const communeBody: TableCell[][] = [
            [th('Commune (code)'), th('Ville'), th('Total'), th('Admis'), th('Réussite %'), th('Moyenne')],
            ...data.par_commune.map((c) => [
                td(c.code_commune),
                td(c.ville ?? '—'),
                td(String(c.total)),
                td(String(c.admis)),
                td(fmtPct(c.taux_reussite)),
                td(fmtNum(c.moyenne)),
            ]),
        ];
        content.push(sectionTitle('Par commune'));
        content.push({
            table: {
                widths: [70, '*', 40, 40, 50, 45],
                body: communeBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8],
        });
    }

    // Par milieu
    content.push(sectionTitle('Par milieu géographique'));
    content.push({
        table: {
            widths: [80, 50, 50, 60, 50],
            body: milieuBody,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
    });

    // ── Définition du document ────────────────────────────────────────────────
    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [30, 40, 30, 40],
        content,
        styles: {
            institution: {
                fontSize: 9,
                color: '#64748b',
            },
            examTitle: {
                fontSize: 16,
                bold: true,
                color: '#1e3a5f',
            },
            examSubtitle: {
                fontSize: 9,
                color: '#475569',
            },
            sectionTitle: {
                fontSize: 13,
                bold: true,
                color: '#1e3a5f',
                margin: [0, 12, 0, 4],
            },
            tableHeader: {
                bold: true,
                fillColor: '#1e3a5f',
                color: 'white',
                fontSize: 9,
                margin: [2, 3, 2, 3],
            },
        },
        footer: (currentPage: number, pageCount: number) => ({
            text: `Page ${currentPage} / ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            color: '#94a3b8',
            margin: [0, 10, 0, 0],
        }),
    };

    // ── Téléchargement ────────────────────────────────────────────────────────
    const suffix = scopeLabel ? `_${scopeLabel}` : '';
    const filename = `Analyses_${data.examen_libelle}_${data.examen_annee}${suffix}.pdf`;

    return new Promise<void>((resolve, reject) => {
        try {
            pdfMake.createPdf(docDefinition).download(filename, () => {
                resolve();
            });
        } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
        }
    });
}
