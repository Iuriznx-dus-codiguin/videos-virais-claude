# Calendário e rotinas

Todos os horários são de Brasília. Uma rotina por série, para cada sessão ler só o que é dela.

## Quando cada parte é publicada
| Dia da semana | Partes | Horários | Produzido |
|---|---|---|---|
| Segunda a sexta | 1 por dia | 18h | às 3h do mesmo dia |
| Sábado | 2 | 11h e 18h | sexta às 3h |
| Domingo | 2 | 11h e 18h | sábado às 3h |

A parte do dia seguinte de fim de semana é produzida na véspera (sexta produz sábado, sábado produz domingo). Sexta, portanto, produz duas partes (a de sexta e a de sábado) no mesmo run, uma depois da outra.

## Rotinas
1. **Produção (3h, escalonada por série: 3h00, 3h20, 3h40).** Uma rotina por série. Prompt: "Use a skill roteirizar-episodio para a série X e produza a(s) parte(s) do dia seguinte conforme motor/producao/PRODUCAO.md."
2. **Publicação (18h e, nos fins de semana, 11h).** Uma rotina só para todas as séries: `cd motor && npm ci && npm run dados -- publicar-pendentes`. Publica tudo da fila cujo horário já chegou, YouTube e Instagram, e tira o vídeo da fila.
3. **Correções (sem rotina).** O Iuri responde na própria sessão de produção até as 16h. A sessão usa a skill `aplicar-correcoes`. Sem resposta, publica o original.

## Estado
- `public/series/<serie>/estado.json` guarda a próxima parte e o resumo da última.
- Tudo que muda fica no ramo `dados` (veja `ferramentas/dados.ts`). O ramo `main` só tem código.
- Se a rotina de publicação falhar em uma rede, o que já foi publicado fica registrado e a próxima rodada tenta só o que falta.
