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

## Ritmo, primeiro quadro e capa (pesquisa de 03/11)
O Shorts e o Reels decidem em menos de 1 s se mostram o vídeo para mais gente (quanta gente desliza logo no começo). Então:
- **Primeiro quadro:** o plano 1 começa em `inicio` sem transição (nada de `preto`, `iris` ou `desfoque` no começo) e já em movimento (`arco` ou `descer`), mostrando o lugar e quem está em perigo. Ele também é a miniatura do vídeo no feed.
- **Algo muda na tela a cada 2 a 3 s:** corte, começo de um movimento, efeito ou ação de personagem. Nenhum plano igual por mais de ~4 s.
- **Pista plantada** (`estrutura.md`): num plano aberto ou médio dos primeiros ~10 s, sem `circular` nem `destacar`; na virada, o mesmo detalhe volta em close com `circular`.
- **Zona segura:** os botões do Shorts e do Reels ficam na faixa da direita (~150 px) e o título e a legenda da plataforma, nos ~400 px de baixo. Rosto, pista, letreiro e rótulo ficam fora delas (a legenda das falas já se ajusta sozinha). Letreiro alto demais também some atrás do topo: deixe entre `altura` 0,15 e 0,6.
- **Capa (`postagem.capa`):** um close do personagem com expressão forte ou o quadro do gancho com o perigo bem claro, com uma palavra de impacto na legenda. Nunca o quadro da virada (estraga a surpresa), um quadro de transição ou um quadro escuro. Confira com `npm run quadro -- <serie> <parte> <segundo> --escala=0.5`.

## Narração na tela (11/11)
Pedido do Iuri em 11/11: mais profissional e que prenda até o fim. Estes recursos vieram da referência 2D (`estrutura.md`, formato "regras e contradição") e valem para qualquer série de histórias. Os nomes e opções estão em `npm run catalogo` (MANCHETE, RELÓGIO, INSERÇÕES, SÉRIE).
- **Manchete** (`manchetes` na cena: `{"de", "ate", "texto", "cor"}`): frase curta no alto (até ~40 letras), a palavra-chave entre asteriscos sai colorida (`"SEU JORGE *SUMIU* HÁ 7 DIAS"`, vermelho por padrão; `"cor": "#2FD27A"` para boa notícia). Uma por batida, trocando a cada 3 a 6 s. Não repete a legenda palavra por palavra: resume a batida ("REGRA 1 — *O PORTÃO NÃO ABRE*").
- **Relógio** (`relogio` na cena: `{"de", "hora": "03:00", "ate_hora": "03:11"}`): relógio digital no canto de cima; com `ate_hora` os minutos correm durante a cena. Use a partir da hora do perigo, com horas quebradas.
- **Inserções em tela cheia** (`insercoes` na cena: `{"de", "ate", "tipo", ...}`), o objeto ocupa a tela com um leve balanço:
  - `celular`: `titulo` (nome do grupo ou contato) e `mensagens` (`[{"de", "texto", "eu"}]`, aparecem uma a uma) ou `linhas` (notificação);
  - `bilhete`: `titulo` e `linhas` (papel pautado, linha a linha);
  - `radio`: rádio comunicador com a onda de quem fala (`quem`);
  - `interfone`: visor com `titulo` ("APTO 0"), "CHAMANDO" piscando até `quem` falar e a onda da voz; com `linhas`, as teclas do interfone (a última pisca em vermelho: "o botão a mais"); sem `quem`, interfone parado ("PORTARIA");
  - `cctv`: por cima da imagem 3D, como câmera de segurança (cinza, chuvisco, ● REC, `titulo` "CAM 4 · GARAGEM" e `hora` correndo). Ponha o plano 3D de cima e de longe, como câmera de parede.
  Pelo menos uma por parte; a de diálogo (celular, interfone, rádio) fica no máximo ~4 s sem trocar de imagem.
- **Etiqueta da voz** (`etiqueta` do personagem na bíblia): aparece acima da legenda só quando ele fala em off (interfone, rádio, telefone).
- **Voz pelo alto-falante:** fala que chega pelo interfone, rádio ou telefone leva `"tom": "interfone"` (som de alto-falante, comprimido). Não use voz de sussurro (`whisper` no `instruct` da bíblia): sai só chiado, o Whisper ouve "tchau tchau tchau" e nenhuma semente salva (11/11).
- **Selo com contador:** `partes` (total) e `rotulo_parte` ("NOITE", "DIA") na bíblia fazem o selo dizer "APARTAMENTO 0 • NOITE 1/7".
- **Voz do narrador com presença:** `"realce": true` na `voz` do narrador (bíblia) passa a voz por compressão e brilho, para ela não soar "morta". Muda o áudio de todas as falas dele (são regeneradas na próxima rodada de `vozes`).
- **Câmera colada em objeto pequeno não funciona** (monitor, interfone, livro viram mancha sem detalhe): mostre o objeto com uma inserção e deixe o 3D para pessoas e lugares.
- **Vulto e suspeito:** cabeça escura (`cabeca` bem escura na bíblia) não recebe a luz do rosto e vira silhueta; o acessório `capuz` cobre a cabeça e deixa o rosto no escuro.

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
