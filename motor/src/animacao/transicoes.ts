// Transições entre planos: quanto tempo cada estilo gasta antes do corte (saída do plano velho)
// e depois dele (entrada do plano novo), e em que ponto da transição o quadro está. A câmera usa
// isso para virar (chicote) ou mergulhar (zoom); a camada 2D, para borrar, varrer e fechar a íris.
import type {CenaTempo, PlanoTempo} from '../roteiro/tipos';
import {clamp} from '../util/mat';

/** [saída, entrada] em segundos. flash e preto só têm entrada (como sempre foi). */
export const DURACOES_TRANSICAO: Record<string, [number, number]> = {
	flash: [0, 0.25],
	preto: [0, 0.4],
	chicote: [0.16, 0.2],
	zoom: [0.2, 0.26],
	desfoque: [0.3, 0.36],
	varrer: [0.22, 0.24],
	iris: [0.36, 0.36],
};

/** Transições que tocam um whoosh sozinhas (um pouco antes do corte). */
export const TRANSICOES_COM_WHOOSH = new Set(['chicote', 'zoom', 'varrer']);

export interface TransicaoAtiva {
	tipo: string;
	fase: 'saida' | 'entrada';
	/** 0 → 1 dentro da fase (na saída, 1 é o corte; na entrada, 0 é o corte). */
	p: number;
}

/** Plano em andamento no instante t. */
export const planoNoTempo = (cena: CenaTempo, t: number): PlanoTempo | undefined =>
	cena.planos.find((p) => t >= p.ini && t < p.fim) ?? cena.planos[cena.planos.length - 1];

/** Transição em andamento no plano (saindo para o próximo ou entrando nele), ou null. */
export const transicaoDoPlano = (plano: PlanoTempo | undefined, t: number): TransicaoAtiva | null => {
	if (!plano) return null;
	const dur = Math.max(0.05, plano.fim - plano.ini);
	const ent = plano.transicao ? DURACOES_TRANSICAO[plano.transicao] : undefined;
	if (ent && ent[1] > 0) {
		const d = Math.min(ent[1], dur * 0.45);
		if (t - plano.ini < d) return {tipo: plano.transicao!, fase: 'entrada', p: clamp((t - plano.ini) / d)};
	}
	const sai = plano.saida ? DURACOES_TRANSICAO[plano.saida] : undefined;
	if (sai && sai[0] > 0) {
		const d = Math.min(sai[0], dur * 0.45);
		if (plano.fim - t < d) return {tipo: plano.saida!, fase: 'saida', p: clamp(1 - (plano.fim - t) / d)};
	}
	return null;
};

export const transicaoAtiva = (cena: CenaTempo, t: number) => transicaoDoPlano(planoNoTempo(cena, t), t);

/** Força da transição (0 longe do corte, 1 no corte), com a curva de cada lado. */
export const forcaNoCorte = (tr: TransicaoAtiva) => (tr.fase === 'saida' ? tr.p * tr.p : (1 - tr.p) * (1 - tr.p));
