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

**O que funcionou (14–15/11/2026):**
- **YouTube Studio:** o `fetch` direto do raw.githubusercontent.com funciona (a página deixa). Use a automação abaixo.
- **Instagram (instagram.com):** a página bloqueia o `fetch` (Failed to fetch). O plano B funciona, mas o `window.open` só passa com gesto do usuário: injete um botão na página e clique nele com o `computer` (clique de verdade). O instagram.com não agenda: para agendar é o Meta Business Suite.
- O `file_upload` do Claude in Chrome tem limite de 10 MB: não serve para os vídeos.

## YouTube Studio (automação)
O diálogo inteiro é preenchido por `youtube.js` (nesta pasta). Cada vídeo leva uma chamada e um acompanhamento.

1. Aba nova em `https://studio.youtube.com/channel/<canal>/videos/short`.
2. Carregue o script (uma vez por aba; troque `<commit>` pelo commit do ramo que tem a versão atual do `youtube.js`). O Studio bloqueia `eval` em algumas páginas, por isso entra como `<script>` com o nonce da própria página:
```js
window.__carregar = async (sha) => {
  const code = await (await fetch(`https://raw.githubusercontent.com/<dono>/<repo>/${sha}/.claude/skills/publicar-lote/youtube.js`)).text();
  const s = document.createElement('script'); s.nonce = (document.querySelector('script[nonce]') || {}).nonce;
  let txt = code; if (window.trustedTypes && trustedTypes.createPolicy) { try { txt = trustedTypes.createPolicy('publote' + Date.now(), {createScript: (x) => x}).createScript(code); } catch (e) {} }
  s.textContent = txt; document.head.appendChild(s); return 'carregado';
};
window.__fechar = async () => { const f = [...document.querySelectorAll('ytcp-button, button')].find(e => e.innerText.trim() === 'Fechar' && e.getBoundingClientRect().width > 0); if (f) f.click(); await new Promise(r => setTimeout(r, 1000)); return !!f; };
await __carregar('<commit>');
```
3. As playlists precisam existir antes: **Criar → Nova playlist**, visibilidade Pública; para série em ordem, "Ordem padrão dos vídeos" = **Data de publicação (mais antiga)**. Depois **Adicionar vídeos → Escolher vídeos do canal** e marque as partes que já saíram.
4. **Vários de uma vez (o normal):** `python3 .claude/skills/publicar-lote/cfg_youtube.py --fila <primeiro>..<ultimo>` imprime `__rodarFila([...])` com os vídeos nessa faixa, na ordem de horário. Cole com `javascript_tool` e deixe a aba **em primeiro plano** (aba de fundo tem os timers freados pelo Chrome). A fila pré-baixa o próximo vídeo enquanto preenche o atual e para no primeiro que não sair `programado` com a data e a hora certas. Acompanhe com `JSON.stringify({atual: __fila.atual, feitos: __fila.feitos, parou: __fila.parou, fase: __auto.fase, erro: __auto.erro, res: __fila.resultados.map(r => [r.nome, r.ok, r.link])})` e marque cada um que saiu ok. Depois de consertar um que parou, retome com `__rodarFila(__fila.lista.slice(__fila.feitos + 1))`. Pare a faixa antes de uma série que ainda não tem playlist e crie a playlist antes.
   **Um só:** `cfg_youtube.py <nome>` imprime `__autoRun({...})`; rode `await __fechar();` e essa linha.
5. Acompanhe um só a cada ~10–15 s: `JSON.stringify({fase: __auto.fase, erro: __auto.erro, avisos: __auto.avisos, conf: __auto.conferencia, agenda: __auto.conferenciaAgenda, confirmacao: __auto.confirmacao, ok: __auto.ok, link: __auto.link})`. Leva de 1 a 4 min por vídeo, conforme a velocidade de download do PC do Iuri (já foi de 100 KB/s a vários MB/s).
   - `programado` com `ok: true`: a mensagem "Vídeo programado" bateu com dia e hora. Marque `npm run fila -- marcar <nome> --youtube=programado --url=<link>`.
   - `conferir data e hora`: algo não bateu (data, hora ou fuso). Tire print, acerte com cliques (`__auto.alvos` tem as coordenadas) e clique em Programar.
   - `erro`: leia `__auto.erro`; `cfg.desde` (detalhes | playlist | avancado | elementos | visibilidade) retoma do passo sem reenviar.
6. O que o script já resolve, para não redescobrir:
   - Abre o envio por **Criar → Enviar vídeos**. Clique por JS no `ytcp-button` do cabeçalho não abre o menu; no `button` de dentro, abre. Os itens do menu repetem ids (`#text-item-0`) com outros menus: procure pelo texto.
   - Diálogos são `position: fixed` (`offsetParent` é nulo): veja visibilidade pelo tamanho do retângulo.
   - "Conteúdo alterado" e tags ficam em **Mostrar mais** (`#toggle-button`); a seção some do DOM quando fecha. As tags viram chips depois de `insertText` + `blur`.
   - **Vídeo relacionado** (em Elementos do vídeo): a lista só mostra vídeos **públicos**, então a parte anterior ainda programada não aparece; o script usa a mais recente pública da mesma série.
   - Hora: o campo abre uma lista de 15 em 15 min; o script clica o item ("12:00"). Só `insertText` às vezes deixa lixo ("00:12"). Fuso: "Fuso horário" sem nada escolhido é o horário local; o script escolhe "(GMT-0300) Horário local" para ficar explícito.
   - Ao clicar em Programar com a verificação ainda rodando, aparece "Ainda estamos verificando seu conteúdo": o script clica em Ok e segue.
   - Data: abre `#datepicker-trigger` e clica o `span.calendar-day` do mês certo (`ytcp-scrollable-calendar .calendar-month[aria-label="nov. de 2026"]`). Digitar a data no campo e dar Enter não pega.
   - A confirmação pode vir como "Vídeo programado" ou, quando o envio termina antes do processamento, "Processando vídeo ... ficará público em <data> às <hora>". As duas valem; o script confere pelo título do vídeo porque a confirmação do anterior pode ficar aberta atrás.
   - Se o PC do Iuri dormir no meio, o navegador desconecta: pare, avise e retome depois pelo `npm run fila -- lote` (os já programados não voltam para o lote).

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

### O que funcionou (24/11/2026)
- **Conta:** o seletor do topo mostra o perfil (ex.: historiasdestick). Cada fluxo tem o seu perfil (`instagram.conta` do lote); se o perfil não aparece no seletor, peça ao Iuri para ligá-lo ao Business Suite.
- **Vídeo:** o CSP do Business Suite bloqueia o `fetch` do raw. Plano B: injete um botão fixo na página (`window.open('https://example.com/', 'ajudante')` no `onclick`), clique nele com o `computer` (precisa ser clique de verdade). Na aba ajudante, defina `__baixar(url, nome, tipo)` que baixa e faz `opener.postMessage({tipo:'arquivo', nome, arquivo: new File([blob], nome, {type})}, 'https://business.facebook.com')`, e um ouvinte para `{tipo:'baixar', url, nome}` vindo do Business Suite. No Business Suite, um ouvinte guarda os arquivos em `window.__recebidos[nome]`. Mude o título da ajudante para "Ajudante de envio (não feche)".
- **Lista:** suba `publicacao/fila/instagram.json` no ramo dados (nome, conta, video, legenda, data `mm/dd/aaaa`, h, m, ap) e mande a ajudante buscar e repassar (`{tipo:'lista'}`).
- **Composer:** o botão "Create reel" (na página de agendados também) abre o composer sem recarregar a página, então as variáveis continuam. Antes de clicar em "Add Video", sobrescreva `HTMLInputElement.prototype.click`: se for `type=file` e houver `window.__arquivoPendente`, ponha o arquivo com DataTransfer e dispare `input`/`change` em vez de abrir o seletor. O envio termina quando o texto mostra `1080 x 1920 100%`.
- **Legenda:** foque `[contenteditable=true][aria-label^="Describe your reel"]` e dispare um `ClipboardEvent('paste')` com o texto em `text/plain`.
- **Agendar:** "Next" duas vezes até "Scheduling options"; clique no "Schedule" de cima (o de baixo é o botão final). Data e hora com ações reais do `computer`: clique três vezes no campo da data, clique no dia no calendário; clique no spinbutton das horas e digite, por exemplo, `300P` (vira 3:00 PM); confira os minutos (clique e digite `00`). Leia os campos (`aria-valuenow`) antes do botão final. **Não** use setter de valor + Enter sintético na data: a aba travou.
- **Fim:** "Schedule" de baixo → aviso "Your reel has been published according to your chosen publishing options" e a página vai para os agendados.
- **Abas em segundo plano** têm timers muito lentos: não rode a fila do YouTube e o Business Suite ao mesmo tempo esperando velocidade; deixe a aba que está trabalhando em primeiro plano.

## Comentário fixado (depois que o vídeo sai)
- **YouTube:** abra o link do Short, painel de comentários, publique o `comentario` do lote, depois ⋮ no seu comentário → **Fixar**.
- **Instagram:** abra o Reel no perfil (instagram.com), comente o `comentario`. Se o menu do comentário tiver **Fixar**, fixe; se não tiver na versão web, deixe só comentado e diga ao Iuri para fixar pelo app.
- Marque: `npm run fila -- marcar <nome> --comentario=youtube,instagram` (só as plataformas em que deu certo).
