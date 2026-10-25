// Imprime o vocabulário do motor em poucas linhas, para quem escreve roteiros não precisar ler o código.
// Uso: npm run catalogo [-- <cenario>]
import {ACOES, AMBIENTES, ANIMACOES_PECA, CENARIOS, EFEITOS, EXPRESSOES, FLUXOS, FORMAS, LADOS, LUZES, MOVIMENTOS, MUSICAS, OBJETOS, PLANOS, SONS, USO_OBJETOS} from '../src/catalogo.ts';

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
	if (c.alturas) console.log(`  objetos apoiados: ${Object.entries(c.alturas).map(([m, h]) => `${m} a ${h} m`).join(', ')}`);
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
	console.log(`\nMAQUETES (objeto "maquete" com "modelo"; peças em "modelos" do episódio, ver src/roteiro/tipos.ts > Peca)`);
	console.log(`  FORMAS: ${FORMAS.join(', ')}`);
	console.log(`  FLUXOS: ${Object.keys(FLUXOS).join(', ')}`);
	console.log('  ANIMAÇÕES (campo "animacoes" da cena):');
	for (const [n, d] of Object.entries(ANIMACOES_PECA)) console.log(`    ${n}: ${d}`);
	console.log('  ACESSÓRIOS de personagem: cabelo_curto, rabo_de_cavalo, bandana, bone, capacete, cartola, oculos, bigode, mochila, lenco, colete');
}
