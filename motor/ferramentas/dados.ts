// Guarda o que muda de uma sessão para a outra (séries, estado, vídeos prontos) num ramo próprio
// do repositório, para o código em main ficar limpo e cada sessão nova começar lendo pouco.
//
// Ramo "dados":
//   series/<serie>/...            biblia.json, regras.md, estado.json, epNN.json, vozes/epNN.json, vozes/<personagem>.pt
//   videos/<serie>-epNN.mp4|.md   vídeo pronto e o texto para postar (a publicação é manual)
//
// Uso (a partir de motor/):
//   npx tsx ferramentas/dados.ts baixar                    copia series/ do ramo para public/series
//   npx tsx ferramentas/dados.ts salvar <serie> [...]      copia essas pastas de public/series para o ramo e envia [--juntei]
//   npx tsx ferramentas/dados.ts entregar <serie> <parte> --dia=2026-10-26 --hora=18:00
//   npx tsx ferramentas/dados.ts entregas                  mostra os vídeos guardados
//   npx tsx ferramentas/dados.ts recuperar-vozes <serie> [1-18]
//       traz do histórico do ramo o áudio das falas de partes antigas (o ramo só leva o dos 3 episódios
//       mais recentes); usado pelo filme do fim da minissérie (ferramentas/filme.ts)
//
// Trava contra sobrescrita: salvar e entregar trocam a pasta inteira da série no ramo. Se outra sessão
// salvou a mesma série depois do seu "baixar" (rodadas atrasadas que acordam juntas, uma correção feita
// em outra conversa), eles recusam, deixam a versão do ramo em out/dados-ramo/<serie>/ e pedem para
// juntar as duas e repetir o comando com --juntei.
//
// SHORTS_REMOTO troca o repositório de origem (usado pelos testes).
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';
import {PASTA_SERIES, RAIZ} from './lib/caminhos.ts';
import {VELOCIDADE_PADRAO} from './lib/velocidade.ts';
import {textosDoEpisodio} from './publicar/texto.ts';
import {carregarEpisodio, nomeEpisodio} from './validar.ts';
import {textoNaTela} from '../src/roteiro/legendas.ts';
import type {Biblia, Episodio, LinhaDoTempo} from '../src/roteiro/tipos.ts';

const RAMO = 'dados';
/** Brasília não tem horário de verão desde 2019: 18h lá são 21h UTC. */
const DESLOCAMENTO_BRASILIA_H = 3;

export interface ItemFila {
	serie: string;
	parte: number;
	dia: string;
	hora: string;
	/** Instante (UTC, ISO) combinado para postar. */
	publicar_apos: string;
	status: 'pendente';
}

const git = (cwd: string, ...args: string[]) =>
	execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();

const remoto = () => process.env.SHORTS_REMOTO ?? git(RAIZ, 'remote', 'get-url', 'origin');

/** Clone raso do ramo de dados numa pasta temporária (cria o ramo vazio se ainda não existir). */
const abrir = (): string => {
	const pasta = mkdtempSync(join(tmpdir(), 'shorts-dados-'));
	const url = remoto();
	const existe = git(pasta, 'ls-remote', '--heads', url, RAMO) !== '';
	if (existe) {
		execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', RAMO, url, pasta], {stdio: 'pipe'});
	} else {
		git(pasta, 'init', '--quiet', '-b', RAMO);
		git(pasta, 'remote', 'add', 'origin', url);
	}
	git(pasta, 'config', 'user.name', 'Rotina de Shorts');
	git(pasta, 'config', 'user.email', 'noreply@anthropic.com');
	return pasta;
};

const enviar = (pasta: string, mensagem: string) => {
	git(pasta, 'add', '-A');
	if (git(pasta, 'status', '--porcelain') === '') return false;
	git(pasta, 'commit', '--quiet', '-m', mensagem);
	for (let tentativa = 1; ; tentativa++) {
		try {
			git(pasta, 'push', '--quiet', '-u', 'origin', RAMO);
			return true;
		} catch (e) {
			if (tentativa >= 4) throw e;
			// alguém (outra série) enviou antes: junta e tenta de novo
			try {
				git(pasta, 'pull', '--quiet', '--rebase', 'origin', RAMO);
			} catch {
				git(pasta, 'rebase', '--abort');
				throw e;
			}
		}
	}
};

/**
 * O que esta sessão sabe do ramo: para cada série, o hash da pasta no ramo quando ela foi baixada (ou salva
 * por esta sessão), e o hash da versão deixada em out/dados-ramo/ quando houve conflito.
 */
interface BaseDados {
	series: Record<string, string>;
	pendentes: Record<string, string>;
}
const ARQUIVO_BASE = () => join(PASTA_SERIES, '.dados-base.json');
const lerBase = (): BaseDados => {
	try {
		return {series: {}, pendentes: {}, ...(JSON.parse(readFileSync(ARQUIVO_BASE(), 'utf8')) as Partial<BaseDados>)};
	} catch {
		return {series: {}, pendentes: {}};
	}
};
const gravarBase = (base: BaseDados) => {
	mkdirSync(PASTA_SERIES, {recursive: true});
	writeFileSync(ARQUIVO_BASE(), `${JSON.stringify(base, null, 2)}\n`);
};
/** Hash da pasta series/<serie> no ramo clonado ('' se ela ainda não existe lá). */
const hashNoRamo = (pasta: string, serie: string): string => {
	try {
		return git(pasta, 'rev-parse', `HEAD:series/${serie}`);
	} catch {
		return '';
	}
};

/**
 * Recusa trocar a pasta da série no ramo se ela mudou depois do baixar desta sessão (outra sessão salvou):
 * deixa a versão do ramo em out/dados-ramo/<serie>/ para juntar. Com --juntei, passa se o ramo
 * continua igual à versão deixada lá.
 */
const conferirBase = (pasta: string, series: string[], juntei: boolean) => {
	const base = lerBase();
	const conflitos: string[] = [];
	for (const s of series) {
		const atual = hashNoRamo(pasta, s);
		if (atual === '' || atual === base.series[s] || (juntei && atual === base.pendentes[s])) continue;
		const copia = join(RAIZ, 'out', 'dados-ramo', s);
		rmSync(copia, {recursive: true, force: true});
		mkdirSync(join(RAIZ, 'out', 'dados-ramo'), {recursive: true});
		cpSync(join(pasta, 'series', s), copia, {recursive: true});
		base.pendentes[s] = atual;
		conflitos.push(s);
	}
	if (!conflitos.length) return;
	gravarBase(base);
	const lista = conflitos.join(', ');
	throw new Error(
		[
			`PAROU para não apagar trabalho de outra sessão: ${lista} mudou no ramo ${RAMO} depois do seu "baixar" (ou esta pasta não veio do baixar).`,
			`A versão do ramo está em out/dados-ramo/${conflitos.length === 1 ? conflitos[0] : '<serie>'}/. Junte as duas em public/series/: episódios e vozes de cada uma, estado.json com o maior proxima_parte e o resumo do episódio mais novo, pauta.json com o status de cada item, regras de cada uma.`,
			'Depois rode o mesmo comando de novo com --juntei. Se você não mudou nada nessa pasta, rode "npm run dados -- baixar" em vez de salvar.',
		].join('\n'),
	);
};
/** Depois de enviar: a versão do ramo agora é a desta sessão. */
const atualizarBase = (pasta: string, series: string[]) => {
	const base = lerBase();
	for (const s of series) {
		base.series[s] = hashNoRamo(pasta, s);
		delete base.pendentes[s];
	}
	gravarBase(base);
};

/** Episódios recentes cujo áudio de falas viaja entre sessões (correção do dia e a parte seguinte). */
const EPISODIOS_COM_AUDIO = 3;

/** Chaves (nome sem extensão) dos áudios em vozes/cache usados pelos episódios mais recentes da série. */
const audiosRecentes = (pastaSerie: string): Set<string> => {
	const dir = join(pastaSerie, 'vozes');
	const usados = new Set<string>();
	if (!existsSync(dir)) return usados;
	const eps = readdirSync(dir)
		.map((n) => /^ep(\d+)\.json$/.exec(n))
		.filter((m): m is RegExpExecArray => m !== null)
		.sort((a, b) => Number(b[1]) - Number(a[1]))
		.slice(0, EPISODIOS_COM_AUDIO);
	for (const m of eps) {
		const al = JSON.parse(readFileSync(join(dir, m[0]), 'utf8')) as Record<string, {audio?: string}>;
		for (const f of Object.values(al)) if (f.audio) usados.add(basename(f.audio).replace(/\.wav$/, ''));
	}
	return usados;
};

/**
 * Copia a série levando do cache de vozes só o áudio tratado (e o alinhamento) dos episódios
 * recentes: assim uma correção regenera só as falas que mudaram. O resto do cache se refaz do roteiro e do .pt.
 */
const substituir = (de: string, para: string) => {
	rmSync(para, {recursive: true, force: true});
	if (!existsSync(de)) return;
	const usados = audiosRecentes(de);
	cpSync(de, para, {
		recursive: true,
		filter: (origem) => {
			if (/\.bruto\.wav$/.test(origem)) return false;
			const m = /[\\/]vozes[\\/]cache[\\/]([^\\/]+)\.(wav|json)$/.exec(origem);
			if (m) return usados.has(m[1]);
			return !/[\\/]vozes[\\/]cache[\\/]/.test(origem);
		},
	});
};

export const baixar = () => {
	const pasta = abrir();
	try {
		const origem = join(pasta, 'series');
		if (!existsSync(origem)) return console.log('ramo de dados ainda sem séries; nada a baixar');
		mkdirSync(PASTA_SERIES, {recursive: true});
		const base: BaseDados = {series: {}, pendentes: {}};
		for (const s of readdirSync(origem)) {
			substituir(join(origem, s), join(PASTA_SERIES, s));
			base.series[s] = hashNoRamo(pasta, s);
		}
		gravarBase(base);
		console.log(`séries baixadas: ${readdirSync(origem).join(', ')}`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

export const salvar = (series: string[], juntei = false) => {
	const pasta = abrir();
	try {
		// sem nomes, salvaria as pastas de todos os fluxos (histórias e Como Funciona) e uma sessão
		// sobrescreveria o trabalho da outra
		if (!series.length) throw new Error('Diga quais pastas salvar, ex.: salvar voo-818 _historias');
		const alvo = series;
		for (const s of alvo) if (!existsSync(join(PASTA_SERIES, s))) throw new Error(`Série ${s} não existe em public/series`);
		conferirBase(pasta, alvo, juntei);
		for (const s of alvo) substituir(join(PASTA_SERIES, s), join(pasta, 'series', s));
		const enviou = enviar(pasta, `dados: ${alvo.join(', ')}`);
		atualizarBase(pasta, alvo);
		console.log(enviou ? `salvo no ramo ${RAMO}: ${alvo.join(', ')}` : 'nada mudou');
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

export const instanteDaPublicacao = (dia: string, hora: string): string => {
	const [h, m] = hora.split(':').map(Number);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !Number.isInteger(h) || !Number.isInteger(m)) throw new Error(`Dia/hora inválidos: ${dia} ${hora} (use AAAA-MM-DD e HH:MM)`);
	const [a, mes, d] = dia.split('-').map(Number);
	return new Date(Date.UTC(a, mes - 1, d, h + DESLOCAMENTO_BRASILIA_H, m)).toISOString();
};

/** Vídeos prontos ficam no ramo por este tempo; depois são apagados (o histórico do git guarda, mas não se paga por isso a cada sessão). */
const DIAS_GUARDADOS = 10;

/**
 * Entrega um episódio pronto: guarda o vídeo e o texto de publicação no ramo de dados (pasta videos/)
 * e a série (estado, roteiro, regras). A publicação é manual: o Iuri baixa o vídeo e posta.
 */
export const entregar = (serie: string, parte: number, dia: string, hora: string, video?: string, semVoz = false, juntei = false) => {
	if (!semVoz && !existsSync(join(PASTA_SERIES, serie, 'vozes', `${nomeEpisodio(parte)}.json`))) {
		throw new Error(`A parte ${parte} de ${serie} ainda não tem voz (falta public/series/${serie}/vozes/${nomeEpisodio(parte)}.json). Rode npm run vozes antes, ou use --sem-voz só para teste.`);
	}
	const arquivo = video ?? join(RAIZ, 'out', `${serie}-${nomeEpisodio(parte)}.mp4`);
	if (!existsSync(arquivo)) throw new Error(`Não achei o vídeo ${arquivo}. Rode o render antes.`);
	const biblia = JSON.parse(readFileSync(join(PASTA_SERIES, serie, 'biblia.json'), 'utf8')) as Biblia;
	const ep = JSON.parse(readFileSync(join(PASTA_SERIES, serie, `${nomeEpisodio(parte)}.json`), 'utf8')) as Episodio;
	const t = textosDoEpisodio(biblia, ep);
	const capa = ep.postagem?.capa !== undefined ? capaDoEpisodio(serie, parte) : undefined;
	const pasta = abrir();
	try {
		conferirBase(pasta, [serie], juntei);
		const nome = `${serie}-${nomeEpisodio(parte)}`;
		const dir = join(pasta, 'videos');
		mkdirSync(dir, {recursive: true});
		const limite = Date.now() - DIAS_GUARDADOS * 86_400_000;
		for (const n of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
			const velho = JSON.parse(readFileSync(join(dir, n), 'utf8')) as ItemFila;
			if (Date.parse(`${velho.dia}T12:00:00Z`) < limite) for (const ext of ['json', 'mp4', 'md']) rmSync(join(dir, n.replace(/json$/, ext)), {force: true});
		}
		cpSync(arquivo, join(dir, `${nome}.mp4`));
		const item: ItemFila = {serie, parte, dia, hora, publicar_apos: instanteDaPublicacao(dia, hora), status: 'pendente'};
		writeFileSync(join(dir, `${nome}.json`), `${JSON.stringify(item, null, 2)}\n`);
		writeFileSync(
			join(dir, `${nome}.md`),
			[
				biblia.formato === 'avulso' ? `# ${biblia.titulo} #${parte}: ${ep.titulo}` : `# ${biblia.titulo} · Parte ${parte}: ${ep.titulo}`,
				'',
				`**Postar em ${dia.split('-').reverse().join('/')} às ${hora} (Brasília)** · vídeo: ${nome}.mp4`,
				'',
				'## YouTube Shorts',
				`Título: ${t.tituloYoutube}`,
				'',
				t.descricaoYoutube,
				'',
				'## Instagram Reels',
				t.legendaInstagram,
				'',
				'## Na hora de postar',
				`- Capa (nas duas): ${capa ?? 'escolha um close claro do personagem ou o quadro do gancho, nunca um quadro escuro ou de transição'}.`,
				...(t.relacionado ? [`- YouTube, "Vídeo relacionado": ${t.relacionado}.`] : []),
				`- YouTube, playlist: ${t.playlist}.`,
				...(t.comentarioFixado ? [`- Comentário para postar e fixar nas duas, logo depois de publicar: ${t.comentarioFixado}`] : []),
				'',
			].join('\n'),
		);
		substituir(join(PASTA_SERIES, serie), join(pasta, 'series', serie));
		enviar(pasta, `entrega: ${nome} para ${dia} ${hora}`);
		atualizarBase(pasta, [serie]);
		console.log(`entregue: ${nome} (postar ${dia} ${hora}); vídeo e texto no ramo ${RAMO}, pasta videos/`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

/** Onde fica a capa no vídeo entregue: o segundo (já acelerado, como o Iuri vê no app) e a palavra da legenda naquele momento. */
const ondeEstaCapa = (linha: LinhaDoTempo) => {
	if (linha.capa === undefined) return undefined;
	const t = linha.capa;
	const palavras = linha.falas.flatMap((f) => f.palavras);
	const naHora = palavras.filter((p) => p.ini <= t + 0.05).at(-1);
	const segundos = `${(t / VELOCIDADE_PADRAO).toFixed(1).replace('.', ',')} s do vídeo`;
	return naHora ? `quadro de ${segundos}, quando a legenda mostra "${textoNaTela(naHora.texto)}"` : `quadro de ${segundos}`;
};

/** A capa é só um lembrete no texto de postagem: se o episódio não resolver, a entrega segue sem ela. */
const capaDoEpisodio = (serie: string, parte: number) => {
	try {
		return ondeEstaCapa(carregarEpisodio(serie, parte).linha);
	} catch (e) {
		console.warn(`aviso: não deu para achar o quadro da capa (${e instanceof Error ? e.message : e})`);
		return undefined;
	}
};

/**
 * Áudio das falas de partes antigas. O ramo leva só o áudio dos episódios recentes (EPISODIOS_COM_AUDIO),
 * mas o histórico dele guarda todos: cada arquivo do cache saiu num commit e está inteiro no commit
 * anterior. Clona o ramo sem conteúdo (só a lista de arquivos de cada commit, rápido), acha onde cada
 * arquivo que falta estava e baixa só esses, de uma vez. São os mesmos arquivos do vídeo entregue:
 * nada é gerado de novo. Devolve o que não achou.
 */
export const recuperarVozes = (serie: string, partes: number[]): {recuperados: number; faltando: string[]} => {
	const publico = join(PASTA_SERIES, '..');
	const faltam = new Set<string>();
	for (const p of partes) {
		const arq = join(PASTA_SERIES, serie, 'vozes', `${nomeEpisodio(p)}.json`);
		if (!existsSync(arq)) continue;
		const al = JSON.parse(readFileSync(arq, 'utf8')) as Record<string, {audio?: string}>;
		for (const f of Object.values(al)) {
			if (!f.audio) continue;
			for (const rel of [f.audio, f.audio.replace(/\.wav$/, '.json')]) if (!existsSync(join(publico, rel))) faltam.add(rel);
		}
	}
	if (!faltam.size) return {recuperados: 0, faltando: []};
	const pasta = mkdtempSync(join(tmpdir(), 'shorts-historico-'));
	try {
		execFileSync('git', ['clone', '--quiet', '--filter=blob:none', '--no-checkout', '--single-branch', '--branch', RAMO, remoto(), pasta], {stdio: 'pipe'});
		// commits que apagaram arquivos do cache (do mais novo para o mais velho): o arquivo está no pai
		const apagadoEm = new Map<string, string>();
		let commit = '';
		for (const l of git(pasta, 'log', '--format=>%H', '--name-only', '--diff-filter=D', '--', `series/${serie}/vozes/cache/`).split('\n')) {
			if (l.startsWith('>')) commit = l.slice(1);
			else if (l.trim() && !apagadoEm.has(l.trim())) apagadoEm.set(l.trim(), commit);
		}
		const objetos = new Map<string, string>();
		for (const rel of faltam) {
			const onde = apagadoEm.has(rel) ? `${apagadoEm.get(rel)}^` : 'HEAD';
			try {
				objetos.set(rel, git(pasta, 'rev-parse', '--verify', '--quiet', `${onde}:${rel}`));
			} catch {
				// nunca esteve no ramo (voz gerada e não salva): fica na lista do que falta
			}
		}
		const ids = [...new Set(objetos.values())];
		for (let i = 0; i < ids.length; i += 200) {
			execFileSync('git', ['-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '--quiet', '--no-tags', '--no-write-fetch-head', '--filter=blob:none', 'origin', ...ids.slice(i, i + 200)], {cwd: pasta, stdio: 'pipe'});
		}
		for (const [rel, id] of objetos) {
			const destino = join(publico, rel);
			mkdirSync(join(destino, '..'), {recursive: true});
			writeFileSync(destino, execFileSync('git', ['cat-file', 'blob', id], {cwd: pasta, maxBuffer: 256 * 1024 * 1024}));
		}
		return {recuperados: objetos.size, faltando: [...faltam].filter((rel) => !objetos.has(rel))};
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

/** "1-18", "3,5,7-9" → [1, 2, ...]. */
export const lerPartes = (texto: string): number[] => {
	const partes = new Set<number>();
	for (const pedaco of texto.split(',')) {
		const [a, b] = pedaco.split('-').map((x) => Number(x.trim()));
		if (!Number.isInteger(a) || (b !== undefined && !Number.isInteger(b))) throw new Error(`partes "${texto}" inválidas (use 1-18 ou 1,2,5)`);
		for (let p = a; p <= (b ?? a); p++) partes.add(p);
	}
	return [...partes].sort((x, y) => x - y);
};

export const mostrarEntregas = () => {
	const pasta = abrir();
	try {
		const dir = join(pasta, 'videos');
		const itens = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')) as ItemFila) : [];
		if (!itens.length) return console.log('nenhuma entrega guardada');
		for (const i of itens.sort((a, b) => a.publicar_apos.localeCompare(b.publicar_apos))) console.log(`${i.dia} ${i.hora}  ${i.serie} parte ${i.parte}`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	const [comando, ...resto] = process.argv.slice(2);
	const opc = Object.fromEntries(resto.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
	const pos = resto.filter((a) => !a.startsWith('--'));
	try {
		if (comando === 'baixar') baixar();
		else if (comando === 'salvar') salvar(pos, 'juntei' in opc);
		else if (comando === 'entregar') {
			if (pos.length < 2 || !opc.dia || !opc.hora) throw new Error('uso: entregar <serie> <parte> --dia=AAAA-MM-DD --hora=HH:MM [--video=arquivo.mp4] [--sem-voz] [--juntei]');
			entregar(pos[0], Number(pos[1]), opc.dia, opc.hora, opc.video, 'sem-voz' in opc, 'juntei' in opc);
		} else if (comando === 'entregas') mostrarEntregas();
		else if (comando === 'recuperar-vozes') {
			if (!pos[0]) throw new Error('uso: recuperar-vozes <serie> [partes, ex.: 1-18]');
			const todas = readdirSync(join(PASTA_SERIES, pos[0])).map((n) => /^ep(\d+)\.json$/.exec(n)?.[1]).filter((n): n is string => !!n).map(Number);
			const r = recuperarVozes(pos[0], pos[1] ? lerPartes(pos[1]) : todas);
			console.log(`áudios recuperados do histórico: ${r.recuperados}`);
			if (r.faltando.length) console.log(`não estão no histórico (${r.faltando.length}): ${r.faltando.slice(0, 8).join(', ')}${r.faltando.length > 8 ? '...' : ''}`);
		} else throw new Error('comandos: baixar | salvar | entregar | entregas | recuperar-vozes');
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	}
}
