# Calendário e rotinas das histórias

Este é o fluxo de **histórias** (séries em partes, ex.: voo-818). O Como Funciona tem o próprio calendário (`COMO-FUNCIONA.md`) e as próprias skills: os dois fluxos só compartilham o motor e as ferramentas, nunca regras, roteiros ou estado.

Todos os horários são de Brasília. Uma rotina de produção por série, para cada sessão ler só o que é dela. **A publicação é manual**: o Iuri baixa o vídeo e posta no YouTube Shorts e no Instagram Reels.

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
1. **Produção (3h, por série).** Prompt: "Use a skill roteirizar-episodio para a série X e produza as partes de hoje conforme motor/producao/PRODUCAO.md." O ambiente é o "Shorts" (rede liberada para huggingface.co, hf.co, download.pytorch.org e download-r2.pytorch.org).
2. **Correções (sem rotina).** Cada entrega traz o vídeo do dia e o roteiro da próxima parte (já escrito e validado, sem voz). O Iuri responde na própria sessão de produção até as 16h, corrigindo um ou outro. A sessão usa a skill `aplicar-correcoes`. Sem resposta, o original vale.
3. **Publicação: manual.** O vídeo e o texto para colar (título, descrição, legenda) ficam no ramo `dados`, pasta `videos/`, e no `out/` da sessão.

## Estado
- Jeito de contar cada parte (as 8 batidas, a linguagem e o checklist): `.claude/skills/roteirizar-episodio/estrutura.md`, com os vídeos que viralizaram em `modelos.md`. Fica na skill (ramo `main`), porque o `baixar` substitui as pastas de `public/series/`.
- Regras gerais das histórias: `public/series/_historias/regras.md`; de cada série: `public/series/<serie>/regras.md`.
- Salve sempre nomeando as pastas: `npm run dados -- salvar <serie> _historias`.
- O ramo `dados` guarda as vozes (.pt) e o áudio das falas dos 3 episódios mais recentes, para uma correção regenerar só o que mudou.
- `public/series/<serie>/estado.json` guarda a próxima parte e o resumo da última.
- Tudo que muda fica no ramo `dados` (veja `ferramentas/dados.ts`). O ramo `main` só tem código.
- Cada sessão nova precisa rodar `bash voz/instalar.sh` (a máquina não guarda nada entre sessões; ~4 min).
- Tempos medidos (25/10, parte 1): instalar voz 4 min, criar 2 vozes 5 min (só na primeira vez), 30 falas 14,5 min, render 14 min. Sexta (3 partes) leva perto de 1h30.
