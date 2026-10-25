// Agrupa as palavras das falas em blocos curtos de legenda (2 a 3 palavras), quebrando nas
// pausas da frase, no estilo das legendas de shorts.
import type {FalaTempo, PalavraTempo} from './tipos';

export interface GrupoLegenda {
	quem: string;
	ini: number;
	fim: number;
	palavras: PalavraTempo[];
}

const MAX_PALAVRAS = 3;
const MAX_LETRAS = 17;

/** Texto que aparece na tela: sem ponto, vírgula e reticências (mantém ? e !). */
export const textoNaTela = (palavra: string) =>
	palavra
		.replace(/\.\.\.|…/g, '')
		.replace(/[.,;:]+(?=[?!]*$)/g, '')
		.replace(/["“”]/g, '')
		.toUpperCase();

export const gruposDeLegenda = (falas: FalaTempo[]): GrupoLegenda[] => {
	const grupos: GrupoLegenda[] = [];
	for (const f of falas) {
		let atual: PalavraTempo[] = [];
		const fechar = () => {
			if (atual.length) grupos.push({quem: f.quem, palavras: atual, ini: atual[0].ini, fim: atual[atual.length - 1].fim});
			atual = [];
		};
		for (const p of f.palavras) {
			const letras = atual.reduce((s, w) => s + textoNaTela(w.texto).length + 1, 0) + textoNaTela(p.texto).length;
			if (atual.length >= MAX_PALAVRAS || (atual.length && letras > MAX_LETRAS)) fechar();
			// palavra de ênfase longa fica sozinha
			if (p.enfase && atual.length && textoNaTela(p.texto).length > 6) fechar();
			atual.push(p);
			const pausa = /(\.\.\.|…|[.!?])["”]?$/.test(p.texto) || (/[,;:—]$/.test(p.texto) && atual.length >= 2);
			if (pausa) fechar();
		}
		fechar();
	}
	// cada bloco fica na tela até o próximo começar (se estiver perto) ou um pouco depois do fim
	for (let i = 0; i < grupos.length; i++) {
		const prox = grupos[i + 1];
		const g = grupos[i];
		g.fim = prox && prox.ini - g.fim < 0.6 ? prox.ini : g.fim + 0.35;
	}
	return grupos;
};
