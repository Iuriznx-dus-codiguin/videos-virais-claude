# Passo a passo no navegador (Claude in Chrome)

As telas mudam com o tempo: guie-se pelo que aparece (tire print, use `find` e `read_page`) e atualize este arquivo quando um passo mudar.

## Ferramentas
Numa chamada só de ToolSearch:
`select:mcp__claude-in-chrome__list_connected_browsers,mcp__claude-in-chrome__select_browser,mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text`

Cuidados:
- **Nunca clique em "Selecionar arquivos"/"Adicionar vídeo"**: abre a janela de arquivos do Windows, que trava a extensão. O vídeo entra pelo código abaixo.
- Não dispare `alert`/`confirm` nem clique em algo que abra um. Se a página parar de responder, peça ao Iuri para fechar o aviso.
- Senha, código de verificação, "confirme que é você": é com o Iuri.

## Colocar o vídeo (ou a capa) no campo de arquivo
Rode com `javascript_tool` na aba da plataforma, com o diálogo de envio já aberto. Troque `URL`, `NOME` e o tipo (`video/mp4` ou `image/jpeg`). O `ACEITA` escolhe o campo certo quando a página tem mais de um (`video` ou `image`).
```js
const URL = 'https://raw.githubusercontent.com/.../videos/apartamento-0-ep03.mp4';
const NOME = 'apartamento-0-ep03.mp4', TIPO = 'video/mp4', ACEITA = 'video';
const r = await fetch(URL);
if (!r.ok) throw new Error('download ' + r.status);
const arquivo = new File([await r.blob()], NOME, {type: TIPO});
const campos = [...document.querySelectorAll('input[type=file]')];
const campo = campos.find((c) => (c.accept || '').includes(ACEITA)) ?? campos.at(-1);
if (!campo) throw new Error('nenhum campo de arquivo na página: abra o diálogo de envio antes');
const dt = new DataTransfer();
dt.items.add(arquivo);
campo.files = dt.files;
campo.dispatchEvent(new Event('input', {bubbles: true}));
campo.dispatchEvent(new Event('change', {bubbles: true}));
`ok: ${arquivo.size} bytes em ${campos.length} campo(s)`;
```
- `Failed to fetch` ou erro de Content-Security-Policy no console = a página não deixa buscar fora do site. Vá para o plano B ou C.
- Campo dentro de shadow DOM (nenhum `input[type=file]` achado com o diálogo aberto): procure com `find` "campo de arquivo" e use o seletor que ele mostrar.

**Plano B (a página bloqueia a busca):** a partir da aba da plataforma, `window.__lote = null; addEventListener('message', (e) => { if (e.data?.tipo === 'lote') window.__lote = e.data.arquivo; }); window.open('https://example.com/')`. Na aba nova (example.com não bloqueia), busque o arquivo como acima e mande `opener.postMessage({tipo: 'lote', arquivo}, '*')`. De volta na plataforma, use `window.__lote` no lugar do `fetch`. Se a aba nova não tiver `opener`, o plano B não serve nessa plataforma.

**Plano C (o mais simples, com um passo do Iuri):** copie os vídeos do lote para a pasta dele no PC (`device_commit_files`, pasta "Iuri Robson" na Área de Trabalho, subpasta `postagens/AAAA-MM-DD/`, um arquivo por vídeo com o nome do lote) e peça para ele arrastar os arquivos para o diálogo de envio que você deixou aberto (o YouTube aceita até 15 de uma vez). Daí em diante, título, descrição, capa e agendamento são seus.

Anote aqui qual caminho funcionou em cada plataforma.

## YouTube Studio
1. `https://studio.youtube.com` → **Criar** → **Enviar vídeos**. Com o diálogo aberto, rode o código com o `video` do lote.
2. Na tela de detalhes (o vídeo vertical de até 3 min vira Short sozinho):
   - **Título:** clique no campo, selecione tudo (ctrl+a) e digite `youtube.titulo`.
   - **Descrição:** o mesmo com `youtube.descricao` (as quebras de linha contam).
   - **Miniatura:** em "Enviar arquivo" da miniatura, rode o código com `capa`, `image/jpeg`, `ACEITA = 'image'`. Sem campo de miniatura para Shorts, escolha a sugestão mais clara.
   - **Playlists:** marque `youtube.playlist`. Se não existir, "Nova playlist" com esse nome, visibilidade Pública. Ela deve ficar em ordem de publicação.
   - **Público:** "Não, não é conteúdo para crianças".
   - **Mostrar mais:** conteúdo alterado = Não; tags = `youtube.tags` separadas por vírgula; "Vídeo relacionado" (se aparecer aqui ou na tela de elementos) = `youtube.relacionado` (procure pelo título).
3. **Avançar** até **Visibilidade** → **Programar** → data e hora de `horario` (dia e hora de Brasília; confira o fuso mostrado: GMT-3, São Paulo) → **Programar**.
4. Copie o link do vídeo que aparece no diálogo (youtube.com/shorts/... ou youtu.be/...) e marque: `npm run fila -- marcar <nome> --youtube=programado --url=<link>`.

## Instagram (Meta Business Suite)
O Instagram só agenda Reels pelo computador no Meta Business Suite (perfil profissional ligado a uma página do Facebook).
1. `https://business.facebook.com/latest/home` → **Criar reel** (ou Conteúdo → Criar → Reel).
2. **Publicar em:** só o Instagram (desmarque a página do Facebook, salvo pedido do Iuri).
3. Vídeo: com o composer aberto, rode o código com o `video` do lote.
4. **Legenda:** clique no campo e digite `instagram.legenda`.
5. **Capa/miniatura:** "Editar" → enviar imagem com o código (`capa`, `ACEITA = 'image'`) ou escolha o quadro de `segundo_da_capa`.
6. **Opções de agendamento** → **Agendar** → data e hora de `horario` (o Business Suite usa o fuso do PC do Iuri, que é o de Brasília; confira) → **Agendar**.
7. Marque: `npm run fila -- marcar <nome> --instagram=programado`. O link do Reel só existe depois que sai; ele entra no `conferir`.
8. Trocar um agendado: Planejador → o post → Excluir (o Iuri aprovou a troca no lote) → programe o novo no mesmo horário.

## Comentário fixado (depois que o vídeo sai)
- **YouTube:** abra o link do Short, painel de comentários, publique o `comentario` do lote, depois ⋮ no seu comentário → **Fixar**.
- **Instagram:** abra o Reel no perfil (instagram.com), comente o `comentario`. Se o menu do comentário tiver **Fixar**, fixe; se não tiver na versão web, deixe só comentado e diga ao Iuri para fixar pelo app.
- Marque: `npm run fila -- marcar <nome> --comentario=youtube,instagram` (só as plataformas em que deu certo).
