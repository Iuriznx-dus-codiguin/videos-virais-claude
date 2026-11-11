// Imprime o vocabulário do motor em poucas linhas, para quem escreve roteiros não precisar ler o código.
// Uso: npm run catalogo [-- <cenario>]
import {ACESSORIOS, ACOES, AMBIENTES, ANCORAS_OBJETO, ANIMACOES_PECA, CENARIOS, EFEITOS, EXPRESSOES, FILTROS, FLUXOS, FORMAS, INSERCOES, ITENS_MAO, LADOS, LUZES, MOVIMENTOS, MUSICAS, OBJETOS, PARTICULAS, PLANOS, SONS, TRANSICOES, USO_MOVIMENTOS, USO_OBJETOS} from '../src/catalogo.ts';

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
	console.log(`\nPLANOS: ${PLANOS.join(', ')}\nLADOS: ${LADOS.join(', ')}`);
	console.log('MOVIMENTOS (campo "movimento" do plano; "intensidade" aumenta ou diminui):');
	for (const m of MOVIMENTOS) console.log(`  ${m}: ${USO_MOVIMENTOS[m]}`);
	console.log('TRANSIÇÕES (campo "transicao" do plano: como ele entra; o plano anterior sai no mesmo estilo):');
	for (const [n, d] of Object.entries(TRANSICOES)) console.log(`  ${n}: ${d}`);
	console.log(`EXPRESSÕES: ${EXPRESSOES.join(', ')}`);
	console.log(`EFEITOS (campo "efeitos" da cena: de, ate, intensidade): ${Object.keys(EFEITOS).join(', ')}`);
	console.log('  letreiro: "texto" grande numa faixa ("altura" 0 a 1, padrão 0.3); circular e destacar: "alvo" (peça, personagem, marca, ponto); linhas, letreiro e circular aceitam "cor"');
	console.log(`FILTROS de cor (campo "filtro" da cena): ${Object.entries(FILTROS).map(([n, d]) => `${n} (${d})`).join('; ')}`);
	console.log('ATMOSFERA: estúdio, oficina, cabine, raízes, adega, selva e praia à noite já trazem poeira, feixes de luz, folhas ou vaga-lumes; "atmosfera": false na cena desliga');
	console.log('CARTÃO com contador: "contar": [de, até] e "#" no "grande" ("# °C", "DIA #")');
	console.log('MANCHETE (campo "manchetes" da cena: de, ate, texto): frase curta fixa no alto da tela enquanto a legenda corre; *palavras entre asteriscos* saem coloridas ("REGRA 1 — *APAGUE AS LUZES*")');
	console.log('RELÓGIO (campo "relogio" da cena: hora "03:00", ate_hora "03:11" faz os minutos correrem): relógio digital no canto de cima');
	console.log('INSERÇÕES (campo "insercoes" da cena: de, ate, tipo; objeto importante em tela cheia):');
	for (const [n, d] of Object.entries(INSERCOES)) console.log(`  ${n}: ${d}`);
	console.log('SÉRIE: "partes" na bíblia põe "PARTE 3/7" no selo ("rotulo_parte": NOITE, DIA...); "etiqueta" no personagem mostra "RÁDIO", "VOZ LÁ FORA" perto da legenda quando ele fala em off');
	console.log(`SONS: ${SONS.join(', ')}\nAMBIENTES: ${AMBIENTES.join(', ')}\nMÚSICAS: ${MUSICAS.join(', ')}`);
	console.log(`ITENS NA MÃO ("segura" ou "item" de pegar): ${ITENS_MAO.join(', ')}`);
	console.log('OBJETOS (opções):');
	for (const o of OBJETOS) console.log(`  ${o}: ${USO_OBJETOS[o]}`);
	console.log(`  todo objeto aceita "aparece" e "some" (surge com um pulinho, some na hora); opções que são âncoras: ${ANCORAS_OBJETO.join(', ')}`);
	console.log('  PARTÍCULAS (campo "particula"):');
	for (const [n, d] of Object.entries(PARTICULAS)) console.log(`    ${n}: ${d}`);
	console.log(`\nMAQUETES (objeto "maquete" com "modelo"; peças em "modelos" do episódio, ver src/roteiro/tipos.ts > Peca)`);
	console.log(`  FORMAS: ${FORMAS.join(', ')}`);
	console.log(`  FLUXOS: ${Object.keys(FLUXOS).join(', ')}`);
	console.log('  ANIMAÇÕES (campo "animacoes" da cena):');
	for (const [n, d] of Object.entries(ANIMACOES_PECA)) console.log(`    ${n}: ${d}`);
	console.log(`  ACESSÓRIOS de personagem: ${ACESSORIOS.join(', ')} (curativo: cruz de esparadrapo na bochecha; tala: perna imobilizada, "lado": "D" ou "E", e quem tem tala manca com "mancar")`);
}
