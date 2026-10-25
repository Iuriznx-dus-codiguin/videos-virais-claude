// Gera as vozes de um episódio com o OmniVoice (voz grátis e aberta), fala por fala, e grava o
// áudio e o alinhamento em public/series/<serie>/vozes/. O render usa esses arquivos no lugar
// dos tempos estimados.
// Uso: npx tsx ferramentas/vozes.ts <serie> <parte> [--forcar]
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PASTA_SERIES} from './lib/caminhos.ts';
import {alinharProporcional, duracaoDoAudio, rodarVoz, TONS, tratarAudio, type TarefaGerar} from './lib/voz.ts';
import {nomeEpisodio} from './validar.ts';
import {textoParaVoz} from '../src/roteiro/resolver.ts';
import {ehSilencio} from '../src/roteiro/tipos.ts';
import type {Alinhamentos, Biblia, Episodio, Fala} from '../src/roteiro/tipos.ts';

/** Passos de difusão do modelo: mais passos, voz melhor e mais lenta na CPU. */
const PASSOS = Number(process.env.VOZ_PASSOS ?? 32);

export interface Pedido {
	fala: Fala;
	texto: string;
	/** arquivo .pt da voz do personagem */
	voz: string;
	velocidade: number;
	semente: number;
	chave: string;
}

const hash = (...partes: (string | Buffer)[]) => {
	const h = createHash('sha256');
	for (const p of partes) h.update(p);
	return h.digest('hex').slice(0, 12);
};

export const arquivoVoz = (serie: string, quem: string) => join(PASTA_SERIES, serie, 'vozes', `${quem}.pt`);

export const montarPedidos = (serie: string, biblia: Biblia, ep: Episodio): Pedido[] =>
	ep.falas
		.filter((f): f is Fala => !ehSilencio(f))
		.map((fala) => {
			const voz = arquivoVoz(serie, fala.quem);
			if (!existsSync(voz)) {
				throw new Error(`"${fala.quem}" ainda não tem voz escolhida. Rode: npx tsx ferramentas/escolher-voz.ts ${serie} ${fala.quem} --auto`);
			}
			const texto = textoParaVoz(fala.texto);
			const velocidade = +((fala.velocidade ?? 1) * (fala.tom ? (TONS[fala.tom]?.velocidade ?? 1) : 1)).toFixed(3);
			const semente = biblia.personagens[fala.quem]?.voz?.semente ?? 1;
			const chave = hash(readFileSync(voz), JSON.stringify({texto, velocidade, semente, PASSOS, filtro: fala.tom ? TONS[fala.tom]?.filtro : undefined}));
			return {fala, texto, voz, velocidade, semente, chave};
		});

const main = async () => {
	const args = process.argv.slice(2);
	const forcar = args.includes('--forcar');
	const [serie, parteTxt] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !parteTxt) {
		console.error('uso: npx tsx ferramentas/vozes.ts <serie> <parte> [--forcar]');
		process.exit(2);
	}
	const parte = Number(parteTxt);
	const pasta = join(PASTA_SERIES, serie);
	const biblia = JSON.parse(readFileSync(join(pasta, 'biblia.json'), 'utf8')) as Biblia;
	const ep = JSON.parse(readFileSync(join(pasta, `${nomeEpisodio(parte)}.json`), 'utf8')) as Episodio;
	const pedidos = montarPedidos(serie, biblia, ep);

	const dirCache = join(pasta, 'vozes', 'cache');
	mkdirSync(dirCache, {recursive: true});
	const bruto = (p: Pedido) => join(dirCache, `${p.chave}.bruto.wav`);
	const final = (p: Pedido) => join(dirCache, `${p.chave}.wav`);
	const faltam = pedidos.filter((p) => forcar || !existsSync(final(p)));
	console.log(`${pedidos.length} falas, ${faltam.length} para gerar`);

	if (faltam.length) {
		const tarefas: TarefaGerar[] = faltam.map((p) => ({id: p.fala.id, saida: bruto(p), texto: p.texto, voz: p.voz, velocidade: p.velocidade, semente: p.semente}));
		await rodarVoz('gerar', tarefas, PASSOS);
		for (const p of faltam) await tratarAudio(bruto(p), final(p), p.fala.tom);
	}

	const alinhamentos: Alinhamentos = {};
	for (const p of pedidos) {
		const arqAl = join(dirCache, `${p.chave}.json`);
		if (forcar || !existsSync(arqAl) || faltam.includes(p)) {
			const duracao = await duracaoDoAudio(final(p));
			writeFileSync(arqAl, JSON.stringify({duracao: +(duracao + 0.05).toFixed(3), ...alinharProporcional(p.texto, duracao)}));
		}
		const al = JSON.parse(readFileSync(arqAl, 'utf8')) as Omit<Alinhamentos[string], 'audio'>;
		alinhamentos[p.fala.id] = {...al, audio: `series/${serie}/vozes/cache/${p.chave}.wav`};
	}
	writeFileSync(join(pasta, 'vozes', `${nomeEpisodio(parte)}.json`), JSON.stringify(alinhamentos));
	console.log(`pronto: public/series/${serie}/vozes/${nomeEpisodio(parte)}.json`);
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	main().catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	});
}
