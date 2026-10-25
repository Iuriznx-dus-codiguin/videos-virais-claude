# Como Funciona: calendário e rotina

Fluxo separado do de aventura (que segue `PRODUCAO.md`): rotina, skills, pauta e regras próprias, mesmo motor (Three.js + Remotion, voz OmniVoice) e mesmo ramo `dados`. Horários de Brasília. **A publicação é manual.**

## Quando cada vídeo sai
| Dia | Vídeos | Horários | Produzido |
|---|---|---|---|
| Segunda a sexta | 1 por dia | 18h | às 3h do mesmo dia |
| Sábado | 2 | 11h e 18h | sexta às 3h |
| Domingo | 2 | 11h e 18h | sábado às 3h |

A rotina produz: seg–qui 1 vídeo; sexta 3 (sexta 18h, sábado 11h e 18h); sábado 2 (domingo 11h e 18h); domingo nada. O número do vídeo é `proxima_parte` em `public/series/como-funciona/estado.json`, e o tema é o item de mesmo `n` em `pauta.json`. Se um vídeo do dia já foi entregue (rodada repetida), não refaça: confira `npm run dados -- entregas`.

## Rotina e skills
1. **Produção (3h):** rotina "Produção Como Funciona", skill `como-funciona-produzir`.
2. **Correções:** o Iuri responde na sessão da rotina até as 16h; skill `como-funciona-corrigir` corrige o vídeo e grava a regra em `como-funciona/regras.md`. Sem resposta, o original vale.
3. **Publicação: manual.** Vídeo e texto para colar em `videos/como-funciona-epNN.*` no ramo `dados`.

## Arquivos do formato
- `biblia.json`: Tito (narrador fixo, capacete amarelo e óculos), `formato: "avulso"` (selo "#N", texto de publicação sem "Parte").
- `pauta.json`: lista de temas em ordem, do chuveiro elétrico ao arranha-céu; a rotina acrescenta temas quando faltarem.
- `regras.md`: regras do formato, alimentadas pelas correções.
- `epNN.json`: roteiro com `modelos` (maquete peça por peça), `animacoes`, `rotulos` e `cartoes`. Modelo: `ep01.json`.
