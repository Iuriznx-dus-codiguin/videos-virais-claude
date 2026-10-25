// Roteiro de um episódio em texto corrido (Markdown), para o Iuri revisar a próxima parte antes
// da produção: cenas, quem fala o quê e a chamada final. Os tempos são estimados se ainda não há voz.
// Uso: npm run roteiro -- <serie> <parte>
import {carregarEpisodio} from './validar.ts';

const seg = (t: number) => `${Math.round(t)} s`;
const LUZ: Record<string, string> = {dia: 'dia', por_do_sol: 'pôr do sol', entardecer: 'entardecer', noite: 'noite'};

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
