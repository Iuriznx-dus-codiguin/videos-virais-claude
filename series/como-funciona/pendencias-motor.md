# Pendências do motor (Como Funciona)

- (2026-10-26, ep02 lâmpada) Maquete com `escala` no objeto: as peças crescem, mas o `caminho` dos fluxos com `peca` = id da maquete não acompanha a escala (as bolinhas de gás/luz saíam perto da base). Por ora: não use `escala` em maquete que tem fluxo com caminho.
- (2026-10-26) `pai` deixa a `pos`/`caminho` da peça relativos à peça-mãe (soma a posição). Documentar em tipos.ts > Peca, ou escrever as medidas da filha já relativas.
- (2026-10-26) Falta uma animação para escurecer/mudar a cor de uma peça (vidro ficando preto); hoje é feito com uma esfera escura `oculta` que aparece.
- (2026-10-27, ep02) `aparecer` depois de `sumir` na mesma peça não traz a peça de volta (a escala do `sumir` fica em 0). Por ora: uma cópia `oculta` da peça que aparece no lugar (ex.: `fio_velho`, cópia do `fio_carvao`).
- (2026-10-27, ep02) `olhar: "camera"` só vira a cabeça; o corpo continua para o `olhando` da cena e, em close de três quartos, o rosto sai pela borda. Por ora: `faz: "virar", para: [x, y, z]` com a posição da câmera do plano, ou planos de frente.
- (2026-10-27, ep02/ep03) Cartão: o texto grande tem fonte fixa de 120 px e não quebra palavra; palavra com mais de ~8 letras vaza da caixa (INCANDESCÊNCIA, EVAPORAÇÃO, AR-CONDICIONADO). Por ora: hífen escondido (U+00AD) no meio da palavra ou palavra curta. A legenda também não diminui palavra longa (INCANDESCÊNCIA encosta nas duas bordas).
- (2026-10-27, ep02) `validar`/`enquadramento` não avisam (a) fala com `off: true` enquanto o plano mostra quem fala em close ou médio (a boca fica parada) nem (b) cartão por cima do rosto num close (o cartão ocupa ~17–39% da altura). Por ora: tire o `off` das falas com o Tito em quadro e, enquanto houver cartão, use plano médio ou detalhe da peça.
