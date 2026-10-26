---
name: aplicar-correcoes
description: Aplica as correções do Iuri a um episódio de HISTÓRIA já entregue ou ao roteiro da próxima parte (ex.: voo-818) e transforma cada correção em regra permanente da série ou das histórias. Use quando o Iuri responder à revisão de um episódio de história. Não serve para o Como Funciona.
---

# Aplicar correções e aprender com elas

**Fluxo separado:** só mexa na série de história em questão e em `public/series/_historias/`. Nunca leia nem altere o Como Funciona ou outro fluxo; salve sempre nomeando as pastas (`npm run dados -- salvar <serie> _historias`).

## 1. Entender o pedido
Separe cada correção do Iuri em uma destas classes:
- **só este episódio** (ex.: "troca essa fala", "a câmera cortou o Davi no segundo 20");
- **regra da série** (ex.: "a Marina nunca grita", "mais pausas antes do susto");
- **regra das histórias** (valem para todas as séries de histórias: ritmo, legenda, jeito de abrir o vídeo).
Se uma correção for ambígua, escolha a leitura mais provável, aplique e diga qual leitura usou.

## 2. Aplicar no episódio
1. Sessão nova: `cd motor && npm ci && npm run dados -- baixar`. Edite `public/series/<serie>/epNN.json`.
2. `npm run validar -- <serie> <parte>`. Se mudou fala: `bash voz/instalar.sh` (se a sessão for nova) e `npm run vozes -- <serie> <parte>`; o áudio dos episódios recentes vem do ramo `dados`, então só as falas alteradas são geradas, e a pronúncia delas é conferida com o Whisper (se ele reclamar de fala errada, use `--conferir-tudo` para conferir também as antigas). Se o Iuri disse que uma fala saiu estranha, reescreva a frase em vez de só gerar de novo.
3. Confira os quadros dos planos que mudaram (`npm run quadro -- <serie> <parte> <segundos...> --escala=0.4`) antes de renderizar. Depois `npm run render -- <serie> <parte>` (em segundo plano, ~55 min) e confira os quadros afetados de novo no vídeo final. Entregue o mp4 em alta qualidade e, se ele for grande, uma cópia leve só para assistir.
4. `npm run dados -- entregar <serie> <parte> --dia=... --hora=...` com o mesmo dia e hora de antes (substitui o vídeo e o texto no ramo `dados`). Se já passou do horário de postar, diga ao Iuri que talvez ele já tenha postado o original.

## 2b. Correção no roteiro da próxima parte
Se a correção é do roteiro da próxima parte (enviado junto com a produção): edite o `epNN.json` dela, rode `npm run validar -- <serie> <N>` e `npm run dados -- salvar <serie> _historias`. Não gere voz nem renderize; a rotina da manhã produz a partir do roteiro corrigido. Responda com a saída de `npm run roteiro -- <serie> <N>` para ele conferir.

## 3. Virar regra
- Acrescente **uma linha curta e no imperativo** por correção de série em `public/series/<serie>/regras.md` e por correção das histórias em `public/series/_historias/regras.md`, com a data: `- (2026-10-26) Faça pausa de 0,8 s antes do susto.`
- Antes de escrever, leia o arquivo e **não duplique**: se já existe regra parecida, reescreva a existente mais forte. Se duas regras se contradizem, a mais recente vence e a antiga é apagada.
- Mantenha cada `regras.md` abaixo de ~40 linhas: ao passar disso, funda regras parecidas em uma só.
- Se a correção também melhora o jeito de produzir (ordem dos passos, conferências), proponha a mudança na skill `roteirizar-episodio` no resumo final; quem altera skill é uma sessão normal.
- Para o motor (jeito que a câmera, a pose ou o som se comportam), não mexa no código aqui: anote em `public/series/_historias/pendencias-motor.md` com o exemplo exato (série, parte, segundo).

## 4. Salvar e responder
`npm run dados -- salvar <serie> _historias` e responda ao Iuri em poucas linhas: o que mudou no vídeo, quais regras novas ficaram gravadas (e onde) e o que ficou pendente do motor.
