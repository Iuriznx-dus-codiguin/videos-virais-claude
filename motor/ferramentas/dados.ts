// Guarda o que muda de uma sessão para a outra (séries, estado, vídeos prontos) num ramo próprio
// do repositório, para o código em main ficar limpo e cada sessão nova começar lendo pouco.
//
// Ramo "dados":
//   series/<serie>/...            biblia.json, regras.md, estado.json, epNN.json, vozes/epNN.json, vozes/<personagem>.pt
//   videos/<serie>-epNN.mp4|.md   vídeo pronto e o texto para postar (a publicação é manual)
//
// Uso (a partir de motor/):
//   npx tsx ferramentas/dados.ts baixar                    copia series/ do ramo para public/series
//   npx tsx ferramentas/dados.ts salvar <serie> [...]      copia essas pastas de public/series para o ramo e envia
//   npx tsx ferramentas/dados.ts entregar <serie> <parte> --dia=2026-10-26 --hora=18:00
//   npx tsx ferramentas/dados.ts entregas                  mostra os vídeos guardados
//
// SHORTS_REMOTO troca o repositório de origem (usado pelos testes).
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';
import {PASTA_SERIES, RAIZ} from './lib/caminhos.ts';
import {textosDoEpisodio} from './publicar/texto.ts';
import {nomeEpisodio} from './validar.ts';
import type {Biblia, Episodio} from '../src/roteiro/tipos.ts';

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
		for (const s of readdirSync(origem)) substituir(join(origem, s), join(PASTA_SERIES, s));
		console.log(`séries baixadas: ${readdirSync(origem).join(', ')}`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

export const salvar = (series: string[]) => {
	const pasta = abrir();
	try {
		// sem nomes, salvaria as pastas de todos os fluxos (histórias e Como Funciona) e uma sessão
		// sobrescreveria o trabalho da outra
		if (!series.length) throw new Error('Diga quais pastas salvar, ex.: salvar voo-818 _historias');
		const alvo = series;
		for (const s of alvo) {
			if (!existsSync(join(PASTA_SERIES, s))) throw new Error(`Série ${s} não existe em public/series`);
			substituir(join(PASTA_SERIES, s), join(pasta, 'series', s));
		}
		console.log(enviar(pasta, `dados: ${alvo.join(', ')}`) ? `salvo no ramo ${RAMO}: ${alvo.join(', ')}` : 'nada mudou');
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
export const entregar = (serie: string, parte: number, dia: string, hora: string, video?: string, semVoz = false) => {
	if (!semVoz && !existsSync(join(PASTA_SERIES, serie, 'vozes', `${nomeEpisodio(parte)}.json`))) {
		throw new Error(`A parte ${parte} de ${serie} ainda não tem voz (falta public/series/${serie}/vozes/${nomeEpisodio(parte)}.json). Rode npm run vozes antes, ou use --sem-voz só para teste.`);
	}
	const arquivo = video ?? join(RAIZ, 'out', `${serie}-${nomeEpisodio(parte)}.mp4`);
	if (!existsSync(arquivo)) throw new Error(`Não achei o vídeo ${arquivo}. Rode o render antes.`);
	const biblia = JSON.parse(readFileSync(join(PASTA_SERIES, serie, 'biblia.json'), 'utf8')) as Biblia;
	const ep = JSON.parse(readFileSync(join(PASTA_SERIES, serie, `${nomeEpisodio(parte)}.json`), 'utf8')) as Episodio;
	const t = textosDoEpisodio(biblia, ep);
	const pasta = abrir();
	try {
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
			].join('\n'),
		);
		substituir(join(PASTA_SERIES, serie), join(pasta, 'series', serie));
		enviar(pasta, `entrega: ${nome} para ${dia} ${hora}`);
		console.log(`entregue: ${nome} (postar ${dia} ${hora}); vídeo e texto no ramo ${RAMO}, pasta videos/`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
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
		else if (comando === 'salvar') salvar(pos);
		else if (comando === 'entregar') {
			if (pos.length < 2 || !opc.dia || !opc.hora) throw new Error('uso: entregar <serie> <parte> --dia=AAAA-MM-DD --hora=HH:MM [--video=arquivo.mp4] [--sem-voz]');
			entregar(pos[0], Number(pos[1]), opc.dia, opc.hora, opc.video, 'sem-voz' in opc);
		} else if (comando === 'entregas') mostrarEntregas();
		else throw new Error('comandos: baixar | salvar | entregar | entregas');
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	}
}
