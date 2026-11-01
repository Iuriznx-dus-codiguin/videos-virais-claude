# Produção visual do Como Funciona

Pedido do Iuri (01/11): menos foco em nitidez, mais **produção**. O vídeo tem que parecer editado por alguém: a maquete ganhando vida, câmera que se mexe com intenção, transições, números contando, partículas e comemoração no fim. O render já sai em qualidade média (20 a 35 MB); o tempo que sobra vai para isto.

Tudo aqui é campo do `epNN.json`. A lista completa com o que cada um faz está em `npm run catalogo` (MOVIMENTOS, TRANSIÇÕES, EFEITOS, FILTROS, PARTÍCULAS).

## Cada degrau tem a sua ferramenta

| Momento | Câmera | Transição / efeito |
|---|---|---|
| "Se você..." (abertura) | `detalhe` da maquete com `arco` (contorna a peça e revela) | o primeiro quadro já mostra a coisa funcionando do jeito simples |
| Problema (MAS / SÓ QUE) | close do Tito com `zoom_rapido` na palavra do problema | a falha acontece na maquete com partícula (`vapor`, `faiscas`, `fumaca`, `bolhas`) + `zoom_soco`, `tremor` ou `flash`; `linhas` (cor `#FFE14A`) no maior susto |
| Perigo de verdade (explodir, pegar fogo, choque) | close do Tito com `dolly_zoom` (uma vez por vídeo) | `letreiro` de 1 a 2 palavras em vermelho (`"cor": "#FF3B30"`): "PERIGO!", "VAZOU!" |
| Solução ("Então, você...") | `detalhe` da peça nova com `arco` ou `aproximar` | entra com `transicao: "varrer"` (o carimbo de "passo novo"); a peça aparece na palavra do nome com rótulo e `circular` nela (ou `destacar`, se ela fica por dentro) |
| Número (temperatura, pressão, volts, litros) | `detalhe` ou `medio` | `cartoes` com `contar`: `"grande": "# °C", "contar": [20, 100]` (o número sobe na tela) |
| Volta para o Tito | `medio` com `travelling` | `chicote` ou corte seco |
| Virada final / curiosidade | `aberto` com `arco` | `desfoque` para entrar e cena com algo novo na tela |
| "Parabéns! Você construiu..." | `aberto` com `arco` em volta do Tito e da maquete | `particulas` com `particula: "confete"` e `aparece` na palavra "parabens" (em cima do pedestal: `em: [0, 0]`, `alt` 1.5, `raio` 1.4) + `linhas` suaves (intensidade 0.6); pode fechar com `iris` só se o plano final for longo |

## Regras de uso
- **Movimento em todo plano:** `arco` nos detalhes da maquete, `travelling` no médio do Tito, `zoom_rapido` nos MAS/SÓ QUE, `dolly_zoom` uma vez só. Nunca mais de dois planos seguidos com o mesmo movimento (o vídeo de 31/10 tinha quase tudo `aproximar`: não repita).
- **Transições:** `varrer` em pelo menos metade dos "Então, você..." (no máximo um a cada dois cortes seguidos); `zoom` para entrar no miolo da maquete; `chicote` para voltar ao Tito; o resto, corte seco. Pelo menos 3 estilos diferentes por vídeo.
- **Partículas na maquete:** use o mesmo `em` da maquete (`[0, 0]` no pedestal) e `alt` = 1,0 (tampo) + altura da peça. `vapor` em panela, chaleira, chuveiro; `faiscas` em fio, tomada, resistência (na falha); `bolhas` em água fervendo; `fumaca` em motor ou coisa queimando. Ligue com `aparece` na palavra do problema e desligue com `some` quando a peça nova resolver.
- **Círculo e destaque:** no máximo um de cada vez, junto com o rótulo da peça; o rótulo continua com 1 a 2 palavras.
- **Letreiro:** no máximo 2 por vídeo e nunca nos primeiros 3 s (ali quem fala é a maquete). Não use para repetir a legenda.
- **Cor:** a cena do estúdio fica bem com `"filtro": "vivo"`. O estúdio já traz feixes de refletor e poeira azul no ar (não precisa pedir).
- Som: `chicote`, `zoom` e `varrer` já tocam um whoosh sozinhos; não ponha outro.

## Conferir antes do render
Além do `validar` e do enquadramento, gere quadros nos cortes com transição (0,1 s antes e depois), no meio de cada `circular`, `destacar` e `letreiro`, num momento com partícula ligada e no confete: `npm run quadro -- como-funciona <n> <segundos...> --escala=0.4`. O círculo precisa abraçar a peça certa (ele já pega o tamanho da peça), a partícula tem que sair da peça certa e o letreiro não pode tampar a maquete nem os olhos do Tito (ele fica a 30% da altura; mude com `"altura"`, de 0 = topo a 1 = pé).

## Exemplo (#6 Panela de pressão refeita em 01/11)
Abertura com `arco` na panela e `vapor` saindo quando a água ferve; cartões "# °C" contando de 20 a 100 e de 100 a 120; "Então, você coloca uma BORRACHA" com `varrer` + `circular` na borracha; "pode EXPLODIR" com `dolly_zoom` no Tito, `letreiro` "PERIGO!" vermelho e `linhas`; pino com `destacar` e jato de `vapor` quando chia; válvula com `circular`; "Parabéns!" com `arco`, `confete` e `iris` no fim.
