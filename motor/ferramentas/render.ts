// Renderiza um episódio em MP4 vertical (1080x1920, 30 fps) com a voz e os sons da trilha.
// Uso: npm run render -- <serie> <parte> [--saida=caminho.mp4] [--crf=24]
import {renderMedia, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {RAIZ} from './lib/caminhos.ts';
import {CHROME, empacotar} from './quadro.ts';
import {nomeEpisodio} from './validar.ts';

const gerarSons = async () => {
	const {execFileSync} = await import('node:child_process');
	execFileSync('npx', ['tsx', join(RAIZ, 'ferramentas', 'sons-provisorios.ts')], {stdio: 'inherit', cwd: RAIZ});
};

const main = async () => {
	const args = process.argv.slice(2);
	const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
	const [serie, parteTxt] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !parteTxt) {
		console.error('uso: npm run render -- <serie> <parte> [--saida=caminho.mp4] [--crf=24]');
		process.exit(2);
	}
	const parte = Number(parteTxt);
	const saida = opc.saida ?? join(RAIZ, 'out', `${serie}-${nomeEpisodio(parte)}.mp4`);
	mkdirSync(dirname(saida), {recursive: true});

	await gerarSons();
	const servir = await empacotar();
	const inputProps = {serie, parte};
	const comp = await selectComposition({serveUrl: servir, id: 'Episodio', inputProps, browserExecutable: CHROME, chromiumOptions: {gl: 'swangle'}});
	const semVoz = (comp.props as {semVoz?: boolean}).semVoz;
	if (semVoz) console.warn('AVISO: sem voz (rode npm run vozes antes); o vídeo sai só com sons e música.');
	const inicio = Date.now();
	let ultimo = -1;
	await renderMedia({
		composition: comp,
		serveUrl: servir,
		codec: 'h264',
		outputLocation: saida,
		inputProps,
		crf: Number(opc.crf ?? 24),
		concurrency: 2,
		browserExecutable: CHROME,
		chromiumOptions: {gl: 'swangle'},
		onProgress: ({progress}) => {
			const pct = Math.floor(progress * 10) * 10;
			if (pct !== ultimo) {
				ultimo = pct;
				console.log(`render ${pct}% (${Math.round((Date.now() - inicio) / 1000)} s)`);
			}
		},
	});
	await normalizarVolume(saida);
	console.log(`pronto: ${saida} (${Math.round((Date.now() - inicio) / 1000)} s)`);
};

/** Volume integrado padrão de YouTube e Instagram; pico máximo um pouco abaixo de 0 dB. */
const ALVO_LUFS = -14;

/** Loudnorm em duas passadas (mede e depois corrige linear), copiando o vídeo sem recodificar. */
const normalizarVolume = async (arquivo: string) => {
	const {spawnSync} = await import('node:child_process');
	const {renameSync} = await import('node:fs');
	const base = `loudnorm=I=${ALVO_LUFS}:TP=-1.5:LRA=11`;
	// o ffmpeg escreve a medição em JSON no stderr, no fim da saída
	const medida = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', arquivo, '-af', `${base}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'});
	const json = /\{[^{}]*"input_i"[^{}]*\}/.exec(medida.stderr ?? '');
	if (!json) {
		console.warn('AVISO: não consegui medir o volume; o vídeo fica sem normalizar.');
		return;
	}
	const m = JSON.parse(json[0]) as Record<string, string>;
	const temp = arquivo.replace(/\.mp4$/, '.normalizado.mp4');
	const filtro = `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
	const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', arquivo, '-c:v', 'copy', '-af', filtro, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', temp], {encoding: 'utf8'});
	if (r.status !== 0) {
		console.warn(`AVISO: normalização de volume falhou (${r.stderr?.trim()}); o vídeo fica como saiu do render.`);
		return;
	}
	renameSync(temp, arquivo);
	console.log(`volume: ${m.input_i} LUFS → ${ALVO_LUFS} LUFS`);
};

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
