// Filme do fim da minissérie (só o fluxo de histórias; o Como Funciona não tem filme): renderiza cada
// parte de novo em 16:9, sem a chamada "COMENTA PARTE N", e junta todas num vídeo só, com um capítulo
// por parte. Mesmo roteiro, mesmas vozes (o áudio de partes antigas volta do histórico do ramo dados),
// mesma produção, qualidade média e 1.1x como os episódios (ver src/filme.ts e ferramentas/render.ts).
//
// Uso: npm run filme -- <serie> [--partes=1-18] [--pasta=/mnt/project-files/<serie>/filme] [--sem-legenda]
//                       [--refazer=3,5|tudo] [--so-juntar]
//
// Retomável: cada parte pronta fica em <pasta>/partes/ com um .json do que entrou nela (roteiro, vozes,
// personagens). Rodando de novo, só renderiza o que falta ou o que mudou (uma correção numa parte) e
// junta de novo. Por isso a pasta deve ser uma que sobrevive à sessão (/mnt/project-files/...).
// A primeira parte da lista abre com o título da série e a última fecha com "FIM".
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {PASTA_SERIES, RAIZ} from './lib/caminhos.ts';
import {VELOCIDADE_PADRAO} from './lib/velocidade.ts';
import {lerPartes, recuperarVozes} from './dados.ts';
import {nomeEpisodio} from './validar.ts';
import type {Biblia, Episodio} from '../src/roteiro/tipos.ts';

/** Muda quando o jeito de montar a parte do filme muda (força refazer as partes guardadas). */
const VERSAO_PARTE = 1;

interface InfoParte {
	parte: number;
	titulo: string;
	assinatura: string;
	duracao: number;
	mb: number;
	feito: string;
}

const lerJson = <T>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;

const duracaoDe = (arquivo: string) => {
	const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo], {encoding: 'utf8'});
	return Number(r.stdout.trim());
};

/** 754.3 → "12:34"; 3754 → "1:02:34" (formato dos capítulos do YouTube). */
const relogio = (s: number) => {
	const t = Math.floor(s);
	const h = Math.floor(t / 3600);
	const m = Math.floor((t % 3600) / 60);
	const ss = String(t % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const main = () => {
	const args = process.argv.slice(2);
	const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('='))) as Record<string, string | undefined>;
	const [serie] = args.filter((a) => !a.startsWith('--'));
	if (!serie) {
		console.error('uso: npm run filme -- <serie> [--partes=1-18] [--pasta=/mnt/project-files/<serie>/filme] [--sem-legenda] [--refazer=3,5|tudo] [--so-juntar]');
		process.exit(2);
	}
	const pastaSerie = join(PASTA_SERIES, serie);
	if (!existsSync(join(pastaSerie, 'biblia.json'))) throw new Error(`Série ${serie} não existe em public/series (rode npm run dados -- baixar)`);
	const biblia = lerJson<Biblia>(join(pastaSerie, 'biblia.json'));
	if ((biblia.formato ?? 'serie') === 'avulso') throw new Error(`${serie} é de vídeos avulsos (Como Funciona): o filme é só para minisséries de histórias.`);

	const todas = readdirSync(pastaSerie)
		.map((n) => /^ep(\d+)\.json$/.exec(n)?.[1])
		.filter((n): n is string => !!n)
		.map(Number)
		.sort((a, b) => a - b);
	const partes = opc.partes ? lerPartes(opc.partes) : todas;
	const semEpisodio = partes.filter((p) => !todas.includes(p));
	if (semEpisodio.length) throw new Error(`Não achei o roteiro das partes ${semEpisodio.join(', ')} em public/series/${serie}.`);
	const semVoz = partes.filter((p) => !existsSync(join(pastaSerie, 'vozes', `${nomeEpisodio(p)}.json`)));
	if (semVoz.length) {
		throw new Error(
			`${semVoz.length === 1 ? `A parte ${semVoz[0]} ainda não tem voz` : `As partes ${semVoz.join(', ')} ainda não têm voz`} (rascunho?). O filme junta só partes prontas: produza antes ou escolha as partes com --partes=${partes[0]}-${Math.min(...semVoz) - 1}.`,
		);
	}

	// áudio das falas: o ramo dados só leva o dos episódios recentes; o resto volta do histórico
	const r = recuperarVozes(serie, partes);
	if (r.recuperados) console.log(`áudio de ${r.recuperados} arquivos de falas recuperado do histórico do ramo dados`);
	if (r.faltando.length) {
		const eps = partes.filter((p) => {
			const al = lerJson<Record<string, {audio?: string}>>(join(pastaSerie, 'vozes', `${nomeEpisodio(p)}.json`));
			return Object.values(al).some((f) => f.audio && r.faltando.includes(f.audio));
		});
		throw new Error(
			`Faltam áudios de falas que não estão no histórico (partes ${eps.join(', ')}). Gere com npm run vozes -- ${serie} <parte> para cada uma (todas as vozes antes de qualquer render) e rode o filme de novo.`,
		);
	}

	const pasta = resolve(opc.pasta ?? join(RAIZ, 'out', 'filme', serie));
	const pastaPartes = join(pasta, 'partes');
	const local = join(RAIZ, 'out', 'filme', serie);
	mkdirSync(pastaPartes, {recursive: true});
	mkdirSync(join(local, 'partes'), {recursive: true});
	const refazer = opc.refazer === 'tudo' ? new Set(partes) : new Set(opc.refazer ? lerPartes(opc.refazer) : []);
	const semLegenda = 'sem-legenda' in opc;
	const personagens = JSON.stringify({titulo: biblia.titulo, personagens: biblia.personagens});

	const prontas: {parte: number; arquivo: string; info: InfoParte}[] = [];
	const aFazer: number[] = [];
	const assinaturas = new Map<number, string>();
	for (const [i, p] of partes.entries()) {
		const primeira = i === 0;
		const ultima = i === partes.length - 1;
		// o que muda o vídeo da parte: roteiro, vozes, personagens e o lugar dela no filme
		// (a bíblia inteira não: os fatos e ganchos crescem a cada parte nova)
		const assinatura = createHash('sha256')
			.update(readFileSync(join(pastaSerie, `${nomeEpisodio(p)}.json`)))
			.update(readFileSync(join(pastaSerie, 'vozes', `${nomeEpisodio(p)}.json`)))
			.update(personagens)
			.update(JSON.stringify({primeira, ultima, semLegenda, velocidade: VELOCIDADE_PADRAO, VERSAO_PARTE}))
			.digest('hex')
			.slice(0, 16);
		assinaturas.set(p, assinatura);
		const arquivo = join(pastaPartes, `${serie}-filme-${nomeEpisodio(p)}.mp4`);
		const arqInfo = arquivo.replace(/\.mp4$/, '.json');
		const info = existsSync(arqInfo) && existsSync(arquivo) ? lerJson<InfoParte>(arqInfo) : null;
		if (info && info.assinatura === assinatura && !refazer.has(p)) prontas.push({parte: p, arquivo, info});
		else aFazer.push(p);
	}
	console.log(`filme de ${serie}: ${partes.length} partes (${partes[0]} a ${partes.at(-1)}); prontas ${prontas.length}, a renderizar ${aFazer.length}`);
	if (aFazer.length && 'so-juntar' in opc) throw new Error(`--so-juntar, mas faltam as partes ${aFazer.join(', ')}.`);

	for (const [k, p] of aFazer.entries()) {
		const i = partes.indexOf(p);
		const saidaLocal = join(local, 'partes', `${serie}-filme-${nomeEpisodio(p)}.mp4`);
		console.log(`\n== parte ${p} (${k + 1} de ${aFazer.length} a renderizar) ==`);
		const inicio = Date.now();
		const flags = [i === 0 ? '--primeira' : '', i === partes.length - 1 ? '--ultima' : '', semLegenda ? '--sem-legenda' : ''].filter(Boolean);
		// um processo por parte: o Chrome e a memória do render anterior não se acumulam
		const res = spawnSync('npx', ['tsx', join(RAIZ, 'ferramentas', 'render.ts'), serie, String(p), '--formato=filme', `--saida=${saidaLocal}`, ...flags], {cwd: RAIZ, stdio: 'inherit'});
		if (res.status !== 0) throw new Error(`O render da parte ${p} falhou (código ${res.status}). As partes já prontas ficam guardadas: rode o mesmo comando de novo.`);
		const ep = lerJson<Episodio>(join(pastaSerie, `${nomeEpisodio(p)}.json`));
		const arquivo = join(pastaPartes, `${serie}-filme-${nomeEpisodio(p)}.mp4`);
		if (arquivo !== saidaLocal) copyFileSync(saidaLocal, arquivo);
		const info: InfoParte = {
			parte: p,
			titulo: ep.titulo,
			assinatura: assinaturas.get(p)!,
			duracao: +duracaoDe(saidaLocal).toFixed(3),
			mb: +(statSync(saidaLocal).size / 1e6).toFixed(1),
			feito: new Date().toISOString(),
		};
		writeFileSync(arquivo.replace(/\.mp4$/, '.json'), `${JSON.stringify(info, null, 2)}\n`);
		prontas.push({parte: p, arquivo, info});
		console.log(`parte ${p} pronta: ${info.duracao.toFixed(1)} s, ${info.mb} MB, ${Math.round((Date.now() - inicio) / 60000)} min`);
	}

	// juntar: o vídeo vai sem recodificar (todas as partes saem iguais do render); o áudio é refeito
	// de uma vez para não ficar um estalo de AAC em cada emenda
	prontas.sort((a, b) => a.parte - b.parte);
	const lista = join(local, 'lista.txt');
	writeFileSync(lista, prontas.map((x) => `file '${x.arquivo.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
	const nome = `${serie}-filme`;
	const saida = join(local, `${nome}.mp4`);
	console.log(`\njuntando ${prontas.length} partes...`);
	const j = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', saida], {encoding: 'utf8'});
	if (j.status !== 0) throw new Error(`ffmpeg não conseguiu juntar as partes: ${j.stderr?.trim()}`);
	const total = duracaoDe(saida);
	const mb = statSync(saida).size / 1e6;

	// capítulos para a descrição do YouTube (o primeiro precisa ser 0:00)
	let t = 0;
	const capitulos = prontas.map((x) => {
		const linha = `${relogio(t)} Capítulo ${x.parte} · ${x.info.titulo}`;
		t += x.info.duracao;
		return linha;
	});
	const texto = [
		`# ${biblia.titulo}: o filme completo`,
		'',
		`Vídeo: ${nome}.mp4 · ${relogio(total)} · ${mb.toFixed(0)} MB · 1920x1080 · partes ${prontas[0].parte} a ${prontas.at(-1)!.parte}`,
		'',
		'## Capítulos (cole na descrição do YouTube; viram marcadores na barra do vídeo)',
		...capitulos,
		'',
	].join('\n');
	writeFileSync(join(local, `${nome}.md`), texto);
	if (resolve(local) !== pasta) {
		copyFileSync(saida, join(pasta, `${nome}.mp4`));
		copyFileSync(join(local, `${nome}.md`), join(pasta, `${nome}.md`));
	}
	console.log(`\n${texto}`);
	console.log(`pronto: ${join(pasta, `${nome}.mp4`)} (${relogio(total)}, ${mb.toFixed(0)} MB)`);
};

try {
	main();
} catch (e) {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
}
