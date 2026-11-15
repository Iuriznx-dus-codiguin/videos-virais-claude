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
//   npm run fila -- contas --instagram:historias=conta --instagram:avulso:como-funciona=conta
//                                              conta de destino de cada fluxo (publicacao/contas.json)
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
/** Dois vídeos do mesmo fluxo nunca saem com menos de 3 h entre eles. */
export const INTERVALO_MS = 3 * H;
/** No YouTube os dois fluxos dividem um canal só (Iuri, 15/11): dois vídeos quaisquer saem com pelo menos 1h30 entre eles. */
export const INTERVALO_CANAL_MS = 90 * 60_000;
/** Plataformas em que todos os fluxos postam na mesma conta. No Instagram cada fluxo tem a sua. */
const CANAL_UNICO: Record<Plataforma, boolean> = {youtube: true, instagram: false};
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

/** Horários possíveis a partir de um instante (UTC), em ordem, dizendo se é o último do dia. */
function* horariosDesde(inicio: number): Generator<{utc: number; ultimo: boolean}> {
	const b = brasilia(inicio);
	for (let dia = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()); ; dia += 24 * H) {
		const semana = new Date(dia).getUTCDay();
		const horas = semana === 0 || semana === 6 ? HORAS_FIM_DE_SEMANA : HORAS_SEMANA;
		for (const [i, hora] of horas.entries()) {
			const utc = dia + (hora + BRASILIA_H) * H;
			if (utc >= inicio) yield {utc, ultimo: i === horas.length - 1};
		}
	}
}

// ---------- plano do lote ----------

export type Acao = 'subir' | 'trocar' | 'conferir' | 'comentar';
export interface Tarefa {
	acao: Acao;
	/** Quando sai (ou saiu) nessa plataforma, UTC em ms. */
	horario: number;
	atrasado: boolean;
}
export interface Plano {
	item: ItemFila;
	/** O que fazer em cada plataforma neste lote (só as que têm algo a fazer). */
	tarefas: Partial<Record<Plataforma, Tarefa>>;
}

/**
 * Decide, plataforma por plataforma, quando cada vídeo sai e o que fazer. Cada plataforma tem a própria fila
 * (o YouTube pode estar em dia enquanto o Instagram está atrasado), e dentro dela cada fluxo anda na sua ordem.
 * - Já programado fica onde está; se o horário passou, conferir se saiu (e fixar o comentário); se a produção
 *   entregou outro vídeo depois (correção), trocar.
 * - No prazo: sai no horário combinado na entrega, se estiver livre.
 * - Atrasado (o horário passou ou falta menos de 90 min) ou horário ocupado: próximo horário livre do calendário
 *   (com os extras de 12h/15h/21h), sempre depois do vídeo anterior do mesmo fluxo e com 3 h entre eles.
 * - No YouTube (um canal para os dois fluxos) também 1h30 entre quaisquer dois vídeos: quando o horário já é de
 *   outro fluxo, este sai 1h30 depois (história 15h, Como Funciona 16h30), nunca depois do último horário do dia.
 *   Os fluxos se alternam na ordem em que foram entregues.
 * Os horários futuros só andam se não couberem depois dos atrasados.
 */
export const planejar = (itens: ItemFila[], agora: number): Plano[] => {
	const tarefas = new Map<string, Plano['tarefas']>();
	const ordem = [...itens].sort((a, b) => a.planejado.localeCompare(b.planejado) || a.serie.localeCompare(b.serie) || a.parte - b.parte);
	for (const p of PLATAFORMAS) {
		const ocupados: {horario: number; fluxo: string}[] = [];
		for (const i of ordem) if (i.publicacao[p]?.horario) ocupados.push({horario: Date.parse(i.publicacao[p]!.horario!), fluxo: i.fluxo});
		const livre = (h: number, fluxo: string) =>
			!ocupados.some((o) => (o.fluxo === fluxo && Math.abs(o.horario - h) < INTERVALO_MS) || (CANAL_UNICO[p] && Math.abs(o.horario - h) < INTERVALO_CANAL_MS));
		const anterior = new Map<string, number>();
		for (const item of ordem) {
			const n = item.publicacao[p];
			const combinado = Date.parse(item.planejado);
			const anotar = (acao: Acao, horario: number) => tarefas.set(item.nome, {...tarefas.get(item.nome), [p]: {acao, horario, atrasado: horario !== combinado}});
			if (n) {
				const h = n.horario ? Date.parse(n.horario) : combinado;
				anterior.set(item.fluxo, Math.max(anterior.get(item.fluxo) ?? -Infinity, h));
				if (n.status === 'programado') {
					if (h <= agora) anotar('conferir', h);
					else if (n.video && n.video !== item.video) anotar('trocar', h);
				} else if (n.status === 'publicado' && !n.comentario && item.textos.comentario && n.nota !== 'manual') anotar('comentar', h);
				continue;
			}
			const minimo = Math.max(agora + MARGEM_MS, (anterior.get(item.fluxo) ?? -Infinity) + INTERVALO_MS);
			let horario = combinado;
			const deOutroFluxo = (h: number) => ocupados.some((o) => o.fluxo !== item.fluxo && Math.abs(o.horario - h) < INTERVALO_CANAL_MS);
			if (combinado < minimo || !livre(combinado, item.fluxo)) {
				horario = minimo;
				for (const {utc: h, ultimo} of horariosDesde(minimo - INTERVALO_CANAL_MS)) {
					if (h >= minimo && livre(h, item.fluxo)) {
						horario = h;
						break;
					}
					const meia = h + INTERVALO_CANAL_MS;
					if (CANAL_UNICO[p] && !ultimo && deOutroFluxo(h) && meia >= minimo && livre(meia, item.fluxo)) {
						horario = meia;
						break;
					}
				}
			}
			ocupados.push({horario, fluxo: item.fluxo});
			anterior.set(item.fluxo, horario);
			anotar('subir', horario);
		}
	}
	const primeiro = (pl: Plano) => Math.min(...Object.values(pl.tarefas).map((t) => t!.horario));
	return itens
		.filter((i) => tarefas.has(i.nome))
		.map((item) => ({item, tarefas: tarefas.get(item.nome)!}))
		.sort((a, b) => primeiro(a) - primeiro(b) || a.item.nome.localeCompare(b.item.nome));
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

/** Hashtag de verdade tem pelo menos uma letra ("#21" do selo do Como Funciona não conta). */
const HASHTAG = /#(?=[\p{N}_]*\p{L})[\p{L}\p{N}_]+/gu;

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
	const tags = legendaInstagram.match(HASHTAG) ?? [];
	if (tags.length > LIMITE_HASHTAGS_IG) {
		avisos.push(`Instagram aceita ${LIMITE_HASHTAGS_IG} hashtags e a legenda tem ${tags.length}: ficaram as ${LIMITE_HASHTAGS_IG} primeiras`);
		for (const extra of tags.slice(LIMITE_HASHTAGS_IG)) legendaInstagram = legendaInstagram.replace(new RegExp(`\\s*${extra}(?![\\p{L}\\p{N}_])`, 'u'), '');
	}
	if ([...legendaInstagram].length > LIMITE_LEGENDA_IG) avisos.push(`legenda do Instagram com ${[...legendaInstagram].length} caracteres (máx. ${LIMITE_LEGENDA_IG}): encurte no texto de postagem do fluxo`);
	const tagsYoutube = [...new Set((descricaoYoutube.match(HASHTAG) ?? []).map((x) => x.slice(1)).filter((x) => x.toLowerCase() !== 'shorts'))];
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
const NOME_PLATAFORMA: Record<Plataforma, string> = {youtube: 'YouTube', instagram: 'Instagram'};
const situacao = (p?: NaPlataforma) => (!p ? '—' : `${p.status}${p.horario ? ` ${textoDoHorario(p.horario)}` : ''}${p.comentario ? ' +coment.' : ''}${p.nota ? ` (${p.nota})` : ''}`);
const vaiSubir = (t?: {acao: Acao}) => t?.acao === 'subir' || t?.acao === 'trocar';
const jaSaiu = (t?: {acao: Acao}) => t?.acao === 'conferir' || t?.acao === 'comentar';

/** Contas de destino de cada fluxo (publicacao/contas.json no ramo dados): {"instagram": {"historias": "conta", ...}}. */
interface Contas {
	youtube?: string;
	instagram?: Record<string, string>;
}
const lerContas = (pasta: string): Contas => {
	const arq = join(pasta, 'publicacao', 'contas.json');
	return existsSync(arq) ? lerJson<Contas>(arq) : {};
};

export const mostrar = (agora = Date.now()) => {
	const pasta = abrir();
	try {
		const itens = lerItens(pasta).sort((a, b) => a.planejado.localeCompare(b.planejado));
		if (!itens.length) return console.log('nenhum vídeo entregue no ramo dados');
		const planos = new Map(planejar(itens, agora).map((p) => [p.item.nome, p]));
		for (const i of itens) {
			const t = planos.get(i.nome)?.tarefas ?? {};
			const falta = PLATAFORMAS.filter((p) => t[p])
				.map((p) => `${p === 'youtube' ? 'YT' : 'IG'}: ${t[p]!.acao}${t[p]!.acao === 'subir' ? ` ${textoDoHorario(t[p]!.horario)}` : ''}`)
				.join(', ');
			console.log(`${textoDoHorario(i.planejado)}  ${i.nome.padEnd(22)}  YT ${situacao(i.publicacao.youtube).padEnd(28)} IG ${situacao(i.publicacao.instagram).padEnd(28)} → ${falta || 'nada a fazer'}`);
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

const horarioJson = (utc: number) => ({utc: new Date(utc).toISOString(), ...partesDoHorario(utc), texto: textoDoHorario(utc)});

export const montarLote = (agora = Date.now(), saida = join(RAIZ, 'out', 'lote')) => {
	const pasta = abrir();
	try {
		const planos = planejar(lerItens(pasta), agora);
		const contas = lerContas(pasta);
		// capas que faltam vão para publicacao/capas/ no ramo, para o navegador buscar pelo link direto
		git(pasta, 'sparse-checkout', 'add', '/publicacao/capas/');
		for (const p of planos.filter((x) => x.item.textos.segundoDaCapa !== undefined && PLATAFORMAS.some((pl) => vaiSubir(x.tarefas[pl])))) {
			const arq = join(pasta, 'publicacao', 'capas', `${p.item.nome}.jpg`);
			const marca = join(pasta, 'publicacao', 'capas', `${p.item.nome}.txt`);
			const assinatura = `${p.item.video} ${p.item.textos.segundoDaCapa}`;
			if (existsSync(arq) && existsSync(marca) && readFileSync(marca, 'utf8').trim() === assinatura) continue;
			if (tirarCapa(pasta, p.item, arq)) writeFileSync(marca, `${assinatura}\n`);
		}
		if (enviar(pasta, 'fila: capas do lote')) console.log('capas novas salvas no ramo dados (publicacao/capas/)');
		const commit = git(pasta, 'rev-parse', 'HEAD');
		const lote = planos.map(({item, tarefas}) => {
			const t = item.textos;
			const lim = conferirLimites(t);
			const yt = tarefas.youtube;
			const ig = tarefas.instagram;
			return {
				nome: item.nome,
				rotulo: t.rotulo,
				fluxo: item.fluxo,
				planejado: textoDoHorario(item.planejado),
				video: linkDireto(commit, `videos/${item.nome}.mp4`),
				capa: existsSync(join(pasta, 'publicacao', 'capas', `${item.nome}.jpg`)) ? linkDireto(commit, `publicacao/capas/${item.nome}.jpg`) : undefined,
				segundo_da_capa: t.segundoDaCapa,
				comentario: t.comentario,
				avisos: lim.avisos,
				youtube: yt && {acao: yt.acao, horario: horarioJson(yt.horario), atrasado: yt.atrasado, titulo: lim.tituloYoutube, descricao: lim.descricaoYoutube, tags: lim.tagsYoutube, playlist: t.playlist, relacionado: t.relacionado, atual: item.publicacao.youtube},
				instagram: ig && {acao: ig.acao, horario: horarioJson(ig.horario), atrasado: ig.atrasado, conta: contas.instagram?.[item.fluxo], legenda: lim.legendaInstagram, atual: item.publicacao.instagram},
			};
		});
		mkdirSync(saida, {recursive: true});
		writeFileSync(join(saida, 'lote.json'), `${JSON.stringify({gerado_em: new Date(agora).toISOString(), commit, itens: lote}, null, 2)}\n`);

		const linhas = [`# Lote de publicação (${textoDoHorario(agora)}, Brasília)`, ''];
		if (!lote.length) linhas.push('Nada a fazer: tudo entregue já está programado ou publicado.');
		const subir = lote.filter((l) => vaiSubir(l.youtube) || vaiSubir(l.instagram));
		for (const p of PLATAFORMAS) {
			const daqui = subir.filter((l) => vaiSubir(l[p])).sort((a, b) => a[p]!.horario.utc.localeCompare(b[p]!.horario.utc));
			if (!daqui.length) continue;
			linhas.push(`## ${NOME_PLATAFORMA[p]}: ${daqui.length} para programar`, '', '| Sai em | Vídeo |', '|---|---|');
			for (const l of daqui) {
				const t = l[p]!;
				const conta = p === 'instagram' && 'conta' in t && t.conta ? ` (@${t.conta})` : '';
				linhas.push(`| ${t.horario.texto}${t.atrasado ? ` (era ${l.planejado})` : ''} | ${l.rotulo}${conta}${t.acao === 'trocar' ? ' **trocar o programado**' : ''} |`);
			}
			linhas.push('');
		}
		const depois = lote.filter((l) => jaSaiu(l.youtube) || jaSaiu(l.instagram));
		if (depois.length) {
			linhas.push('## Já saíram: conferir e fixar o comentário', '');
			for (const l of depois) linhas.push(`- ${l.rotulo}: ${PLATAFORMAS.filter((p) => jaSaiu(l[p])).map((p) => `${NOME_PLATAFORMA[p]}, ${ROTULO_ACAO[l[p]!.acao]}`).join('; ')}`);
			linhas.push('');
		}
		linhas.push('## Textos', '');
		for (const l of subir) {
			linhas.push(`### ${l.rotulo}`, '');
			if (l.avisos.length) linhas.push(...l.avisos.map((a) => `> Aviso: ${a}`), '');
			if (vaiSubir(l.youtube)) {
				linhas.push(`**YouTube**, ${l.youtube!.horario.texto}`, '', `Título: ${l.youtube!.titulo}`, '', l.youtube!.descricao, '');
				linhas.push(`Playlist: ${l.youtube!.playlist ?? '—'} · Vídeo relacionado: ${l.youtube!.relacionado ?? '—'} · Capa: ${l.segundo_da_capa !== undefined ? `quadro de ${String(l.segundo_da_capa).replace('.', ',')} s` : 'a sugerida pela plataforma'}`, '');
			}
			if (vaiSubir(l.instagram)) linhas.push(`**Instagram**${l.instagram!.conta ? ` @${l.instagram!.conta}` : ''}, ${l.instagram!.horario.texto}`, '', l.instagram!.legenda, '');
			if (l.comentario) linhas.push(`**Comentário para fixar depois que sair:** ${l.comentario}`, '');
		}
		writeFileSync(join(saida, 'lote.md'), `${linhas.join('\n')}\n`);
		const conta = (p: Plataforma) => subir.filter((l) => vaiSubir(l[p])).length;
		console.log(`lote: YouTube ${conta('youtube')}, Instagram ${conta('instagram')} para programar; ${depois.length} para conferir/comentar → ${join(saida, 'lote.md')} e lote.json`);
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
		const arqLote = join(RAIZ, 'out', 'lote', 'lote.json');
		const lote = existsSync(arqLote) ? lerJson<{itens: ({nome: string} & Partial<Record<Plataforma, {horario: {utc: string}}>>)[]}>(arqLote).itens : [];
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
					} else if (!horario) horario = lote.find((l) => l.nome === i.nome)?.[p]?.horario.utc ?? (valor === 'publicado' && opc.nota === 'manual' ? i.planejado : undefined);
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

/** Guarda a conta de destino de cada fluxo: --instagram:historias=conta --instagram:avulso:como-funciona=conta --youtube=canal. */
export const definirContas = (opc: Record<string, string>) => {
	const pasta = abrir();
	try {
		const contas = lerContas(pasta);
		for (const [k, v] of Object.entries(opc)) {
			if (k === 'youtube') contas.youtube = v;
			else if (k.startsWith('instagram:')) contas.instagram = {...contas.instagram, [k.slice('instagram:'.length)]: v.replace(/^@/, '')};
		}
		mkdirSync(join(pasta, 'publicacao'), {recursive: true});
		writeFileSync(join(pasta, 'publicacao', 'contas.json'), `${JSON.stringify(contas, null, 2)}\n`);
		console.log(JSON.stringify(contas, null, 2));
		console.log(enviar(pasta, 'fila: contas de destino') ? 'salvo no ramo dados (publicacao/contas.json)' : 'nada mudou');
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
		else if (comando === 'contas') definirContas(opc);
		else throw new Error('comandos: (nada) | lote | marcar | contas');
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	}
}
