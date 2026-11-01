# Produção visual das histórias

Pedido do Iuri (01/11): menos foco em nitidez, mais **produção**. O vídeo tem que parecer editado por alguém: câmera que se mexe com intenção, transições, letreiros, partículas e cor de cena. O render já sai em qualidade média (20 a 35 MB); o tempo que sobra vai para isto.

Tudo aqui é campo do `epNN.json`. A lista completa com o que cada um faz está em `npm run catalogo` (MOVIMENTOS, TRANSIÇÕES, EFEITOS, FILTROS, PARTÍCULAS).

## Cada batida tem a sua ferramenta

| Batida | Câmera | Transição / efeito |
|---|---|---|
| Gancho (0–3 s) | `geral` ou `drone` com `arco` (grua que revela o lugar) ou `descer` | o primeiro quadro já mostra a situação; `linhas` na palavra do susto |
| Promessa e alerta | `close` com `zoom_rapido` na palavra em MAIÚSCULAS | `linhas` (no máximo 2 por vídeo) |
| Instinto errado | `travelling` acompanhando quem faz a besteira | corte seco |
| Relógio | `close` ou `aberto` com `aproximar` | `letreiro` com o prazo ("2 DIAS", "ANTES DO ESCURO") ou `cartoes` com `contar` ("DIA #") |
| Corrente de problemas | alterne close, médio e aberto; nada de dois `aproximar` seguidos | `chicote` quando a ação troca de lugar ou de personagem; `circular` na pista (pegada, nome no manifesto, peça quebrada) |
| Falsa segurança | `aberto` com `arco` ou `travelling` lento | cena com `filtro: "quente"` |
| Virada | `close` de quem percebe com `dolly_zoom` (intensidade 0,7 a 0,9) | entra com `transicao: "zoom"`; `barras` da virada até o fim; `destacar` no detalhe que revela; som `impacto` ou `tensao_sobe` |
| Chamada | close claro do protagonista | sem efeito por cima |

## Regras de uso
- **Movimento em todo plano**, escolhido pelo que a fala pede: `travelling` em quem anda ou conversa, `arco` nas aberturas e chegadas, `zoom_rapido` em susto e ênfase, `dolly_zoom` uma vez só (a virada), `aproximar` em suspense lento, `fixo` só em plano curto de reação. Nunca mais de dois planos seguidos com o mesmo movimento.
- **Transições:** pelo menos 3 estilos diferentes por parte, mas no máximo 1 a cada 3 cortes (o resto é corte seco, que dá ritmo). Nunca dois `chicote` seguidos. Em diálogo de dois personagens, corte seco entre eles; transição só quando muda o lugar, o tempo ou o assunto.
  - Pulo de tempo ("no fim da tarde", "de noite"): `transicao: "desfoque"` + `letreiro` com a hora.
  - Lembrança ou o que alguém contou: cena com `filtro: "sepia"` (ou `noir` se for pesadelo), entrando e saindo com `desfoque`.
  - Troca de lugar ou ação rápida: `chicote`. Entrar num detalhe (buraco, porta, papel): `zoom`.
  - `iris` só no fim de um bloco que vira a página, e `varrer` não combina com suspense: evite nas histórias.
- **Letreiro:** no máximo 3 palavras, um a cada ~20 s. Só para tempo, lugar ou prazo, e nunca a mesma palavra que está sendo falada (se a fala diz "fim da tarde", o letreiro não diz "FIM DA TARDE": ponha-o antes da fala ou use outra informação, como "18H").
- **Cor da cena (`filtro`):** noite = `frio`; pôr do sol e alívio = `quente`; perigo e virada = `dramatico`. Uma cor por cena; sem filtro também vale.
- **Partículas:** a fogueira acesa leva `particulas` com `particula: "fagulhas"` (mesmo `em`, `alt` 0.3); destroços e sinal de fumaça, `fumaca`. A selva já traz folhas e feixes de sol (de dia) e vaga-lumes (à noite); a cabine e a toca, poeira na luz; a praia à noite, vaga-lumes. Só desligue com `"atmosfera": false` se atrapalhar um close.
- **Destaque e círculo:** `circular` serve para objeto, pegada, papel ou parte do cenário (o alvo pode ser ponto `[x, y, z]`); `destacar` escurece em volta de um personagem, objeto ou ponto (no close vira um holofote no rosto).
- Som: `chicote`, `zoom` e `varrer` já tocam um whoosh sozinhos; não ponha outro.

## Conferir antes do render
Além do enquadramento, gere quadros nos cortes com transição (0,1 s antes e depois), no meio de cada `letreiro`, `circular` e `destacar` e no plano do `dolly_zoom`: `npm run quadro -- <serie> <parte> <segundos...> --escala=0.4`. O círculo precisa abraçar o objeto certo e o letreiro não pode tampar o rosto de quem fala (ele fica a 30% da altura; mude com `"altura"`, de 0 = topo a 1 = pé, ou ponha num plano aberto).

## Exemplo (parte 6 do Voo 818 refeita em 01/11)
Gancho com `arco` sobre o acampamento → `zoom` para o geral seguinte → `chicote` para o close do Davi → "sabe DEMAIS" com `zoom_rapido` + `linhas` → `chicote` para o farol com `circular` nele. "Aí eu vou" com `dolly_zoom` no Otávio, `letreiro` "2 DIAS". Cena da jangada entra com `desfoque` + `letreiro` "FIM DA TARDE" e `filtro: "quente"`. Virada: `zoom` no close do Davi, `barras` até o fim, `dolly_zoom` + `destacar` no Otávio, `linhas` em "MECÂNICO".
