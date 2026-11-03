---
name: como-funciona-produzir
description: Produz o vídeo do dia do Como Funciona (tema da pauta, roteiro no framework do tema, "volta ao laboratório" ou "você constrói", maquete 3D, voz do Tito, render e entrega). Use na rotina das 3h do Como Funciona ou quando pedirem "produza o Como Funciona #N".
---

# Produzir o Como Funciona do dia

Fluxo **separado** do de aventura: só mexa em `motor/public/series/como-funciona/`. Não edite `_historias/regras.md`, outras séries nem as skills `roteirizar-episodio`/`aplicar-correcoes`. Fale com o Iuri em português, curto. **A publicação é manual: nunca publique nada.**

**Produção (pedido do Iuri em 01/11):** ao escrever o `epNN.json` (passo 3), leia e aplique `producao.md` desta skill, na tabela do framework do tema: movimento de câmera com intenção em cada plano, partícula na falha (maquete ou protótipo), `circular` na peça nova e número contando nos cartões; no "você constrói", `varrer` nos "Então, você..." e confete no "Parabéns!"; no laboratório, a oficina em `sepia` com `desfoque` na ida e na volta. Um vídeo só com cortes secos e `aproximar` não passa. O render sai em qualidade média (20 a 35 MB); mande o próprio mp4, sem cópia leve.

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar`.
2. Voz (uma vez por sessão, alguns minutos): `bash voz/instalar.sh`. Se falhar por rede (huggingface.co, *.hf.co, download.pytorch.org, download-r2.pytorch.org), siga sem voz e diga no aviso final qual host foi bloqueado. Nunca finja que há voz.
3. Quantos vídeos hoje: calendário em `motor/producao/COMO-FUNCIONA.md` (seg–qui 1; sexta 3: sexta 18h + sábado 11h e 18h; sábado 2: domingo 11h e 18h; domingo nada). Confira `npm run dados -- entregas` para não refazer o que já foi entregue. Faça **um de cada vez**, passos 2 a 7. **Nunca rode `npm run vozes` e `npm run render` ao mesmo tempo** (dividem os 4 núcleos: o render do #3 levou 116 min em vez de ~35): termine um antes de começar o outro.
4. Se o `salvar` ou o `entregar` parar dizendo que outra sessão salvou a série depois do seu `baixar`, não force: junte a versão do ramo (fica em `out/dados-ramo/como-funciona/`) com a sua em `public/series/como-funciona/`, como a mensagem explica, e rode o mesmo comando com `--juntei`.
5. Leia só: `public/series/como-funciona/estilos.md` (os dois frameworks e a regra de escolha, obrigatório), `regras.md` (as regras de `_historias` não valem aqui: sem cliffhanger nem limite de 1 min), `estado.json`, `biblia.json` e o item `n = proxima_parte` de `pauta.json`. Se faltarem 10 itens pendentes ou menos, acrescente 20 temas novos no fim da pauta (mesmo formato, sem repetir, variando cozinha, banheiro, rua, transporte, energia, cidade, grandes obras), cada um com `framework` (e `estilo`, se for laboratório) pela regra de `estilos.md`, sem mais de 3 seguidos no mesmo framework.

## 2. Framework, pesquisa e roteiro
- **Framework:** o campo `framework` do item: `laboratorio` (invenção com inventor) ou `voce_constroi` (desenvolvido ao longo de anos). Sem o campo, decida pela pergunta de `estilos.md` ("dá para contar o momento em que alguém inventou isso?") e grave na pauta.
- **Volta ao laboratório:** confira com WebSearch inventor, ano, lugar, o problema que ele queria resolver, o primeiro protótipo e o que deu errado (se a autoria é disputada, "um dos primeiros" ou "a história mais contada"). Monte em tópicos antes de escrever:
  1. a **abertura** no `estilo` do item (mito, E SE, dúvida comum ou fato impossível, até 3 s) e a frase de ponte para o laboratório;
  2. o **laboratório** (10 a 15 s): inventor, ano, o problema e o MAS do primeiro protótipo, se houver;
  3. **por dentro** (35 a 45 s): as peças na ordem em que fazem sentido, com pelo menos um MAS ("funciona assim, MAS daria errado, por isso existe esta peça"). Ache o MAS antes de escrever: qual peça existe para evitar um desastre?
  4. o **conceito** com nome (cartão) e a **curiosidade** final.
- **Você constrói:** o espectador constrói a coisa do zero. Monte a cadeia em tópicos antes de qualquer fala:
  1. o **"Se você..."**: o jeito mais simples que qualquer um pensaria, com o que acontece logo depois;
  2. **4 a 6 degraus**: problema que dá para ver ("MAS/SÓ QUE...") → peça de verdade que resolve ("Então, você...");
  3. a **virada final** (opcional): um bônus ou o fato mais surpreendente (o `gancho` da pauta costuma servir);
  4. **"Parabéns! Você construiu um(a) ___!"**, a última fala.
  Se um degrau não tem peça para mostrar na maquete, troque ou corte. Confira com WebSearch o jeito simples, o motivo de cada peça e o fato da virada.
- Na dúvida, deixe o fato de fora; nunca invente número.
- **Linguagem (os dois):** palavras de conversa, frases curtas, nome técnico só com a explicação na mesma frase, MAS/SÓ QUE em MAIÚSCULAS. No "você constrói", segunda pessoa e nada de inventor ou data (fato histórico só se virar problema da cadeia).
- **Retenção (pesquisa de 03/11, pedido do Iuri: os vídeos não passavam de mil visualizações).** O Shorts mostra o vídeo primeiro para poucas pessoas e só empurra se quase ninguém deslizar no começo e muita gente for até o fim; no Instagram, o que mais leva para quem não segue é a pessoa mandar o vídeo para alguém. Por isso, nos dois frameworks:
  - **primeiro segundo:** a primeira fala tem até ~15 palavras, sai no quadro 0, e a maquete já está fazendo a coisa estranha no primeiro quadro. Teste do mudo: sem som, só com a imagem e a legenda dos 2 primeiros segundos, dá para entender a pergunta?
  - **pergunta aberta até o fim:** nos primeiros ~6 s fica clara a pergunta que o vídeo responde (laboratório: a dúvida ou o mito da abertura; você constrói: "dá para fazer isso funcionar?"), e a resposta completa só chega no fim.
  - **laboratório curto:** inventor, ano e primeiro protótipo em até ~15 s; aula de história longa é onde as pessoas deslizam. Varie a frase de ponte para a oficina (o "Para descobrir, vamos voltar para onde tudo começou" saiu no #7 e no #8): conte direto o problema do inventor ("Em 1893, um inventor queria fechar uma bota de uma vez só.").
  - **re-gancho no meio (35 a 45 s):** o MAS mais forte (ou o degrau mais surpreendente) cai nessa faixa, onde a retenção costuma cair.
  - **fim que puxa o recomeço:** a última fala se liga à primeira, para quem assiste de novo (cada recomeço conta visualização no Shorts). Laboratório: a curiosidade final responde ou vira do avesso a abertura. Você constrói: o "Parabéns!" já está ligado ao "Se você..." do começo. Nada depois disso (sem "é isso", "gostou?" ou despedida).
  - **fato para mandar para alguém:** a curiosidade final (ou a virada do você constrói) é o fato que a pessoa conta para outra no mesmo dia.
- **Duração: ~1min20 com a voz real (75 a 90 s; nunca menos de 1 min).** A voz do Tito fala ~15–20% mais rápido que a estimativa do `validar` sem voz: mire em 90 a 105 s estimados (o validar avisa fora disso) e confira de novo depois do passo 5. O Tito é a única voz.
- **Título:** laboratório, a dúvida ou o fato impossível ("Por que o fio da lâmpada não pega fogo?"); você constrói, o desafio ("Construa uma geladeira do zero"). O título de busca da postagem é outro campo: veja `postagem.md`.
- **Chamada:** `pergunta` sobre o próximo tema da pauta no jeito do framework DELE (laboratório: a dúvida ou o mito dele, "E o ventilador? Ele esfria o ar mesmo?"; você constrói: o desafio, "E agora, topa construir uma fechadura?"), `texto: "Comenta"`, `destaque` = campo `curto` do próximo item.

## 3. Escrever o episódio (`public/series/como-funciona/epNN.json`)
**Se `epNN.json` já existir** (roteiro mandado ao Iuri na véspera, passo 8), parta dele: aplique as correções que o Iuri mandou para ele (estão na conversa da revisão ou já no arquivo), revise e siga para o passo 4. Não reescreva do zero o que ele já leu, a não ser que ele tenha pedido o outro framework. A produção não mexe nas falas: se o roteiro ainda não tem os movimentos, transições, partículas e efeitos de `producao.md` (roteiros de antes de 01/11 não têm), acrescente-os antes de validar.

Modelos (vêm com o `dados baixar`): laboratório, `ep07.json` (zíper) e `ep02.json` (lâmpada); você constrói, `ep03.json` (geladeira). Vocabulário: `npm run catalogo` (cenários `estudio` e `oficina`, maquetes, animações, fluxos, acessórios).
- **Laboratório, três cenas:**
  1. `gancho` no `estudio`: o Tito na marca `apresentador`, a maquete de hoje no `pedestal` fazendo a coisa estranha da abertura.
  2. `invencao` na `oficina` (transição `preto` no primeiro plano): o inventor do dia em `personagens` do episódio (não na bíblia), sem `voz`, com acessórios da época; o protótipo é outra maquete em `modelos`, na bancada (`em` perto de `[0, -1.05]`, `alt: 0.92`, `escala` ~1,5). Falas com `off: true` (o Tito não está lá). Câmera com `camera` e `alvo` explícitos e o inventor virado (`virar`) para a câmera do close, como no ep07 e no ep02. Cartão com o ano e o inventor.
  3. `por_dentro` no `estudio`: a maquete volta ao começo (peças `oculta` escondidas de novo) e cada peça aparece na palavra do nome dela.
- **Você constrói, uma cena só no estúdio:** o Tito na marca `apresentador` e a maquete no `pedestal` (coisa grande, como prédio ou ponte, no chão: `chao_esq`, `chao_dir`, `chao_centro`, com `escala`). A versão do "Se você..." visível desde o início e cada peça de degrau com `oculta: true`, aparecendo (`aparecer`, `crescer` ou `montar`) na palavra do nome dela. Em cada degrau: no problema, a falha na maquete + som `tensao_sobe` ou `impacto` + `zoom_soco`, `tremor` ou `flash`, alternando o detalhe da peça com o close do Tito reagindo; na solução, a peça aparece com rótulo e som `pop`/`ding`, e o Tito aponta para ela. No "Parabéns!", a maquete inteira e o Tito acenando feliz.
- **Maquete** (`modelos.<nome>`): peças com `forma`, `tam`, `pos`, `cor`, `explode`, `oculta`, `pai`, `giro`; medidas em metros a partir do apoio (tampo do pedestal no estúdio, bancada na oficina). Cartoon: peças grandes e coloridas, até ~16. Animação vale só dentro da cena: numa cena nova a maquete volta ao começo. Carcaça por fora + miolo por dentro; mostre o miolo com `transparente` na carcaça (e `transparente` com `opacidade: 1` para fechar de novo).
- **Tubo que aparece:** dê a ele `pos` no meio do tubo e o `caminho` relativo a essa `pos`; sem isso ele cresce a partir da base da maquete e a câmera que mira nele pula. Peça que some não volta com `aparecer`: use uma cópia oculta.
- **Animações** (`animacoes` da cena): `girar`, `girar_para`, `mover`, `aparecer`, `crescer`, `sumir`, `aquecer`, `esfriar`, `pulsar`, `transparente`, `tremer`, `explodir`/`montar` (peca = id da maquete), `fluxo` (agua, eletricidade, calor, ar, gas, luz: num `tubo` ou com `caminho`).
- **Rótulos:** 1–2 palavras, no máximo 2 ao mesmo tempo, presos à peça. **Cartões:** laboratório, o ano com o inventor, o conceito e um número curioso; você constrói, só um conceito ou um número de susto, no máximo 3. Palavra com mais de ~8 letras no texto grande vaza da caixa: use hífen escondido (U+00AD).
- **Câmera no estúdio:** nos detalhes da maquete use `lado` `frente` ou `tres_quartos_esquerda` (do lado direito o Tito tapa a lente) e `tamanho` = largura (m) do que precisa caber; peça atrás da maquete pede `camera` e `alvo` explícitos (veja o compressor no ep03). No médio do Tito use `lado` `tres_quartos_direita` com `olhar: camera` (com `frente`, ou com ele olhando a maquete, a maquete entra na frente da lente ou o capacete tapa o rosto). Para o Tito e a maquete juntos no fim, câmera explícita ~5,8 m à frente e `virar` o Tito para ela (veja o fim do ep03 e do ep07). Alterne detalhe da peça, close/médio do Tito e geral: algo novo na tela a cada 2 a 3 s e nada parado mais de ~4 s. Plano que mira uma peça oculta deve começar quando ela aparece.
- Âncoras sempre nas falas (`"f5:compressor"`, `"f8:fim+0.3"`).
- **Postagem:** preencha o campo `postagem` (título de busca começando por "Como funciona...", descrição, 3 a 5 hashtags, comentário fixado e a âncora da capa) seguindo `postagem.md` desta skill.

## 4. Validar e revisar como espectador
1. `npm run validar -- como-funciona <n>` sem avisos e `npm run enquadramento -- como-funciona <n>`.
2. Releia o roteiro como quem rola o feed e corrija antes de gastar voz e render:
   - o framework é o do campo `framework` da pauta?
   - laboratório: os 3 primeiros segundos fazem parar o dedo (nunca "hoje vamos falar de...")? O inventor aparece com cartão de ano? Tem pelo menos um MAS em MAIÚSCULAS, com efeito e som, e a peça que resolve aparece logo depois? O conceito tem nome e a curiosidade fecha o vídeo?
   - você constrói: a primeira fala é um "Se você..." concreto? Cada degrau tem MAS/SÓ QUE + "Então, você...", e a peça aparece na palavra do nome dela? A última fala é "Parabéns! Você construiu um(a) ___!"?
   - uma criança de 10 anos entende? Toda palavra difícil vem explicada na mesma frase? A física está certa e os fatos dá para conferir?
   - cada fala tem algo novo na tela (peça, falha, plano, rótulo, cartão) a cada 3–4 s?
   - a chamada cita o próximo tema da pauta, no jeito do framework dele?
   - a pergunta do vídeo fica clara nos primeiros ~6 s e só fecha no fim? O inventor cabe em ~15 s? Tem um MAS ou degrau forte entre 35 e 45 s? A última fala puxa o recomeço e não sobra nada depois dela?
   - a `postagem` está completa e o título começa pelo que as pessoas buscam ("Como funciona o...")?
3. Melhore sempre um ponto em relação ao vídeo anterior (`resumo_ultima` e `regras.md`): o resultado final deve subir de nível a cada dia.

## 5. Voz
1. Voz do Tito guardada em `vozes/tito.pt`; se não existir: `npx tsx ferramentas/escolher-voz.ts como-funciona tito --auto`.
2. `npm run vozes -- como-funciona <n>` e, **logo em seguida**, `npm run dados -- salvar como-funciona` (se a sessão cair, as vozes não se perdem). O validar com voz quer 70 a 95 s (alvo 75 a 90). Curto: no laboratório, mais um MAS ou uma curiosidade; no você constrói, mais um degrau ou uma curiosidade virada problema. Longo: enxugue as frases ou corte o trecho mais técnico, nunca o MAS do laboratório, o "Se você..." nem o "Parabéns".

## 6. Render e conferência
1. Antes do render, com os tempos reais da voz: `npm run enquadramento -- como-funciona <n>` de novo (os planos mudam de tempo quando a voz entra) e os quadros de produção (`producao.md`, "Conferir antes do render"). Corrija o que aparecer.
2. `npm run render -- como-funciona <n>` em segundo plano (~25 min para 1min20 em qualidade média; sai em `out/como-funciona-epNN.mp4` com 20 a 35 MB). Não use `--qualidade=alta` a não ser que o Iuri peça. Se o render avisar que o tamanho saiu da faixa, diga no aviso final.
3. `npm run quadro -- como-funciona <n> 0.1 2 20 40 60 75` e a capa (o segundo que o `validar` mostra em "postagem", com `--escala=0.5`) e olhe: primeiro quadro com a maquete já fazendo a coisa, peça certa no quadro, Tito não tapando a maquete, inventor de frente na oficina, rótulo apontando para a peça certa, cartão legível, chamada visível. Corrija e renderize de novo se precisar.

## 7. Entregar
1. `estado.json`: `proxima_parte` +1 e `resumo_ultima` (tema, framework e o caminho: laboratório, "abertura → inventor e ano → MAS → conceito → curiosidade"; você constrói, "Se você... → peça 1 → peça 2... → Parabéns"). Em `pauta.json`, marque o item: `"status": "produzido"`, `"dia": "AAAA-MM-DD"`. Fato novo que valha para outros vídeos vai em `biblia.json` > `fatos`.
2. `npm run dados -- entregar como-funciona <n> --dia=AAAA-MM-DD --hora=18:00` (11:00 ou 18:00 conforme o calendário).
3. Avise o Iuri (mande o mp4 e a imagem da capa): tema, título, título da postagem, framework, o que conferiu, avisos (sem voz, peça que faltou no motor…), onde está o vídeo e o texto (ramo `dados`, `videos/como-funciona-epNN.*`) e que ele pode responder com correções até as 16h (sem resposta, o original vale).
4. Se o tema pediu algo que o motor não sabe fazer (forma de peça, cenário, som), anote em `public/series/como-funciona/pendencias-motor.md` com o exemplo exato; é trabalho de código numa sessão normal.

## 8. Roteiro do próximo vídeo (sempre, junto com a entrega)
O Iuri revisa a produção de hoje e, na mesma leitura, o roteiro do próximo vídeo, para evitar erros antes de gastar voz e render.
1. Depois do último vídeo do dia, escreva o episódio seguinte (`n = proxima_parte` já atualizado) com os passos 2 a 4, no framework do item dele: pesquisa, `epNN.json` completo e `validar` sem avisos. **Sem voz e sem render.**
2. Em `pauta.json`, marque o item com `"status": "roteiro"`.
3. `npm run dados -- salvar como-funciona` para o roteiro ficar no ramo `dados` e a rotina de amanhã partir dele.
4. Na mesma mensagem da entrega, mande o roteiro legível (não o JSON): tema, título, framework e o caminho numa linha, as falas numeradas do Tito (f1, f2...) e, por trecho (cena ou degrau), uma linha com o que aparece (cenário, inventor, peça nova, falha, rótulos e cartões). Diga que correções nele valem para o vídeo de amanhã.
