---
name: roteirizar-episodio
description: Cria o próximo episódio de uma série de Shorts (ideia, roteiro em JSON, validação, vozes, render e fila). Use na rotina das 3h ou quando pedirem "produza a parte N da série X".
---

# Roteirizar e produzir um episódio

Trabalhe sempre em **uma série por sessão** (economiza tokens). Fale com o Iuri em português.

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar` (traz séries, estado e regras do ramo `dados`).
2. Leia só estes arquivos: `public/series/_geral/regras.md` (se existir), `public/series/<serie>/regras.md`, `public/series/<serie>/estado.json`, `public/series/<serie>/biblia.json`. Do episódio anterior leia apenas `resumo_ultima` do estado, não o JSON inteiro.
3. Se a série ainda não existe: crie `biblia.json` (pasta nova em `public/series/<serie>/`), seguindo o formato de `public/series/ilha-perdida/biblia.json`, e um `regras.md` com o tom e as proibições da série.

## 2. Ideia
- Cada episódio tem ~60 s, uma ideia só, gancho nos 3 primeiros segundos e termina em **cliffhanger**.
- A parte N continua exatamente do `resumo_ultima`. Não repita informação já mostrada, não resolva o mistério antes da hora.
- O último quadro é a chamada para comentar "PARTE N+1" (campo `chamada` do episódio).
- Frases curtas, faladas, em português do Brasil. Palavras em MAIÚSCULAS viram ênfase na legenda.

## 3. Escrever o episódio
- Se `epNN.json` já existir (rascunho do piloto), use-o como ponto de partida: valide, confira e só reescreva o que estiver errado.
- Veja o vocabulário disponível: `npm run catalogo` (todos) ou `npm run catalogo -- <cenario>` (marcas e pontos de um cenário). **Use só nomes que existem lá.** Se a história pede cenário, objeto ou ação que não existe, não invente: escolha o mais próximo e avise o Iuri no resumo final (é trabalho de código, feito numa sessão normal).
- Modelo de formato: `public/series/ilha-perdida/ep02.json`. Âncoras de tempo sempre ligadas às falas (`"f3:fim+0.4"`), nunca em segundos fixos.
- Alterne planos (geral, médio, close, detalhe, ombro, pov…) e use sons e efeitos nos momentos de susto. Nada de plano parado por mais de ~5 s.
- Salve em `public/series/<serie>/epNN.json` (NN com dois dígitos).

## 4. Validar e corrigir
`npm run validar -- <serie> <parte>` deve terminar sem avisos. Corrija até zerar.

## 5. Voz
`npm run vozes -- <serie> <parte>` gera as falas no ElevenLabs e grava os tempos reais. Se o personagem ainda não tem voz escolhida, o comando diz qual passo rodar (`escolher-voz.ts`); a primeira escolha de voz de uma série precisa da aprovação do Iuri. Se o ElevenLabs falhar, o vídeo sai marcado "sem voz" e isso vai no aviso final. Nunca finja que há voz.

## 6. Render e conferência
1. `npm run render -- <serie> <parte>` (leva vários minutos; o resultado fica em `out/<serie>-epNN.mp4`).
2. Confira 4 quadros: `npm run quadro -- <serie> <parte> 2 15 35 58` e olhe as imagens em `out/quadros/` (personagem cortado, câmera atrás de objeto, legenda ilegível, chamada final visível). Corrija o roteiro e renderize de novo se algo estiver errado.

## 7. Entregar
1. Atualize `estado.json`: `proxima_parte` +1 e `resumo_ultima` com 3 a 5 linhas do que aconteceu e como terminou.
2. Enfileire para a hora certa (calendário em `motor/producao/PRODUCAO.md`): `npm run dados -- enfileirar <serie> <parte> --dia=AAAA-MM-DD --hora=18:00`. Isso também salva a série no ramo `dados`.
3. Avise o Iuri para revisar (notificação de celular com o título do episódio) e deixe o vídeo em `out/` para ele abrir. Em poucas linhas: título, resumo, o que conferiu, avisos (sem voz, cenário improvisado…) e que ele pode responder com correções até as 16h; sem resposta, o original publica às 18h.
4. Não publique nada daqui. Quem publica é a rotina de publicação (`npm run dados -- publicar-pendentes`).
