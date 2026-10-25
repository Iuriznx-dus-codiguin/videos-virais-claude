// Confere um episódio antes do render: resolve a linha do tempo, mostra quando cada fala,
// cena e plano acontecem e lista os avisos (marcas, ações ou palavras que não existem).
// Uso: npm run validar -- <serie> <parte>     (sem parte: todas as partes da série)
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {resolverEpisodio} from '../src/roteiro/resolver.ts';
import type {Alinhamentos, Biblia, Episodio} from '../src/roteiro/tipos.ts';

export const PASTA_SERIES = join(import.meta.dirname, '..', 'public', 'series');
export const nomeEpisodio = (parte: number) => `ep${String(parte).padStart(2, '0')}`;

const lerJson = <T>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;

export const carregarEpisodio = (serie: string, parte: number) => {
	const pasta = join(PASTA_SERIES, serie);
	const biblia = lerJson<Biblia>(join(pasta, 'biblia.json'));
	const ep = lerJson<Episodio>(join(pasta, `${nomeEpisodio(parte)}.json`));
	const caminhoVozes = join(pasta, 'vozes', `${nomeEpisodio(parte)}.json`);
	const alinhamentos = existsSync(caminhoVozes) ? lerJson<Alinhamentos>(caminhoVozes) : {};
	return {biblia, ep, alinhamentos, linha: resolverEpisodio(ep, biblia, alinhamentos)};
};

const s = (t: number) => `${t.toFixed(2).padStart(6)}s`;

const mostrar = (serie: string, parte: number) => {
	const {linha, alinhamentos} = carregarEpisodio(serie, parte);
	const comVoz = Object.keys(alinhamentos).length > 0;
	console.log(`\n${linha.tituloSerie} · parte ${linha.parte}: ${linha.titulo}`);
	console.log(`duração ${linha.duracao.toFixed(1)}s ${comVoz ? '(com vozes)' : '(tempos estimados pelo texto, sem vozes)'}\n`);
	for (const c of linha.cenas) {
		console.log(`cena ${c.id} [${c.cenario}, ${c.luz}] ${s(c.ini)} → ${s(c.fim)}`);
		for (const p of c.planos) {
			const extra = [p.alvo, p.alvo2 && `→ ${p.alvo2}`, p.lado, p.movimento].filter(Boolean).join(' ');
			console.log(`   plano ${s(p.ini)} ${p.tipo.padEnd(9)} ${extra}`);
		}
		for (const a of c.acoes) {
			const o = [a.faz, a.para && `para ${a.para}`, a.olhar && `olha ${a.olhar}`, a.expressao && `cara ${a.expressao}`].filter(Boolean).join(', ');
			console.log(`   ação  ${s(a.ini)} ${a.quem}: ${o}`);
		}
	}
	console.log('\nfalas');
	for (const f of linha.falas) {
		console.log(`  ${f.id.padEnd(4)} ${s(f.ini)} → ${s(f.fim)}  ${f.quem}${f.off ? ' (off)' : ''}: ${f.texto}`);
	}
	console.log(`\nchamada ${s(linha.chamada.ini)}: ${linha.chamada.pergunta ?? ''} ${linha.chamada.destaque}`);
	if (linha.avisos.length) {
		console.log(`\n${linha.avisos.length} aviso(s):`);
		for (const a of linha.avisos) console.log(`  - ${a}`);
	} else console.log('\nnenhum aviso');
	return linha.avisos.length;
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	const [serie, parte] = process.argv.slice(2);
	if (!serie) {
		console.error('uso: npm run validar -- <serie> [parte]');
		process.exit(2);
	}
	const partes = parte
		? [Number(parte)]
		: readdirSync(join(PASTA_SERIES, serie))
				.map((n) => /^ep(\d+)\.json$/.exec(n)?.[1])
				.filter((n): n is string => !!n)
				.map(Number)
				.sort((a, b) => a - b);
	const avisos = partes.reduce((soma, p) => soma + mostrar(serie, p), 0);
	process.exit(avisos ? 1 : 0);
}
