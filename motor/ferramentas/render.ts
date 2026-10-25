// Renderiza um episódio em MP4 vertical (1080x1920, 30 fps) com a voz e os sons da trilha.
// Uso: npm run render -- <serie> <parte> [--saida=caminho.mp4] [--crf=18]
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
		console.error('uso: npm run render -- <serie> <parte> [--saida=caminho.mp4] [--crf=18]');
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
		crf: Number(opc.crf ?? 18),
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
	console.log(`pronto: ${saida} (${Math.round((Date.now() - inicio) / 1000)} s)`);
};

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
