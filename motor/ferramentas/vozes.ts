// Gera as vozes de um episódio com o OmniVoice (voz grátis e aberta), fala por fala, e grava o
// áudio e o alinhamento em public/series/<serie>/vozes/. O render usa esses arquivos no lugar
// dos tempos estimados. Depois confere a pronúncia de cada fala nova com o Whisper: a que sai
// trocada (nota baixa ou nome próprio sumido) é refeita com outras sementes e fica a melhor
// tomada; a semente vencedora é gravada na fala ("semente") para o cache continuar valendo.
// Uso: npx tsx ferramentas/vozes.ts <serie> <parte> [--forcar] [--sem-conferir] [--conferir-tudo]
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PASTA_SERIES} from './lib/caminhos.ts';
import {alinharProporcional, avaliarPronuncia, duracaoDoAudio, ouvirFalas, rodarVoz, TONS, tratarAudio, type TarefaGerar} from './lib/voz.ts';
import {nomeEpisodio} from './validar.ts';
import {textoParaVoz} from '../src/roteiro/resolver.ts';
import {ehSilencio} from '../src/roteiro/tipos.ts';
import type {Alinhamentos, Biblia, Episodio, Fala} from '../src/roteiro/tipos.ts';

/** Passos de difusão do modelo: mais passos, voz melhor e mais lenta na CPU. */
const PASSOS = Number(process.env.VOZ_PASSOS ?? 32);
/** Quantas sementes extras tentar numa fala com pronúncia ruim. */
const TENTATIVAS = Number(process.env.VOZ_TENTATIVAS ?? 2);

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
			const semente = fala.semente ?? biblia.personagens[fala.quem]?.voz?.semente ?? 1;
			return {fala, texto, voz, velocidade, semente, chave: chaveDe(voz, texto, velocidade, semente, fala.tom)};
		});

const chaveDe = (voz: string, texto: string, velocidade: number, semente: number, tom?: string) =>
	hash(readFileSync(voz), JSON.stringify({texto, velocidade, semente, PASSOS, filtro: tom ? TONS[tom]?.filtro : undefined}));

/** Nomes próprios que a voz não pode engolir: os da bíblia e palavras com maiúscula no meio da frase. */
const nomesDaFala = (biblia: Biblia, texto: string) => {
	const daBiblia = Object.values(biblia.personagens).flatMap((p) => p.nome.split(/\s+/)).filter((n) => !/^(dona|seu|o|a)$/i.test(n));
	const noMeio = [...texto.matchAll(/[^.!?…]\s+([A-ZÀ-Ú][\p{L}]+)/gu)].map((m) => m[1]);
	return [...daBiblia, ...noMeio];
};

/**
 * Confere as falas com o Whisper e refaz as ruins com outras sementes. Devolve as falas cuja
 * semente mudou (já gravadas no episódio por quem chamou).
 */
const conferirPronuncia = async (pedidos: Pedido[], biblia: Biblia, dirCache: string) => {
	const final = (p: Pedido) => join(dirCache, `${p.chave}.wav`);
	console.log(`conferindo a pronúncia de ${pedidos.length} falas (Whisper)...`);
	const ouvido = await ouvirFalas(pedidos.map((p) => ({id: p.fala.id, audio: final(p)})));
	const notas = new Map<string, {pedido: Pedido; nota: number; ok: boolean; ouvido: string; faltam: string[]}>();
	for (const p of pedidos) {
		const r = avaliarPronuncia(p.texto, ouvido[p.fala.id] ?? '', nomesDaFala(biblia, p.fala.texto));
		notas.set(p.fala.id, {pedido: p, ...r, ouvido: ouvido[p.fala.id] ?? ''});
		console.log(`  ${p.fala.id}: ${r.ok ? 'ok' : 'REFAZER'} (${r.nota.toFixed(2)})${r.ok ? '' : ` ouvi "${ouvido[p.fala.id]}"${r.faltam.length ? `, sumiu: ${r.faltam.join(', ')}` : ''}`}`);
	}
	const ruins = pedidos.filter((p) => !notas.get(p.fala.id)!.ok);
	if (!ruins.length || TENTATIVAS <= 0) return {trocas: new Map<string, number>(), ruins: ruins.map((p) => p.fala.id)};

	// outras tomadas das ruins, todas de uma vez (o modelo carrega uma vez só)
	const variantes: Pedido[] = [];
	for (const p of ruins) {
		for (let k = 1; k <= TENTATIVAS; k++) {
			const semente = p.semente + k * 101;
			variantes.push({...p, semente, chave: chaveDe(p.voz, p.texto, p.velocidade, semente, p.fala.tom)});
		}
	}
	const novas = variantes.filter((v) => !existsSync(final(v)));
	if (novas.length) {
		console.log(`refazendo ${ruins.length} falas com ${TENTATIVAS} sementes cada...`);
		await rodarVoz('gerar', novas.map((v) => ({id: `${v.fala.id}@${v.semente}`, saida: join(dirCache, `${v.chave}.bruto.wav`), texto: v.texto, voz: v.voz, velocidade: v.velocidade, semente: v.semente})), PASSOS);
		for (const v of novas) await tratarAudio(join(dirCache, `${v.chave}.bruto.wav`), final(v), v.fala.tom);
	}
	const ouvidoV = await ouvirFalas(variantes.map((v) => ({id: `${v.fala.id}@${v.semente}`, audio: final(v)})));
	const trocas = new Map<string, number>();
	const continuam: string[] = [];
	for (const p of ruins) {
		let melhor = notas.get(p.fala.id)!;
		for (const v of variantes.filter((x) => x.fala.id === p.fala.id)) {
			const o = ouvidoV[`${v.fala.id}@${v.semente}`] ?? '';
			const r = avaliarPronuncia(v.texto, o, nomesDaFala(biblia, v.fala.texto));
			const melhorQue = (r.ok && !melhor.ok) || (r.ok === melhor.ok && r.faltam.length < melhor.faltam.length) || (r.ok === melhor.ok && r.faltam.length === melhor.faltam.length && r.nota > melhor.nota + 0.02);
			if (melhorQue) melhor = {pedido: v, ...r, ouvido: o};
		}
		if (melhor.pedido !== p) trocas.set(p.fala.id, melhor.pedido.semente);
		console.log(`  ${p.fala.id}: ${melhor.ok ? 'ok' : 'AINDA RUIM'} com a semente ${melhor.pedido.semente} (${melhor.nota.toFixed(2)}) ouvi "${melhor.ouvido}"`);
		if (!melhor.ok) continuam.push(p.fala.id);
	}
	return {trocas, ruins: continuam};
};

const main = async () => {
	const args = process.argv.slice(2);
	const forcar = args.includes('--forcar');
	const [serie, parteTxt] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !parteTxt) {
		console.error('uso: npx tsx ferramentas/vozes.ts <serie> <parte> [--forcar] [--sem-conferir] [--conferir-tudo]');
		process.exit(2);
	}
	const parte = Number(parteTxt);
	const pasta = join(PASTA_SERIES, serie);
	const biblia = JSON.parse(readFileSync(join(pasta, 'biblia.json'), 'utf8')) as Biblia;
	const arqEp = join(pasta, `${nomeEpisodio(parte)}.json`);
	const ep = JSON.parse(readFileSync(arqEp, 'utf8')) as Episodio;
	let pedidos = montarPedidos(serie, biblia, ep);

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

	const conferir = args.includes('--conferir-tudo') ? pedidos : faltam;
	if (!args.includes('--sem-conferir') && conferir.length) {
		try {
			const {trocas, ruins} = await conferirPronuncia(conferir, biblia, dirCache);
			if (trocas.size) {
				for (const f of ep.falas) if (!ehSilencio(f) && trocas.has(f.id)) f.semente = trocas.get(f.id);
				writeFileSync(arqEp, JSON.stringify(ep, null, 2) + '\n');
				console.log(`sementes novas gravadas no episódio: ${[...trocas.keys()].join(', ')}`);
				pedidos = montarPedidos(serie, biblia, ep);
			}
			if (ruins.length) console.log(`ATENÇÃO: ${ruins.join(', ')} continuam com pronúncia estranha; reescreva a frase (troque a palavra que a voz engole) e rode de novo`);
		} catch (e) {
			console.log(`não deu para conferir a pronúncia (${e instanceof Error ? e.message.split('\n')[0] : e}); siga ouvindo as falas novas`);
		}
	}

	const alinhamentos: Alinhamentos = {};
	for (const p of pedidos) {
		const arqAl = join(dirCache, `${p.chave}.json`);
		if (forcar || !existsSync(arqAl) || faltam.some((f) => f.chave === p.chave)) {
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
