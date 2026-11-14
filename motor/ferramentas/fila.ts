// Fila de publicação: o que a produção entregou no ramo dados (videos/) e o que já foi programado ou
// publicado no YouTube e no Instagram (publicacao/). Usada pela skill publicar-lote, na sessão em que
// o Claude sobe os vídeos pelo navegador do Iuri e usa o agendamento das próprias plataformas.
//
// Ferramenta compartilhada pelos dois fluxos: não escreve nem muda texto de postagem. Título, descrição,
// legenda, hashtags, capa e comentário vêm do .md que o "entregar" escreveu com as regras de cada fluxo.
//
// Uso (a partir de motor/):
//   npm run fila                               a fila: horário de cada vídeo e situação no YouTube e no Instagram
//   npm run fila -- lote                       monta o lote do que falta fazer: out/lote/lote.md (para o Iuri ler)
//                                              e out/lote/lote.json (para o navegador), com capas e links dos vídeos
//   npm run fila -- marcar <nome> [...] --youtube=programado --horario=2026-11-14T18:00 [--url=...]
//   npm run fila -- marcar <nome> --instagram=programado|publicado|pulado|limpar [--nota=...]
//   npm run fila -- marcar <nome> --comentario=youtube,instagram
//   npm run fila -- marcar --ate=2026-11-12 --youtube=publicado --instagram=publicado --nota=manual
//                                              tudo com horário até esse dia (o que o Iuri já postou à mão)
//   --agora=2026-11-14T13:00:00Z               finge outra hora (testes)
//
// Horários de Brasília (UTC-3, sem horário de verão). O ramo guarda tudo em UTC.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RAIZ} from './lib/caminhos.ts';

const RAMO = 'dados';
const BRASILIA_H = 3;
const H = 3_600_000;
/** Tempo mínimo entre agora e o horário programado: dá para subir o lote inteiro antes do primeiro sair. */
export const MARGEM_MS = 90 * 60_000;
/** Vídeo já programado numa plataforma: a outra usa o mesmo horário se ainda faltar pelo menos isto. */
export const MARGEM_CURTA_MS = 30 * 60_000;
/** Dois vídeos do mesmo fluxo nunca saem com menos de 3 h entre eles. */
export const INTERVALO_MS = 3 * H;
/** Horários possíveis (Brasília). Os do calendário (18h; fim de semana 11h e 18h) mais os extras de quem atrasou. */
const HORAS_SEMANA = [12, 15, 18, 21];
const HORAS_FIM_DE_SEMANA = [11, 15, 18, 21];
const LIMITE_TITULO_YT = 100;
const LIMITE_DESCRICAO_YT = 5000;
const LIMITE_LEGENDA_IG = 2200;
const LIMITE_HASHTAGS_IG = 5;

export type Situacao = 'programado' | 'publicado' | 'pulado';
export type Plataforma = 'youtube' | 'instagram';
export const PLATAFORMAS: Plataforma[] = ['youtube', 'instagram'];

export interface NaPlataforma {
	status: Situacao;
	/** Horário em que sai (ou saiu), UTC ISO. */
	horario?: string;
	url?: string;
	/** Blob do mp4 que foi subido: se a produção entregar outro (correção), o lote manda trocar. */
	video?: string;
	comentario?: boolean;
	nota?: string;
	em: string;
}
export type Publicacao = Partial<Record<Plataforma, NaPlataforma>> & {nome: string};

/** O que o "entregar" grava em videos/<nome>.json. */
interface Entrega {
	serie: string;
	parte: number;
	dia: string;
	hora: string;
	publicar_apos: string;
}

export interface Textos {
	rotulo: string;
	tituloYoutube: string;
	descricaoYoutube: string;
	legendaInstagram: string;
	segundoDaCapa?: number;
	relacionado?: string;
	playlist?: string;
	comentario?: string;
}

export interface ItemFila {
	nome: string;
	serie: string;
	parte: number;
	/** Fluxo para o calendário: histórias dividem os horários entre si; cada série avulsa é um fluxo. */
	fluxo: string;
	/** Horário combinado na entrega, UTC ISO. */
	planejado: string;
	/** Blob do mp4 entregue agora. */
	video: string;
	publicacao: Publicacao;
	textos: Textos;
}

// ---------- datas ----------

const brasilia = (utc: number) => new Date(utc - BRASILIA_H * H);
export const utcDeBrasilia = (dia: string, hora: string): number => {
	const [a, m, d] = dia.split('-').map(Number);
	const [hh, mm] = hora.split(':').map(Number);
	if (![a, m, d, hh, mm].every(Number.isInteger)) throw new Error(`horário inválido: ${dia} ${hora} (use AAAA-MM-DD e HH:MM)`);
	return Date.UTC(a, m - 1, d, hh + BRASILIA_H, mm);
};
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const dois = (n: number) => String(n).padStart(2, '0');
export const textoDoHorario = (utc: number | string) => {
	const b = brasilia(typeof utc === 'string' ? Date.parse(utc) : utc);
	return `${DIAS[b.getUTCDay()]} ${dois(b.getUTCDate())}/${dois(b.getUTCMonth() + 1)} ${dois(b.getUTCHours())}:${dois(b.getUTCMinutes())}`;
};
const partesDoHorario = (utc: number) => {
	const b = brasilia(utc);
	return {dia: `${b.getUTCFullYear()}-${dois(b.getUTCMonth() + 1)}-${dois(b.getUTCDate())}`, hora: `${dois(b.getUTCHours())}:${dois(b.getUTCMinutes())}`};
};

/** Horários possíveis a partir de um instante (UTC), em ordem. */
function* horariosDesde(inicio: number): Generator<number> {
	const b = brasilia(inicio);
	for (let dia = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()); ; dia += 24 * H) {
		const semana = new Date(dia).getUTCDay();
		for (const hora of semana === 0 || semana === 6 ? HORAS_FIM_DE_SEMANA : HORAS_SEMANA) {
			const utc = dia + (hora + BRASILIA_H) * H;
			if (utc >= inicio) yield utc;
		}
	}
}

// ---------- plano do lote ----------

export type Acao = 'subir' | 'trocar' | 'conferir' | 'comentar';
export interface Plano {
	item: ItemFila;
	horario: number;
	atrasado: boolean;
	/** O que fazer em cada plataforma neste lote (só as que têm algo a fazer). */
	acoes: Partial<Record<Plataforma, Acao>>;
}

const feito = (p?: NaPlataforma) => p?.status === 'publicado' || p?.status === 'pulado' || p?.status === 'programado';

/**
 * Decide o horário de cada vídeo e o que fazer em cada plataforma.
 * - Vídeo já programado numa plataforma fica no horário de lá; a outra plataforma usa o mesmo, se ainda der.
 * - Vídeo no prazo sai no horário combinado na entrega.
 * - Vídeo atrasado (o horário passou ou está a menos de 90 min) vai para o próximo horário livre do fluxo
 *   (calendário mais os extras de 12h/15h/21h), sempre depois do vídeo anterior do fluxo e com 3 h entre eles.
 *   Os horários futuros só andam se não couberem depois dos atrasados.
 * - Programado com horário que já passou: conferir se saiu (e fixar o comentário). Entrega nova depois de
 *   programado (correção): trocar, se ainda não saiu.
 */
export const planejar = (itens: ItemFila[], agora: number): Plano[] => {
	const planos: Plano[] = [];
	const porFluxo = new Map<string, ItemFila[]>();
	for (const i of itens) porFluxo.set(i.fluxo, [...(porFluxo.get(i.fluxo) ?? []), i]);
	for (const lista of porFluxo.values()) {
		lista.sort((a, b) => a.planejado.localeCompare(b.planejado) || a.serie.localeCompare(b.serie) || a.parte - b.parte);
		// horários que já estão ocupados por algo programado ou publicado
		const ocupados = new Set<number>();
		for (const i of lista) for (const p of PLATAFORMAS) if (i.publicacao[p]?.horario) ocupados.add(Date.parse(i.publicacao[p]!.horario!));
		let anterior = -Infinity;
		for (const item of lista) {
			const pub = item.publicacao;
			const fixos = PLATAFORMAS.map((p) => pub[p]?.horario).filter((h): h is string => !!h).map((h) => Date.parse(h));
			const acoes: Plano['acoes'] = {};
			const cedo = agora + MARGEM_MS;
			const fixo = fixos.length ? Math.min(...fixos) : undefined;
			let horario: number;
			if (fixo !== undefined && (fixo >= agora + MARGEM_CURTA_MS || PLATAFORMAS.every((p) => feito(pub[p])))) horario = fixo;
			else {
				const minimo = Math.max(cedo, anterior + INTERVALO_MS);
				const combinado = Date.parse(item.planejado);
				if (combinado >= minimo && !ocupados.has(combinado)) horario = combinado;
				else {
					horario = minimo;
					for (const h of horariosDesde(minimo)) {
						if (!ocupados.has(h) && ![...ocupados].some((o) => Math.abs(o - h) < INTERVALO_MS)) {
							horario = h;
							break;
						}
					}
				}
				ocupados.add(horario);
			}
			anterior = Math.max(anterior, horario);
			for (const p of PLATAFORMAS) {
				const n = pub[p];
				if (!n) acoes[p] = 'subir';
				else if (n.status === 'programado') {
					const saiu = n.horario ? Date.parse(n.horario) <= agora : false;
					if (saiu) acoes[p] = 'conferir';
					else if (n.video && n.video !== item.video) acoes[p] = 'trocar';
				} else if (n.status === 'publicado' && !n.comentario && item.textos.comentario && n.nota !== 'manual') acoes[p] = 'comentar';
			}
			if (Object.keys(acoes).length) planos.push({item, horario, atrasado: horario !== Date.parse(item.planejado), acoes});
		}
	}
	return planos.sort((a, b) => a.horario - b.horario || a.item.nome.localeCompare(b.item.nome));
};

// ---------- texto de postagem (.md do entregar) ----------

const secoes = (md: string) => {
	const r: Record<string, string> = {};
	for (const bloco of md.split(/^## /m).slice(1)) {
		const quebra = bloco.indexOf('\n');
		r[bloco.slice(0, quebra).trim()] = bloco.slice(quebra + 1).trim();
	}
	return r;
};
const item = (linhas: string, inicio: string) =>
	linhas
		.split('\n')
		.find((l) => l.startsWith(`- ${inicio}`))
		?.slice(2 + inicio.length)
		.trim();

export const lerTextos = (md: string): Textos => {
	const s = secoes(md);
	const yt = s['YouTube Shorts'] ?? '';
	const [primeira, ...resto] = yt.split('\n');
	const hora = s['Na hora de postar'] ?? '';
	const capa = item(hora, 'Capa (nas duas):');
	const segundo = capa ? /quadro de (\d+(?:[.,]\d+)?) s/.exec(capa)?.[1] : undefined;
	const semPonto = (t?: string) => t?.replace(/\.$/, '');
	return {
		rotulo: (md.split('\n')[0] ?? '').replace(/^#\s*/, ''),
		tituloYoutube: primeira.replace(/^Título:\s*/, '').trim(),
		descricaoYoutube: resto.join('\n').trim(),
		legendaInstagram: s['Instagram Reels'] ?? '',
		segundoDaCapa: segundo ? Number(segundo.replace(',', '.')) : undefined,
		relacionado: semPonto(item(hora, 'YouTube, "Vídeo relacionado":')),
		playlist: semPonto(item(hora, 'YouTube, playlist:')),
		comentario: item(hora, 'Comentário para postar e fixar nas duas, logo depois de publicar:'),
	};
};

/** Só limites das plataformas (nada de conteúdo): o que passar do limite é avisado e cortado no lote. */
export const conferirLimites = (t: Textos) => {
	const avisos: string[] = [];
	let {tituloYoutube, descricaoYoutube, legendaInstagram} = t;
	if (/[<>]/.test(tituloYoutube + descricaoYoutube)) {
		avisos.push('YouTube recusa < e > no título e na descrição: troquei por aspas');
		tituloYoutube = tituloYoutube.replace(/[<>]/g, '"');
		descricaoYoutube = descricaoYoutube.replace(/[<>]/g, '"');
	}
	if ([...tituloYoutube].length > LIMITE_TITULO_YT) {
		avisos.push(`título do YouTube com ${[...tituloYoutube].length} caracteres (máx. ${LIMITE_TITULO_YT}): cortado`);
		tituloYoutube = [...tituloYoutube].slice(0, LIMITE_TITULO_YT).join('').trim();
	}
	if (Buffer.byteLength(descricaoYoutube) > LIMITE_DESCRICAO_YT) avisos.push('descrição do YouTube passa de 5000 bytes: encurte no texto de postagem do fluxo');
	const tags = legendaInstagram.match(/#[\p{L}\p{N}_]+/gu) ?? [];
	if (tags.length > LIMITE_HASHTAGS_IG) {
		avisos.push(`Instagram aceita ${LIMITE_HASHTAGS_IG} hashtags e a legenda tem ${tags.length}: ficaram as ${LIMITE_HASHTAGS_IG} primeiras`);
		for (const extra of tags.slice(LIMITE_HASHTAGS_IG)) legendaInstagram = legendaInstagram.replace(new RegExp(`\\s*${extra}(?![\\p{L}\\p{N}_])`, 'u'), '');
	}
	if ([...legendaInstagram].length > LIMITE_LEGENDA_IG) avisos.push(`legenda do Instagram com ${[...legendaInstagram].length} caracteres (máx. ${LIMITE_LEGENDA_IG}): encurte no texto de postagem do fluxo`);
	const tagsYoutube = [...new Set((descricaoYoutube.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((x) => x.slice(1)).filter((x) => x.toLowerCase() !== 'shorts'))];
	return {tituloYoutube, descricaoYoutube, legendaInstagram, tagsYoutube, avisos};
};

// ---------- ramo dados ----------

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024}).trim();
const remoto = () => process.env.SHORTS_REMOTO ?? git(RAIZ, 'remote', 'get-url', 'origin');

/** Dono/nome do repositório no GitHub, para os links diretos (raw) dos arquivos. */
const repositorio = () => {
	const m = /([^/:]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remoto());
	if (!m) throw new Error(`não entendi o endereço do repositório: ${remoto()}`);
	return `${m[1]}/${m[2]}`;
};
export const linkDireto = (commit: string, caminho: string) =>
	process.env.SHORTS_LINK_BASE ? `${process.env.SHORTS_LINK_BASE}/${commit}/${caminho}` : `https://raw.githubusercontent.com/${repositorio()}/${commit}/${caminho}`;

/**
 * Clone leve do ramo: só os .json/.md de videos/, publicacao/ e as bíblias (sem baixar vídeo nenhum).
 * Um mp4 só é baixado se precisar tirar a capa dele.
 */
const abrir = (): string => {
	const pasta = mkdtempSync(join(tmpdir(), 'shorts-fila-'));
	execFileSync('git', ['clone', '--quiet', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', RAMO, remoto(), pasta], {stdio: 'pipe'});
	git(pasta, 'sparse-checkout', 'set', '--no-cone', '/publicacao/*.json', '/videos/*.json', '/videos/*.md', '/series/*/biblia.json');
	git(pasta, 'config', 'user.name', 'Rotina de Shorts');
	git(pasta, 'config', 'user.email', 'noreply@anthropic.com');
	return pasta;
};

const enviar = (pasta: string, mensagem: string) => {
	git(pasta, 'add', '--sparse', '-A', 'publicacao');
	if (git(pasta, 'status', '--porcelain', '--', 'publicacao') === '') return false;
	git(pasta, 'commit', '--quiet', '-m', mensagem);
	for (let tentativa = 1; ; tentativa++) {
		try {
			git(pasta, 'push', '--quiet', 'origin', `HEAD:${RAMO}`);
			return true;
		} catch (e) {
			if (tentativa >= 4) throw e;
			// a produção entregou alguma coisa nesse meio-tempo: junta e tenta de novo (publicacao/ é só desta ferramenta)
			try {
				git(pasta, 'pull', '--quiet', '--rebase', 'origin', RAMO);
			} catch {
				git(pasta, 'rebase', '--abort');
				throw e;
			}
		}
	}
};

const lerJson = <T>(arquivo: string): T => JSON.parse(readFileSync(arquivo, 'utf8')) as T;

const lerItens = (pasta: string): ItemFila[] => {
	const dir = join(pasta, 'videos');
	if (!existsSync(dir)) return [];
	const blobs = new Map<string, string>();
	for (const l of git(pasta, 'ls-tree', 'HEAD', 'videos/').split('\n')) {
		const m = /^\S+ blob (\S+)\tvideos\/(.+)\.mp4$/.exec(l);
		if (m) blobs.set(m[2], m[1]);
	}
	const formatos = new Map<string, string | undefined>();
	const formato = (serie: string) => {
		if (!formatos.has(serie)) {
			const b = join(pasta, 'series', serie, 'biblia.json');
			formatos.set(serie, existsSync(b) ? lerJson<{formato?: string}>(b).formato : undefined);
		}
		return formatos.get(serie);
	};
	const itens: ItemFila[] = [];
	for (const n of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
		const nome = n.replace(/\.json$/, '');
		const md = join(dir, `${nome}.md`);
		if (!blobs.has(nome) || !existsSync(md)) continue;
		const e = lerJson<Entrega>(join(dir, n));
		const arqPub = join(pasta, 'publicacao', `${nome}.json`);
		itens.push({
			nome,
			serie: e.serie,
			parte: e.parte,
			fluxo: formato(e.serie) === 'avulso' ? `avulso:${e.serie}` : 'historias',
			planejado: e.publicar_apos,
			video: blobs.get(nome)!,
			publicacao: existsSync(arqPub) ? lerJson<Publicacao>(arqPub) : {nome},
			textos: lerTextos(readFileSync(md, 'utf8')),
		});
	}
	return itens;
};

const opcoes = (args: string[]) => ({
	opc: Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => {
		const [k, ...v] = a.slice(2).split('=');
		return [k, v.join('=')];
	})) as Record<string, string>,
	pos: args.filter((a) => !a.startsWith('--')),
});
const agoraDe = (opc: Record<string, string>) => (opc.agora ? Date.parse(opc.agora) : Date.now());

// ---------- comandos ----------

const ROTULO_ACAO: Record<Acao, string> = {subir: 'subir e programar', trocar: 'trocar pelo vídeo novo (correção)', conferir: 'conferir se saiu e fixar o comentário', comentar: 'postar e fixar o comentário'};
const situacao = (p?: NaPlataforma) => (!p ? '—' : `${p.status}${p.horario ? ` ${textoDoHorario(p.horario)}` : ''}${p.comentario ? ' +coment.' : ''}${p.nota ? ` (${p.nota})` : ''}`);

export const mostrar = (agora = Date.now()) => {
	const pasta = abrir();
	try {
		const itens = lerItens(pasta).sort((a, b) => a.planejado.localeCompare(b.planejado));
		if (!itens.length) return console.log('nenhum vídeo entregue no ramo dados');
		const planos = new Map(planejar(itens, agora).map((p) => [p.item.nome, p]));
		for (const i of itens) {
			const p = planos.get(i.nome);
			const falta = p ? Object.entries(p.acoes).map(([pl, a]) => `${pl === 'youtube' ? 'YT' : 'IG'}: ${a}`).join(', ') : 'nada a fazer';
			console.log(`${textoDoHorario(i.planejado)}  ${i.nome.padEnd(22)}  YT ${situacao(i.publicacao.youtube).padEnd(28)} IG ${situacao(i.publicacao.instagram).padEnd(28)} → ${falta}${p?.atrasado ? ` (novo horário ${textoDoHorario(p.horario)})` : ''}`);
		}
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

/** Tira o quadro da capa do mp4 (baixa só esse vídeo do ramo). */
const tirarCapa = (pasta: string, item: ItemFila, destino: string) => {
	const tmp = mkdtempSync(join(tmpdir(), 'shorts-capa-'));
	try {
		const mp4 = join(tmp, 'video.mp4');
		writeFileSync(mp4, execFileSync('git', ['cat-file', 'blob', item.video], {cwd: pasta, maxBuffer: 512 * 1024 * 1024}));
		mkdirSync(join(destino, '..'), {recursive: true});
		execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(item.textos.segundoDaCapa), '-i', mp4, '-frames:v', '1', '-q:v', '2', destino], {stdio: 'pipe'});
		return existsSync(destino);
	} catch (e) {
		console.warn(`aviso: não deu para tirar a capa de ${item.nome} (${e instanceof Error ? e.message.split('\n')[0] : e})`);
		return false;
	} finally {
		rmSync(tmp, {recursive: true, force: true});
	}
};

export const montarLote = (agora = Date.now(), saida = join(RAIZ, 'out', 'lote')) => {
	const pasta = abrir();
	try {
		const planos = planejar(lerItens(pasta), agora);
		// capas que faltam vão para publicacao/capas/ no ramo, para o navegador buscar pelo link direto
		const precisaCapa = planos.filter((p) => p.item.textos.segundoDaCapa !== undefined && Object.values(p.acoes).some((a) => a === 'subir' || a === 'trocar'));
		git(pasta, 'sparse-checkout', 'add', '/publicacao/capas/');
		for (const p of precisaCapa) {
			const arq = join(pasta, 'publicacao', 'capas', `${p.item.nome}.jpg`);
			const marca = join(pasta, 'publicacao', 'capas', `${p.item.nome}.txt`);
			const assinatura = `${p.item.video} ${p.item.textos.segundoDaCapa}`;
			if (existsSync(arq) && existsSync(marca) && readFileSync(marca, 'utf8').trim() === assinatura) continue;
			if (tirarCapa(pasta, p.item, arq)) writeFileSync(marca, `${assinatura}\n`);
		}
		if (enviar(pasta, 'fila: capas do lote')) console.log('capas novas salvas no ramo dados (publicacao/capas/)');
		const commit = git(pasta, 'rev-parse', 'HEAD');
		const lote = planos.map((p) => {
			const t = p.item.textos;
			const lim = conferirLimites(t);
			const capa = existsSync(join(pasta, 'publicacao', 'capas', `${p.item.nome}.jpg`)) ? linkDireto(commit, `publicacao/capas/${p.item.nome}.jpg`) : undefined;
			const {dia, hora} = partesDoHorario(p.horario);
			return {
				nome: p.item.nome,
				rotulo: t.rotulo,
				fluxo: p.item.fluxo,
				horario: {utc: new Date(p.horario).toISOString(), dia, hora, texto: textoDoHorario(p.horario)},
				planejado: textoDoHorario(p.item.planejado),
				atrasado: p.atrasado,
				acoes: p.acoes,
				video: linkDireto(commit, `videos/${p.item.nome}.mp4`),
				capa,
				segundo_da_capa: t.segundoDaCapa,
				youtube: {titulo: lim.tituloYoutube, descricao: lim.descricaoYoutube, tags: lim.tagsYoutube, playlist: t.playlist, relacionado: t.relacionado, atual: p.item.publicacao.youtube},
				instagram: {legenda: lim.legendaInstagram, atual: p.item.publicacao.instagram},
				comentario: t.comentario,
				avisos: lim.avisos,
			};
		});
		mkdirSync(saida, {recursive: true});
		writeFileSync(join(saida, 'lote.json'), `${JSON.stringify({gerado_em: new Date(agora).toISOString(), commit, itens: lote}, null, 2)}\n`);
		const linhas = [`# Lote de publicação (${textoDoHorario(agora)}, Brasília)`, ''];
		if (!lote.length) linhas.push('Nada a fazer: tudo entregue já está programado ou publicado.');
		const tabela = lote.filter((l) => Object.values(l.acoes).some((a) => a === 'subir' || a === 'trocar'));
		if (tabela.length) {
			linhas.push('| Sai em | Vídeo | YouTube | Instagram |', '|---|---|---|---|');
			for (const l of tabela) linhas.push(`| ${l.horario.texto}${l.atrasado ? ` (era ${l.planejado})` : ''} | ${l.rotulo} | ${l.acoes.youtube ?? 'ok'} | ${l.acoes.instagram ?? 'ok'} |`);
			linhas.push('');
		}
		const depois = lote.filter((l) => Object.values(l.acoes).some((a) => a === 'conferir' || a === 'comentar'));
		if (depois.length) {
			linhas.push('## Já saíram: conferir e fixar o comentário', '');
			for (const l of depois) linhas.push(`- ${l.rotulo}: ${Object.entries(l.acoes).map(([pl, a]) => `${pl} ${ROTULO_ACAO[a]}`).join('; ')}`);
			linhas.push('');
		}
		for (const l of tabela) {
			linhas.push(`## ${l.rotulo}`, '', `Sai em **${l.horario.texto}** (Brasília)${l.atrasado ? `; estava para ${l.planejado}` : ''}.`, '');
			if (l.avisos.length) linhas.push(...l.avisos.map((a) => `> Aviso: ${a}`), '');
			linhas.push('**YouTube**', '', `Título: ${l.youtube.titulo}`, '', l.youtube.descricao, '');
			linhas.push(`Playlist: ${l.youtube.playlist ?? '—'} · Vídeo relacionado: ${l.youtube.relacionado ?? '—'} · Capa: ${l.segundo_da_capa !== undefined ? `quadro de ${String(l.segundo_da_capa).replace('.', ',')} s` : 'a sugerida pela plataforma'}`, '');
			linhas.push('**Instagram**', '', l.instagram.legenda, '');
			if (l.comentario) linhas.push(`**Comentário para fixar depois que sair:** ${l.comentario}`, '');
		}
		writeFileSync(join(saida, 'lote.md'), `${linhas.join('\n')}\n`);
		console.log(`lote: ${tabela.length} para subir/trocar, ${depois.length} para conferir/comentar → ${join(saida, 'lote.md')} e lote.json`);
		return lote;
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

export const marcar = (nomes: string[], opc: Record<string, string>, agora = Date.now()) => {
	const pasta = abrir();
	try {
		const itens = lerItens(pasta);
		let alvo: ItemFila[];
		if (opc.ate) {
			const limite = utcDeBrasilia(opc.ate, '23:59');
			alvo = itens.filter((i) => Date.parse(i.planejado) <= limite);
		} else {
			if (!nomes.length) throw new Error('diga quais vídeos (ex.: marcar apartamento-0-ep03 --youtube=programado) ou use --ate=AAAA-MM-DD');
			alvo = nomes.map((n) => {
				const i = itens.find((x) => x.nome === n);
				if (!i) throw new Error(`${n} não está em videos/ no ramo dados (veja npm run fila)`);
				return i;
			});
		}
		if (!alvo.length) return console.log('nenhum vídeo nesse período');
		const lote = existsSync(join(RAIZ, 'out', 'lote', 'lote.json'))
			? lerJson<{itens: {nome: string; horario: {utc: string}}[]}>(join(RAIZ, 'out', 'lote', 'lote.json')).itens
			: [];
		const comentarios = (opc.comentario ?? '').split(',').map((x) => x.trim()).filter(Boolean);
		mkdirSync(join(pasta, 'publicacao'), {recursive: true});
		for (const i of alvo) {
			const pub: Publicacao = {...i.publicacao, nome: i.nome};
			for (const p of PLATAFORMAS) {
				const valor = opc[p];
				if (valor === 'limpar') delete pub[p];
				else if (valor) {
					if (!['programado', 'publicado', 'pulado'].includes(valor)) throw new Error(`--${p}=${valor}: use programado, publicado, pulado ou limpar`);
					let horario = pub[p]?.horario;
					if (opc.horario) {
						const [dia, hora] = opc.horario.split('T');
						horario = new Date(utcDeBrasilia(dia, hora ?? '')).toISOString();
					} else if (!horario) horario = lote.find((l) => l.nome === i.nome)?.horario.utc ?? (valor === 'publicado' && opc.nota === 'manual' ? i.planejado : undefined);
					if (valor === 'programado' && !horario) throw new Error(`${i.nome}: diga o horário programado (--horario=AAAA-MM-DDTHH:MM, Brasília) ou rode o lote antes`);
					if (valor === 'programado' && Date.parse(horario!) <= agora) throw new Error(`${i.nome}: ${textoDoHorario(horario!)} já passou; programado precisa ser no futuro`);
					pub[p] = {
						...pub[p],
						status: valor as Situacao,
						horario,
						video: valor === 'pulado' ? pub[p]?.video : i.video,
						...(opc.url ? {url: opc.url} : {}),
						...(opc.nota ? {nota: opc.nota} : {}),
						em: new Date(agora).toISOString(),
					};
				}
			}
			for (const c of comentarios) {
				if (!PLATAFORMAS.includes(c as Plataforma)) throw new Error(`--comentario=${c}: use youtube, instagram ou youtube,instagram`);
				const n = pub[c as Plataforma];
				if (!n) throw new Error(`${i.nome}: marque ${c} como publicado antes do comentário`);
				n.comentario = true;
			}
			writeFileSync(join(pasta, 'publicacao', `${i.nome}.json`), `${JSON.stringify(pub, null, 2)}\n`);
			console.log(`${i.nome}: YT ${situacao(pub.youtube)} · IG ${situacao(pub.instagram)}`);
		}
		console.log(enviar(pasta, `fila: ${alvo.length === 1 ? alvo[0].nome : `${alvo.length} vídeos`}`) ? 'salvo no ramo dados (publicacao/)' : 'nada mudou');
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	const [comando, ...resto] = process.argv.slice(2);
	const {opc, pos} = opcoes(resto);
	try {
		if (!comando || comando.startsWith('--')) mostrar(agoraDe(opcoes(process.argv.slice(2)).opc));
		else if (comando === 'lote') montarLote(agoraDe(opc));
		else if (comando === 'marcar') marcar(pos, opc, agoraDe(opc));
		else throw new Error('comandos: (nada) | lote | marcar');
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	}
}
