import { describe, it, expect } from 'vitest';
import { shouldRetry } from './queryClient';

describe('shouldRetry', () => {
    it('retourne false si failureCount >= 2', () => {
        expect(shouldRetry(2, {})).toBe(false);
        expect(shouldRetry(3, {})).toBe(false);
        expect(shouldRetry(10, {})).toBe(false);
    });

    it('retourne false sur erreur 401 (non authentifié)', () => {
        expect(shouldRetry(0, { status: 401 })).toBe(false);
        expect(shouldRetry(1, { status: 401 })).toBe(false);
    });

    it('retourne false sur erreur 403 (interdit)', () => {
        expect(shouldRetry(0, { status: 403 })).toBe(false);
        expect(shouldRetry(1, { status: 403 })).toBe(false);
    });

    it('retourne false sur erreur 404 (non trouvé)', () => {
        expect(shouldRetry(0, { status: 404 })).toBe(false);
        expect(shouldRetry(1, { status: 404 })).toBe(false);
    });

    it('retourne false sur AbortError (annulation utilisateur)', () => {
        expect(shouldRetry(0, { name: 'AbortError' })).toBe(false);
        expect(shouldRetry(1, { name: 'AbortError' })).toBe(false);
    });

    it('retourne false si le message contient "aborted"', () => {
        expect(shouldRetry(0, { message: 'Request was aborted' })).toBe(false);
        expect(shouldRetry(1, { message: 'fetch aborted' })).toBe(false);
    });

    it('retourne true pour les erreurs réseau standard (< 2 tentatives)', () => {
        expect(shouldRetry(0, { status: 500 })).toBe(true);
        expect(shouldRetry(1, { status: 503 })).toBe(true);
        expect(shouldRetry(0, new Error('Network error'))).toBe(true);
    });

    it('retourne true pour les erreurs sans statut HTTP (< 2 tentatives)', () => {
        expect(shouldRetry(0, {})).toBe(true);
        expect(shouldRetry(1, {})).toBe(true);
    });

    it('retourne false pour les erreurs réseau standard à 2 tentatives', () => {
        expect(shouldRetry(2, { status: 500 })).toBe(false);
    });
});
