---
name: aplicar-correcoes
description: Aplica as correções do Iuri a um episódio já entregue e transforma cada correção em regra permanente da série ou geral. Use quando o Iuri responder à revisão de um episódio.
---

# Aplicar correções e aprender com elas

## 1. Entender o pedido
Separe cada correção do Iuri em uma destas classes:
- **só este episódio** (ex.: "troca essa fala", "a câmera cortou o Léo no segundo 20");
- **regra da série** (ex.: "a Bia nunca grita", "mais pausas antes do susto");
- **regra geral** (valem para todas as séries: ritmo, tamanho de legenda, jeito de abrir o vídeo).
Se uma correção for ambígua, escolha a leitura mais provável, aplique e diga qual leitura usou.

## 2. Aplicar no episódio
1. `cd motor && npm run dados -- baixar` (se a sessão for nova), edite `public/series/<serie>/epNN.json`.
2. `npm run validar -- <serie> <parte>`; se mudou fala, rode `bash voz/instalar.sh` (se a sessão for nova) e `npm run vozes -- <serie> <parte>` (só as falas alteradas são regeneradas).
3. `npm run render -- <serie> <parte>` e confira os quadros afetados com `npm run quadro`.
4. `npm run dados -- entregar <serie> <parte> --dia=... --hora=...` com o mesmo dia e hora de antes (substitui o vídeo e o texto no ramo `dados`). Se já passou do horário de postar, diga ao Iuri que talvez ele já tenha postado o original.

## 3. Virar regra
- Acrescente **uma linha curta e no imperativo** por correção de série em `public/series/<serie>/regras.md` e por correção geral em `public/series/_geral/regras.md`, com a data: `- (2026-10-26) Faça pausa de 0,8 s antes do susto.`
- Antes de escrever, leia o arquivo e **não duplique**: se já existe regra parecida, reescreva a existente mais forte. Se duas regras se contradizem, a mais recente vence e a antiga é apagada.
- Mantenha cada `regras.md` abaixo de ~40 linhas: ao passar disso, funda regras parecidas em uma só.
- Para o motor (jeito que a câmera, a pose ou o som se comportam), não mexa no código aqui: anote em `public/series/_geral/pendencias-motor.md` com o exemplo exato (série, parte, segundo) para uma sessão normal consertar.

## 4. Salvar e responder
`npm run dados -- salvar` e responda ao Iuri em poucas linhas: o que mudou no vídeo, quais regras novas ficaram gravadas (e onde), e o que ficou pendente do motor.
