// Roteiro de um episódio em texto corrido (Markdown), para o Iuri revisar a próxima parte antes
// da produção: cenas, quem fala o quê e a chamada final. Os tempos são estimados se ainda não há voz.
// Uso: npm run roteiro -- <serie> <parte>
import type {CenaTempo} from '../src/roteiro/tipos.ts';
import {carregarEpisodio} from './validar.ts';

const seg = (t: number) => `${Math.round(t)} s`;
const LUZ: Record<string, string> = {dia: 'dia', por_do_sol: 'pôr do sol', entardecer: 'entardecer', noite: 'noite'};

const alvoTxt = (a: unknown, nome: (id: string) => string) => (Array.isArray(a) ? 'ponto' : nome(String(a)));

/** Uma linha com o que a cena tem de produção (câmera, transições, letreiros, partículas, cor). */
const producaoDaCena = (c: CenaTempo, nome: (id: string) => string) => {
	const partes: string[] = [];
	if (c.filtro) partes.push(`cor ${c.filtro}`);
	const movs = [...new Set(c.planos.map((p) => p.movimento).filter((m): m is string => !!m && m !== 'fixo' && m !== 'aproximar'))];
	if (movs.length) partes.push(`câmera ${movs.join(', ').replace(/_/g, ' ')}`);
	const trans = c.planos.map((p) => p.transicao).filter((x): x is string => !!x && x !== 'corte');
	if (trans.length) partes.push(`transições ${trans.join(', ')}`);
	for (const e of c.efeitos) {
		if (e.efeito === 'letreiro' && e.texto) partes.push(`letreiro "${e.texto}"`);
		else if (e.efeito === 'circular') partes.push(`círculo em ${alvoTxt(e.alvo, nome)}`);
		else if (e.efeito === 'destacar') partes.push(`destaque em ${alvoTxt(e.alvo, nome)}`);
		else if (e.efeito === 'barras') partes.push('faixas de cinema');
		else if (e.efeito === 'linhas') partes.push('linhas de ação');
	}
	const parts = c.objetos.filter((o) => o.tipo === 'particulas').map((o) => String(o.particula));
	if (parts.length) partes.push(`partículas ${[...new Set(parts)].join(', ')}`);
	const contadores = c.cartoes.filter((k) => k.contar).length;
	if (contadores) partes.push(`${contadores} número(s) contando`);
	return partes.join(' · ');
};

export const roteiroEmTexto = (serie: string, parte: number): string => {
	const {linha} = carregarEpisodio(serie, parte);
	const nome = (id: string) => linha.personagens[id]?.nome ?? id;
	const linhas = [`## ${linha.tituloSerie} · Parte ${linha.parte}: ${linha.titulo}`, `Duração estimada: ${seg(linha.duracao)}`, ''];
	linha.cenas.forEach((c, i) => {
		linhas.push(`**Cena ${i + 1}: ${c.cenario.replace(/_/g, ' ')}, ${LUZ[c.luz] ?? c.luz}** (${seg(c.ini)} a ${seg(c.fim)})`);
		for (const f of linha.falas.filter((x) => x.ini >= c.ini - 0.01 && x.ini < c.fim)) {
			const como = [f.off ? 'em off' : '', f.tom ?? ''].filter(Boolean).join(', ');
			linhas.push(`- **${nome(f.quem)}**${como ? ` (${como})` : ''}: ${f.texto}`);
		}
		const prod = producaoDaCena(c, nome);
		if (prod) linhas.push(`- _Produção: ${prod}_`);
		linhas.push('');
	});
	const ch = linha.chamada;
	linhas.push(`**Chamada final:** ${[ch.pergunta, `${ch.texto ?? 'Comenta'} "${ch.destaque}"`].filter(Boolean).join(' ')}`);
	return linhas.join('\n');
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	const [serie, parte] = process.argv.slice(2);
	if (!serie || !parte) {
		console.error('uso: npm run roteiro -- <serie> <parte>');
		process.exit(2);
	}
	try {
		console.log(roteiroEmTexto(serie, Number(parte)));
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	}
}
