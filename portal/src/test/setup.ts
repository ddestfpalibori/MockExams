import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './server';

// Démarrer MSW avant tous les tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset les handlers après chaque test
afterEach(() => {
    server.resetHandlers();
    cleanup();
});

// Fermer MSW après tous les tests
afterAll(() => server.close());
