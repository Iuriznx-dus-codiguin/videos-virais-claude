// Estado de cada série: guardado em arquivo no repositório para que cada sessão nova comece
// lendo poucas linhas em vez de reler o histórico inteiro.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PASTA_SERIES} from './caminhos.ts';

export interface Publicacao {
	em: string;
	youtube?: {id: string; url: string; agendado_para?: string; privacidade: string};
	instagram?: {id: string; url?: string};
}

export interface EstadoSerie {
	/** Próxima parte a produzir. */
	proxima_parte: number;
	/** Resumo de poucas linhas da última parte publicada ou em produção. */
	resumo_ultima: string;
	publicados: Record<string, Publicacao>;
}

const caminho = (serie: string) => join(PASTA_SERIES, serie, 'estado.json');

export const lerEstado = (serie: string): EstadoSerie =>
	existsSync(caminho(serie))
		? (JSON.parse(readFileSync(caminho(serie), 'utf8')) as EstadoSerie)
		: {proxima_parte: 1, resumo_ultima: '', publicados: {}};

export const gravarEstado = (serie: string, e: EstadoSerie) => writeFileSync(caminho(serie), `${JSON.stringify(e, null, 2)}\n`);
