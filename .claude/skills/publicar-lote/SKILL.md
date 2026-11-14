---
name: publicar-lote
description: Sobe pelo navegador do Iuri (Claude in Chrome) todos os vídeos entregues que ainda não foram programados e usa o agendamento do YouTube Studio e do Meta Business Suite (Instagram) para cada um sair no horário dele. Use quando o Iuri pedir para subir, postar, programar ou publicar os vídeos acumulados ("sobe o lote", "programa as postagens"). Serve aos dois fluxos sem mexer nas regras de nenhum.
---

# Subir e programar o lote pelo navegador

O Iuri entra a cada 2 ou 3 dias (mais no fim de semana). Nessa hora você pega **tudo** que a produção entregou e ainda não está programado, sobe no YouTube Shorts e no Instagram Reels pelo Chrome dele e deixa cada vídeo agendado no horário do calendário. Ele só abre a sessão e fica logado; o resto é seu.

**Ferramenta compartilhada, conteúdo separado.** Título, descrição, legenda, hashtags, capa, playlist e comentário vêm prontos do texto que cada fluxo escreveu na entrega (`videos/<serie>-epNN.md`, campo `postagem` de cada skill). Aqui você não reescreve nada nem aplica regra de um fluxo no outro. A ferramenta `npm run fila` só corta o que passa do limite da plataforma e avisa. Se o Iuri corrigir um texto nesta sessão, use o texto dele na plataforma e leve a regra para a skill de correção **do fluxo daquele vídeo** (`aplicar-correcoes` para histórias, `como-funciona-corrigir` para o Como Funciona).

## 0. Navegador
- Carregue as ferramentas do Chrome numa chamada só (veja `navegador.md`) e rode `list_connected_browsers`. Nenhum: peça ao Iuri para abrir o Chrome do PC com a extensão Claude in Chrome logada nesta conta, e espere. Mais de um: pergunte qual (com `request_decision`) e use `select_browser`.
- Abra uma aba nova (`tabs_context_mcp` com `createIfEmpty`, depois `tabs_create_mcp`) e confira que o YouTube Studio e o Meta Business Suite abrem logados. Página de login: peça ao Iuri para entrar. Nunca digite senha nem código.

## 1. Fila e lote
Em `motor/`:
```bash
npm run fila            # cada vídeo entregue, horário e situação no YouTube e no Instagram
npm run fila -- lote    # o que fazer agora: out/lote/lote.md (para o Iuri) e out/lote/lote.json (para você)
```
- A fila vive no ramo `dados`: `videos/` é da produção (o `entregar`), `publicacao/<nome>.json` é desta skill (programado, publicado, link, comentário) e `publicacao/capas/` guarda o quadro da capa tirado do vídeo. Nada disso fica em `main`.
- **Horários.** No prazo, o vídeo sai no horário combinado na entrega (seg–sex 18h; sáb e dom 11h e 18h). Atrasado (o horário passou ou falta menos de 90 min), vai para o próximo horário livre do mesmo fluxo, contando os extras de 12h (15h no fim de semana) e 21h, depois do vídeo anterior do fluxo e com 3 h entre eles. As partes de uma história nunca trocam de ordem. Os horários futuros só andam se os atrasados não couberem antes. Histórias e Como Funciona têm horários independentes (os dois às 18h é normal).
- **Primeira vez (ou se a fila mostrar vídeos antigos que o Iuri já postou à mão):** confira no YouTube Studio (Conteúdo > Shorts) e no perfil do Instagram o que já saiu e marque como `publicado` com `--nota=manual` antes de montar o lote (`npm run fila -- marcar --ate=AAAA-MM-DD --youtube=publicado --instagram=publicado --nota=manual`, ou por nome). Na dúvida, pergunte ao Iuri até qual vídeo ele postou.
- Copie o `lote.md` para `/mnt/project-files/publicacao/lote-AAAA-MM-DD.md` e mande ao Iuri a lista curta: horário, vídeo, o que vai em cada plataforma, avisos e trocas. **No primeiro lote de todos, espere o ok dele antes de programar.** Nos seguintes, o pedido dele para subir o lote já é o ok: mande a lista e comece. Peça confirmação de novo só para o que não estiver na lista (apagar algo, mudar horário que ele marcou, postar fora do calendário).

## 2. Ordem do trabalho
1. **Já saíram** (`conferir`, `comentar`): confira no Studio que o vídeo está público e no Instagram que o Reel saiu; poste o comentário do lote e fixe (`navegador.md`, "Comentário fixado"). Marque: `npm run fila -- marcar <nome> --youtube=publicado --instagram=publicado --comentario=youtube,instagram`. Não saiu? Diga ao Iuri o que aparece lá; não reenvie por conta própria.
2. **Subir** (`subir`), em ordem de horário, o mais cedo primeiro. Para cada vídeo: YouTube, depois Instagram, seguindo `navegador.md`. **Marque logo depois de cada plataforma** (`npm run fila -- marcar <nome> --youtube=programado --url=<link>`; o horário vem do `lote.json`), para uma queda no meio do lote não subir o mesmo vídeo duas vezes.
3. **Trocar** (`trocar`: a produção entregou outro vídeo depois de programado, por correção): no YouTube, deixe o antigo como Privado e sem agendamento (não apague) e suba o novo no mesmo horário; no Instagram, apague o agendado antigo no Planejador do Meta Business Suite (a troca estava na lista que o Iuri aprovou) e programe o novo no mesmo horário. Marque de novo como `programado`.
4. Se o horário de um vídeo ficar a menos de 20 min enquanto você trabalha, rode `npm run fila -- lote` de novo e use o horário novo.
5. No fim: `npm run fila`, feche as abas que abriu e mande ao Iuri o resultado em poucas linhas (quantos programados, até quando a fila vai, o que falhou), com o `lote.md` anexado.

## 3. Regras
- Sempre **programar**, nunca "publicar agora" (mesmo atrasado: o horário extra já está no lote). Nunca apague vídeo publicado nem mude configuração do canal ou do perfil.
- Audiência do YouTube: "Não é conteúdo para crianças". Conteúdo alterado ou sintético: "Não" (animação 3D claramente não realista, voz sintética genérica, nenhuma pessoa real). No Instagram, só a conta do Instagram no Meta Business Suite (Facebook desmarcado), salvo se o Iuri pedir as duas. Se ele decidir diferente, siga e guarde na memória do projeto.
- A capa é o quadro indicado pelo fluxo (link em `lote.json`, campo `capa`). Sem capa, use a sugerida pela plataforma que mostra o personagem com claridade.
- Os vídeos vão do ramo `dados` direto para a página pelo link do GitHub (o repositório é público): nada é baixado no PC do Iuri. Se ele tornar o repositório privado, esse caminho para; use o plano C de `navegador.md`.
- O `entregar` apaga do ramo os vídeos de mais de 10 dias. Com lote a cada 2 ou 3 dias isso não chega a pegar nada; se a fila mostrar vídeo com mais de 7 dias sem programar, avise o Iuri.
- Tempo: cerca de 5 min por vídeo em cada plataforma. Um lote de 8 vídeos leva perto de 1h20; avise o Iuri no começo.
