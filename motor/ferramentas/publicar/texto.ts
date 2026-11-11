// Título, descrição e legenda de cada plataforma a partir do roteiro e da bíblia da série.
// O campo `postagem` do episódio (escrito pela skill de cada fluxo, ver postagem.md) traz o
// título de busca, a descrição, as hashtags, o comentário fixado e a capa; sem ele, sai o texto antigo.
import type {Biblia, Episodio} from '../../src/roteiro/tipos.ts';

const semAcento = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '');
const hashtag = (t: string) => `#${semAcento(t).toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
/** Tira o hífen escondido (U+00AD) que o destaque usa para quebrar palavra comprida no vídeo. */
const limpo = (t: string) => t.replace(/­/g, '');
const semDuplicadas = (lista: string[]) => [...new Set(lista)];

export interface Textos {
	tituloYoutube: string;
	descricaoYoutube: string;
	legendaInstagram: string;
	tags: string[];
	/** Comentário para postar e fixar nas duas plataformas logo depois de publicar. */
	comentarioFixado?: string;
	/** O que pôr em "Vídeo relacionado" no YouTube. */
	relacionado?: string;
	/** Playlist do YouTube onde o vídeo entra. */
	playlist: string;
}

/**
 * Instagram: o pedido "comente PALAVRA" pode tirar o vídeo das recomendações para quem não segue
 * (o Instagram cita comentar uma palavra específica como isca de engajamento). A legenda faz a
 * pergunta e pede para seguir; o "Comenta X" fica no YouTube e no próprio vídeo.
 */
const pedidoInstagram = (pergunta: string | undefined, seguir: string) => [pergunta ? limpo(pergunta) : '', seguir].filter(Boolean).join(' ');

/** Vídeo avulso (Como Funciona): cada um fecha o assunto e a chamada pede o próximo tema nos comentários. */
const textosAvulso = (biblia: Biblia, ep: Episodio): Textos => {
	const p = ep.postagem ?? {};
	const tags = p.hashtags?.length ? p.hashtags : (biblia.hashtags ?? ['comofunciona', 'engenharia', 'curiosidades']);
	const hashtags = semDuplicadas(tags.map(hashtag));
	const destaque = ep.chamada?.destaque ? limpo(ep.chamada.destaque) : '';
	const pedido = destaque ? `Comenta "${destaque}" ${ep.chamada.pergunta ? `(${limpo(ep.chamada.pergunta).replace(/[?!.]+$/, '').toLowerCase()})` : ''}`.trim() : '';
	const abertura = p.descricao ?? ep.titulo;
	const selo = `${biblia.titulo} #${ep.parte}`;
	return {
		tituloYoutube: (p.titulo ?? `${ep.titulo} #shorts`).slice(0, 100),
		descricaoYoutube: [abertura, selo, pedido, [...hashtags, '#shorts'].join(' ')].filter(Boolean).join('\n\n'),
		legendaInstagram: [abertura, selo, pedidoInstagram(ep.chamada?.pergunta, 'Segue o perfil pra ver o próximo.'), hashtags.join(' ')].filter(Boolean).join('\n\n'),
		tags: semDuplicadas(['shorts', ...tags, biblia.titulo]),
		comentarioFixado: p.comentario,
		relacionado: ep.parte > 1 ? `${biblia.titulo} #${ep.parte - 1}` : undefined,
		playlist: biblia.titulo,
	};
};

export const textosDoEpisodio = (biblia: Biblia, ep: Episodio): Textos => {
	if (biblia.formato === 'avulso') return textosAvulso(biblia, ep);
	const p = ep.postagem ?? {};
	const proxima = limpo(ep.chamada?.destaque ?? `PARTE ${ep.parte + 1}`);
	const pergunta = ep.chamada?.pergunta ?? '';
	// última parte da minissérie: não existe "parte N+1", a próxima é uma série nova
	const ultima = (biblia.partes ? ep.parte >= biblia.partes : false) || proxima.toUpperCase() === 'FIM';
	const rotulo = (biblia.rotulo_parte ?? 'Parte').toLowerCase().replace(/^./, (c) => c.toUpperCase());
	const tags = p.hashtags?.length ? p.hashtags : ['historia', 'suspense'];
	const hashtags = semDuplicadas([hashtag(biblia.titulo), ...tags.map(hashtag)]);
	const nomeParte = `${biblia.titulo} · ${rotulo} ${ep.parte}${biblia.partes ? `/${biblia.partes}` : ''}${ultima ? ' (final)' : ''}: ${ep.titulo}`;
	// título: a manchete da parte primeiro (é o que aparece no feed), a série e a parte no fim
	const titulo = p.titulo ? `${p.titulo} | ${biblia.titulo} ${rotulo.toLowerCase()} ${ep.parte}` : `${nomeParte} #shorts`;
	const abertura = p.descricao ? [p.descricao, nomeParte] : [nomeParte];
	return {
		tituloYoutube: titulo.slice(0, 100),
		descricaoYoutube: [
			...abertura,
			pergunta,
			ultima ? 'Último episódio! Comenta o que você achou do final. Amanhã começa uma história nova.' : `Comenta "${proxima}" que eu continuo a história!`,
			[...hashtags, '#shorts'].join(' '),
		]
			.filter(Boolean)
			.join('\n\n'),
		legendaInstagram: [
			...abertura,
			pedidoInstagram(pergunta, ultima ? 'Segue o perfil pra ver a próxima história.' : `Segue o perfil pra não perder a ${rotulo.toLowerCase()} ${ep.parte + 1}.`),
			hashtags.join(' '),
		]
			.filter(Boolean)
			.join('\n\n'),
		tags: semDuplicadas(['shorts', biblia.titulo, ...tags, 'animação']),
		comentarioFixado: p.comentario,
		relacionado: ep.parte > 1 ? `${biblia.titulo} · Parte ${ep.parte - 1}` : undefined,
		playlist: `${biblia.titulo} (em ordem)`,
	};
};
