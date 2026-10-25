---
name: roteirizar-episodio
description: Cria e produz o episódio do dia de uma série de HISTÓRIAS (ex.: voo-818): roteiro em JSON, validação, voz OmniVoice, render e entrega. Use na rotina das 3h ou quando pedirem "produza a parte N da série X". Não serve para o Como Funciona.
---

# Roteirizar e produzir um episódio de história

Trabalhe sempre em **uma série por sessão** (economiza uso). Fale com o Iuri em português, curto. A publicação é manual: nunca publique nada.

**Fluxo separado:** este é o fluxo de histórias. Nunca leia, escreva nem salve nada de `public/series/como-funciona/` ou de outro fluxo; só o motor e as ferramentas são compartilhados. Salve sempre nomeando a série: `npm run dados -- salvar <serie> _historias` (sem nomes, o comando salvaria as pastas de todos os fluxos).

**Economize uso:** rode cada passo demorado (instalar voz, vozes, render) em segundo plano com log num arquivo e espere ele terminar, sem conferir a cada minuto. Atualize o progresso só no fim de cada passo. Não leia arquivos de que não precisa.

## 1. Preparar
1. `cd motor && npm ci` (se faltar node_modules) e `npm run dados -- baixar` (traz séries, estado, vozes e regras do ramo `dados`).
2. Voz (uma vez por sessão, ~4 min): `bash voz/instalar.sh`. Se falhar por rede (huggingface.co, *.hf.co, download.pytorch.org, download-r2.pytorch.org), siga sem voz e avise o Iuri qual host foi bloqueado; o vídeo sai marcado "sem voz". Nunca finja que há voz.
3. Descubra quais partes produzir hoje (calendário em `motor/producao/PRODUCAO.md`: sexta produz sexta + 2 de sábado; sábado produz 2 de domingo; domingo nada). Confira `npm run dados -- entregas` para não refazer o que já foi entregue. Faça as partes **uma de cada vez, na ordem**, cada uma com os passos 2 a 7.
4. Leia só: `public/series/_historias/regras.md`, `public/series/<serie>/regras.md`, `estado.json`, `biblia.json` e `roteiro-geral.md` (o mapa da história: siga-o). Do episódio anterior leia só `resumo_ultima`.
5. Série nova: crie `biblia.json` (modelo: `public/series/voo-818/biblia.json`), `regras.md` e `roteiro-geral.md` com a história inteira e o que acontece em cada parte.

## 2. Ideia
- ~55 a 60 s, uma ideia só, gancho nos 3 primeiros segundos, termina em **cliffhanger**.
- A parte N continua exatamente do `resumo_ultima`. Não repita o já mostrado, não resolva o mistério antes da hora (o `roteiro-geral.md` diz quando).
- Último quadro: chamada para comentar "PARTE N+1" (campo `chamada`, com uma pergunta curta que puxa comentário).
- Frases curtas, faladas, português do Brasil. MAIÚSCULAS viram ênfase na legenda.

## 3. Escrever o episódio
- Se `epNN.json` já existir, use-o como base: valide, confira e só reescreva o que estiver errado. Modelo: `public/series/voo-818/ep01.json`.
- Vocabulário: `npm run catalogo` (cenários, objetos com as opções de cada um, ações, sons) ou `npm run catalogo -- <cenario>` (marcas, pontos e câmera sugerida). **Use só nomes que existem.** Se faltar cenário ou objeto, escolha o mais próximo e avise o Iuri no resumo final (é trabalho de código, numa sessão normal).
- Âncoras de tempo sempre ligadas às falas (`"f3:fim+0.4"`), nunca segundos fixos. Alterne planos, use sons e efeitos nos sustos; nada de plano parado por mais de ~5 s.
- Som por baixo de fala: volume até 0,5. Nos primeiros 4 s a primeira fala precisa ser entendida.
- Chamada final: fundo com close claro do protagonista reagindo (`close`, `frente`), nunca um detalhe de objeto.
- Em cenário fechado (cabine, sala_farol, adega) use `camera` fixa; o catálogo sugere posições que não atravessam parede nem objeto.
- Salve em `public/series/<serie>/epNN.json`.

## 4. Validar
`npm run validar -- <serie> <parte>` sem avisos. Corrija até zerar.

## 5. Voz
1. Personagem sem voz guardada (`vozes/<id>.pt`): `npx tsx ferramentas/escolher-voz.ts <serie> <id> --auto` (usa `voz.instruct` da bíblia, em inglês, ex.: "male, young adult, low pitch"). Vozes guardadas nunca são recriadas.
2. `npm run vozes -- <serie> <parte>` (~10 s de cálculo por segundo de fala; falas já geradas são reaproveitadas).
3. **Logo em seguida** salve, para não perder as vozes se a sessão cair: `npm run dados -- salvar <serie> _historias`.
4. `npm run validar -- <serie> <parte>` de novo, agora com os tempos reais: até 60 s. Se passar, corte falas e refaça só as que mudaram.

## 6. Render e conferência
1. `npm run render -- <serie> <parte>` (~15 min; sai em `out/<serie>-epNN.mp4`, com o volume já normalizado em -14 LUFS).
2. `npm run quadro -- <serie> <parte> 1 3 15 35 <fim-1>` e olhe as imagens em `out/quadros/`: gancho visível nos primeiros 3 s, personagem cortado, câmera atrás de objeto, legenda ilegível, chamada final com fundo claro. Se algo estiver errado, corrija e renderize de novo.

## 7. Entregar
1. Atualize `estado.json`: `proxima_parte` +1 e `resumo_ultima` (3 a 5 linhas: o que aconteceu e como terminou). Fato novo vai para `biblia.json` (`fatos`, `ganchos_abertos`).
2. `npm run dados -- entregar <serie> <parte> --dia=AAAA-MM-DD --hora=18:00` (11:00 ou 18:00 conforme o calendário). Guarda o vídeo, o texto para postar e a série no ramo `dados`.
3. Quando todas as partes do dia estiverem entregues, avise o Iuri: título de cada parte, resumo, o que conferiu, avisos (sem voz, cenário improvisado…), onde está o vídeo e o texto de cada plataforma (ramo `dados`, `videos/`), e que ele pode responder com correções até as 16h; sem resposta o original vale.
