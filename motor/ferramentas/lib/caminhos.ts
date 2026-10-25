// Pastas do projeto. SHORTS_RAIZ troca a raiz dos dados (usado pelos testes para trabalhar numa cópia);
// MOTOR é sempre a pasta do código.
import {join} from 'node:path';

export const MOTOR = join(import.meta.dirname, '..', '..');
export const RAIZ = process.env.SHORTS_RAIZ ?? MOTOR;
export const PASTA_SERIES = join(RAIZ, 'public', 'series');
