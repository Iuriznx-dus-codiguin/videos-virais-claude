# Pendências do motor (Como Funciona)

- (2026-10-26, ep02 lâmpada) Maquete com `escala` no objeto: as peças crescem, mas o `caminho` dos fluxos com `peca` = id da maquete não acompanha a escala (as bolinhas de gás/luz saíam perto da base). Por ora: não use `escala` em maquete que tem fluxo com caminho.
- (2026-10-26) `pai` deixa a `pos`/`caminho` da peça relativos à peça-mãe (soma a posição). Documentar em tipos.ts > Peca, ou escrever as medidas da filha já relativas.
- (2026-10-26) Falta uma animação para escurecer/mudar a cor de uma peça (vidro ficando preto); hoje é feito com uma esfera escura `oculta` que aparece.
