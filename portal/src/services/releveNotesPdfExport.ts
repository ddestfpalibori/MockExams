import type { TDocumentDefinitions, Content, TableCell, ContentColumns, ContentStack, ContentImage, ColumnItem } from 'pdfmake/interfaces';
import type { CandidatReleve } from './releveNotesService';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convertit note_centimes + code_special en affichage /20 */
function fmtNote(centimes: number | null, codeSpecial: string | null): string {
    if (codeSpecial) {
        switch (codeSpecial) {
            case 'ABS':    return 'Abs.';
            case 'ABD':    return 'Abd.';
            case 'INAPTE': return 'Inap.';
            default:       return codeSpecial;
        }
    }
    if (centimes === null) return 'N/S'; // non saisi (différent d'absent)
    return (centimes / 100).toFixed(2);
}


/** Convertit moyenne_centimes en affichage /20 */
function fmtMoyenne(centimes: number | null): string {
    if (centimes === null) return '—';
    return (centimes / 100).toFixed(2);
}

/** Points = note × coefficient (nul si absent / code spécial) */
function calcPoints(noteCentimes: number | null, codeSpecial: string | null, coeff: number): string {
    if (codeSpecial || noteCentimes === null) return '—';
    return ((noteCentimes / 100) * coeff).toFixed(2);
}

function th(text: string): TableCell {
    return {
        text,
        bold: true,
        fillColor: '#1e3a5f',
        color: 'white',
        fontSize: 9,
        margin: [2, 3, 2, 3] as [number, number, number, number],
    };
}

function td(text: string, bold = false, align: 'left' | 'center' | 'right' = 'left'): TableCell {
    return { text, bold, fontSize: 9, alignment: align };
}

// ── Chargement image en base64 ────────────────────────────────────────────────

async function urlToDataUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        // Détecter le type MIME depuis les en-têtes
        const contentType = response.headers.get('content-type') ?? 'image/png';
        return `data:${contentType};base64,${base64}`;
    } catch {
        return null;
    }
}

// ── Libellé de décision ───────────────────────────────────────────────────────

function getDecisionLabel(status: string | null): { text: string; color: string } {
    switch (status) {
        case 'ADMIS':
            return { text: 'ADMIS', color: '#16a34a' };
        case 'RATTRAPAGE':
            return { text: 'EN ATTENTE DE RATTRAPAGE', color: '#d97706' };
        case 'NON_ADMIS':
            return { text: 'NON ADMIS', color: '#dc2626' };
        default:
            return { text: 'EN ATTENTE DE DÉLIBÉRATION', color: '#64748b' };
    }
}

// ── Génération d'une page de relevé pour un candidat ─────────────────────────

async function buildCandidatContent(
    releve: CandidatReleve,
    logoDataUrl: string | null,
    signatureDataUrl: string | null,
    isLast: boolean,
): Promise<Content[]> {
    const { candidat, examen, notes, resultat } = releve;
    const content: Content[] = [];

    // ── En-tête avec logo / nom institution / signature ───────────────────────
    const headerCols: ColumnItem[] = [];

    if (logoDataUrl) {
        const logoItem: ContentImage & { width: number } = { image: logoDataUrl, width: 60, margin: [0, 0, 0, 0] };
        headerCols.push(logoItem);
    } else {
        headerCols.push({ text: '', width: 60 });
    }

    const centerStack: ContentStack & { width: string; margin: [number, number, number, number] } = {
        stack: [
            { text: examen.organisateur, fontSize: 11, bold: true, alignment: 'center', color: '#1e3a5f' },
            { text: 'RELEVÉ DE NOTES', fontSize: 14, bold: true, alignment: 'center', margin: [0, 4, 0, 2], color: '#1e3a5f' },
            { text: `${examen.libelle} — Session ${examen.annee}`, fontSize: 10, alignment: 'center', color: '#475569' },
        ],
        width: '*',
        margin: [8, 0, 8, 0],
    };
    headerCols.push(centerStack);

    if (signatureDataUrl) {
        const sigItem: ContentImage & { width: number } = { image: signatureDataUrl, width: 60, margin: [0, 0, 0, 0] };
        headerCols.push(sigItem);
    } else {
        headerCols.push({ text: '', width: 60 });
    }

    const headerBlock: ContentColumns = {
        columns: headerCols,
        margin: [0, 0, 0, 12],
    };
    content.push(headerBlock);

    // ── Informations candidat ─────────────────────────────────────────────────
    const infoRows: TableCell[][] = [
        [
            { text: 'Nom et Prénom', bold: true, fontSize: 9, fillColor: '#f1f5f9' },
            { text: `${candidat.nom} ${candidat.prenom}`, fontSize: 9 },
            { text: 'Établissement', bold: true, fontSize: 9, fillColor: '#f1f5f9' },
            { text: candidat.etablissement_nom ?? '—', fontSize: 9 },
        ],
        [
            { text: 'Date de naissance', bold: true, fontSize: 9, fillColor: '#f1f5f9' },
            { text: candidat.date_naissance ?? '—', fontSize: 9 },
            { text: 'Lieu de naissance', bold: true, fontSize: 9, fillColor: '#f1f5f9' },
            { text: candidat.lieu_naissance ?? '—', fontSize: 9 },
        ],
        [
            { text: 'Matricule', bold: true, fontSize: 9, fillColor: '#f1f5f9' },
            { text: candidat.matricule ?? '—', fontSize: 9 },
            { text: 'N° de table', bold: true, fontSize: 9, fillColor: '#f1f5f9' },
            { text: candidat.numero_table !== null ? String(candidat.numero_table) : '—', fontSize: 9 },
        ],
        [
            { text: 'Série', bold: true, fontSize: 9, fillColor: '#f1f5f9' },
            { text: candidat.serie_code ?? '—', fontSize: 9 },
            { text: '', border: [false, false, false, false] as [boolean, boolean, boolean, boolean] },
            { text: '', border: [false, false, false, false] as [boolean, boolean, boolean, boolean] },
        ],
    ];

    content.push({
        table: {
            widths: [90, '*', 90, '*'],
            body: infoRows,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 12],
    } as Content);

    // ── Tableau des notes ─────────────────────────────────────────────────────
    let totalCoeff = 0;

    const notesBody: TableCell[][] = [
        [th('Discipline'), th('Coefficient'), th('Note (/20)'), th('Points')],
    ];

    for (const note of notes) {
        totalCoeff += note.coefficient;
        notesBody.push([
            td(note.discipline_libelle),
            td(String(note.coefficient), false, 'center'),
            td(fmtNote(note.note_centimes, note.code_special), false, 'center'),
            td(calcPoints(note.note_centimes, note.code_special, note.coefficient), false, 'right'),
        ]);
    }

    // HIGH-01 : moyenne officielle depuis resultats (pas de recalcul — règles métier complexes)
    notesBody.push([
        { text: '—', fontSize: 9, alignment: 'right', italics: true },
        { text: String(totalCoeff), bold: true, fontSize: 9, alignment: 'center' },
        { text: `Moy. : ${fmtMoyenne(resultat.moyenne_centimes)}`, bold: true, fontSize: 9, alignment: 'center' },
        { text: '—', fontSize: 9, alignment: 'right', italics: true },
    ]);

    content.push({
        table: {
            widths: ['*', 70, 80, 70],
            body: notesBody,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
    } as Content);

    // ── Décision ──────────────────────────────────────────────────────────────
    const { text: decisionText, color: decisionColor } = getDecisionLabel(resultat.status);
    content.push({
        text: decisionText,
        fontSize: 14,
        bold: true,
        alignment: 'center',
        color: decisionColor,
        margin: [0, 0, 0, 20],
    } as Content);

    // ── Pied de page : signature ──────────────────────────────────────────────
    if (signatureDataUrl) {
        const sigCols: ColumnItem[] = [
            { text: '', width: '*' },
            {
                stack: [
                    { image: signatureDataUrl, width: 80, alignment: 'center' } as ContentImage,
                    { text: "Le Directeur / L'Autorité", fontSize: 8, alignment: 'center', color: '#64748b' },
                ],
                width: 120,
            } as ContentStack & { width: number },
        ];
        const sigBlock: ContentColumns = { columns: sigCols, margin: [0, 0, 0, 0] };
        content.push(sigBlock);
    }

    // Saut de page entre candidats (sauf le dernier)
    if (!isLast) {
        content.push({ text: '', pageBreak: 'after' } as Content);
    }

    return content;
}

// ── Export principal ──────────────────────────────────────────────────────────

/**
 * Génère et télécharge un PDF A4 portrait de relevés de notes.
 * 1 page par candidat.
 * Import dynamique pour éviter d'alourdir le bundle initial.
 */
export async function downloadRelevesPdf(
    candidats: CandidatReleve[],
    filename: string,
): Promise<void> {
    if (candidats.length === 0) return;

    // Import dynamique pdfmake (~1 Mo)
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const vfsFonts = (await import('pdfmake/build/vfs_fonts')).default;
    pdfMake.vfs = vfsFonts as unknown as Record<string, string>;

    // Pré-charger les images en base64 (logo & signature partagés entre candidats)
    // On déduplique par URL pour éviter les appels réseau redondants
    const imageCache = new Map<string, string | null>();

    async function getImage(url: string | null): Promise<string | null> {
        if (!url) return null;
        if (imageCache.has(url)) return imageCache.get(url)!;
        const dataUrl = await urlToDataUrl(url);
        imageCache.set(url, dataUrl);
        return dataUrl;
    }

    // Construire le contenu global
    const allContent: Content[] = [];

    for (let i = 0; i < candidats.length; i++) {
        const releve = candidats[i];
        const logoUrl = await getImage(releve.examen.logo_url);
        const sigUrl = await getImage(releve.examen.signature_url);
        const isLast = i === candidats.length - 1;

        const pageContent = await buildCandidatContent(releve, logoUrl, sigUrl, isLast);
        allContent.push(...pageContent);
    }

    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 40, 40, 50],
        content: allContent,
        styles: {
            tableHeader: {
                bold: true,
                fillColor: '#1e3a5f',
                color: 'white',
                fontSize: 9,
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
