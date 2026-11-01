---
name: como-funciona-produzir
description: Produz o vídeo do dia do Como Funciona (tema da pauta, roteiro no framework do tema, "volta ao laboratório" ou "você constrói", maquete 3D, voz do Tito, render e entrega). Use na rotina das 3h do Como Funciona ou quando pedirem "produza o Como Funciona #N".
---

# Produzir o Como Funciona do dia

Fluxo **separado** do de aventura: só mexa em `motor/public/series/como-funciona/`. Não edite `_historias/regras.md`, outras séries nem as skills `roteirizar-episodio`/`aplicar-correcoes`. Fale com o Iuri em português, curto. **A publicação é manual: nunca publique nada.**

**Produção (pedido do Iuri em 01/11):** ao escrever o `epNN.json` (passo 3), leia e aplique `producao.md` desta skill, na tabela do framework do tema: movimento de câmera com intenção em cada plano, partícula na falha (maquete ou protótipo), `circular` na peça nova e número contando nos cartões; no "você constrói", `varrer` nos "Então, você..." e confete no "Parabéns!"; no laboratório, a oficina em `sepia` com `desfoque` na ida e na volta. Um vídeo só com cortes secos e `aproximar` não passa. O render sai em qualidade média (20 a 35 MB); mande o próprio mp4, sem cópia leve.

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar`.
2. Voz (uma vez por sessão, alguns minutos): `bash voz/instalar.sh`. Se falhar por rede (huggingface.co, download.pytorch.org), siga sem voz e diga no aviso final qual host foi bloqueado. Nunca finja que há voz.
3. Quantos vídeos hoje: calendário em `motor/producao/COMO-FUNCIONA.md` (seg–qui 1; sexta 3: sexta 18h + sábado 11h e 18h; sábado 2: domingo 11h e 18h; domingo nada). Faça **um de cada vez**, passos 2 a 7.
4. Leia só: `public/series/como-funciona/estilos.md` (os dois frameworks e a regra de escolha, obrigatório), `regras.md` (as regras de `_historias` não valem aqui: sem cliffhanger nem limite de 1 min), `estado.json`, `biblia.json` e o item `n = proxima_parte` de `pauta.json`. Se faltarem 10 itens pendentes ou menos, acrescente 20 temas novos no fim da pauta (mesmo formato, sem repetir, variando cozinha, banheiro, rua, transporte, energia, cidade, grandes obras), cada um com `framework` (e `estilo`, se for laboratório) pela regra de `estilos.md`, sem mais de 3 seguidos no mesmo framework.

## 2. Framework, pesquisa e roteiro
- **Framework:** o campo `framework` do item: `laboratorio` (invenção com inventor) ou `voce_constroi` (desenvolvido ao longo de anos). Sem o campo, decida pela pergunta de `estilos.md` ("dá para contar o momento em que alguém inventou isso?") e grave na pauta.
- **Volta ao laboratório:** confira com WebSearch inventor, ano, lugar, o problema que ele queria resolver, o primeiro protótipo e o que deu errado (se a autoria é disputada, "um dos primeiros" ou "a história mais contada"). Monte em tópicos antes de escrever:
  1. a **abertura** no `estilo` do item (mito, E SE, dúvida comum ou fato impossível, até 3 s) e a frase de ponte para o laboratório;
  2. o **laboratório** (10 a 20 s): inventor, ano, o problema e o MAS do primeiro protótipo, se houver;
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
- **Duração: ~1min20 com a voz real (75 a 90 s; nunca menos de 1 min).** A voz do Tito fala ~15–20% mais rápido que a estimativa do `validar` sem voz: mire em 90 a 105 s estimados (o validar avisa fora disso) e confira de novo depois do passo 5. O Tito é a única voz.
- **Título:** laboratório, a dúvida ou o fato impossível ("Por que o fio da lâmpada não pega fogo?"); você constrói, o desafio ("Construa uma geladeira do zero").
- **Chamada:** `pergunta` sobre o próximo tema da pauta no jeito do framework DELE (laboratório: a dúvida ou o mito dele, "E o ventilador? Ele esfria o ar mesmo?"; você constrói: o desafio, "E agora, topa construir uma fechadura?"), `texto: "Comenta"`, `destaque` = campo `curto` do próximo item.

## 3. Escrever o episódio (`public/series/como-funciona/epNN.json`)
**Se `epNN.json` já existir** (roteiro mandado ao Iuri na véspera, passo 8), parta dele: aplique as correções que o Iuri mandou para ele (estão na conversa da revisão ou já no arquivo), revise e siga para o passo 4. Não reescreva do zero o que ele já leu, a não ser que ele tenha pedido o outro framework.

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
- **Câmera no estúdio:** nos detalhes da maquete use `lado` `frente` ou `tres_quartos_esquerda` (do lado direito o Tito tapa a lente) e `tamanho` = largura (m) do que precisa caber; peça atrás da maquete pede `camera` e `alvo` explícitos (veja o compressor no ep03). No médio do Tito use `lado` `tres_quartos_direita` com `olhar: camera` (com `frente`, ou com ele olhando a maquete, a maquete entra na frente da lente ou o capacete tapa o rosto). Para o Tito e a maquete juntos no fim, câmera explícita ~5,8 m à frente e `virar` o Tito para ela (veja o fim do ep03 e do ep07). Alterne detalhe da peça, close/médio do Tito e geral; nada parado mais de ~4 s. Plano que mira uma peça oculta deve começar quando ela aparece.
- Âncoras sempre nas falas (`"f5:compressor"`, `"f8:fim+0.3"`).

## 4. Validar e revisar como espectador
1. `npm run validar -- como-funciona <n>` sem avisos e `npm run enquadramento -- como-funciona <n>`.
2. Releia o roteiro como quem rola o feed e corrija antes de gastar voz e render:
   - o framework é o do campo `framework` da pauta?
   - laboratório: os 3 primeiros segundos fazem parar o dedo (nunca "hoje vamos falar de...")? O inventor aparece com cartão de ano? Tem pelo menos um MAS em MAIÚSCULAS, com efeito e som, e a peça que resolve aparece logo depois? O conceito tem nome e a curiosidade fecha o vídeo?
   - você constrói: a primeira fala é um "Se você..." concreto? Cada degrau tem MAS/SÓ QUE + "Então, você...", e a peça aparece na palavra do nome dela? A última fala é "Parabéns! Você construiu um(a) ___!"?
   - uma criança de 10 anos entende? Toda palavra difícil vem explicada na mesma frase? A física está certa e os fatos dá para conferir?
   - cada fala tem algo novo na tela (peça, falha, plano, rótulo, cartão) a cada 3–4 s?
   - a chamada cita o próximo tema da pauta, no jeito do framework dele?
3. Melhore sempre um ponto em relação ao vídeo anterior (`resumo_ultima` e `regras.md`): o resultado final deve subir de nível a cada dia.

## 5. Voz
1. Voz do Tito guardada em `vozes/tito.pt`; se não existir: `npx tsx ferramentas/escolher-voz.ts como-funciona tito --auto`.
2. `npm run vozes -- como-funciona <n>`. O validar com voz quer 70 a 95 s (alvo 75 a 90). Curto: no laboratório, mais um MAS ou uma curiosidade; no você constrói, mais um degrau ou uma curiosidade virada problema. Longo: enxugue as frases ou corte o trecho mais técnico, nunca o MAS do laboratório, o "Se você..." nem o "Parabéns".

## 6. Render e conferência
1. `npm run render -- como-funciona <n>` (~25 min para 1min20 em qualidade média; sai em `out/como-funciona-epNN.mp4` com 20 a 35 MB). Antes, confira os quadros de produção (`producao.md`, "Conferir antes do render").
2. `npm run quadro -- como-funciona <n> 2 20 40 60 75` e olhe: peça certa no quadro, Tito não tapando a maquete, inventor de frente na oficina, rótulo apontando para a peça certa, cartão legível, chamada visível. Corrija e renderize de novo se precisar.

## 7. Entregar
1. `estado.json`: `proxima_parte` +1 e `resumo_ultima` (tema, framework e o caminho: laboratório, "abertura → inventor e ano → MAS → conceito → curiosidade"; você constrói, "Se você... → peça 1 → peça 2... → Parabéns"). Em `pauta.json`, marque o item: `"status": "produzido"`, `"dia": "AAAA-MM-DD"`. Fato novo que valha para outros vídeos vai em `biblia.json` > `fatos`.
2. `npm run dados -- entregar como-funciona <n> --dia=AAAA-MM-DD --hora=18:00` (11:00 ou 18:00 conforme o calendário).
3. Avise o Iuri: tema, título, framework, o que conferiu, avisos (sem voz, peça que faltou no motor…), onde está o vídeo e o texto (ramo `dados`, `videos/como-funciona-epNN.*`) e que ele pode responder com correções até as 16h (sem resposta, o original vale).
4. Se o tema pediu algo que o motor não sabe fazer (forma de peça, cenário, som), anote em `public/series/como-funciona/pendencias-motor.md` com o exemplo exato; é trabalho de código numa sessão normal.

## 8. Roteiro do próximo vídeo (sempre, junto com a entrega)
O Iuri revisa a produção de hoje e, na mesma leitura, o roteiro do próximo vídeo, para evitar erros antes de gastar voz e render.
1. Depois do último vídeo do dia, escreva o episódio seguinte (`n = proxima_parte` já atualizado) com os passos 2 a 4, no framework do item dele: pesquisa, `epNN.json` completo e `validar` sem avisos. **Sem voz e sem render.**
2. Em `pauta.json`, marque o item com `"status": "roteiro"`.
3. `npm run dados -- salvar como-funciona` para o roteiro ficar no ramo `dados` e a rotina de amanhã partir dele.
4. Na mesma mensagem da entrega, mande o roteiro legível (não o JSON): tema, título, framework e o caminho numa linha, as falas numeradas do Tito (f1, f2...) e, por trecho (cena ou degrau), uma linha com o que aparece (cenário, inventor, peça nova, falha, rótulos e cartões). Diga que correções nele valem para o vídeo de amanhã.
