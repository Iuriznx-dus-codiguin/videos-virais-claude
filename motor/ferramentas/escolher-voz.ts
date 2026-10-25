// Cria a voz de um personagem a partir da descrição na bíblia (campo voz.instruct) e a guarda
// para todos os episódios, para a voz não mudar de um dia para o outro.
//  1) npx tsx ferramentas/escolher-voz.ts <serie> <personagem> [--candidatas=3]
//     gera candidatas em out/vozes-candidatas/<serie>-<personagem>/ para você ouvir.
//  2) npx tsx ferramentas/escolher-voz.ts <serie> <personagem> --usar=2
//     guarda a candidata 2 como a voz do personagem.
//  Atalho para as rotinas: --auto escolhe sozinho a candidata de duração mais plausível.
// Trocar a voz depois: rode de novo com outra --semente=N (e apague vozes/cache se quiser regerar tudo).
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PASTA_SERIES, RAIZ} from './lib/caminhos.ts';
import {duracaoDoAudio, rodarVoz, tratarAudio, type TarefaGerar} from './lib/voz.ts';
import type {Biblia} from '../src/roteiro/tipos.ts';

const AMOSTRA_PADRAO = 'Eu não sei onde estou, mas preciso sair daqui antes que escureça. Tem alguém aí? Por favor, alguém me responde.';
/** Fala natural em português: uns 14 caracteres por segundo. */
const CARACTERES_POR_SEGUNDO = 14;

const main = async () => {
	const args = process.argv.slice(2);
	const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
	const [serie, quem] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !quem) {
		console.error('uso: npx tsx ferramentas/escolher-voz.ts <serie> <personagem> [--candidatas=3] [--usar=N | --auto] [--semente=N]');
		process.exit(2);
	}
	const arq = join(PASTA_SERIES, serie, 'biblia.json');
	const biblia = JSON.parse(readFileSync(arq, 'utf8')) as Biblia;
	const p = biblia.personagens[quem];
	if (!p?.voz?.instruct) throw new Error(`"${quem}" precisa de voz.instruct na bíblia, em inglês, com atributos como "male, young adult, low pitch" (veja motor/voz/gerar.py)`);
	const n = Number(opc.candidatas ?? 3);
	const amostra = p.voz.amostra ?? AMOSTRA_PADRAO;
	const base = Number(opc.semente ?? p.voz.semente ?? 1);
	const pasta = join(RAIZ, 'out', 'vozes-candidatas', `${serie}-${quem}`);
	mkdirSync(pasta, {recursive: true});
	const bruta = (i: number) => join(pasta, `cand-${i}.bruto.wav`);
	const boa = (i: number) => join(pasta, `cand-${i}.wav`);

	if (!opc.usar) {
		console.log(`gerando ${n} candidatas para ${p.nome}...`);
		const tarefas: TarefaGerar[] = Array.from({length: n}, (_, i) => ({id: `cand-${i + 1}`, saida: bruta(i + 1), texto: amostra, instruct: p.voz!.instruct, semente: base + i}));
		await rodarVoz('gerar', tarefas);
		for (let i = 1; i <= n; i++) await tratarAudio(bruta(i), boa(i));
		const linhas = [`# Candidatas para ${p.nome} (${serie})`, '', `Descrição: ${p.voz.instruct}`, ...Array.from({length: n}, (_, i) => `- cand-${i + 1}.wav (semente ${base + i}): npx tsx ferramentas/escolher-voz.ts ${serie} ${quem} --usar=${i + 1}`)];
		writeFileSync(join(pasta, 'candidatas.md'), `${linhas.join('\n')}\n`);
		console.log(`candidatas em ${pasta}`);
		if (!('auto' in opc)) return;
	}

	let escolhida = Number(opc.usar);
	if ('auto' in opc) {
		// descarta candidatas que saíram curtas ou longas demais (voz travada ou áudio cortado)
		const esperado = amostra.length / CARACTERES_POR_SEGUNDO;
		let melhor = Infinity;
		for (let i = 1; i <= n; i++) {
			const erro = Math.abs((await duracaoDoAudio(boa(i))) - esperado) / esperado;
			if (erro < melhor) {
				melhor = erro;
				escolhida = i;
			}
		}
		console.log(`candidata escolhida automaticamente: ${escolhida}`);
	}
	if (!Number.isInteger(escolhida) || escolhida < 1) throw new Error('--usar precisa ser o número de uma candidata');

	const dir = join(PASTA_SERIES, serie, 'vozes');
	mkdirSync(dir, {recursive: true});
	const ref = join(dir, `${quem}-ref.wav`);
	copyFileSync(boa(escolhida), ref);
	await rodarVoz('prompt', [{id: quem, audio: ref, texto: amostra, saida: join(dir, `${quem}.pt`)}]);
	p.voz.semente = base + escolhida - 1;
	writeFileSync(arq, `${JSON.stringify(biblia, null, 2)}\n`);
	console.log(`voz de ${p.nome} guardada em public/series/${serie}/vozes/${quem}.pt`);
};

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
