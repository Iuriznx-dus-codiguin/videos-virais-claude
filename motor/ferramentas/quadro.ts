// Gera quadros soltos (PNG) de um episódio para conferir o visual sem renderizar o vídeo todo.
// Uso: npm run quadro -- <serie> <parte> <segundos...> [--escala=0.5]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {RAIZ} from './lib/caminhos.ts';

export const CHROME = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
export {RAIZ};

export const empacotar = () => bundle({entryPoint: join(RAIZ, 'src', 'index.ts'), publicDir: join(RAIZ, 'public')});

const main = async () => {
	const args = process.argv.slice(2);
	const opcoes = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
	const [serie, parte, ...tempos] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !parte || !tempos.length) {
		console.error('uso: npm run quadro -- <serie> <parte> <segundos...> [--escala=0.5]');
		process.exit(2);
	}
	const escala = Number(opcoes.escala ?? 0.5);
	const servir = await empacotar();
	const inputProps = {serie, parte: Number(parte), semAudio: true};
	const comp = await selectComposition({serveUrl: servir, id: 'Episodio', inputProps, browserExecutable: CHROME, chromiumOptions: {gl: 'swangle'}});
	const pasta = join(RAIZ, 'out', 'quadros');
	mkdirSync(pasta, {recursive: true});
	for (const s of tempos) {
		const frame = Math.min(comp.durationInFrames - 1, Math.round(Number(s) * comp.fps));
		const saida = join(pasta, `${serie}-ep${String(parte).padStart(2, '0')}-${Number(s).toFixed(2).padStart(6, '0')}s.png`);
		await renderStill({
			composition: comp,
			serveUrl: servir,
			output: saida,
			frame,
			inputProps,
			scale: escala,
			browserExecutable: CHROME,
			chromiumOptions: {gl: 'swangle'},
			overwrite: true,
		});
		console.log(saida);
	}
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
