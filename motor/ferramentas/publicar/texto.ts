// Título, descrição e legenda de cada plataforma a partir do roteiro e da bíblia da série.
import type {Biblia, Episodio} from '../../src/roteiro/tipos.ts';

const semAcento = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '');
const hashtag = (t: string) => `#${semAcento(t).toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

export interface Textos {
	tituloYoutube: string;
	descricaoYoutube: string;
	legendaInstagram: string;
	tags: string[];
}

/** Vídeo avulso (Como Funciona): cada um fecha o assunto e a chamada pede o próximo tema nos comentários. */
const textosAvulso = (biblia: Biblia, ep: Episodio): Textos => {
	const tags = biblia.hashtags ?? ['comofunciona', 'engenharia', 'curiosidades'];
	const base = [...tags.map(hashtag), '#shorts'];
	const pedido = ep.chamada?.destaque ? `Comenta "${ep.chamada.destaque}" ${ep.chamada.pergunta ? `(${ep.chamada.pergunta.replace(/[?!.]+$/, '').toLowerCase()})` : ''}`.trim() : '';
	const corpo = [`${ep.titulo}`, `${biblia.titulo} #${ep.parte}`, pedido].filter(Boolean).join('\n\n');
	return {
		tituloYoutube: `${ep.titulo} #shorts`.slice(0, 100),
		descricaoYoutube: `${corpo}\n\n${base.join(' ')}`,
		legendaInstagram: `${corpo}\n\n${base.filter((h) => h !== '#shorts').join(' ')} #reels`,
		tags: ['shorts', ...tags, biblia.titulo],
	};
};

export const textosDoEpisodio = (biblia: Biblia, ep: Episodio): Textos => {
	if (biblia.formato === 'avulso') return textosAvulso(biblia, ep);
	const proxima = ep.chamada?.destaque ?? `PARTE ${ep.parte + 1}`;
	const gancho = ep.chamada?.pergunta ?? '';
	const base = [hashtag(biblia.titulo), '#historia', '#suspense', '#shorts'];
	const corpo = [
		`${biblia.titulo} · Parte ${ep.parte}: ${ep.titulo}`,
		gancho,
		`Comenta "${proxima}" que eu continuo a história!`,
	]
		.filter(Boolean)
		.join('\n\n');
	return {
		tituloYoutube: `${biblia.titulo} · Parte ${ep.parte}: ${ep.titulo} #shorts`,
		descricaoYoutube: `${corpo}\n\n${base.join(' ')}`,
		legendaInstagram: `${corpo}\n\n${base.filter((h) => h !== '#shorts').join(' ')} #reels`,
		tags: ['shorts', biblia.titulo, 'historia', 'suspense', 'animação'],
	};
};
