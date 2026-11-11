---
name: nova-minisserie
description: Cria a próxima minissérie de HISTÓRIAS quando a atual termina (bíblia, regras, mapa de 5 a 7 partes com final fechado, ordem em series.json) e deixa o roteiro da parte 1 pronto. Use na rotina quando a série da vez acabou ou quando pedirem "crie uma série nova". Não serve para o Como Funciona.
---

# Criar a próxima minissérie de histórias

Decisão do Iuri (11/11): **toda minissérie tem episódio final com o desfecho da história.** Quando ela acaba, não se inventa parte nova: começa outra história. Este é o fluxo de histórias; nunca leia nem mexa em `public/series/como-funciona/` ou nas skills do Como Funciona. Fale com o Iuri em português, curto. A publicação é manual: nunca publique nada.

## Quando
- Na rotina, quando `public/series/_historias/series.json` não tem nenhuma série em andamento (todas com `"encerrada": true` no `estado.json` ou com a última parte do `roteiro-geral.md` entregue).
- No dia da última parte de uma série (passo 8 da `roteirizar-episodio`), para o Iuri revisar a parte 1 junto com o final.
- Quando o Iuri pedir uma série nova (ele pode dar o tema; sem tema, escolha você).

## 1. Escolher a história
1. Leia `series.json` e o campo `genero` da bíblia de cada série da ordem. **Troque de gênero** em relação à anterior, em rodízio: sobrevivência → mistério/terror ("regras e contradição") → novelinha/drama de família → aventura/fuga → curiosidade em série... Nada fixo: o que importa é a próxima ser diferente da anterior.
2. Premissa que cabe em uma frase com "você" e que dá um gancho "Se..." diferente em cada parte (ex.: "Você é o porteiro novo da noite e o interfone toca de um apartamento que não existe").
3. **5 a 7 partes** (no máximo 7, a não ser que o Iuri peça outra coisa). Uma parte por dia no calendário de `motor/producao/PRODUCAO.md`: uma série de 7 partes começa num dia e termina em ~5 dias, com o filme 16:9 logo depois.
4. **A verdade** (o segredo, o culpado, o motivo) decidida antes da parte 1, e revelada aos poucos: um passo do mistério por parte. A última parte **fecha tudo**: quem fez, por quê, o que acontece com cada personagem, e uma última imagem que dá a sensação de fim (não um novo mistério). A chamada da última parte é uma pergunta de opinião sobre a história inteira, com COMENTA "FIM".
5. Só cenários que existem: `cd motor && npm run catalogo` (e `npm run catalogo -- <cenario>` para marcas, pontos e câmeras). Se a história pedir um lugar que não existe, adapte a história a um cenário pronto e avise o Iuri no resumo que um cenário novo melhoraria (é trabalho de código, numa sessão normal, não na rotina das 3h).
6. 3 a 6 personagens, cada um com um traço visual que se reconhece de longe (bigode, capacete, capuz, cor do corpo) e uma voz diferente. Narrador fixo da série.

## 2. Arquivos (`motor/public/series/<serie>/`, nome curto com hífen, ex.: `apartamento-0`)
Modelo completo: `public/series/apartamento-0/`.
- `biblia.json`: `serie`, `titulo` (MAIÚSCULAS, curto), `genero`, `partes` (total), `rotulo_parte` ("PARTE", "NOITE", "DIA"...), `narrador`, `personagens` (cada um com `nome`, `papel`, `personalidade`, `voz` com `descricao` e `instruct` em inglês, ex.: "male, young adult, low pitch", `visual`, `cor_legenda`; voz que vem de fora da tela com `etiqueta`, ex.: "INTERFONE · APTO 0"; o narrador com `"realce": true` na voz), `fatos` e `ganchos_abertos`.
- `estado.json`: `{"proxima_parte": 1, "resumo_ultima": ""}`.
- `regras.md`: as regras da série (quem é o protagonista, tom, o que nunca mostrar, quando cada segredo pode aparecer) e "a verdade" escrita para as próximas sessões.
- `roteiro-geral.md`: premissa, a verdade, formato (qual de `estrutura.md` da `roteirizar-episodio`), calendário previsto (data e hora de cada parte, a última marcada "FINAL → filme 16:9 e série nova") e a tabela **"As N partes"** com `| # | Título | O que acontece | Cliffhanger / chamada |`, uma linha por parte. A rotina usa a última linha dessa tabela para saber qual é a parte final: nunca deixe linha a mais nem a menos.
- Acrescente a série no fim de `public/series/_historias/series.json` (`{"ordem": [...]}`).

## 3. Parte 1 e entrega
1. Escreva `ep01.json` com a skill `roteirizar-episodio` (passos 2 a 4: texto, cenas, `validar` sem avisos). Se for a rotina do dia em que não há série em andamento, siga a produção normal da parte 1 (voz, render, entrega); se for o dia da última parte de outra série, deixe só o rascunho para o Iuri revisar.
2. Personagens novos precisam de voz guardada antes do `vozes`: `npx tsx ferramentas/escolher-voz.ts <serie> <id> --auto` (a rotina faz isso no passo 5 da `roteirizar-episodio`).
3. `npm run dados -- salvar <serie> _historias` (salva a série nova e o `series.json`).
4. No aviso ao Iuri: título, premissa em 2 linhas, quantas partes, gênero, calendário e o roteiro da parte 1 (`npm run roteiro -- <serie> 1`). Ele pode responder com correções até as 16h, como nas outras partes.
