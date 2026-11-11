# Migração para o visual limpo (fazer uma vez, no ramo dados)

Em 11/11 o Iuri pediu um Como Funciona mais profissional (vídeos de referência: a barragem e o muro de arrimo). As regras antigas de estúdio, maquete cartoon e Tito na cena deixaram de valer. Na primeira rodada depois do PR, troque as linhas abaixo em `public/series/como-funciona/` e salve com `npm run dados -- salvar como-funciona`. Se as linhas já estiverem trocadas, não faça nada.

## regras.md

Troque a linha que começa com `- (2026-10-25) Maquete cartoon com peças grandes e coloridas` por:

```
- (2026-11-11) Visual limpo, como nos vídeos da barragem e do muro de arrimo que o Iuri mandou: a coisa no mundo de verdade (campo, rua, cozinha ou vitrine), no tamanho de verdade, com material (metal, vidro, concreto, terra), vista em corte por dentro (`cortar`, e `"solo": true` para abrir o chão) e a falha acontecendo na tela antes de cada peça nova. Nada de estúdio, pedestal nem contorno cartoon. Até ~30 peças; no máximo 2 rótulos na tela ao mesmo tempo, rótulos de 1 a 3 palavras.
```

Troque a linha que começa com `- (2026-10-25) Plano parado no máximo ~4 s` por:

```
- (2026-11-11) O Tito é só a voz: todas as falas com `"off": true` e nenhum personagem na cena, a não ser o inventor na oficina do laboratório. Câmera sempre com `camera` e `alvo` explícitos voando pelo mundo; corte a cada 2 a 3 s e plano parado no máximo ~4 s. O Iuri achou o boneco simples demais e a tela com ele perdia tempo da coisa.
```

Na linha `- (2026-10-27) No "você constrói": ...`, troque `tudo no estúdio, numa cena só, com a maquete ganhando` por `tudo numa cena só, no mundo da coisa, com a maquete ganhando`.

Na linha `- (2026-11-01) Dois frameworks ...`, troque `por dentro no estúdio, com MAS` por `por dentro no mundo da coisa, em corte, com MAS`.

Na linha `- (2026-10-25) O Tito narra tudo e é a única voz.`, acrescente no fim: ` Escreva para a voz ter vida (11/11): perguntas de verdade, exclamação no espanto e no "Parabéns!", frases de 6 a 14 palavras, "tom": "animado" no gancho, na virada e no Parabéns e "tom": "tenso" nos MAS.`

## estilos.md

Na seção "Framework 1", passo 1 do esqueleto: troque `no estúdio, com a maquete fazendo algo estranho ou o Tito em close` por `no mundo da coisa (cenário limpo), com ela fazendo algo estranho no quadro 0`.

Passo 3: troque `de volta ao estúdio, a maquete de hoje peça por peça` por `de volta ao mundo da coisa, ela abre em corte e as peças aparecem uma por uma`.

Na seção "Na tela" do Framework 1, troque as linhas que começam com `- Três cenas:` e `- Estúdio:` por:

```
- Três cenas: abertura no cenário limpo do tema → oficina (inventor e protótipo, transição `desfoque`, filtro `sepia`) → de volta ao cenário limpo, com a coisa em corte.
- Por dentro: peça nova aparece na palavra do nome, com rótulo de 1 a 3 palavras (no máximo 2 na tela) e som pop ou ding; `circular` ou `destacar` nela. Cartões para o ano, o conceito e um número curioso. O Tito não aparece (narra em off).
```

Na lista do MAS (`### A virada com MAS`), troque `o plano vai para o close do Tito, para o inventor ou para a peça que daria errado` por `o plano vai para o inventor ou para a peça que daria errado, e a falha acontece na tela`.

Em "Só neste framework" do Framework 2, troque a linha que começa com `- Tudo no estúdio, numa cena só:` por:

```
- Tudo numa cena só, no mundo da coisa (campo, rua, cozinha ou vitrine): a maquete começa na versão do "Se você..." e ganha uma peça a cada "Então, você..." (na palavra do nome dela, com rótulo e som pop ou ding). No problema, a falha acontece na tela (racha, transborda, tomba, vaza, esquenta) com tensao_sobe ou impacto e zoom_soco ou tremor, em close no lugar da falha. Use corte (`cortar`, `"solo": true`) para mostrar o que fica dentro ou embaixo da terra. No "Parabéns!", a obra inteira com câmera voando e confete. Cartões só para um conceito ou um número de susto (no máximo 3).
```

No "Vale para os dois" > "Linguagem", troque `frases de até ~15 palavras` por `frases de 6 a 14 palavras, com pergunta e exclamação onde a pessoa falaria assim (a voz entoa pela pontuação)`.

## biblia.json (voz do Tito)

No `personagens.tito.voz`, acrescente (sem mexer em `instruct`, `amostra` nem `semente`, e sem apagar `vozes/tito.pt`):

```
"velocidade": 0.92,
"tratamento": "locutor"
```

As vozes já geradas ficam no cache com a chave antiga e não mudam; só as falas novas saem no jeito novo.
