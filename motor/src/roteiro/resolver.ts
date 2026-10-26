// Transforma o roteiro (âncoras nas falas) em uma linha do tempo com segundos absolutos.
// Sem áudio, a duração de cada fala é estimada pelo texto; com o alinhamento do OmniVoice,
// usa o tempo real de cada letra. O resto do roteiro não muda entre um caso e outro.
import {ACOES, ANIMACOES_PECA, CENARIOS, EFEITOS, ENCERRA_ESTADO, EXPRESSOES, FLUXOS, FORMAS, LADOS, MOVIMENTOS, PLANOS} from '../catalogo';
import {
	Alinhamentos,
	AcaoTempo,
	AnimacaoTempo,
	Ancora,
	CartaoTempo,
	Peca,
	RotuloTempo,
	Biblia,
	Cena,
	CenaTempo,
	EfeitoTempo,
	Episodio,
	Fala,
	FalaTempo,
	LetraTempo,
	LinhaDoTempo,
	PalavraTempo,
	PlanoTempo,
	SomTempo,
	ehSilencio,
} from './tipos';

export const INICIO_PRIMEIRA_FALA = 0.3;
export const PAUSA_PADRAO = 0.22;
export const DURACAO_CHAMADA = 2.8;

/** Minúsculas, sem acento e sem pontuação: "Ilha..." -> "ilha". */
export const normalizar = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

const letrasDe = (palavra: string) => palavra.replace(/[^\p{L}\p{N}]/gu, '');

/** Palavra inteira em maiúsculas (e com mais de uma letra) vira ênfase na legenda. */
export const ehEnfase = (palavra: string) => {
	const l = letrasDe(palavra);
	return l.length > 1 && l === l.toUpperCase() && l !== l.toLowerCase();
};

/** Texto que vai para a voz: as palavras de ênfase voltam a ser minúsculas (mesmo número de letras). */
export const textoParaVoz = (texto: string) =>
	texto
		.split(/(\s+)/)
		.map((p) => (ehEnfase(p) ? p.toLowerCase() : p))
		.join('');

const pausaDepois = (palavra: string) => {
	if (/\.\.\.|…/.test(palavra)) return 0.45;
	if (/[.!?]["”']?$/.test(palavra)) return 0.3;
	if (/[:]$/.test(palavra)) return 0.22;
	if (/[,;—-]$/.test(palavra)) return 0.16;
	return 0;
};

/** Estimativa da fala em português, num ritmo de narração de suspense. */
export const estimarFala = (fala: Fala, ini: number): Pick<FalaTempo, 'palavras' | 'letras' | 'fim'> => {
	const vel = fala.velocidade ?? 1;
	const tokens = fala.texto.split(/\s+/).filter(Boolean);
	const palavras: PalavraTempo[] = [];
	const letras: LetraTempo[] = [];
	let t = ini;
	tokens.forEach((tok, i) => {
		const l = letrasDe(tok);
		const dur = Math.max(0.16, 0.062 * l.length + 0.08) / vel;
		palavras.push({texto: tok, ini: t, fim: t + dur, enfase: ehEnfase(tok)});
		const passo = dur / Math.max(1, l.length);
		[...l].forEach((c, k) => letras.push({c: c.toLowerCase(), ini: t + k * passo, fim: t + (k + 1) * passo}));
		t += dur;
		if (i < tokens.length - 1) t += pausaDepois(tok) / vel + 0.03;
	});
	return {palavras, letras, fim: t};
};

/** Palavras e letras a partir do alinhamento por caractere devolvido pelo OmniVoice. */
export const falaDoAlinhamento = (
	fala: Fala,
	al: Alinhamentos[string],
	ini: number,
): Pick<FalaTempo, 'palavras' | 'letras' | 'fim'> => {
	const alvo = textoParaVoz(fala.texto).toLowerCase();
	const recebido = al.caracteres.join('').toLowerCase();
	// a resposta pode trazer marcas de emoção antes do texto: acha onde o texto começa
	const desloc = Math.max(0, recebido.indexOf(alvo));
	const palavras: PalavraTempo[] = [];
	const letras: LetraTempo[] = [];
	const original = fala.texto;
	let i = 0;
	while (i < original.length) {
		if (/\s/.test(original[i])) {
			i++;
			continue;
		}
		let j = i;
		while (j < original.length && !/\s/.test(original[j])) j++;
		const tok = original.slice(i, j);
		let pIni = Infinity;
		let pFim = -Infinity;
		for (let k = i; k < j; k++) {
			const a = k + desloc;
			if (a >= al.inicio.length) break;
			if (/[\p{L}\p{N}]/u.test(original[k])) {
				pIni = Math.min(pIni, al.inicio[a]);
				pFim = Math.max(pFim, al.fim[a]);
				letras.push({c: original[k].toLowerCase(), ini: ini + al.inicio[a], fim: ini + al.fim[a]});
			}
		}
		if (Number.isFinite(pIni)) palavras.push({texto: tok, ini: ini + pIni, fim: ini + pFim, enfase: ehEnfase(tok)});
		i = j;
	}
	return {palavras, letras, fim: ini + al.duracao};
};

interface Contexto {
	itens: Map<string, {ini: number; fim: number; palavras: PalavraTempo[]}>;
	cena?: {ini: number; fim: number};
	avisos: string[];
	onde: string;
}

/** Resolve uma âncora para segundos. Devolve undefined se não der para resolver (com aviso). */
export const resolverAncora = (a: Ancora | undefined, ctx: Contexto): number | undefined => {
	if (a === undefined || a === null) return undefined;
	if (typeof a === 'number') return a;
	const m = /^(.*?)([+-]\d+(?:\.\d+)?)?$/.exec(a.trim());
	const base = (m?.[1] ?? a).trim();
	const desloc = m?.[2] ? parseFloat(m[2]) : 0;
	if (base === 'inicio' || base === 'fim') {
		if (!ctx.cena) {
			ctx.avisos.push(`${ctx.onde}: "${a}" só vale dentro de uma cena`);
			return undefined;
		}
		return (base === 'inicio' ? ctx.cena.ini : ctx.cena.fim) + desloc;
	}
	const partes = base.split(':');
	const item = ctx.itens.get(partes[0]);
	if (!item) {
		ctx.avisos.push(`${ctx.onde}: a âncora "${a}" cita "${partes[0]}", que não existe nas falas`);
		return undefined;
	}
	if (partes.length === 1) return item.ini + desloc;
	if (partes.length === 2 && partes[1] === 'fim') return item.fim + desloc;
	const procurada = normalizar(partes[1]);
	const palavra =
		item.palavras.find((p) => normalizar(p.texto) === procurada) ??
		item.palavras.find((p) => normalizar(p.texto).startsWith(procurada));
	if (!palavra) {
		ctx.avisos.push(`${ctx.onde}: a palavra "${partes[1]}" não está na fala ${partes[0]}`);
		return item.ini + desloc;
	}
	return (partes[2] === 'fim' ? palavra.fim : palavra.ini) + desloc;
};

/** Ids das maquetes da cena e nomes das peças que dá para citar ("peca" e "maquete.peca"). */
const nomesDeMaquete = (cena: Cena, modelos: Record<string, Peca[]>) => {
	const maquetes = new Set<string>();
	const pecas = new Set<string>();
	for (const o of cena.objetos ?? []) {
		if (o.tipo !== 'maquete') continue;
		const modelo = String(o.modelo ?? '');
		const id = String(o.id ?? modelo);
		maquetes.add(id);
		maquetes.add(modelo);
		for (const p of modelos[modelo] ?? []) {
			pecas.add(p.id);
			pecas.add(`${id}.${p.id}`);
			pecas.add(`${modelo}.${p.id}`);
		}
	}
	return {maquetes, pecas};
};

const conferirAlvo = (alvo: unknown, cena: Cena, ctx: Contexto, biblia: Biblia, modelos: Record<string, Peca[]> = {}) => {
	if (alvo === undefined || Array.isArray(alvo) || alvo === 'camera') return;
	const def = CENARIOS[cena.cenario];
	const nome = String(alvo);
	const ehMarca = def && (nome in def.marcas || (def.pontos && nome in def.pontos));
	const ehPersonagem = nome in (cena.personagens ?? {}) || nome in biblia.personagens;
	const ehObjeto = (cena.objetos ?? []).some((o) => o.tipo === nome || o.id === nome);
	const m = nomesDeMaquete(cena, modelos);
	const ehPeca = m.pecas.has(nome) || m.maquetes.has(nome);
	if (!ehMarca && !ehPersonagem && !ehObjeto && !ehPeca) ctx.avisos.push(`${ctx.onde}: alvo "${nome}" desconhecido no cenário ${cena.cenario}`);
};

/** Confere as peças de cada modelo: forma conhecida, ids únicos, mãe que existe. */
const conferirModelos = (modelos: Record<string, Peca[]>, avisos: string[]) => {
	for (const [nome, pecas] of Object.entries(modelos)) {
		const ids = new Set<string>();
		for (const p of pecas) {
			const onde = `modelo ${nome}, peça ${p.id}`;
			if (ids.has(p.id)) avisos.push(`${onde}: id repetido`);
			ids.add(p.id);
			if (!(FORMAS as readonly string[]).includes(p.forma)) avisos.push(`${onde}: forma "${p.forma}" desconhecida (formas: ${FORMAS.join(', ')})`);
			if (p.forma === 'tubo' && !(p.caminho && p.caminho.length >= 2)) avisos.push(`${onde}: tubo precisa de "caminho" com 2 pontos ou mais`);
		}
		for (const p of pecas) if (p.pai && !ids.has(p.pai)) avisos.push(`modelo ${nome}, peça ${p.id}: mãe "${p.pai}" não existe`);
	}
};

export const resolverEpisodio = (ep: Episodio, bibliaSerie: Biblia, alinhamentos: Alinhamentos = {}): LinhaDoTempo => {
	const avisos: string[] = [];
	// personagens só do episódio (o inventor do dia) entram junto com os da bíblia
	const biblia: Biblia = ep.personagens ? {...bibliaSerie, personagens: {...bibliaSerie.personagens, ...ep.personagens}} : bibliaSerie;
	const modelos = ep.modelos ?? {};
	conferirModelos(modelos, avisos);
	const ctx: Contexto = {itens: new Map(), avisos, onde: 'falas'};

	// 1. falas em sequência
	const falas: FalaTempo[] = [];
	let t = INICIO_PRIMEIRA_FALA;
	for (const item of ep.falas) {
		if (ctx.itens.has(item.id)) avisos.push(`falas: id repetido "${item.id}"`);
		if (ehSilencio(item)) {
			ctx.itens.set(item.id, {ini: t, fim: t + item.silencio, palavras: []});
			t += item.silencio;
			continue;
		}
		if (!(item.quem in biblia.personagens)) avisos.push(`fala ${item.id}: personagem "${item.quem}" não está na bíblia`);
		// alinhamento de uma versão antiga da fala (texto mudou e a voz ainda não foi refeita): estima pelo texto
		const bruto = alinhamentos[item.id];
		const al = bruto && bruto.caracteres.join('').toLowerCase().includes(textoParaVoz(item.texto).toLowerCase()) ? bruto : undefined;
		if (bruto && !al) avisos.push(`fala ${item.id}: o texto mudou depois da voz; rode npm run vozes de novo`);
		const r = al ? falaDoAlinhamento(item, al, t) : estimarFala(item, t);
		falas.push({
			id: item.id,
			quem: item.quem,
			off: !!item.off,
			tom: item.tom,
			texto: item.texto,
			ini: t,
			fim: r.fim,
			palavras: r.palavras,
			letras: r.letras,
			audio: al?.audio,
			estimada: !al,
		});
		ctx.itens.set(item.id, {ini: t, fim: r.fim, palavras: r.palavras});
		t = r.fim + (item.pausa_depois ?? PAUSA_PADRAO);
	}
	const ultima = ep.falas.length ? ctx.itens.get(ep.falas[ep.falas.length - 1].id)! : {fim: INICIO_PRIMEIRA_FALA};
	const iniChamada = ultima.fim + 0.15;
	const duracao = iniChamada + DURACAO_CHAMADA;

	// 2. cenas: cada uma começa na sua âncora "de" e termina onde a próxima começa
	const inicios = ep.cenas.map((c, i) => {
		ctx.onde = `cena ${c.id}`;
		if (i === 0) return 0;
		const v = resolverAncora(c.de, ctx);
		if (v === undefined) avisos.push(`cena ${c.id}: precisa de "de" para saber onde começa`);
		return v;
	});
	const cenas: CenaTempo[] = ep.cenas.map((c, i) => {
		const ini = inicios[i] ?? (i > 0 ? (inicios[i - 1] ?? 0) : 0);
		const fim = i < ep.cenas.length - 1 ? (inicios[i + 1] ?? duracao) : duracao;
		if (fim <= ini) avisos.push(`cena ${c.id}: termina antes de começar (${ini.toFixed(2)}s a ${fim.toFixed(2)}s)`);
		const def = CENARIOS[c.cenario];
		if (!def) avisos.push(`cena ${c.id}: cenário "${c.cenario}" não existe`);
		ctx.cena = {ini, fim};

		for (const [quem, p] of Object.entries(c.personagens ?? {})) {
			ctx.onde = `cena ${c.id}, personagem ${quem}`;
			if (!(quem in biblia.personagens)) avisos.push(`${ctx.onde}: não está na bíblia`);
			if (typeof p.em === 'string' && def && !(p.em in def.marcas)) avisos.push(`${ctx.onde}: marca "${p.em}" não existe em ${c.cenario}`);
			if (p.expressao && !(EXPRESSOES as readonly string[]).includes(p.expressao)) avisos.push(`${ctx.onde}: expressão "${p.expressao}" desconhecida`);
			conferirAlvo(p.olhando, c, ctx, biblia, modelos);
		}

		// ações
		const brutas = (c.acoes ?? []).map((a, k) => {
			ctx.onde = `cena ${c.id}, ação ${k + 1}`;
			if (!(a.quem in (c.personagens ?? {}))) avisos.push(`${ctx.onde}: "${a.quem}" não está na cena`);
			if (a.faz && !(a.faz in ACOES)) avisos.push(`${ctx.onde}: ação "${a.faz}" desconhecida`);
			if (a.expressao && !(EXPRESSOES as readonly string[]).includes(a.expressao)) avisos.push(`${ctx.onde}: expressão "${a.expressao}" desconhecida`);
			conferirAlvo(a.para, c, ctx, biblia, modelos);
			conferirAlvo(a.olhar, c, ctx, biblia, modelos);
			const aIni = resolverAncora(a.de, ctx) ?? ini;
			const aFim = resolverAncora(a.ate, ctx);
			return {a, aIni, aFim};
		});
		const acoes: AcaoTempo[] = brutas
			.map(({a, aIni, aFim}) => {
				let f: number;
				const def = a.faz ? ACOES[a.faz] : undefined;
				if (aFim !== undefined) f = aFim;
				else if (def?.tipo === 'gesto') f = aIni + (def.duracao ?? 1);
				else if (def?.tipo === 'movimento') f = -1; // calculado pela velocidade no motor
				else if (def?.tipo === 'estado') {
					// dura até o próximo estado do mesmo personagem ou até ele andar, levantar...
					const prox = brutas
						.filter(
							(o) =>
								o.a.quem === a.quem &&
								o.aIni > aIni &&
								o.a.faz &&
								(ACOES[o.a.faz]?.tipo === 'estado' || ENCERRA_ESTADO.has(o.a.faz)),
						)
						.map((o) => o.aIni);
					f = Math.min(fim, ...prox);
				} else if (def?.tipo === 'modificador') f = fim;
				else f = fim; // só olhar/expressão
				return {...a, ini: aIni, fim: f};
			})
			.sort((x, y) => x.ini - y.ini);

		// planos
		let planos: PlanoTempo[] = (c.planos ?? [])
			.map((p, k) => {
				ctx.onde = `cena ${c.id}, plano ${k + 1}`;
				if (!(PLANOS as readonly string[]).includes(p.tipo)) avisos.push(`${ctx.onde}: tipo "${p.tipo}" desconhecido`);
				if (p.movimento && !(MOVIMENTOS as readonly string[]).includes(p.movimento)) avisos.push(`${ctx.onde}: movimento "${p.movimento}" desconhecido`);
				if (p.lado && !(LADOS as readonly string[]).includes(p.lado)) avisos.push(`${ctx.onde}: lado "${p.lado}" desconhecido`);
				conferirAlvo(p.alvo, c, ctx, biblia, modelos);
				conferirAlvo(p.alvo2, c, ctx, biblia, modelos);
				return {...p, ini: resolverAncora(p.de, ctx) ?? ini, fim: fim};
			})
			.sort((x, y) => x.ini - y.ini);
		if (!planos.length) {
			const primeiro = Object.keys(c.personagens ?? {})[0];
			planos = [{de: 'inicio', tipo: 'medio', alvo: primeiro, ini, fim}];
		}
		if (planos[0].ini > ini + 0.01) {
			avisos.push(`cena ${c.id}: o primeiro plano começa ${(planos[0].ini - ini).toFixed(2)}s depois da cena; puxei para o início`);
		}
		planos[0].ini = ini;
		planos.forEach((p, k) => {
			p.ini = Math.max(ini, Math.min(p.ini, fim));
			p.fim = k < planos.length - 1 ? planos[k + 1].ini : fim;
		});

		const sons: SomTempo[] = (c.sons ?? []).map((s, k) => {
			ctx.onde = `cena ${c.id}, som ${k + 1}`;
			return {...s, ini: resolverAncora(s.de, ctx) ?? ini};
		});
		const efeitos: EfeitoTempo[] = (c.efeitos ?? []).map((e, k) => {
			ctx.onde = `cena ${c.id}, efeito ${k + 1}`;
			if (!(e.efeito in EFEITOS)) avisos.push(`${ctx.onde}: efeito "${e.efeito}" desconhecido`);
			const eIni = resolverAncora(e.de, ctx) ?? ini;
			const padrao = EFEITOS[e.efeito];
			const eFim = resolverAncora(e.ate, ctx) ?? (padrao == null ? fim : eIni + padrao);
			return {...e, ini: eIni, fim: eFim};
		});

		// maquetes: objetos "maquete" precisam de um modelo que exista
		for (const [k, o] of (c.objetos ?? []).entries()) {
			if (o.tipo === 'maquete' && !(String(o.modelo ?? '') in modelos)) avisos.push(`cena ${c.id}, objeto ${k + 1}: modelo "${o.modelo}" não existe em "modelos"`);
		}
		const nomes = nomesDeMaquete(c, modelos);
		const animacoes: AnimacaoTempo[] = (c.animacoes ?? []).map((a, k) => {
			ctx.onde = `cena ${c.id}, animação ${k + 1}`;
			if (!(a.faz in ANIMACOES_PECA)) avisos.push(`${ctx.onde}: animação "${a.faz}" desconhecida`);
			const deMaquete = a.faz === 'explodir' || a.faz === 'montar' || (a.faz === 'fluxo' && nomes.maquetes.has(a.peca));
			if (deMaquete ? !nomes.maquetes.has(a.peca) && !nomes.pecas.has(a.peca) : !nomes.pecas.has(a.peca)) avisos.push(`${ctx.onde}: peça "${a.peca}" não existe nas maquetes da cena`);
			if (a.faz === 'fluxo' && a.tipo && !(a.tipo in FLUXOS)) avisos.push(`${ctx.onde}: fluxo "${a.tipo}" desconhecido (${Object.keys(FLUXOS).join(', ')})`);
			const aIni = resolverAncora(a.de, ctx) ?? ini;
			const padrao: Record<string, number> = {girar_para: 0.6, mover: 0.8, explodir: 1.2, montar: 1.0, crescer: 1.2, aparecer: 0.45, sumir: 0.35, transparente: 0.6};
			const aFim = resolverAncora(a.ate, ctx) ?? (a.faz in padrao ? aIni + padrao[a.faz] : fim);
			return {...a, ini: aIni, fim: aFim};
		});
		const rotulos: RotuloTempo[] = (c.rotulos ?? []).map((r, k) => {
			ctx.onde = `cena ${c.id}, rótulo ${k + 1}`;
			conferirAlvo(r.alvo, c, ctx, biblia, modelos);
			const rIni = resolverAncora(r.de, ctx) ?? ini;
			return {...r, ini: rIni, fim: resolverAncora(r.ate, ctx) ?? fim};
		});
		const cartoes: CartaoTempo[] = (c.cartoes ?? []).map((r, k) => {
			ctx.onde = `cena ${c.id}, cartão ${k + 1}`;
			const rIni = resolverAncora(r.de, ctx) ?? ini;
			return {...r, ini: rIni, fim: resolverAncora(r.ate, ctx) ?? Math.min(fim, rIni + 3)};
		});

		return {
			id: c.id,
			cenario: c.cenario,
			luz: c.luz ?? def?.luzPadrao ?? 'dia',
			ini,
			fim,
			personagens: c.personagens ?? {},
			// objetos animados (o avião caindo) dizem quando começam e terminam em "quando_de" e "quando_ate"
			objetos: (c.objetos ?? []).map((o, k) => {
				if (o.quando_de === undefined && o.quando_ate === undefined) return o;
				ctx.onde = `cena ${c.id}, objeto ${k + 1}`;
				return {...o, _ini: resolverAncora(o.quando_de as Ancora, ctx) ?? ini, _fim: resolverAncora(o.quando_ate as Ancora, ctx) ?? fim};
			}),
			acoes,
			planos,
			sons,
			efeitos,
			ambiente: c.ambiente,
			animacoes,
			rotulos,
			cartoes,
		};
	});

	if ((biblia.formato ?? 'serie') === 'avulso') {
		// Como Funciona: alvo ~1min20 com a voz real. Sem voz, a estimativa sai ~20% mais longa que a voz do narrador.
		const comVoz = falas.length > 0 && falas.every((f) => !f.estimada);
		const [min, max] = comVoz ? [70, 95] : [85, 112];
		const alvo = comVoz ? '75 a 90s com voz' : '90 a 105s estimados, que dão ~75 a 90s com voz';
		if (duracao < min) avisos.push(`duração total ${duracao.toFixed(1)}s: curta demais (alvo ${alvo})`);
		if (duracao > max) avisos.push(`duração total ${duracao.toFixed(1)}s: longa demais (alvo ${alvo})`);
	} else {
		// histórias: alvo ~1min20 (pedido do Iuri em 26/10)
		if (duracao < 72) avisos.push(`duração total ${duracao.toFixed(1)}s: curta demais para um episódio (alvo 75 a 88s)`);
		if (duracao > 92) avisos.push(`duração total ${duracao.toFixed(1)}s: longa demais (alvo 75 a 88s)`);
	}

	return {
		serie: ep.serie,
		tituloSerie: biblia.titulo,
		parte: ep.parte,
		titulo: ep.titulo,
		duracao,
		falas,
		cenas,
		chamada: {...ep.chamada, ini: iniChamada},
		personagens: biblia.personagens,
		musica: ep.musica,
		avisos,
		modelos,
		formato: biblia.formato ?? 'serie',
	};
};
