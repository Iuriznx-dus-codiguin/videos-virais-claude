---
name: roteirizar-episodio
description: Cria e produz o episódio do dia de uma série de Shorts (roteiro em JSON, validação, voz OmniVoice, render e entrega). Use na rotina das 3h ou quando pedirem "produza a parte N da série X".
---

# Roteirizar e produzir um episódio

Trabalhe sempre em **uma série por sessão** (economiza tokens). Fale com o Iuri em português, curto. A publicação é manual: nunca publique nada.

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar` (traz séries, estado, vozes e regras do ramo `dados`).
2. Voz (uma vez por sessão, leva alguns minutos): `bash voz/instalar.sh`. Se falhar por rede (huggingface.co, download.pytorch.org), pare e avise o Iuri qual host foi bloqueado; sem voz o vídeo sai marcado "sem voz" e isso vai no aviso final. Nunca finja que há voz.
3. Descubra quais partes produzir hoje (calendário em `motor/producao/PRODUCAO.md`: sexta produz sexta + 2 de sábado; sábado produz 2 de domingo; domingo nada). Faça as partes **uma de cada vez, na ordem**, cada uma com os passos 2 a 7.
4. Leia só: `public/series/_geral/regras.md` (se existir), `public/series/<serie>/regras.md`, `estado.json`, `biblia.json` e `roteiro-geral.md` (se existir; é o mapa da história, siga-o). Do episódio anterior leia só `resumo_ultima`.
5. Se a série ainda não existe: crie `biblia.json` (modelo: `public/series/voo-818/biblia.json`) e um `regras.md`.

## 2. Ideia
- ~60 s, uma ideia só, gancho nos 3 primeiros segundos, termina em **cliffhanger**.
- A parte N continua exatamente do `resumo_ultima`. Não repita o já mostrado, não resolva o mistério antes da hora (o `roteiro-geral.md` diz quando).
- Último quadro: chamada para comentar "PARTE N+1" (campo `chamada`).
- Frases curtas, faladas, português do Brasil. MAIÚSCULAS viram ênfase na legenda.

## 3. Escrever o episódio
- Se `epNN.json` já existir, use-o como base: valide, confira e só reescreva o que estiver errado. Modelo: `public/series/voo-818/ep01.json`.
- Vocabulário: `npm run catalogo` ou `npm run catalogo -- <cenario>`. **Use só nomes que existem.** Se a história pede cenário, objeto ou ação que não existe, escolha o mais próximo e avise o Iuri no resumo final (é trabalho de código, numa sessão normal). Não invente nome.
- Âncoras de tempo sempre ligadas às falas (`"f3:fim+0.4"`), nunca segundos fixos. Alterne planos, use sons e efeitos nos sustos; nada de plano parado por mais de ~5 s.
- Salve em `public/series/<serie>/epNN.json`.

## 4. Validar
`npm run validar -- <serie> <parte>` sem avisos. Corrija até zerar.

## 5. Voz
1. Personagem novo sem voz guardada (`vozes/<id>.pt`): `npx tsx ferramentas/escolher-voz.ts <serie> <id> --auto` (usa `voz.instruct` da bíblia; em inglês, ex.: "male, young adult, low pitch").
2. `npm run vozes -- <serie> <parte>` gera as falas e grava os tempos reais.
3. Confira a duração total: Shorts até 60 s. Se passar, corte falas e refaça.

## 6. Render e conferência
1. `npm run render -- <serie> <parte>` (~15 min; sai em `out/<serie>-epNN.mp4`).
2. `npm run quadro -- <serie> <parte> 2 15 35 55` e olhe as imagens em `out/quadros/`: personagem cortado, câmera atrás de objeto, legenda ilegível, chamada final visível. Se algo estiver errado, corrija e renderize de novo.

## 7. Entregar
1. Atualize `estado.json`: `proxima_parte` +1 e `resumo_ultima` (3 a 5 linhas: o que aconteceu e como terminou). Se a parte revelou fato novo, anote em `biblia.json` (`fatos`, `ganchos_abertos`).
2. `npm run dados -- entregar <serie> <parte> --dia=AAAA-MM-DD --hora=18:00` (hora 11:00 ou 18:00 conforme o calendário). Guarda o vídeo, o texto para postar e a série no ramo `dados`.
3. Quando todas as partes do dia estiverem entregues, avise o Iuri: título, resumo, o que conferiu, avisos (sem voz, cenário improvisado…), onde está o vídeo e o texto de cada plataforma (ramo `dados`, `videos/`), e que ele pode responder com correções até as 16h; sem resposta o original vale.
