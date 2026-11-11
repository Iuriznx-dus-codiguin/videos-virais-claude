---
name: como-funciona-produzir
description: Produz o vídeo do dia do Como Funciona (tema da pauta, roteiro no framework do tema, "volta ao laboratório" ou "você constrói", mundo 3D no visual limpo com corte por dentro, voz do Tito em off, render e entrega). Use na rotina das 3h do Como Funciona ou quando pedirem "produza o Como Funciona #N".
---

# Produzir o Como Funciona do dia

Fluxo **separado** do de aventura: só mexa em `motor/public/series/como-funciona/`. Não edite `_historias/regras.md`, outras séries nem as skills `roteirizar-episodio`/`aplicar-correcoes`. Fale com o Iuri em português, curto. **A publicação é manual: nunca publique nada.**

## O visual novo (pedido do Iuri em 11/11; vale sobre tudo o que falar de estúdio, pedestal ou Tito na cena)
O Iuri mandou de novo dois vídeos que viralizaram (a barragem e o muro de arrimo) e disse que os nossos não evoluíam: apresentador simples demais, peças bugadas e mal feitas, difíceis de entender, voz sem vida. O que eles têm e nós não tínhamos:
1. **Nada de apresentador na tela.** Todo segundo é a coisa: a obra, a falha, a peça que resolve. O Tito é **só a voz** (todas as falas com `"off": true`, nenhum personagem na cena, a não ser o inventor na oficina).
2. **A coisa no lugar de verdade e no tamanho de verdade**, nunca num pedestal: barragem no vale, muro no quintal, caixa d'água em cima da casa, liquidificador no balcão da cozinha, semáforo na esquina. Cenários de visual limpo: `campo`, `rua`, `cozinha`, `vitrine` (fundo infinito para mecanismo pequeno). O `estudio` com pedestal não é mais usado.
3. **Material de verdade, sem contorno preto:** metal que brilha, vidro e água transparentes, concreto, tijolo, terra, madeira (campo `material` da peça). Peça tem cara de peça.
4. **Ver por dentro com corte:** o chão abre de lado e mostra as camadas (`terreno` + `cortar` com `"solo": true`), a casa e a caixa abrem ao meio (`cortar`), o miolo aparece pintado. É o que torna fácil de entender.
5. **A falha acontece na tela** antes de cada peça nova: racha (`rachadura` crescendo), transborda (`fluxo` de água saindo), tomba (`girar_para`), vaza, esquenta (`aquecer`), pinga. Sem a falha, a peça não tem motivo.
6. **Rótulo amarelo preso na peça** quando ela aparece ("BASE LARGA", "VERTEDOURO"), **setas de força** empurrando (`seta` + `empurrar`), e corte de plano a cada 2 a 3 s com a câmera voando pelo mundo.
7. **Legenda limpa:** 1 a 3 palavras do mesmo tamanho, a palavra-chave em amarelo. Ela liga sozinha nos cenários limpos; a palavra-chave é a que está em MAIÚSCULAS no texto (uma por fala, no máximo duas).

**Migração (uma vez):** se `public/series/como-funciona/regras.md` ainda tiver as linhas de estúdio, maquete cartoon, Tito apontando ou "tudo no estúdio", troque-as pelas linhas de `migracao-visual.md` desta skill (e a seção "Na tela" de `estilos.md`, como ele diz) e salve com `npm run dados -- salvar como-funciona`. Depois disso, as regras do ramo dados valem como sempre.

**Produção:** ao escrever o `epNN.json` (passo 3), leia e aplique `producao.md` desta skill: o mundo de cada tipo de tema, o corte, as falhas, os rótulos, as setas e a câmera de cada degrau. O render sai em qualidade média (20 a 35 MB); mande o próprio mp4, sem cópia leve.

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar`.
2. Voz (uma vez por sessão, alguns minutos): `bash voz/instalar.sh`. Se falhar por rede (huggingface.co, *.hf.co, download.pytorch.org, download-r2.pytorch.org), siga sem voz e diga no aviso final qual host foi bloqueado. Nunca finja que há voz.
3. Quantos vídeos hoje: calendário em `motor/producao/COMO-FUNCIONA.md` (seg–qui 1; sexta 3: sexta 18h + sábado 11h e 18h; sábado 2: domingo 11h e 18h; domingo nada). Confira `npm run dados -- entregas` para não refazer o que já foi entregue. Faça **um de cada vez**, passos 2 a 7. **Nunca rode `npm run vozes` e `npm run render` ao mesmo tempo** (dividem os 4 núcleos): termine um antes de começar o outro.
4. Se o `salvar` ou o `entregar` parar dizendo que outra sessão salvou a série depois do seu `baixar`, não force: junte a versão do ramo (fica em `out/dados-ramo/como-funciona/`) com a sua em `public/series/como-funciona/`, como a mensagem explica, e rode o mesmo comando com `--juntei`.
5. Leia só: `public/series/como-funciona/estilos.md` (os dois frameworks e a regra de escolha, obrigatório), `regras.md` (as regras de `_historias` não valem aqui: sem cliffhanger nem limite de 1 min), `estado.json`, `biblia.json` e o item `n = proxima_parte` de `pauta.json`. Se faltarem 10 itens pendentes ou menos, acrescente 20 temas novos no fim da pauta (mesmo formato, sem repetir, variando cozinha, banheiro, rua, transporte, energia, cidade, grandes obras), cada um com `framework` (e `estilo`, se for laboratório) pela regra de `estilos.md`, sem mais de 3 seguidos no mesmo framework.

## 2. Framework, pesquisa e roteiro
- **Framework:** o campo `framework` do item: `laboratorio` (invenção com inventor) ou `voce_constroi` (desenvolvido ao longo de anos). Sem o campo, decida pela pergunta de `estilos.md` ("dá para contar o momento em que alguém inventou isso?") e grave na pauta.
- **Volta ao laboratório:** confira com WebSearch inventor, ano, lugar, o problema que ele queria resolver, o primeiro protótipo e o que deu errado (se a autoria é disputada, "um dos primeiros" ou "a história mais contada"). Monte em tópicos antes de escrever:
  1. a **abertura** no `estilo` do item (mito, E SE, dúvida comum ou fato impossível, até 3 s), com a coisa fazendo o estranho no lugar dela, e a frase de ponte para o laboratório;
  2. o **laboratório** (10 a 15 s): inventor, ano, o problema e o MAS do primeiro protótipo, se houver;
  3. **por dentro** (35 a 45 s): de volta ao lugar da coisa, ela abre em corte e as peças aparecem na ordem em que fazem sentido, com pelo menos um MAS ("funciona assim, MAS daria errado, por isso existe esta peça"). Ache o MAS antes de escrever: qual peça existe para evitar um desastre?
  4. o **conceito** com nome (cartão) e a **curiosidade** final.
- **Você constrói:** o espectador constrói a coisa do zero. Monte a cadeia em tópicos antes de qualquer fala:
  1. o **"Se você..."**: o jeito mais simples que qualquer um pensaria, com o que acontece logo depois;
  2. **4 a 6 degraus**: problema que dá para ver ("MAS/SÓ QUE...") → peça de verdade que resolve ("Então, você...");
  3. a **virada final** (opcional): um bônus ou o fato mais surpreendente (o `gancho` da pauta costuma servir);
  4. **"Parabéns! Você construiu um(a) ___!"**, a última fala.
  Para cada degrau, escreva também **o que se vê**: a falha (racha, transborda, tomba, vaza, pinga) e a peça nova. Se um degrau não tem falha nem peça para mostrar, troque ou corte. Confira com WebSearch o jeito simples, o motivo de cada peça e o fato da virada.
- Na dúvida, deixe o fato de fora; nunca invente número.
- **Linguagem (os dois):** palavras de conversa, frases curtas, nome técnico só com a explicação na mesma frase, MAS/SÓ QUE em MAIÚSCULAS. No "você constrói", segunda pessoa e nada de inventor ou data (fato histórico só se virar problema da cadeia).
- **Escrever para a voz ter vida (11/11):** a voz do Tito saía sem energia. O OmniVoice entoa pela pontuação, então escreva como se fala animado: perguntas de verdade ("E se a boia travar?"), exclamação no espanto e no "Parabéns!", frases de 6 a 14 palavras, uma ideia por frase, vírgula onde a pessoa respira. Use `"tom": "animado"` no gancho, na virada e no Parabéns, e `"tom": "tenso"` nos MAS. Nada de frase longa cheia de "que" e "onde": ela sai monótona.
- **Retenção (pesquisa de 03/11, pedido do Iuri: os vídeos não passavam de mil visualizações).** O Shorts mostra o vídeo primeiro para poucas pessoas e só empurra se quase ninguém deslizar no começo e muita gente for até o fim; no Instagram, o que mais leva para quem não segue é a pessoa mandar o vídeo para alguém. Por isso, nos dois frameworks:
  - **primeiro segundo:** a primeira fala tem até ~15 palavras, sai no quadro 0, e a coisa já está fazendo o estranho no primeiro quadro (água jorrando, parede rachando, fecho correndo). Teste do mudo: sem som, só com a imagem e a legenda dos 2 primeiros segundos, dá para entender a pergunta?
  - **pergunta aberta até o fim:** nos primeiros ~6 s fica clara a pergunta que o vídeo responde, e a resposta completa só chega no fim.
  - **laboratório curto:** inventor, ano e primeiro protótipo em até ~15 s. Varie a frase de ponte para a oficina: conte direto o problema do inventor ("Em 1893, um inventor queria fechar uma bota de uma vez só.").
  - **re-gancho no meio (35 a 45 s):** o MAS mais forte (ou o degrau mais surpreendente) cai nessa faixa.
  - **fim que puxa o recomeço:** a última fala se liga à primeira. Nada depois disso (sem "é isso", "gostou?" ou despedida).
  - **fato para mandar para alguém:** a curiosidade final (ou a virada do você constrói) é o fato que a pessoa conta para outra no mesmo dia.
- **Duração: ~1min20 com a voz real (75 a 90 s; nunca menos de 1 min).** A voz do Tito fala ~15–20% mais rápido que a estimativa do `validar` sem voz: mire em 90 a 105 s estimados e confira de novo depois do passo 5. O Tito é a única voz.
- **Título:** laboratório, a dúvida ou o fato impossível ("Por que o fio da lâmpada não pega fogo?"); você constrói, o desafio ("Construa uma caixa d'água do zero"). O título de busca da postagem é outro campo: veja `postagem.md`.
- **Chamada:** `pergunta` sobre o próximo tema da pauta no jeito do framework DELE (laboratório: a dúvida ou o mito dele; você constrói: o desafio, "E agora, topa construir um fogão do zero?"), `texto: "Comenta"`, `destaque` = campo `curto` do próximo item.

## 3. Escrever o episódio (`public/series/como-funciona/epNN.json`)
**Se `epNN.json` já existir** (roteiro mandado ao Iuri na véspera, passo 8), parta dele: aplique as correções que o Iuri mandou, revise e siga para o passo 4. Não reescreva do zero o que ele já leu. **Roteiro escrito antes de 11/11 (estúdio, pedestal, Tito na cena) mantém as falas e troca só a tela:** passe a cena para o cenário limpo do tema, tire o Tito da cena (falas `off`), refaça a maquete com material e corte e os planos com câmera explícita, como em `producao.md`.

Modelo pronto: `exemplo-caixa-dagua.py` desta skill (o script que gerou o vídeo de prova de 11/11: caixa d'água no campo: casa e chão em corte, tanque que sobe, boia, ladrão, torre). Vocabulário: `npm run catalogo` (cenários, FORMAS com o uso de cada forma nova, MATERIAIS, animações).
- **Você constrói, uma cena só, no mundo da coisa** (`campo` para obra grande, `rua` para trânsito e cidade, `cozinha` para casa e eletrodoméstico, `vitrine` para mecanismo pequeno). A versão do "Se você..." visível desde o quadro 0 e cada peça de degrau com `oculta: true`, aparecendo (`aparecer`, `crescer`) na palavra do nome dela, com rótulo e som. Em cada degrau: a falha acontece (com som `impacto`/`tensao_sobe` e `tremor`, `zoom_soco` ou `circular` no lugar da falha) e logo depois a peça que resolve.
- **Laboratório, três cenas:** 1) `gancho` no lugar da coisa (cenário limpo), ela fazendo o estranho; 2) `invencao` na `oficina` (transição `preto`), o inventor do dia em `personagens` do episódio, sem `voz`, com acessórios da época, o protótipo numa maquete na bancada (`em` perto de `[0, -1.05]`, `alt: 0.92`), câmera explícita e o inventor virado (`virar`) para ela, cartão com ano e inventor; 3) `por_dentro` de volta ao cenário limpo: a coisa abre em `cortar` e as peças aparecem na palavra do nome.
- **Maquete** (`modelos.<nome>`): medidas em **metros de verdade** a partir do apoio da marca (chão, tampo do balcão a 0,92 m). Peças com `forma`, `tam`, `pos` (o **meio** da peça), `cor`, `material`, `oculta`, `pai`, `giro`. Use as formas que dão cara de peça: `torno` com `perfil` para tudo que é redondo (copo, garrafa, bocal, lâmpada, lente, tanque, chuveiro), `extrusao` com `contorno` para tudo que é recortado (pá, ponteiro, lâmina, suporte), `engrenagem`, `mola`, `helice`, `roda`, `tubo` com `caminho` para cano e fio, `terreno` para o chão em corte, `casa` e `arvore` para o contexto. Coisa oca (tanque, copo, carcaça) é um `torno` com perfil de ida e volta (parede com espessura), para o corte mostrar a parede e o miolo. Até ~30 peças.
- **Tubo:** dê `pos` no meio do tubo e o `caminho` relativo a essa `pos`. Peça que some não volta com `aparecer`: use uma cópia oculta.
- **Animações** (`animacoes` da cena): `cortar` (vista em corte; `"solo": true` abre o chão), `empurrar` (seta de força, pistão), `girar`, `girar_para` (somam: para voltar ao mesmo lugar, voltas inteiras), `mover`, `aparecer`, `crescer` (água subindo, rachadura rachando, coluna), `sumir`, `aquecer`, `esfriar`, `pulsar`, `transparente`, `tremer`, `explodir`/`montar`, `fluxo` (agua, eletricidade, calor, ar, gas, luz: num `tubo` ou com `caminho`). A água que já corre no quadro 0 precisa começar antes (`"de": "inicio-3"`), senão as bolinhas ainda estão entrando.
- **Rótulos:** 1 a 3 palavras, no máximo 2 ao mesmo tempo, presos à peça, na palavra do nome dela. **Cartões:** no máximo 3, só para número de susto ou conceito; ano vai escrito, sem `contar`.
- **Câmera:** sempre `camera` e `alvo` explícitos (pontos em metros do cenário). O `detalhe` automático olha de cima e de longe; no mundo limpo ele erra. Algo novo na tela a cada 2 a 3 s e nada parado mais de ~4 s. Plano que mira uma peça oculta começa quando ela aparece.
- Âncoras sempre nas falas (`"f5:boia"`, `"f8:fim+0.3"`).
- **Postagem:** preencha o campo `postagem` seguindo `postagem.md` desta skill.

## 4. Validar e revisar como espectador
1. `npm run validar -- como-funciona <n>` sem avisos.
2. **Quadros antes da voz** (o mundo limpo não tem conferência automática de peça): `npm run quadro -- como-funciona <n> 0.1 <um segundo em cada degrau> --escala=0.3` e olhe cada um: a coisa aparece inteira e grande no quadro? A falha dá para ver? A peça nova está no lugar certo (nem flutuando, nem enterrada, nem atravessando outra)? O corte mostra o miolo? O rótulo aponta para a peça certa? Corrija posições e câmeras até todos passarem.
3. Releia o roteiro como quem rola o feed e corrija antes de gastar voz e render:
   - o framework é o do campo `framework` da pauta?
   - os 2 primeiros segundos fazem parar o dedo, sem som?
   - laboratório: o inventor aparece com cartão de ano? Tem pelo menos um MAS com falha na tela e a peça que resolve logo depois? O conceito tem nome e a curiosidade fecha o vídeo?
   - você constrói: pergunta-desafio + "Se você..." concreto? Cada degrau tem MAS/SÓ QUE + falha na tela + "Então, você..." com a peça aparecendo na palavra do nome dela? A última fala é "Parabéns! Você construiu um(a) ___!"?
   - uma criança de 10 anos entende só olhando a tela? A física está certa e os fatos dá para conferir?
   - nenhum personagem na cena fora da oficina? Todas as falas `off`?
   - a chamada cita o próximo tema da pauta, no jeito do framework dele?
   - tem um MAS ou degrau forte entre 35 e 45 s? A última fala puxa o recomeço e não sobra nada depois dela?
   - a `postagem` está completa e o título começa pelo que as pessoas buscam ("Como funciona o...")?
4. Melhore sempre um ponto em relação ao vídeo anterior (`resumo_ultima` e `regras.md`): o resultado final deve subir de nível a cada dia.

## 5. Voz
1. Voz do Tito guardada em `vozes/tito.pt` (o timbre fica: ele é o narrador fixo do canal; não troque por conta própria). Para a voz não sair "morta" (Iuri, 11/11), a `biblia.json` do Tito tem `voz.velocidade: 0.92` (fala um pouco mais devagar, perto dos vídeos de referência; o render 1.1x devolve o ritmo) e `voz.tratamento: "locutor"` (voz perto e presente, sem o fim da frase cair). Se a bíblia ainda não tiver esses campos, faça a migração de `migracao-visual.md` antes. A vida da voz vem principalmente do texto: pontuação, perguntas, exclamações e frases curtas (passo 2). Se `tito.pt` sumir: `npx tsx ferramentas/escolher-voz.ts como-funciona tito --auto`.
2. `npm run vozes -- como-funciona <n>` e, **logo em seguida**, `npm run dados -- salvar como-funciona` (se a sessão cair, as vozes não se perdem). O validar com voz quer 70 a 95 s (alvo 75 a 90). Curto: mais um degrau, um MAS ou uma curiosidade. Longo: enxugue as frases ou corte o trecho mais técnico, nunca o MAS, o "Se você..." nem o "Parabéns".

## 6. Render e conferência
1. Antes do render, com os tempos reais da voz, gere de novo os quadros dos degraus (os planos mudam de tempo quando a voz entra) e corrija o que aparecer. O `enquadramento` só serve para a oficina (inventor).
2. `npm run render -- como-funciona <n>` em segundo plano (~50 min para 1min20 no visual limpo, em qualidade média; a voz leva mais ~17 min; sai em `out/como-funciona-epNN.mp4` com 20 a 35 MB). Não use `--qualidade=alta` a não ser que o Iuri peça. Se o render avisar que o tamanho saiu da faixa, diga no aviso final.
   O vídeo sai **acelerado 1.1x** (pedido do Iuri em 03/11). A meta de 75 a 90 s com voz continua em tempo de roteiro, e o `quadro` também. Não use `--velocidade=1` a não ser que o Iuri peça.
3. `npm run quadro -- como-funciona <n> 0.1 2 20 40 60 75` e a capa (o segundo que o `validar` mostra em "postagem", com `--escala=0.5`) e olhe: primeiro quadro com a coisa já fazendo o estranho, peça certa no quadro, rótulo apontando para a peça certa, cartão legível, chamada visível. Corrija e renderize de novo se precisar.

## 7. Entregar
1. `estado.json`: `proxima_parte` +1 e `resumo_ultima` (tema, framework, cenário e o caminho: laboratório, "abertura → inventor e ano → MAS → conceito → curiosidade"; você constrói, "Se você... → peça 1 → peça 2... → Parabéns"). Em `pauta.json`, marque o item: `"status": "produzido"`, `"dia": "AAAA-MM-DD"`. Fato novo que valha para outros vídeos vai em `biblia.json` > `fatos`.
2. `npm run dados -- entregar como-funciona <n> --dia=AAAA-MM-DD --hora=18:00` (11:00 ou 18:00 conforme o calendário).
3. Avise o Iuri (mande o mp4 e a imagem da capa): tema, título, título da postagem, framework, cenário, o que conferiu, avisos (sem voz, peça que faltou no motor…), onde está o vídeo e o texto (ramo `dados`, `videos/como-funciona-epNN.*`) e que ele pode responder com correções até as 16h (sem resposta, o original vale).
4. Se o tema pediu algo que o motor não sabe fazer (forma de peça, cenário, som), anote em `public/series/como-funciona/pendencias-motor.md` com o exemplo exato; é trabalho de código numa sessão normal.

## 8. Roteiro do próximo vídeo (sempre, junto com a entrega)
O Iuri revisa a produção de hoje e, na mesma leitura, o roteiro do próximo vídeo, para evitar erros antes de gastar voz e render.
1. Depois do último vídeo do dia, escreva o episódio seguinte (`n = proxima_parte` já atualizado) com os passos 2 a 4, no framework do item dele: pesquisa, `epNN.json` completo, `validar` sem avisos e os quadros dos degraus conferidos. **Sem voz e sem render.**
2. Em `pauta.json`, marque o item com `"status": "roteiro"`.
3. `npm run dados -- salvar como-funciona` para o roteiro ficar no ramo `dados` e a rotina de amanhã partir dele.
4. Na mesma mensagem da entrega, mande o roteiro legível (não o JSON): tema, título, framework, cenário e o caminho numa linha, as falas numeradas do Tito (f1, f2...) e, por degrau, uma linha com o que aparece (falha, peça nova, corte, rótulos e cartões). Diga que correções nele valem para o vídeo de amanhã.
