---
name: filme-da-minisserie
description: Quando uma minissérie de HISTÓRIAS termina (ex.: voo-818 na última parte do roteiro-geral), junta todas as partes num filme 16:9 sem as chamadas "COMENTA PARTE N". Use depois de entregar a última parte, ou quando pedirem "monte o filme da série X". Não serve para o Como Funciona.
---

# Filme do fim da minissérie

Pedido do Iuri (07/11): ao finalizar uma minissérie, todos os episódios são renderizados juntos em 16:9, sem os finais "comenta parte...", como um filme completo. **Vale só para o fluxo de histórias**: o Como Funciona fica como está (o `npm run filme` recusa série avulsa). Fale com o Iuri em português, curto. A publicação é manual: nunca publique nada.

## Como o filme sai (não precisa mexer no roteiro)
- Mesmo roteiro, mesmas vozes e mesma produção de cada parte, qualidade média e 1.1x como os episódios. O áudio das partes antigas volta sozinho do histórico do ramo `dados`: nada de voz é gerado de novo.
- Quadro 1920x1080. A câmera de cada plano é a mesma do vertical, com a mesma lente: o quadro deitado mostra mais dos lados, e o motor gira a câmera alguns graus quando isso tira uma cabeça do corte da borda.
- Cada parte acaba ~1 s depois da última fala e escurece para a próxima: pergunta, balão e "PARTE N+1" da chamada não entram. No lugar do selo "PARTE N", um letreiro "CAPÍTULO N · TÍTULO" nos primeiros segundos; a primeira parte abre com o título da série e a última fecha com "FIM". Legenda menor, no pé da tela (`--sem-legenda` tira).
- Tamanho: ~20 a 30 MB por parte (18 partes dão ~400 a 500 MB). Tempo: ~20 a 25 min de render por parte (18 partes, ~6 a 7 h).

## Quando
- **Rotina da última parte:** a última parte é a última linha da tabela "As N partes" do `roteiro-geral.md` da série. Nesse dia, produza e entregue a parte normalmente e mande ao Iuri o aviso de sempre (passo 9 da `roteirizar-episodio`, dizendo que o filme começou). Não há roteiro da próxima parte (o passo 8 vira este filme). Depois siga os passos abaixo.
- **Pedido do Iuri** ("monte o filme da série X"): os mesmos passos, numa sessão nova.
- **Correção depois do filme:** se o Iuri corrigir uma parte depois que o filme saiu, a skill `aplicar-correcoes` refaz a parte vertical e roda o filme de novo: só a parte que mudou é renderizada, o resto é juntado de novo.

## Passos
1. Sessão nova: `cd motor && npm ci` e `npm run dados -- baixar`. Não precisa instalar a voz (o filme não gera voz). Se a sessão acabou de renderizar a última parte, espere esse render terminar antes de começar (dois renders juntos dividem os 4 núcleos).
2. Confira: `npm run validar -- <serie>` mostra todas as partes; todas precisam ter voz (as que falharem só por falta de `postagem` em partes antigas estão boas para o filme).
3. Em segundo plano, com log, numa pasta que sobrevive à sessão:
   `mkdir -p out && npm run filme -- <serie> --pasta=/mnt/project-files/<serie>/filme > out/filme.log 2>&1`
   Ele recupera o áudio do histórico, renderiza parte por parte (guardando cada uma em `<pasta>/partes/`) e junta tudo em `<pasta>/<serie>-filme.mp4`, com `<serie>-filme.md` (lista de capítulos com os tempos, para a descrição do YouTube). Espere sem conferir a cada minuto; esperas em segundo plano são cortadas em ~30 min, então refaça o laço de espera até o log dizer "pronto" ou mostrar erro.
4. Se a sessão cair ou o render de uma parte falhar, rode **o mesmo comando** de novo: as partes prontas são reaproveitadas (cada uma guarda a assinatura do roteiro e das vozes) e só o que falta é renderizado. `--refazer=3,5` força refazer partes; `--so-juntar` só junta as prontas.
5. Confira o vídeo final antes de avisar: duração ≈ soma das partes (o log mostra), som em todas as emendas e quadros de algumas emendas e do fim. Para um quadro de uma parte no 16:9: `npm run quadro -- <serie> <parte> <segundos...> --formato=filme --escala=0.4` (a primeira parte com `--primeira`, a última com `--ultima`). `npm run enquadramento -- <serie> <parte> --formato=filme` lista cabeças cortadas na borda; algumas sobram (personagem em primeiro plano na beirada, como em filme) e não pedem correção: as partes já foram aprovadas na vertical. Só corrija o que estragar a cena (rosto de quem fala tampado), mudando a câmera daquele plano no `epNN.json`, e rode o filme de novo.
6. O filme não vai para o ramo `dados` (passa do limite de 100 MB do GitHub). Ele fica em `/mnt/project-files/<serie>/filme/`.

## Avisar o Iuri
Uma mensagem, com o mp4 do filme anexado: duração, tamanho, quantas partes, que é 16:9 sem as chamadas, e a lista de capítulos do `<serie>-filme.md` pronta para colar na descrição do YouTube. Sugira um título de busca (ex.: "VOO 818: o filme completo | sobreviventes numa ilha") e diga que ele pode responder com correções; uma correção numa parte refaz só aquela parte.
