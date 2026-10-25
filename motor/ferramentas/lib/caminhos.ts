// Pastas do projeto. SHORTS_RAIZ troca a raiz (usado pelos testes para trabalhar numa cópia).
import {join} from 'node:path';

export const RAIZ = process.env.SHORTS_RAIZ ?? join(import.meta.dirname, '..', '..');
export const PASTA_SERIES = join(RAIZ, 'public', 'series');
