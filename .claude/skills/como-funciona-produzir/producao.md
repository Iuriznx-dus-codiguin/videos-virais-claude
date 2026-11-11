# Produção visual do Como Funciona (visual limpo, 11/11)

Pedido do Iuri (11/11): os vídeos não evoluíam, o apresentador era simples demais, as peças pareciam bugadas e difíceis de entender. Os dois vídeos que ele mandou (a barragem e o muro de arrimo) mostram o caminho: **a coisa no mundo de verdade, por dentro, falhando e sendo consertada, sem apresentador na tela**. Este arquivo substitui o de 01/11 (estúdio, pedestal, close do Tito). Continua valendo: render em qualidade média e algo novo na tela a cada 2 a 3 s.

Tudo aqui é campo do `epNN.json`. A lista completa está em `npm run catalogo` (cenários, FORMAS com o uso de cada forma, MATERIAIS, animações, movimentos, transições, efeitos, partículas). Modelo pronto para copiar: `exemplo-caixa-dagua.py` desta skill (leia para ver a estrutura; não grave a saída dele na pasta da série).

## 1. Escolher o mundo
| Tema | Cenário | Marca e apoio |
|---|---|---|
| Obra grande, água, energia, campo (barragem, muro, poço, caixa d'água, moinho, ponte, para-raios) | `campo` | `centro`, `esquerda`, `direita`, `fundo` no chão; casa com `forma: casa`; chão em corte com `terreno` |
| Trânsito e cidade (semáforo, bueiro, poste, lombada, ônibus, faixa) | `rua` | `rua`, `rua_esq`, `rua_dir`, `calcada` (alt 0,16), `calcada_fundo`, `esquina` |
| Casa, cozinha, banheiro, eletrodoméstico (liquidificador, torradeira, geladeira, descarga, chuveiro) | `cozinha` | `balcao` (tampo a 0,92 m), `balcao_esq`, `balcao_dir`, `parede` (com `alt`), `chao` |
| Mecanismo pequeno sem lugar óbvio (relógio, cadeado, zíper, caneta, motor) | `vitrine` | `centro`, `esquerda`, `direita`, `frente`, `fundo`; fundo infinito de estúdio de produto |
| Laboratório: o inventor | `oficina` (só a cena da invenção) | bancada perto de `[0, -1.05]`, `alt: 0.92` |

Os cenários limpos têm luz de produto e sombra macia; nenhum precisa de `filtro` (deixe sem, o `vivo` estoura o metal). A oficina continua com `"filtro": "sepia"`.

## 2. Montar a coisa como peça de verdade
- **Tamanho de verdade.** Uma caixa d'água de 1.000 L tem ~1,2 m de diâmetro; um liquidificador, ~0,4 m; uma casa térrea, 3 m de pé-direito. Escala errada é o que fazia as peças parecerem brinquedo quebrado.
- **Material em toda peça** (`material`): `metal`, `cromado`, `cobre` e `ouro` brilham; `vidro` e `agua` deixam ver o que tem dentro; `plastico` (padrão), `fosco`, `borracha`, `ceramica`, `madeira`, `concreto`, `tijolo`, `terra`, `pedra`, `grama`, `asfalto`, `tecido`; `luz` para lâmpada, LED e brasa (brilha sozinha). A `cor` continua mandando no tom.
- **Forma com cara de peça:**
  - `torno` + `perfil` (lista de `[raio, altura]` de baixo para cima) para o que é redondo. Coisa oca vai e volta: `[[0,0],[0.6,0],[0.6,1.2],[0.56,1.2],[0.56,0.04],[0,0.04]]` é um tanque com parede de 4 cm.
  - `extrusao` + `contorno` (lista de `[x, y]`) para o que é recortado: pá, lâmina, ponteiro, alavanca, suporte.
  - `engrenagem`, `mola`, `helice` (pás de verdade), `roda` (aro, pneu e raios).
  - `tubo` + `caminho` para cano, fio e mangueira.
  - `rachadura` (com `semente`) para a falha crescer na parede ou no chão.
  - Contexto: `terreno` (camadas grama/terra/pedra, mude com `camadas`), `casa` (oca, com porta e janela; `sem_telhado` para pôr algo em cima da laje), `arvore`.
- **Pai e filho:** peças que andam juntas (tanque e água, boia e haste) ficam com `pai`; mova só o pai.
- **Contexto ao redor:** a coisa nunca fica sozinha no vazio. No campo, a casa, uma árvore, a torre ao fundo; na cozinha, o balcão e a parede; na rua, a calçada e o prédio. É isso que dá a escala.

## 3. Ver por dentro
- `cortar` numa peça ou numa maquete inteira abre a vista em corte (o plano corre de `intensidade` até `posicao`; `eixo` padrão z, de frente para a câmera). O miolo aparece com tampa colorida e as peças de dentro ficam à mostra.
- `"solo": true` no `cortar` do `terreno` também corta o chão do cenário: o espectador vê as camadas de terra, o cano enterrado, a fundação. É a imagem mais forte das referências: use sempre que o tema tiver algo embaixo da terra.
- Corte cedo (até ~3 s) quando o segredo está dentro; deixe inteiro e corte no meio quando a graça é "olha o que tem lá dentro".
- `transparente` para uma carcaça ficar de vidro por um tempo (alternativa ao corte para mecanismo pequeno).

## 4. Cada degrau: falha → peça
| Momento | O que acontece na tela | Câmera | Efeito e som |
|---|---|---|---|
| "Se você..." (abertura, quadro 0) | a versão simples já funcionando no mundo: água correndo, carro passando, motor girando | plano médio em movimento (`arco` ou `travelling`), câmera explícita | sem transição no começo; som ambiente |
| MAS / SÓ QUE | a falha de verdade: `rachadura` cresce, água transborda (`fluxo` saindo), a parede tomba (`girar_para`), a peça esquenta (`aquecer`) ou treme (`tremer`) | close no lugar da falha com `zoom_rapido` | `zoom_soco` ou `tremor`, som `impacto`/`tensao_sobe`; `letreiro` vermelho de 1 a 2 palavras só no maior perigo ("VAZOU!", "DENGUE!") |
| Força invisível (peso, pressão, vento, empuxo) | `seta` + `empurrar` mostrando para onde a força vai | médio, a seta inteira no quadro | — |
| "Então, você..." | a peça nova aparece no lugar certo (`aparecer`, `crescer`, `mover` vindo de fora), com rótulo amarelo na palavra do nome | `detalhe` da peça com `arco` ou `aproximar` | `varrer` em metade dos degraus; `circular` na peça (no máximo um de cada vez) |
| Número (litros, metros, graus) | cartão com `contar` | médio | — |
| Virada final | a coisa inteira funcionando, câmera voando por ela | `aberto` com `arco` ou `subir` | `desfoque` para entrar |
| "Parabéns! Você construiu..." | a obra pronta no mundo | `aberto` com `arco` | `particulas` `confete` em cima da obra (use `em` e `alt` da obra) + `linhas` suaves |

## 5. Volta ao laboratório: os três trechos
| Trecho | Tela | Câmera e efeito |
|---|---|---|
| Abertura | a coisa no cenário limpo fazendo o estranho no quadro 0 | médio em movimento; nada de transição no começo |
| Oficina ("Em 1893...") | o inventor (`personagens` do episódio, sem `voz`) com o protótipo na bancada | entra com `desfoque`, `"filtro": "sepia"`, `aberto` com `descer`, depois `medio` com `travelling`; cartão com ano e inventor; MAS do protótipo com `fumaca`/`faiscas` + `zoom_soco` |
| Por dentro | de volta ao cenário limpo: a coisa abre em `cortar` e as peças acendem na palavra do nome | sai da oficina com `desfoque` ou `zoom`; `detalhe` com `arco`; rótulo + `circular` (ou `destacar` se a peça fica por dentro) |

## 6. Câmera
- **Sempre explícita** (`camera` e `alvo` em metros do cenário). Os enquadramentos automáticos (`detalhe`, `medio`) foram feitos para o estúdio e erram no mundo limpo.
- Referências do ep21 (casa de 6 × 3 × 5 m no `centro` do campo, cortada de frente; chuveiro em `[2.2, 2.18, -1.2]`, caixa na laje): geral da casa e do chão em corte `camera [-3.5, 2.6, 13.5] alvo [0.6, 0.6, 1.0]`; cano enterrado `camera [1.2, -0.35, 7.6] alvo [1.8, -0.6, 4.4]`; chuveiro por dentro `camera [0.9, 2.0, 1.9] alvo [2.2, 1.55, -1.2]`; caixa na laje `camera [4.6, 5.0, 2.2] alvo [2.2, 4.0, -1.2]`. A câmera de um detalhe fica a 2 a 4 m da peça; a de um geral, a 10 a 15 m.
- Corte de plano a cada 2 a 3 s; nunca mais de dois planos seguidos com o mesmo movimento. Movimentos: `arco`, `travelling`, `aproximar`, `subir`, `descer`, `zoom_rapido` (MAS), `dolly_zoom` (uma vez por vídeo, no maior susto).
- Plano que mira uma peça oculta começa quando ela aparece.

## 7. Legenda, rótulo e cartão
- A **legenda limpa** liga sozinha nos cenários limpos: 1 a 3 palavras do mesmo tamanho, a palavra em MAIÚSCULAS no texto da fala sai amarela. Escolha a palavra que é a peça ou o problema ("BOIA", "TRANSBORDA").
- **Rótulo** amarelo preso na peça, 1 a 3 palavras, no máximo 2 ao mesmo tempo, na palavra do nome dela.
- **Cartão** só para número de susto ou conceito com nome; no máximo 3. Ano escrito, sem `contar` (o contador põe ponto de milhar).
- **Zona segura:** os botões do Shorts e do Reels ficam nos ~150 px da direita e o título da plataforma nos ~400 px de baixo. Nada importante colado na direita; letreiro com `altura` entre 0,15 e 0,6.

## 8. Ritmo, primeiro quadro e capa (pesquisa de 03/11, continua valendo)
- **Primeiro quadro:** o plano 1 começa em `inicio` sem transição e já em movimento, com a coisa fazendo o estranho no quadro 0. Água ou fluxo que já corre começa antes (`"de": "inicio-3"`). Ele também é a miniatura no feed.
- **Algo novo na tela a cada 2 a 3 s:** peça aparecendo, falha, rótulo, corte, seta ou começo de movimento. Nada parado mais de ~4 s.
- **Re-gancho no meio (35 a 45 s):** o MAS mais forte leva o efeito mais forte (`dolly_zoom`, `letreiro` vermelho ou a maior falha).
- **Capa (`postagem.capa`):** a coisa em corte no momento mais curioso (a falha, a peça que resolve). Nunca um quadro de transição, da oficina escura ou da chamada.
- Som: `chicote`, `zoom` e `varrer` já tocam um whoosh sozinhos; não ponha outro.

## 9. Conferir antes do render
O mundo limpo não tem conferência automática de peça (o `enquadramento` só serve para a oficina). Gere quadros em cada degrau, no meio de cada corte, em cada falha e no confete: `npm run quadro -- como-funciona <n> <segundos...> --escala=0.3`. Em cada quadro: a coisa aparece inteira e grande? A peça está apoiada (nem flutuando, nem enterrada, nem atravessando outra)? O corte mostra o miolo? O rótulo aponta para a peça certa? A falha dá para ver sem som? Corrija e gere de novo antes de gastar render.

**Erros que já aconteceram no ep21 (não repita):**
- Casa afundada: a `pos` é o **meio** da peça; para uma casa de pé-direito 3 m sem telhado, o meio fica a 1,55 m do chão.
- Torre aparecendo antes da hora: maquete com `aparece` só surge na âncora dela; peças com `oculta` só surgem com `aparecer`.
- Água "entrando" no primeiro quadro: `fluxo` que já corre começa em `inicio-3`.
- Alavanca da boia apontando para cima: `girar_para` soma ao `giro` inicial; confira o sinal num quadro.
