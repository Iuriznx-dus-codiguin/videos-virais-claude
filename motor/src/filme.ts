// Formato filme: quando uma minissérie de histórias termina, todas as partes são renderizadas de novo
// em 16:9 e juntadas num vídeo só (ferramentas/filme.ts). É o mesmo roteiro, as mesmas vozes e a mesma
// produção; muda só o quadro e o fim de cada parte:
// - a câmera é a mesma de cada plano, com a mesma lente vertical: o quadro deitado mostra mais dos
//   lados (o personagem continua do mesmo tamanho na altura da tela), em vez de cortar o vertical;
// - a parte acaba logo depois da última fala e escurece para a próxima: a chamada "COMENTA PARTE N"
//   (pergunta, balão e destaque) não entra;
// - em vez do selo "PARTE N" fixo, um letreiro de capítulo nos primeiros segundos; a primeira parte
//   abre com o título da série e a última fecha com "FIM";
// - legenda menor, embaixo, no estilo de filme.
import type {LinhaDoTempo} from './roteiro/tipos';

export const LARGURA_FILME = 1920;
export const ALTURA_FILME = 1080;

/** Segundos (de roteiro) entre o fim da última fala e o corte da parte: o último plano respira. */
export const CAUDA_FILME = 0.9;
/** Escurecimento no fim de cada parte e clareamento no começo (segundos de roteiro). */
export const ESCURECE_FILME = 0.6;
export const CLAREIA_FILME = 0.4;
/** Cartão "FIM" depois do corte da última parte. */
export const FIM_FILME = 3.4;
/** Letreiro de capítulo no começo de cada parte (o da primeira, com o título da série, fica mais). */
export const CAPITULO_FILME = {de: 0.35, ate: 3.6, ateNaPrimeira: 4.4};

export interface OpcoesFilme {
	primeira?: boolean;
	ultima?: boolean;
	semLegenda?: boolean;
}

/**
 * Linha do tempo da parte no filme: acaba no corte (antes da chamada) ou, na última parte, no fim do
 * cartão "FIM". Cenas, planos e falas não mudam; só a duração e o modo de desenhar a camada 2D.
 */
export const paraFilme = (linha: LinhaDoTempo, opc: OpcoesFilme = {}): LinhaDoTempo => {
	const ultimaFala = linha.falas.at(-1);
	// a chamada começa 0,15 s depois da última fala (ou silêncio): o corte vem um pouco depois disso
	const fimDaHistoria = ultimaFala ? Math.max(ultimaFala.fim, linha.chamada.ini - 0.15) : linha.chamada.ini;
	const corte = Math.min(linha.duracao, fimDaHistoria + CAUDA_FILME);
	const ultima = !!opc.ultima;
	return {
		...linha,
		duracao: corte + (ultima ? FIM_FILME : 0),
		filme: {corte, primeira: !!opc.primeira, ultima, semLegenda: !!opc.semLegenda},
	};
};
