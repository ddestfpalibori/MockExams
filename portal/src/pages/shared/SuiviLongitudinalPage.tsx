/**
 * Page Suivi Longitudinal — tutelle + chef_etablissement (Sprint 6C)
 *
 * Permet de sélectionner un examen cible et d'afficher la chaîne A→B→C
 * pour tous les candidats hérités. Le filtre établissement est appliqué
 * côté DB pour chef_etablissement.
 */

import { useState } from 'react';
import { useExamens } from '@/hooks/queries/useExamens';
import { ExamenTabSuivi } from '@/pages/admin/ExamenTabSuivi';
import { Select } from '@/components/ui/FormField';
import { TrendingUp } from 'lucide-react';

export default function SuiviLongitudinalPage() {
    const { data: examens, isLoading } = useExamens();
    const [examenId, setExamenId] = useState('');

    // Garder uniquement les examens qui ont potentiellement des candidats hérités
    // (INSCRIPTIONS ou plus avancé)
    const examensDisponibles = (examens ?? []).filter(
        (e) => e.status !== 'CONFIG'
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-6 w-6 text-brand-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Suivi Longitudinal</h1>
                </div>
                <p className="text-secondary text-sm">
                    Visualisez la progression des candidats hérités à travers les sessions d'examens liées.
                </p>
            </div>

            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                    Examen cible
                </label>
                <Select
                    value={examenId}
                    onChange={(e) => setExamenId(e.target.value)}
                    className="w-80"
                    disabled={isLoading}
                >
                    <option value="">— Sélectionner un examen —</option>
                    {examensDisponibles.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                            {ex.code} — {ex.libelle} ({ex.annee})
                        </option>
                    ))}
                </Select>
            </div>

            {examenId ? (
                <ExamenTabSuivi examenId={examenId} />
            ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-14 text-center">
                    <TrendingUp className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="font-medium text-slate-500">Sélectionnez un examen</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Choisissez un examen cible pour afficher la chaîne longitudinale des candidats hérités.
                    </p>
                </div>
            )}
        </div>
    );
}
