// Imprime o vocabulário do motor em poucas linhas, para quem escreve roteiros não precisar ler o código.
// Uso: npm run catalogo [-- <cenario>]
import {ACOES, AMBIENTES, CENARIOS, EFEITOS, EXPRESSOES, LADOS, LUZES, MOVIMENTOS, MUSICAS, OBJETOS, PLANOS, SONS, USO_OBJETOS} from '../src/catalogo.ts';

const so = process.argv[2];
if (so && !CENARIOS[so]) {
	console.error(`Cenário "${so}" não existe. Cenários: ${Object.keys(CENARIOS).join(', ')}`);
	process.exit(1);
}
for (const [nome, c] of Object.entries(CENARIOS)) {
	if (so && so !== nome) continue;
	console.log(`CENÁRIO ${nome} (luz padrão ${c.luzPadrao}): ${c.descricao}`);
	console.log(`  marcas (chão): ${Object.keys(c.marcas).join(', ')}`);
	if (c.pontos) console.log(`  pontos (para olhar/enquadrar): ${Object.keys(c.pontos).join(', ')}`);
}
if (!so) {
	console.log(`\nLUZES: ${LUZES.join(', ')}`);
	console.log('\nAÇÕES (campo "faz"):');
	for (const [n, a] of Object.entries(ACOES)) console.log(`  ${n} [${a.tipo}${a.duracao ? ` ${a.duracao}s` : ''}]: ${a.descricao}`);
	console.log(`\nPLANOS: ${PLANOS.join(', ')}\nMOVIMENTOS: ${MOVIMENTOS.join(', ')}\nLADOS: ${LADOS.join(', ')}`);
	console.log(`EXPRESSÕES: ${EXPRESSOES.join(', ')}`);
	console.log(`EFEITOS: ${Object.keys(EFEITOS).join(', ')}`);
	console.log(`SONS: ${SONS.join(', ')}\nAMBIENTES: ${AMBIENTES.join(', ')}\nMÚSICAS: ${MUSICAS.join(', ')}`);
	console.log('OBJETOS (opções):');
	for (const o of OBJETOS) console.log(`  ${o}: ${USO_OBJETOS[o]}`);
}
