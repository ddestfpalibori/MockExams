import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ResultatStatusBadge } from '@/components/ui/StatusBadge';
import { Search, AlertCircle, Lock } from 'lucide-react';
import type { ResultatStatus } from '@/types/domain';

interface ConsultationResult {
    moyenne_centimes: number | null;
    phase: number;
    status: ResultatStatus;
}

interface ConsultationResponse {
    anonymat_actif: boolean;
    candidat: {
        numero_anonyme: string;
        numero_table: string | null;
        serie: string;
        etablissement: string;
    };
    resultat: ConsultationResult;
}

export default function ConsultationPage() {
    const [examenCode, setExamenCode] = useState('');
    const [numeroAnonyme, setNumeroAnonyme] = useState('');
    const [codeAcces, setCodeAcces] = useState('');
    const [searching, setSearching] = useState(false);
    const [result, setResult] = useState<ConsultationResult | null | 'not_found'>(null);
    const [candidatInfo, setCandidatInfo] = useState<ConsultationResponse['candidat'] | null>(null);
    const [anonymatActif, setAnonymatActif] = useState<boolean | null>(null);
    const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isLocked = lockoutUntil && new Date() < lockoutUntil;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!examenCode.trim() || !numeroAnonyme.trim() || !codeAcces.trim() || isLocked) return;

        setSearching(true);
        setResult(null);
        setCandidatInfo(null);
        setAnonymatActif(null);
        setError(null);

        try {
            const { data, error: fnError } = await supabase.functions.invoke<ConsultationResponse>(
                'consultation-publique',
                {
                    body: {
                        examen_code: examenCode.trim().toUpperCase(),
                        numero_anonyme: numeroAnonyme.trim().toUpperCase(),
                        code_acces: codeAcces.trim(),
                    },
                }
            );

            if (fnError) {
                // FunctionsHttpError expose le status via context.status (supabase-js >= 2)
                const status = (fnError as { context?: { status?: number } }).context?.status
                    ?? (fnError as { status?: number }).status;

                // Lire retry_after_seconds depuis le body de l'erreur
                let retryAfterSeconds: number | undefined;
                try {
                    const body = await (fnError as { context?: Response }).context?.json() as { retry_after_seconds?: number } | undefined;
                    retryAfterSeconds = body?.retry_after_seconds;
                } catch {
                    // Body non lisible — les fallbacks ci-dessous s'appliquent
                }

                if (status === 403) {
                    const lockoutMs = retryAfterSeconds ? retryAfterSeconds * 1000 : 60 * 60 * 1000;
                    setLockoutUntil(new Date(Date.now() + lockoutMs));
                    setError('Trop de tentatives. Accès temporairement verrouillé.');
                } else if (status === 429) {
                    setLockoutUntil(new Date(Date.now() + 60 * 1000));
                    setError('Trop de requêtes. Réessayez dans une minute.');
                } else if (status === 404) {
                    setResult('not_found');
                } else {
                    setError('Une erreur est survenue. Veuillez réessayer.');
                }
                return;
            }

            if (!data) {
                setResult('not_found');
                return;
            }

            setCandidatInfo(data.candidat);
            setAnonymatActif(data.anonymat_actif);
            setResult(data.resultat);
        } catch {
            setError('Une erreur de connexion est survenue. Vérifiez votre connexion internet.');
        } finally {
            setSearching(false);
        }
    };

    const reset = () => {
        setResult(null);
        setCandidatInfo(null);
        setAnonymatActif(null);
        setError(null);
        setNumeroAnonyme('');
        setCodeAcces('');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 py-4">
                <div className="max-w-2xl mx-auto px-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-brand-primary flex items-center justify-center">
                        <Search className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900">Consultation des résultats</h1>
                        <p className="text-xs text-slate-400">DDEST-FP Alibori</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-start justify-center pt-16 px-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900">
                            Consultez votre résultat
                        </h2>
                        <p className="text-slate-500 mt-1">
                            Saisissez le code de l'examen et votre identifiant.
                        </p>
                    </div>

                    {result === null && (
                        <form
                            onSubmit={handleSearch}
                            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Code de l'examen
                                </label>
                                <input
                                    type="text"
                                    value={examenCode}
                                    onChange={(e) => setExamenCode(e.target.value)}
                                    placeholder="Ex: BAC2024, BEPC2024..."
                                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    required
                                    disabled={!!isLocked}
                                    autoComplete="off"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Identifiant (numéro anonyme ou numéro de table)
                                </label>
                                <input
                                    type="text"
                                    value={numeroAnonyme}
                                    onChange={(e) => setNumeroAnonyme(e.target.value)}
                                    placeholder="Ex: 001234 ou C01-0042"
                                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    required
                                    disabled={!!isLocked}
                                    autoComplete="off"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Code d'accès
                                </label>
                                <input
                                    type="text"
                                    value={codeAcces}
                                    onChange={(e) => setCodeAcces(e.target.value)}
                                    placeholder="Code reçu sur votre souche"
                                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    required
                                    disabled={!!isLocked}
                                    autoComplete="off"
                                />
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
                                    {isLocked ? (
                                        <Lock className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                                    )}
                                    <p className="text-sm text-danger">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={searching}
                                disabled={!!isLocked || !examenCode.trim() || !numeroAnonyme.trim() || !codeAcces.trim()}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                Consulter mon résultat
                            </Button>
                        </form>
                    )}

                    {/* Résultat trouvé */}
                    {result && result !== 'not_found' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-slate-500 mb-1">
                                    {anonymatActif === false ? 'Identifiant' : 'N° anonyme'} : {candidatInfo?.numero_anonyme ?? numeroAnonyme}
                                </p>
                                {candidatInfo?.numero_table && (
                                    <p className="text-sm text-slate-500 mb-1">N° table : {candidatInfo.numero_table}</p>
                                )}
                                <div className="flex justify-center">
                                    <ResultatStatusBadge status={result.status} />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4 space-y-3">
                                {candidatInfo && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Série</span>
                                            <span className="text-slate-700">{candidatInfo.serie}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Établissement</span>
                                            <span className="text-slate-700 text-right max-w-[60%]">{candidatInfo.etablissement}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Moyenne générale</span>
                                    <span className="font-mono font-semibold text-slate-900">
                                        {result.moyenne_centimes != null
                                            ? `${(result.moyenne_centimes / 100).toFixed(2)} / 20`
                                            : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Phase de délibération</span>
                                    <span className="text-slate-700">Phase {result.phase}</span>
                                </div>
                            </div>

                            <Button variant="outline" className="w-full" onClick={reset}>
                                Nouvelle consultation
                            </Button>
                        </div>
                    )}

                    {/* Résultat non trouvé */}
                    {result === 'not_found' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
                            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
                            <div>
                                <p className="font-semibold text-slate-700">Résultat non trouvé</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Aucun résultat ne correspond à ces informations. Vérifiez le
                                    code de l'examen et votre identifiant.
                                </p>
                            </div>
                            <Button variant="outline" onClick={reset}>
                                Réessayer
                            </Button>
                        </div>
                    )}

                    <p className="text-center text-xs text-slate-400">
                        En cas de difficulté, contactez votre établissement d'inscription.
                    </p>
                </div>
            </main>
        </div>
    );
}
