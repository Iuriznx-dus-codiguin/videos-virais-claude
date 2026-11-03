---
name: roteirizar-episodio
description: Cria e produz o episódio do dia de uma série de HISTÓRIAS (ex.: voo-818): texto da história na estrutura dos vídeos que viralizaram, cenas em JSON, validação, voz OmniVoice, render e entrega. Use na rotina das 3h ou quando pedirem "produza a parte N da série X". Não serve para o Como Funciona.
---

# Roteirizar e produzir um episódio de história

Trabalhe sempre em **uma série por sessão** (economiza uso). Fale com o Iuri em português, curto. A publicação é manual: nunca publique nada.

**Fluxo separado:** este é o fluxo de histórias. Nunca leia, escreva nem salve nada de `public/series/como-funciona/` ou de outro fluxo; só o motor e as ferramentas são compartilhados. Salve sempre nomeando a série: `npm run dados -- salvar <serie> _historias` (sem nomes, o comando salvaria as pastas de todos os fluxos).

**Economize uso:** rode cada passo demorado (instalar voz, vozes, render) em segundo plano com log num arquivo e espere ele terminar, sem conferir a cada minuto. Atualize o progresso só no fim de cada passo. Não leia arquivos de que não precisa.

**Duas etapas, nesta ordem:** primeiro a história, só o texto, como a transcrição de um vídeo (passo 2). Só depois as cenas, a câmera e o JSON (passo 3). Texto fraco não se salva com câmera boa.

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar` (traz séries, estado, vozes e regras do ramo `dados`).
2. Voz (uma vez por sessão, ~4 min): `bash voz/instalar.sh`. Se falhar por rede (huggingface.co, *.hf.co, download.pytorch.org, download-r2.pytorch.org), siga sem voz e avise o Iuri qual host foi bloqueado; o vídeo sai marcado "sem voz". Nunca finja que há voz.
3. Descubra quais partes produzir hoje (calendário em `motor/producao/PRODUCAO.md`: sexta produz sexta + 2 de sábado; sábado produz 2 de domingo; domingo nada). Confira `npm run dados -- entregas` para não refazer o que já foi entregue. Faça as partes **uma de cada vez, na ordem**, cada uma com os passos 2 a 7. **Nunca rode `npm run vozes` e `npm run render` ao mesmo tempo** (dividem os 4 núcleos: uma fala de ~1,5 min passa de 40 min e o render dobra): termine um antes de começar o outro.
4. Se o `salvar` ou o `entregar` parar dizendo que outra sessão salvou a série depois do seu `baixar`, não force: junte a versão do ramo (fica em `out/dados-ramo/<serie>/`) com a sua em `public/series/<serie>/`, como a mensagem explica, e rode o mesmo comando com `--juntei`.
5. Leia só: `estrutura.md` e `modelos.md` desta skill (o jeito de contar), `public/series/_historias/regras.md`, `public/series/<serie>/regras.md`, `estado.json`, `biblia.json` e `roteiro-geral.md` (o mapa da história: siga-o). Do episódio anterior leia só `resumo_ultima`.
6. Série nova: crie `biblia.json` (modelo: `public/series/voo-818/biblia.json`), `regras.md` e `roteiro-geral.md` com a história inteira e, para cada parte, o problema do gancho "Se você...", o passo do mistério e a virada.

## 2. Escrever a história (só o texto)
Antes de qualquer JSON, escreva a parte como texto corrido: uma linha por fala, com a batida, quem fala e a frase (como o exemplo do fim de `estrutura.md`).
- Siga as 8 batidas de `estrutura.md`: gancho falando com "você", promessa, alerta, instinto errado, relógio, corrente de problemas, falsa segurança e virada, e depois a chamada. Linguagem do dia a dia, sem termo técnico e sem lista de regras.
- A parte N continua do `resumo_ultima` e resolve o cliffhanger anterior até ~20 s, mas se entende sozinha. Não repita o já mostrado e não resolva o mistério antes da hora (o `roteiro-geral.md` diz quando).
- A primeira palavra sai no primeiro segundo: nada de silêncio antes do gancho (no máximo ~1 s de imagem). Se a abertura é uma ação vivida por dentro (ex.: turbulência), os personagens não falam nela; o gancho vem do narrador, em off, por cima da imagem.
- ~1min20 (75 a 88 s com a voz): 180 a 200 palavras.
- Siga "O que segura quem rola o feed" (`estrutura.md`, pesquisa de 03/11): gancho no primeiro segundo, pista da virada à vista nos primeiros ~10 s, re-gancho entre 35 e 45 s e nada depois da virada.
- Passe o checklist de `estrutura.md` e reescreva até passar.
- Chamada (campo `chamada`): pergunta curta que puxa comentário, de preferência escolha A ou B, e o destaque "PARTE N+1".
- MAIÚSCULAS viram ênfase na legenda: no máximo uma palavra por fala.

## 3. Montar as cenas (JSON)
Agora cada frase vira uma imagem.
- Se `epNN.json` já existir (rascunho revisado pelo Iuri), use-o como base: valide, confira e só corrija o que estiver errado, sem reescrever as falas sem motivo. A produção não mexe no texto: se o rascunho ainda não tem os movimentos, transições e efeitos de `producao.md` (rascunhos de antes de 01/11 não têm), acrescente-os. Modelo: `public/series/voo-818/ep01.json`.
- Cada batida tem a sua imagem: o gancho mostra a situação grande e clara logo no primeiro quadro (de cima ou de longe); o instinto errado mostra o personagem fazendo; cada elo da corrente mostra a ação acontecendo; a virada fecha em close de quem percebe.
- Vocabulário: `npm run catalogo` (cenários, objetos com as opções de cada um, ações, sons) ou `npm run catalogo -- <cenario>` (marcas, pontos e câmera sugerida). **Use só nomes que existem.** Se faltar cenário ou objeto, escolha o mais próximo e avise o Iuri no resumo final (é trabalho de código, numa sessão normal).
- Âncoras de tempo sempre ligadas às falas (`"f3:fim+0.4"`), nunca segundos fixos. Alterne planos, use sons e efeitos nos sustos; algo muda na tela a cada 2 a 3 s e nenhum plano fica igual por mais de ~4 s.
- Som por baixo de fala: volume até 0,5. Nos primeiros 4 s a primeira fala precisa ser entendida.
- Chamada final: fundo com close claro do protagonista reagindo (`close`, `frente`), nunca um detalhe de objeto.
- Em cenário fechado (cabine, sala_farol, adega) use `camera` fixa; o catálogo sugere posições que não atravessam parede nem objeto.
- **Nome na tela:** na primeira vez que cada personagem aparece numa parte, um plano limpo dele com `rotulos` ("OTÁVIO · COPILOTO"), para quem chega pelo feed: nada entre a câmera e o rosto, nenhuma cabeça de outro personagem cortada na borda, e a fala diz o nome com clareza ("o Otávio quer ir embora", não "ele quer ir embora").
- **Enquadramento:** o personagem tem ~3,1 m de altura na escala 1 e a cabeça ~0,84 m. Close: câmera a ~3 m do rosto; médio: ~4,4 m; aberto: 6 m ou mais. Uma `camera` explícita deixa o alvo (ponto ou rosto) no centro. Olhando para +z, o +x do mundo fica à esquerda da tela; olhando para -z, à direita. Em plano de um personagem com outro por perto, ponha a câmera de modo que o outro fique a mais de ~25° do eixo. Dois frente a frente: câmera perpendicular à linha entre eles (os dois de perfil), nunca por cima do ombro (a nuca escura enche o quadro). Grupo em volta da fogueira: cada um num ponto do círculo; quem conversa de pé é filmado do ponto de vista do outro, com a câmera ~0,5 m acima da cabeça dele e ~1 m para o lado (assim a cabeça dele fica fora do quadro); quem está sentado, do lado oposto, por cima do fogo; o plano aberto do grupo vem de longe (10 m ou mais) e pela diagonal, para ninguém tampar o fogo. Uma cabeça a menos de ~1 m da câmera entra no quadro mesmo bem fora do eixo. O desvio automático só contorna personagens, não objetos: se um objeto tampar o rosto, mude a câmera à mão. Câmera alta apontando para baixo num rosto mostra o topo da cabeça: prefira a câmera na altura do rosto. Num plano de um personagem só, fique a até ~45° da frente dele: de perfil puro (90°) a cabeça mostra quase só o cabelo. Na praia a mata fica em -z, e uma câmera atrás dela é tampada pelos arbustos. Para mostrar algo "de longe" (fogo, sinal), ponha a câmera no mar (+z, 20 a 30 m) com `"tipo": "detalhe"` (lente mais fechada). Quem tem `olhando: "camera"` só vira a cabeça: aponte o corpo para a câmera com `olhando: [x, y, z]` da câmera.
- **Sobrevivência na tela:** mostre a ação acontecendo. `pegar`/`largar` com `item` (garrafa, galhos, isqueiro, radio, pacote; o item troca de mão 0,5 s depois do início do gesto), `arrumar` (agachado mexendo nas coisas), `acender` (com o isqueiro na mão) e a fogueira com `acende`, `mantimentos` com `inicial`/`enche`/`cheio`, `garrafa`, `mascaras` com `cai`. Ferido: acessórios `curativo` e `tala` (com `lado`) na bíblia e ação `mancar`. Sem sangue.
- **Sons:** nada de assovio (tom que sobe ou desce). Para susto e tensão use `impacto`, `susto`, `tensao_sobe`, `queda`, `turbulencia`: já são graves, de ronco e pancada.
- **Produção (pedido do Iuri em 01/11):** leia `producao.md` desta skill e aplique em toda parte: movimento de câmera com intenção em cada plano, transições (chicote, zoom, desfoque), letreiro de tempo ou prazo, partículas, cor de cena e, na virada, `zoom` + `dolly_zoom` + `barras`. Um vídeo só com cortes secos e `aproximar` não passa.
- **Postagem:** preencha o campo `postagem` (título de busca, descrição, 3 ou 4 hashtags, comentário fixado e a âncora da capa) seguindo `postagem.md` desta skill.
- Salve em `public/series/<serie>/epNN.json`.

## 4. Validar
`npm run validar -- <serie> <parte>` sem avisos. Corrija até zerar. Sem voz, a duração estimada deve dar 82 a 87 s (a voz real sai ~7% mais curta).

## 5. Voz
1. Personagem sem voz guardada (`vozes/<id>.pt`): `npx tsx ferramentas/escolher-voz.ts <serie> <id> --auto` (usa `voz.instruct` da bíblia, em inglês, ex.: "male, young adult, low pitch"). Vozes guardadas nunca são recriadas.
2. `npm run vozes -- <serie> <parte>` (~20 a 40 s de cálculo por segundo de fala; falas já geradas são reaproveitadas). No fim ele confere a pronúncia das falas novas com o Whisper (`--conferir-tudo` confere todas) e refaz as ruins com outras sementes, gravando a `semente` boa no episódio. Se uma fala sair "AINDA RUIM", reescreva a frase trocando a palavra que a voz engole e rode de novo.
3. **Logo em seguida** salve, para não perder as vozes se a sessão cair: `npm run dados -- salvar <serie> _historias`.
4. `npm run validar -- <serie> <parte>` de novo, agora com os tempos reais: 75 a 88 s. Se passar, corte falas da corrente de problemas (nunca o gancho nem a virada) e refaça só as que mudaram.

## 6. Render e conferência
1. Antes do render, `npm run enquadramento -- <serie> <parte>` (segundos, sem renderizar): lista os trechos com cabeça cortada na borda, nuca ou topo da cabeça virado para a câmera em quem fala, rosto tampado e câmera dentro de alguém. Corrija até sobrar só o que for falso (cabeça escondida atrás de banco ou objeto). Depois confira um quadro de cada plano nos tempos reais: `npm run quadro -- <serie> <parte> <segundos...> --escala=0.4` (rápido) e olhe as imagens em `out/quadros/`: item na mão errada, braço na frente do rosto, personagem dentro de objeto, rótulo em cima do rosto. Confira também os quadros de produção (`producao.md`, "Conferir antes do render"). Corrija antes de gastar o render.
2. `npm run render -- <serie> <parte>` em segundo plano (~20 a 25 min para 80 s em qualidade média; sai em `out/<serie>-epNN.mp4`, com 20 a 35 MB e o volume já normalizado em -14 LUFS). Não use `--qualidade=alta` (60 MB e render bem mais lento) a não ser que o Iuri peça.
3. `npm run quadro -- <serie> <parte> 0.1 1 3 15 35 <fim-1>`: primeiro quadro já mostrando o perigo, gancho visível nos primeiros 3 s, legenda legível, chamada final com fundo claro. Gere também a capa (o segundo que o `validar` mostra em "postagem") com `--escala=0.5`. Se algo estiver errado, corrija e renderize de novo.

## 7. Entregar
1. Atualize `estado.json`: `proxima_parte` +1 e `resumo_ultima` (3 a 5 linhas: o que aconteceu e como terminou). Fato novo vai para `biblia.json` (`fatos`, `ganchos_abertos`).
2. `npm run dados -- entregar <serie> <parte> --dia=AAAA-MM-DD --hora=18:00` (11:00 ou 18:00 conforme o calendário). Guarda o vídeo, o texto para postar e a série no ramo `dados`.
3. Para o Iuri, mande o próprio mp4 do render (qualidade média, 20 a 35 MB) e a imagem da capa: não precisa mais de cópia leve. Se o render avisar que o tamanho saiu fora disso, diga no aviso final.

## 8. Roteiro da próxima parte (sempre)
O Iuri revisa a produção de hoje e o roteiro da próxima juntos, para evitar erros antes de produzir.
1. Depois de entregar todas as partes do dia, escreva o `epNN.json` da próxima parte (`proxima_parte` do estado, já atualizado), seguindo o `roteiro-geral.md` e os passos 2 a 4. Não gere voz nem renderize: é um rascunho para revisão.
2. `npm run validar -- <serie> <N>` sem avisos e `npm run dados -- salvar <serie> _historias`.
3. A rotina seguinte usa esse arquivo como base (passo 3: "se já existir, use-o"), já com as correções que o Iuri mandar.

## 9. Avisar o Iuri
Uma mensagem só, quando tudo estiver entregue:
- produção de hoje: título de cada parte, resumo, o que conferiu, avisos (sem voz, cenário improvisado…), onde está o vídeo e o texto de cada plataforma (ramo `dados`, `videos/`), e o título da postagem com a capa;
- **roteiro da próxima parte**: cole a saída de `npm run roteiro -- <serie> <N>` (cenas, quem fala o quê e a chamada final);
- que ele pode responder até as 16h com correções do vídeo de hoje e do roteiro da próxima; sem resposta, o original vale.
