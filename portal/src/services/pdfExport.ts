import type { ExportResultatsData, CandidatExport, DisciplineExport } from './exportService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatMoyenne(centimes: number | null): string {
    if (centimes == null) return '—';
    return (centimes / 100).toFixed(2);
}

function formatNote(centimes: number | null, codeSpecial: string | null): string {
    if (codeSpecial) return codeSpecial;
    if (centimes == null) return '—';
    return (centimes / 100).toFixed(2);
}

function formatDecision(status: string): string {
    switch (status) {
        case 'ADMIS': return 'Admis(e)';
        case 'RATTRAPAGE': return 'Rattrapage';
        case 'NON_ADMIS': return 'Non admis(e)';
        default: return status;
    }
}

function decisionStyle(status: string): string {
    switch (status) {
        case 'ADMIS': return 'color:#166534;font-weight:600';
        case 'RATTRAPAGE': return 'color:#92400e;font-weight:600';
        case 'NON_ADMIS': return 'color:#991b1b;font-weight:600';
        default: return '';
    }
}

// ── Génération HTML ───────────────────────────────────────────────────────────

function buildTableRows(
    candidats: CandidatExport[],
    disciplines: DisciplineExport[],
    includeNom: boolean,
): string {
    return candidats.map((c, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        let cells = '';

        if (includeNom) {
            cells += `<td style="padding:4px 6px">${escapeHtml(c.nom)}</td>`;
            cells += `<td style="padding:4px 6px">${escapeHtml(c.prenom)}</td>`;
        }
        cells += `<td style="padding:4px 6px;font-family:monospace">${escapeHtml(c.numero_anonyme ?? '—')}</td>`;

        for (const disc of disciplines) {
            const note = c.notes.find((n) => n.discipline_id === disc.id);
            cells += `<td style="padding:4px 6px;text-align:center">${note ? formatNote(note.note_centimes, note.code_special) : '—'}</td>`;
        }

        cells += `<td style="padding:4px 6px;text-align:center;font-weight:600">${formatMoyenne(c.moyenne_centimes)}</td>`;
        cells += `<td style="padding:4px 6px;${decisionStyle(c.status)}">${formatDecision(c.status)}</td>`;

        return `<tr style="background:${bg}">${cells}</tr>`;
    }).join('');
}

function buildHeaderRow(disciplines: DisciplineExport[], includeNom: boolean): string {
    const th = (label: string, extra = '') =>
        `<th style="padding:6px 8px;background:#1e3a5f;color:#fff;text-align:left;font-size:11px;${extra}">${label}</th>`;

    let headers = '';
    if (includeNom) {
        headers += th('Nom');
        headers += th('Prénom');
    }
    headers += th('N° Anonyme');
    for (const disc of disciplines) {
        headers += th(`${escapeHtml(disc.libelle)}<br/><span style="font-weight:400;font-size:10px">Coeff. ${disc.coefficient}</span>`, 'text-align:center');
    }
    headers += th('Moyenne', 'text-align:center');
    headers += th('Décision');

    return `<tr>${headers}</tr>`;
}

function buildPvHtml(
    data: ExportResultatsData,
    includeNom: boolean,
    titre: string,
): string {
    const now = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
    });

    const totalCandidats = data.etablissements.reduce((s, e) => s + e.candidats.length, 0);
    const totalAdmis = data.etablissements.reduce((s, e) =>
        s + e.candidats.filter((c) => c.status === 'ADMIS').length, 0);
    const tauxReussite = totalCandidats > 0
        ? ((totalAdmis / totalCandidats) * 100).toFixed(1)
        : '0.0';

    let sections = '';
    for (const etab of data.etablissements) {
        const admis = etab.candidats.filter((c) => c.status === 'ADMIS').length;
        const taux = etab.candidats.length > 0
            ? ((admis / etab.candidats.length) * 100).toFixed(1)
            : '0.0';

        sections += `
            <div style="margin-bottom:32px">
                <h2 style="font-size:14px;font-weight:600;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin-bottom:8px;page-break-after:avoid">
                    ${escapeHtml(etab.nom)}
                    <span style="font-size:11px;font-weight:400;color:#475569;margin-left:12px">
                        ${etab.candidats.length} candidat(s) — ${admis} admis(es) — Taux : ${taux}%
                    </span>
                </h2>
                <table style="width:100%;border-collapse:collapse;font-size:11px">
                    <thead>${buildHeaderRow(data.disciplines, includeNom)}</thead>
                    <tbody>${buildTableRows(etab.candidats, data.disciplines, includeNom)}</tbody>
                </table>
            </div>`;
    }

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8"/>
    <title>${titre}</title>
    <style>
        @page { size: A4 landscape; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:1px">
            Direction Departementale de l'Enseignement Secondaire et de la Formation Professionnelle — Alibori
        </div>
        <h1 style="font-size:18px;font-weight:700;color:#1e3a5f;margin:8px 0">
            ${titre}
        </h1>
        <div style="font-size:12px;color:#475569">
            ${escapeHtml(data.examen_libelle)} — Session ${data.examen_annee}
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">
            Généré le ${now} —
            Total : <strong>${totalCandidats}</strong> candidats —
            Admis : <strong>${totalAdmis}</strong> —
            Taux de réussite : <strong>${tauxReussite}%</strong>
        </div>
    </div>

    ${sections}

    <div style="margin-top:40px;display:flex;justify-content:flex-end">
        <div style="text-align:center;border-top:1px solid #94a3b8;padding-top:8px;width:250px">
            <div style="font-size:11px;color:#475569">Le Directeur Departemental</div>
            <div style="height:60px"></div>
            <div style="font-size:11px;font-weight:600">Signature &amp; Cachet</div>
        </div>
    </div>
</body>
</html>`;
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Ouvre le PV de délibération anonyme dans une fenêtre d'impression (Modèle A).
 * L'utilisateur peut "Enregistrer en PDF" via le dialogue d'impression du navigateur.
 */
export function printPvDeliberationAnonyme(data: ExportResultatsData): void {
    const html = buildPvHtml(data, false, 'Procès-Verbal de Délibération (Anonyme)');
    openPrintWindow(html);
}

/**
 * Ouvre le PV de délibération nominatif dans une fenêtre d'impression (Modèle B).
 * Accessible admin uniquement.
 */
export function printPvDeliberationNominatif(data: ExportResultatsData): void {
    const html = buildPvHtml(data, true, 'Procès-Verbal de Délibération (Nominatif)');
    openPrintWindow(html);
}

function openPrintWindow(html: string): void {
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) {
        alert('Veuillez autoriser les popups pour generer le PDF.');
        return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
    }, 500);
}
