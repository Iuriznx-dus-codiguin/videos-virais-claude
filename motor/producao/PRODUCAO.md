# Calendário e rotinas das histórias

Este é o fluxo de **histórias** (séries em partes, ex.: voo-818). O Como Funciona tem o próprio calendário (`COMO-FUNCIONA.md`) e as próprias skills: os dois fluxos só compartilham o motor e as ferramentas, nunca regras, roteiros ou estado.

Todos os horários são de Brasília. Uma rotina de produção só para todas as minisséries de histórias, uma depois da outra (ordem em `public/series/_historias/series.json`); cada sessão lê só a série da vez. **A publicação é manual**: o Iuri baixa o vídeo e posta no YouTube Shorts e no Instagram Reels.

## Quando cada parte é publicada
| Dia da semana | Partes | Horários | Produzido |
|---|---|---|---|
| Segunda a sexta | 1 por dia | 18h | às 3h do mesmo dia |
| Sábado | 2 | 11h e 18h | sexta às 3h |
| Domingo | 2 | 11h e 18h | sábado às 3h |

Cada rotina produz o que o **calendário** manda para o dia, olhando `estado.json` (`proxima_parte`):
- **Segunda a quinta:** 1 parte (a de hoje, para 18h).
- **Sexta:** 3 partes em sequência: a de sexta (18h), as duas de sábado (11h e 18h).
- **Sábado:** 2 partes, as de domingo (11h e 18h).
- **Domingo:** nada para produzir (o domingo já saiu no sábado). Rotina só confere se há correção pendente e termina.

Se uma parte do calendário já existe pronta (rodada repetida), não refaça: confira `npm run dados -- entregas`.

## Rotinas
1. **Produção (3h, "Produção Histórias").** Prompt: "Use a skill roteirizar-episodio e produza as partes de hoje da minissérie em andamento (a primeira de public/series/_historias/series.json que não terminou), conforme motor/producao/PRODUCAO.md. Se a série acabou, não invente parte nova: siga as skills nova-minisserie e filme-da-minisserie." O ambiente é o "Shorts" (rede liberada para huggingface.co, hf.co, download.pytorch.org e download-r2.pytorch.org). Uma rotina antiga com o nome de uma série (ex.: "Produção Voo 818") faz a mesma coisa: a skill troca para a série da vez quando a nomeada já terminou.
2. **Correções (sem rotina).** Cada entrega traz o vídeo do dia e o roteiro da próxima parte (já escrito e validado, sem voz). O Iuri responde na própria sessão de produção até as 16h, corrigindo um ou outro. A sessão usa a skill `aplicar-correcoes`. Sem resposta, o original vale.
3. **Publicação: manual.** O vídeo e o texto para colar (título, descrição, legenda) ficam no ramo `dados`, pasta `videos/`, e no `out/` da sessão. O texto sai do campo `postagem` do episódio (`.claude/skills/roteirizar-episodio/postagem.md`) e termina em "Na hora de postar": capa, vídeo relacionado, playlist da série em ordem e comentário para fixar.

## Fim da minissérie: série nova e filme 16:9
Decisão do Iuri (11/11): **toda minissérie tem episódio final com o desfecho** (5 a 7 partes nas séries novas; o Voo 818 teve 18). A última parte é a última linha da tabela "As N partes" do `roteiro-geral.md`; depois dela nunca se inventa outra. No mesmo dia a rotina cria a série seguinte (skill `nova-minisserie`, gênero diferente da anterior) com o roteiro da parte 1 para o Iuri revisar, e a parte 1 sai no dia seguinte, no horário do calendário.

Pedido do Iuri (07/11, só para as histórias; o Como Funciona não tem filme): quando a última parte da minissérie (última linha da tabela "As N partes" do `roteiro-geral.md`) é entregue, a mesma rotina junta todas as partes num filme 16:9, sem as chamadas "COMENTA PARTE N", com a skill `filme-da-minisserie` (`npm run filme`). Mesmo roteiro, vozes e produção; câmera reenquadrada para o quadro deitado; um capítulo por parte, título da série no começo e "FIM" no fim. Leva ~16 a 20 min por parte e é retomável: as partes prontas ficam em `/mnt/project-files/<serie>/filme/partes/` e o filme em `/mnt/project-files/<serie>/filme/` (grande demais para o ramo `dados`). Correção numa parte depois do filme refaz só aquela parte e junta de novo.

## Estado
- Jeito de contar cada parte (as 8 batidas, a linguagem e o checklist): `.claude/skills/roteirizar-episodio/estrutura.md`, com os vídeos que viralizaram em `modelos.md`. Fica na skill (ramo `main`), porque o `baixar` substitui as pastas de `public/series/`.
- Regras gerais das histórias: `public/series/_historias/regras.md`; de cada série: `public/series/<serie>/regras.md`.
- Salve sempre nomeando as pastas: `npm run dados -- salvar <serie> _historias`.
- O ramo `dados` guarda as vozes (.pt) e o áudio das falas dos 3 episódios mais recentes, para uma correção regenerar só o que mudou.
- `public/series/<serie>/estado.json` guarda a próxima parte e o resumo da última.
- Tudo que muda fica no ramo `dados` (veja `ferramentas/dados.ts`). O ramo `main` só tem código.
- Cada sessão nova precisa rodar `bash voz/instalar.sh` (a máquina não guarda nada entre sessões; ~4 min).
- Tempos medidos (25/10, parte 1): instalar voz 4 min, criar 2 vozes 5 min (só na primeira vez), 30 falas 14,5 min. Render em qualidade média (padrão desde 01/11): ~21 min para 76 s, arquivo de ~30 MB (antes, em alta, ~55 min e ~60 MB).
- Desde 03/11 o render sai acelerado 1.1x (pedido do Iuri): mesmo roteiro, mesmas vozes (sem mudar o tom) e mesma produção, só ~10% mais curto (80 s de roteiro → ~73 s de vídeo). As metas de duração do roteiro não mudam. `--velocidade=1` volta ao normal.
- Produção visual (transições, câmeras, letreiros, partículas): `.claude/skills/roteirizar-episodio/producao.md`.
