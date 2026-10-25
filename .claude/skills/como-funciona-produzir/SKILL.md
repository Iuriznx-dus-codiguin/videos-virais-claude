---
name: como-funciona-produzir
description: Produz o vídeo do dia do Como Funciona (tema da pauta, roteiro com maquete 3D, voz do Tito, render e entrega). Use na rotina das 3h do Como Funciona ou quando pedirem "produza o Como Funciona #N".
---

# Produzir o Como Funciona do dia

Fluxo **separado** do de aventura: só mexa em `motor/public/series/como-funciona/`. Não edite `_geral/regras.md`, outras séries nem as skills `roteirizar-episodio`/`aplicar-correcoes`. Fale com o Iuri em português, curto. **A publicação é manual: nunca publique nada.**

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar`.
2. Voz (uma vez por sessão, alguns minutos): `bash voz/instalar.sh`. Se falhar por rede (huggingface.co, download.pytorch.org), siga sem voz e diga no aviso final qual host foi bloqueado. Nunca finja que há voz.
3. Quantos vídeos hoje: calendário em `motor/producao/COMO-FUNCIONA.md` (seg–qui 1; sexta 3: sexta 18h + sábado 11h e 18h; sábado 2: domingo 11h e 18h; domingo nada). Faça **um de cada vez**, passos 2 a 7.
4. Leia só: `public/series/_geral/regras.md`, `public/series/como-funciona/regras.md` (vale por cima da geral: aqui não tem cliffhanger nem limite de 1 min), `estilos.md`, `estado.json`, `biblia.json` e o item `n = proxima_parte` de `pauta.json`. Se faltarem 10 itens pendentes ou menos, acrescente 20 temas novos no fim da pauta (mesmo formato, sem repetir, variando cozinha, banheiro, rua, transporte, energia, cidade, grandes obras).

## 2. Pesquisa e roteiro falado
- Confira os fatos do tema (inventor, ano, lugar, como funciona) com WebSearch quando tiver; na dúvida, use "um dos primeiros" ou "a história mais contada" e nunca invente número.
- **Estilo de narrativa** (`estilos.md`): comece pelo `estilo` sugerido no item da pauta (mito, E SE, dúvida comum ou cadeia de MAS) e troque se outro render mais curiosidade. Em TODO vídeo, ponha pelo menos uma virada com **MAS** no meio ("funciona assim, MAS daria errado, por isso existe esta peça"): é o estilo que o Iuri mais quer ver. Antes de escrever, ache o "MAS" do tema: qual peça existe para evitar um desastre?
- Estrutura (regras.md): abertura no estilo em até 3 s → invenção (oficina) → por dentro (estúdio, maquete, com o MAS) → conceito com nome (cartão) → curiosidade → chamada.
- **Duração: ~1min20 com a voz real (75 a 90 s; nunca menos de 1 min).** A voz do Tito fala ~20% mais rápido que a estimativa do `validar` sem voz: mire em 90 a 105 s estimados (o validar avisa fora disso) e confira de novo depois do passo 5. Frases curtas e faladas. O Tito é a única voz. MAIÚSCULAS viram ênfase.
- Chamada: `pergunta` sobre o próximo tema da pauta, `texto: "Comenta"`, `destaque` = campo `curto` do próximo item.

## 3. Escrever o episódio (`public/series/como-funciona/epNN.json`)
Modelo completo: `ep01.json` (chuveiro). Vocabulário: `npm run catalogo` (cenários `estudio` e `oficina`, maquetes, animações, fluxos, acessórios).
- **Inventor do dia:** em `personagens` do episódio (não na bíblia), sem `voz`. Use acessórios da época (cartola, bigode, oculos, cabelo_curto, lenco).
- **Maquete:** em `modelos.<nome>` uma lista de peças (`forma`, `tam`, `pos`, `cor`, `explode`, `oculta`, `pai`). Medidas em metros a partir do apoio (tampo do pedestal no estúdio, bancada na oficina). Cartoon: peças grandes e coloridas, até ~15. Carcaça por fora + miolo por dentro; mostre o miolo com `transparente` na carcaça. Coisa grande (prédio, ponte, guindaste) vai no chão do estúdio (`chao_esq`, `chao_dir`, `chao_centro`) com `escala`.
- **Animações** (`animacoes` da cena): `girar`, `girar_para`, `mover`, `aparecer`, `crescer`, `sumir`, `aquecer`, `pulsar`, `transparente`, `tremer`, `explodir`/`montar` (peca = id da maquete), `fluxo` (água, eletricidade, calor, ar, gas, luz: num `tubo` ou com `caminho`).
- **Rótulos** (`rotulos`): 1–2 palavras, no máximo 2 ao mesmo tempo, presos à peça. **Cartões** (`cartoes`): ano + inventor, nome do conceito, número curioso.
- **Câmera no estúdio:** o Tito fica na marca `apresentador` (à esquerda da maquete). Nos detalhes da maquete use `lado` `frente` ou `tres_quartos_esquerda` (do lado direito o Tito tapa a lente) e `tamanho` = largura (m) do que precisa caber. Alterne detalhe da peça, close/médio do Tito e geral; nada parado mais de ~4 s.
- Âncoras sempre nas falas (`"f5:diafragma"`, `"f8:fim+0.3"`).

## 4. Validar e revisar como espectador
1. `npm run validar -- como-funciona <n>` sem avisos.
2. Releia o roteiro como quem rola o feed e corrija antes de gastar voz e render:
   - os 3 primeiros segundos fazem parar o dedo? (mito, E SE, dúvida ou fato impossível, nunca "hoje vamos falar de...")
   - tem pelo menos um MAS em MAIÚSCULAS, com efeito e som, e a peça que resolve aparece logo depois?
   - cada fala tem algo novo na tela (plano, rótulo, cartão, peça animada) a cada 3–4 s?
   - todos os fatos dá para conferir? a física está certa?
   - a chamada final cita o próximo tema da pauta?
3. Melhore sempre um ponto em relação ao vídeo anterior (`resumo_ultima` e `regras.md`): o resultado final deve subir de nível a cada dia.

## 5. Voz
1. Voz do Tito guardada em `vozes/tito.pt`; se não existir: `npx tsx ferramentas/escolher-voz.ts como-funciona tito --auto`.
2. `npm run vozes -- como-funciona <n>`. O validar com voz quer 70 a 95 s (alvo 75 a 90). Curto: acrescente um degrau de MAS ou uma curiosidade; longo: corte frases, não o MAS.

## 6. Render e conferência
1. `npm run render -- como-funciona <n>` (~35 min para 1min20; sai em `out/como-funciona-epNN.mp4`).
2. `npm run quadro -- como-funciona <n> 2 20 40 60 75` e olhe: peça certa no quadro, Tito não tapando a maquete, rótulo apontando para a peça certa, cartão legível, chamada visível. Corrija e renderize de novo se precisar.

## 7. Entregar
1. `estado.json`: `proxima_parte` +1 e `resumo_ultima` (tema e o que foi explicado). Em `pauta.json`, marque o item: `"status": "produzido"`, `"dia": "AAAA-MM-DD"`. Fato novo que valha para outros vídeos vai em `biblia.json` > `fatos`.
2. `npm run dados -- entregar como-funciona <n> --dia=AAAA-MM-DD --hora=18:00` (11:00 ou 18:00 conforme o calendário).
3. Avise o Iuri: tema, título, o que conferiu, avisos (sem voz, peça que faltou no motor…), onde está o vídeo e o texto (ramo `dados`, `videos/como-funciona-epNN.*`) e que ele pode responder com correções até as 16h (sem resposta, o original vale).
4. Se o tema pediu algo que o motor não sabe fazer (forma de peça, cenário, som), anote em `public/series/como-funciona/pendencias-motor.md` com o exemplo exato; é trabalho de código numa sessão normal.
