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

export const textosDoEpisodio = (biblia: Biblia, ep: Episodio): Textos => {
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
