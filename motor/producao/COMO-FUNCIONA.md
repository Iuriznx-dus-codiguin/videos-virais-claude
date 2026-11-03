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
1. **Produção (3h):** rotina "Produção Como Funciona", skill `como-funciona-produzir`. Junto com a entrega vai o roteiro do vídeo seguinte (só texto, sem voz nem render), para o Iuri revisar os dois de uma vez.
2. **Correções:** o Iuri responde na sessão da rotina até as 16h; skill `como-funciona-corrigir` corrige o vídeo e grava a regra em `como-funciona/regras.md`. Correção no roteiro do próximo vídeo vai direto no `epNN.json` dele, e a rotina do dia seguinte parte dessa versão. Sem resposta, o original vale.
3. **Publicação: manual.** Vídeo e texto para colar em `videos/como-funciona-epNN.*` no ramo `dados`. O texto sai do campo `postagem` do episódio (`.claude/skills/como-funciona-produzir/postagem.md`: título começando por "Como funciona...", para a busca) e termina em "Na hora de postar": capa, vídeo relacionado, playlist e comentário para fixar.

## Formato
Vídeos de ~1min20 (75 a 90 s com voz) em dois frameworks, escolhidos pela ideia do tema (Iuri, 2026-11-01) e marcados no campo `framework` da pauta:
- **Volta ao laboratório** (`laboratorio`), para invenções com inventor, ano e lugar: abertura no estilo do tema (mito, E SE, dúvida comum, fato impossível) → oficina com o inventor e o protótipo → por dentro no estúdio, com pelo menos um MAS → conceito com nome → curiosidade.
- **Você constrói** (`voce_constroi`, modelo da barragem), para o que foi desenvolvido e melhorado ao longo de anos (barragem, prédio, ponte, usina): "Se você..." com o jeito mais simples → 4 a 6 degraus "MAS/SÓ QUE [problema]" + "Então, você [põe a peça]" → "Parabéns! Você construiu um(a) ___!", tudo no estúdio com a maquete ganhando uma peça por degrau.

Nunca mais de 3 vídeos seguidos no mesmo framework. Veja `public/series/como-funciona/estilos.md`. Render de 1min20 leva ~25 min em qualidade média (20 a 35 MB); na sexta (3 vídeos) a rotina roda por umas 1h30.

## Arquivos do formato
- `biblia.json`: Tito (narrador fixo, capacete amarelo e óculos), `formato: "avulso"` (selo "#N", texto de publicação sem "Parte").
- `pauta.json`: lista de temas em ordem, do chuveiro elétrico ao arranha-céu, cada um com o `framework` (e o `estilo` de abertura, nos do laboratório); a rotina acrescenta temas quando faltarem.
- `regras.md`: regras do formato, alimentadas pelas correções.
- `estilos.md`: os dois frameworks do roteiro e a regra de escolha, com os vídeos validados pelo Iuri como exemplo.
- `epNN.json`: roteiro com `modelos` (maquete peça por peça), `animacoes`, `rotulos` e `cartoes`. Modelos no ramo `dados`: `ep07.json` (zíper) e `ep02.json` (lâmpada) para o laboratório; `ep03.json` (geladeira) para o você constrói.
