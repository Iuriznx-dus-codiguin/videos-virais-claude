// Chamadas HTTP com tentativas, limite de tempo e mensagens de erro em português que dizem
// qual passo do guia refazer. Nenhuma chave aparece nas mensagens.
import {ocultar} from './ambiente.ts';

export class ErroApi extends Error {
	/** mensagem e dica, sem o nome do serviço na frente */
	readonly resumo: string;
	constructor(
		readonly servico: string,
		readonly status: number,
		mensagem: string,
		readonly dica?: string,
	) {
		const resumo = ocultar(`${mensagem}${dica ? ` — ${dica}` : ''}`);
		super(`${servico}: ${resumo}`);
		this.resumo = resumo;
	}
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Pedido extends Omit<RequestInit, 'signal'> {
	servico: string;
	tentativas?: number;
	timeoutMs?: number;
	/** Dica para o usuário quando der 401 ou 403 (ou quando a resposta casar com acessoRegex). */
	dicaAcesso?: string;
	/** Algumas APIs respondem 400 para token inválido: este padrão reconhece isso no texto. */
	acessoRegex?: RegExp;
}

const retentavel = (status: number) => status === 429 || status >= 500;

/** Faz o pedido e devolve a resposta; só lança erro se não houver resposta de jeito nenhum. */
export const pedirBruto = async (url: string, p: Pedido): Promise<Response> => {
	const tentativas = p.tentativas ?? 3;
	let ultimo: unknown;
	for (let i = 0; i < tentativas; i++) {
		try {
			const r = await fetch(url, {...p, signal: AbortSignal.timeout(p.timeoutMs ?? 60_000)});
			if (retentavel(r.status) && i < tentativas - 1) {
				await esperar(1500 * 2 ** i);
				continue;
			}
			return r;
		} catch (e) {
			ultimo = e;
			if (i < tentativas - 1) await esperar(1500 * 2 ** i);
		}
	}
	const host = new URL(url).host;
	const causa = ultimo instanceof Error ? ((ultimo.cause as {code?: string} | undefined)?.code ?? ultimo.message) : String(ultimo);
	throw new ErroApi(
		p.servico,
		0,
		`não consegui conectar em ${host} (${causa})`,
		`provavelmente a rede do ambiente bloqueia esse endereço: confira "Allowed domains" no Passo 0 do guia`,
	);
};

/** Pedido que espera JSON e lança ErroApi com o texto devolvido pela API se o status não for 2xx. */
export const pedirJson = async <T>(url: string, p: Pedido): Promise<T> => {
	const r = await pedirBruto(url, p);
	const texto = await r.text();
	if (!r.ok) {
		let detalhe = texto.slice(0, 400);
		try {
			const j = JSON.parse(texto) as {detail?: unknown; error?: unknown};
			detalhe = JSON.stringify(j.detail ?? j.error ?? j).slice(0, 400);
		} catch {
			/* texto puro */
		}
		const acesso = r.status === 401 || r.status === 403 || (p.acessoRegex?.test(texto) ?? false);
		throw new ErroApi(p.servico, r.status, `HTTP ${r.status}: ${detalhe}`, acesso ? p.dicaAcesso : undefined);
	}
	return (texto ? JSON.parse(texto) : {}) as T;
};
