// Renderiza um episódio em MP4 vertical (1080x1920, 30 fps) com a voz e os sons da trilha.
// Uso: npm run render -- <serie> <parte> [--saida=caminho.mp4] [--qualidade=media|alta] [--crf=N] [--velocidade=1.1]
//
// Qualidade média (padrão desde 01/11, pedido do Iuri): 3D sem supersampling, crf 24 e um teto de
// bitrate calculado pela duração, para o arquivo ficar entre ~20 e ~35 MB num vídeo de 1min20.
// "alta" é o jeito antigo (crf 18, 3D 1,5x maior): ~60 MB e render bem mais lento.
//
// Velocidade 1.1 (padrão desde 03/11, pedido do Iuri): o vídeo final sai 10% mais rápido, com o mesmo
// roteiro, as mesmas vozes e a mesma produção (1min20 de roteiro viram ~1min13). A composição desenha
// 30 / 1,1 quadros por segundo de roteiro (~9% menos quadros), o vídeo é reinterpretado a 30 fps
// sem recodificar e o áudio é acelerado com atempo, que mantém o tom das vozes. --velocidade=1 desliga.
import {renderMedia, selectComposition} from '@remotion/renderer';
import {mkdirSync, statSync} from 'node:fs';
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
		console.error('uso: npm run render -- <serie> <parte> [--saida=caminho.mp4] [--qualidade=media|alta] [--crf=N] [--velocidade=1.1]');
		process.exit(2);
	}
	const velocidade = Number(opc.velocidade ?? VELOCIDADE_PADRAO);
	if (!(velocidade >= 0.5 && velocidade <= 2)) {
		console.error(`velocidade "${opc.velocidade}" inválida (use um número entre 0.5 e 2; 1 é a velocidade normal)`);
		process.exit(2);
	}
	const q = QUALIDADES[opc.qualidade ?? 'media'];
	if (!q) {
		console.error(`qualidade "${opc.qualidade}" não existe (${Object.keys(QUALIDADES).join(', ')})`);
		process.exit(2);
	}
	const parte = Number(parteTxt);
	const saida = opc.saida ?? join(RAIZ, 'out', `${serie}-${nomeEpisodio(parte)}.mp4`);
	mkdirSync(dirname(saida), {recursive: true});

	await gerarSons();
	const servir = await empacotar();
	const inputProps = {serie, parte, dpr: q.dpr, velocidade};
	const comp = await selectComposition({serveUrl: servir, id: 'Episodio', inputProps, browserExecutable: CHROME, chromiumOptions: {gl: 'swangle'}});
	const semVoz = (comp.props as {semVoz?: boolean}).semVoz;
	if (semVoz) console.warn('AVISO: sem voz (rode npm run vozes antes); o vídeo sai só com sons e música.');
	// segundos de roteiro: o teto vale para o arquivo inteiro, que não muda de tamanho ao acelerar
	const duracao = comp.durationInFrames / comp.fps;
	const teto = q.tetoMB ? tetoDeBitrate(duracao, q.tetoMB) : null;
	const crf = Number(opc.crf ?? q.crf);
	console.log(`qualidade ${opc.qualidade ?? 'media'}: crf ${crf}, 3D ${q.dpr}x${teto ? `, teto ${teto} (≤ ${q.tetoMB} MB em ${duracao.toFixed(0)} s)` : ''}`);
	if (velocidade !== 1) console.log(`velocidade ${velocidade}x: ${duracao.toFixed(1)} s de roteiro → ${(duracao / velocidade).toFixed(1)} s de vídeo`);
	const inicio = Date.now();
	let ultimo = -1;
	await renderMedia({
		composition: comp,
		serveUrl: servir,
		codec: 'h264',
		outputLocation: saida,
		inputProps,
		crf,
		...(teto ? {encodingMaxRate: teto, encodingBufferSize: dobro(teto)} : {}),
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
	await finalizar(saida, velocidade);
	const mb = statSync(saida).size / 1e6;
	console.log(`tamanho: ${mb.toFixed(1)} MB`);
	if (q.tetoMB && (mb < 15 || mb > 36)) console.warn(`AVISO: ${mb.toFixed(1)} MB está fora do esperado (20 a 35 MB para ~1min20).`);
	console.log(`pronto: ${saida} (${Math.round((Date.now() - inicio) / 1000)} s)`);
};

interface Qualidade {
	crf: number;
	/** pixels do 3D por pixel do vídeo */
	dpr: number;
	/** tamanho máximo do arquivo (MB); vira um teto de bitrate do vídeo */
	tetoMB?: number;
}

const QUALIDADES: Record<string, Qualidade> = {
	// no teste de 01/11 (parte 6 do Voo 818 com transições e partículas) o crf 23 encostou no teto:
	// crf 24 com teto de 30 MB deixa ~25–30 MB, no meio da faixa que o Iuri pediu
	media: {crf: 24, dpr: 1, tetoMB: 30},
	alta: {crf: 18, dpr: 1.5},
};

const AUDIO_KBPS = 128;

/** Pedido do Iuri em 03/11: vídeo um pouco acelerado, mais atrativo e alguns segundos mais curto. */
const VELOCIDADE_PADRAO = 1.1;
/** Quadros por segundo do vídeo final (os mesmos da composição em Root.tsx). */
const FPS_FINAL = 30;

/** Bitrate máximo do vídeo (ex.: "3100k") para o arquivo inteiro não passar de `mb`. */
type Taxa = `${number}k`;
const tetoDeBitrate = (segundos: number, mb: number): Taxa => {
	const totalKbps = (mb * 8 * 1000) / Math.max(1, segundos);
	return `${Math.max(800, Math.floor(totalKbps - AUDIO_KBPS - 60))}k`;
};
const dobro = (taxa: Taxa): Taxa => `${parseInt(taxa, 10) * 2}k`;

/** Volume integrado padrão de YouTube e Instagram; pico máximo um pouco abaixo de 0 dB. */
const ALVO_LUFS = -14;

/**
 * Passo final, sem recodificar o vídeo: acelera (quando velocidade ≠ 1) e normaliza o volume.
 * - Vídeo: os quadros saem do render a 30/velocidade fps; aqui os tempos deles são multiplicados por
 *   1/velocidade (-itsscale) e o cabeçalho do H.264 passa a dizer 30 fps. Nenhum quadro é descartado.
 * - Áudio: atempo acelera sem mudar o tom; depois loudnorm em duas passadas (mede e corrige linear).
 */
const finalizar = async (arquivo: string, velocidade: number) => {
	const {spawnSync} = await import('node:child_process');
	const {renameSync} = await import('node:fs');
	const acelerar = velocidade !== 1 ? `atempo=${velocidade},` : '';
	const base = `loudnorm=I=${ALVO_LUFS}:TP=-1.5:LRA=11`;
	// o ffmpeg escreve a medição em JSON no stderr, no fim da saída (medida já no áudio acelerado)
	const medida = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', arquivo, '-af', `${acelerar}${base}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'});
	const json = /\{[^{}]*"input_i"[^{}]*\}/.exec(medida.stderr ?? '');
	const m = json ? (JSON.parse(json[0]) as Record<string, string>) : null;
	if (!m) {
		console.warn('AVISO: não consegui medir o volume; o vídeo fica sem normalizar.');
		if (velocidade === 1) return;
	}
	const filtro = m
		? `${acelerar}${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
		: acelerar.slice(0, -1);
	const video =
		velocidade !== 1
			? ['-itsscale', String(1 / velocidade), '-i', arquivo, '-i', arquivo, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-bsf:v', `h264_metadata=tick_rate=${FPS_FINAL * 2}/1`]
			: ['-i', arquivo, '-c:v', 'copy'];
	const temp = arquivo.replace(/\.mp4$/, '.final.mp4');
	const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...video, '-af', filtro, '-ar', '48000', '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-movflags', '+faststart', temp], {encoding: 'utf8'});
	if (r.status !== 0) {
		const oQueFica = velocidade !== 1 ? 'na velocidade normal e sem normalizar' : 'como saiu do render';
		console.warn(`AVISO: passo final falhou (${r.stderr?.trim()}); o vídeo fica ${oQueFica}.`);
		return;
	}
	renameSync(temp, arquivo);
	if (m) console.log(`volume: ${m.input_i} LUFS → ${ALVO_LUFS} LUFS`);
	if (velocidade !== 1) {
		const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo], {encoding: 'utf8'}).stdout?.trim();
		console.log(`acelerado ${velocidade}x: ${Number(dur).toFixed(1)} s, ${FPS_FINAL} fps`);
	}
};

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
