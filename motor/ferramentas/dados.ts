// Guarda o que muda de uma sessão para a outra (séries, estado, fila de vídeos) num ramo próprio
// do repositório, para o código em main ficar limpo e cada sessão nova começar lendo pouco.
//
// Ramo "dados":
//   series/<serie>/...            biblia.json, regras.md, estado.json, epNN.json, vozes/epNN.json
//   fila/<serie>-epNN.json|.mp4   vídeo pronto esperando a hora de publicar
//
// Uso (a partir de motor/):
//   npx tsx ferramentas/dados.ts baixar                    copia series/ do ramo para public/series
//   npx tsx ferramentas/dados.ts salvar [<serie>...]       copia public/series para o ramo e envia
//   npx tsx ferramentas/dados.ts enfileirar <serie> <parte> --dia=2026-10-26 --hora=18:00
//   npx tsx ferramentas/dados.ts publicar-pendentes [--agora=ISO]
//   npx tsx ferramentas/dados.ts fila                      mostra o que está esperando
//
// SHORTS_REMOTO troca o repositório de origem (usado pelos testes).
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PASTA_SERIES, RAIZ} from './lib/caminhos.ts';
import {nomeEpisodio} from './validar.ts';

const RAMO = 'dados';
/** Brasília não tem horário de verão desde 2019: 18h lá são 21h UTC. */
const DESLOCAMENTO_BRASILIA_H = 3;

export interface ItemFila {
	serie: string;
	parte: number;
	dia: string;
	hora: string;
	/** Instante (UTC, ISO) a partir do qual pode publicar. */
	publicar_apos: string;
	status: 'pendente' | 'publicado';
	publicado_em?: string;
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

const substituir = (de: string, para: string) => {
	rmSync(para, {recursive: true, force: true});
	if (existsSync(de)) cpSync(de, para, {recursive: true});
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
		const alvo = series.length ? series : readdirSync(PASTA_SERIES);
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

export const enfileirar = (serie: string, parte: number, dia: string, hora: string, video?: string, semVoz = false) => {
	if (!semVoz && !existsSync(join(PASTA_SERIES, serie, 'vozes', `${nomeEpisodio(parte)}.json`))) {
		throw new Error(`A parte ${parte} de ${serie} ainda não tem voz (falta public/series/${serie}/vozes/${nomeEpisodio(parte)}.json). Rode npm run vozes antes, ou use --sem-voz só para teste.`);
	}
	const arquivo = video ?? join(RAIZ, 'out', `${serie}-${nomeEpisodio(parte)}.mp4`);
	if (!existsSync(arquivo)) throw new Error(`Não achei o vídeo ${arquivo}. Rode o render antes.`);
	const pasta = abrir();
	try {
		const nome = `${serie}-${nomeEpisodio(parte)}`;
		mkdirSync(join(pasta, 'fila'), {recursive: true});
		cpSync(arquivo, join(pasta, 'fila', `${nome}.mp4`));
		const item: ItemFila = {serie, parte, dia, hora, publicar_apos: instanteDaPublicacao(dia, hora), status: 'pendente'};
		writeFileSync(join(pasta, 'fila', `${nome}.json`), `${JSON.stringify(item, null, 2)}\n`);
		// o ramo guarda também a série (estado, roteiro, vozes) para a rotina de publicação enxergar tudo
		substituir(join(PASTA_SERIES, serie), join(pasta, 'series', serie));
		enviar(pasta, `fila: ${nome} para ${dia} ${hora}`);
		console.log(`na fila: ${nome} (publica a partir de ${item.publicar_apos})`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

const lerFila = (pasta: string): ItemFila[] => {
	const dir = join(pasta, 'fila');
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((n) => n.endsWith('.json'))
		.map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')) as ItemFila)
		.sort((a, b) => a.publicar_apos.localeCompare(b.publicar_apos));
};

export const mostrarFila = () => {
	const pasta = abrir();
	try {
		const fila = lerFila(pasta);
		if (!fila.length) return console.log('fila vazia');
		for (const i of fila) console.log(`${i.status.padEnd(9)} ${i.serie} parte ${i.parte}  ${i.dia} ${i.hora}`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

export const publicarPendentes = (agora: Date) => {
	const pasta = abrir();
	let falhas = 0;
	try {
		const prontos = lerFila(pasta).filter((i) => i.status === 'pendente' && new Date(i.publicar_apos) <= agora);
		if (!prontos.length) return console.log('nada para publicar agora');
		// o publicar.ts trabalha em public/series: usa a cópia do ramo, que tem estado e roteiro de cada série
		for (const s of new Set(prontos.map((i) => i.serie))) substituir(join(pasta, 'series', s), join(PASTA_SERIES, s));
		for (const i of prontos) {
			const nome = `${i.serie}-${nomeEpisodio(i.parte)}`;
			const video = join(pasta, 'fila', `${nome}.mp4`);
			console.log(`\n== publicando ${nome} ==`);
			try {
				execFileSync('npx', ['tsx', join(import.meta.dirname, 'publicar.ts'), i.serie, String(i.parte), `--video=${video}`], {stdio: 'inherit', cwd: import.meta.dirname, env: process.env});
			} catch {
				falhas++;
				console.error(`FALHOU: ${nome} continua pendente (o que já foi publicado em cada rede fica no estado e não se repete)`);
			}
			// o publicar.ts grava o resultado parcial no estado mesmo quando uma rede falha
			substituir(join(PASTA_SERIES, i.serie), join(pasta, 'series', i.serie));
			const publicado = JSON.parse(readFileSync(join(pasta, 'series', i.serie, 'estado.json'), 'utf8')).publicados?.[String(i.parte)];
			if (publicado?.youtube && publicado?.instagram) {
				i.status = 'publicado';
				i.publicado_em = agora.toISOString();
				writeFileSync(join(pasta, 'fila', `${nome}.json`), `${JSON.stringify(i, null, 2)}\n`);
				rmSync(video, {force: true});
			}
		}
		enviar(pasta, `publicado: ${prontos.map((i) => `${i.serie}-${nomeEpisodio(i.parte)}`).join(', ')}`);
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
	if (falhas) process.exit(1);
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	const [comando, ...resto] = process.argv.slice(2);
	const opc = Object.fromEntries(resto.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
	const pos = resto.filter((a) => !a.startsWith('--'));
	try {
		if (comando === 'baixar') baixar();
		else if (comando === 'salvar') salvar(pos);
		else if (comando === 'enfileirar') {
			if (pos.length < 2 || !opc.dia || !opc.hora) throw new Error('uso: enfileirar <serie> <parte> --dia=AAAA-MM-DD --hora=HH:MM [--video=arquivo.mp4]');
			enfileirar(pos[0], Number(pos[1]), opc.dia, opc.hora, opc.video, 'sem-voz' in opc);
		} else if (comando === 'publicar-pendentes') publicarPendentes(opc.agora ? new Date(opc.agora) : new Date());
		else if (comando === 'fila') mostrarFila();
		else throw new Error('comandos: baixar | salvar | enfileirar | publicar-pendentes | fila');
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	}
}
