// Automação do diálogo de envio do YouTube Studio (usada pela skill publicar-lote).
// Carregue na aba do Studio com:
//   eval(await (await fetch('https://raw.githubusercontent.com/<dono>/<repo>/<commit>/.claude/skills/publicar-lote/youtube.js')).text())
// (o Studio bloqueia eval em algumas páginas: injete como <script> com o nonce da página, ver navegador.md)
// e rode `__autoRun(cfg)` com o cfg que `python3 .claude/skills/publicar-lote/cfg_youtube.py <nome>` imprime.
// Acompanhe por `__auto.fase` / `__auto.erro`. Preenche tudo, agenda data, hora e fuso (GMT-0300) e, com
// `cfg.programar: true`, clica em Programar e confere a mensagem "Vídeo programado" (fase 'programado', __auto.link).
// Sem `programar`, para em 'pronto para programar'; se algo não bate, para em 'conferir data e hora'.
// `cfg.desde` retoma a partir de um passo: detalhes | playlist | avancado | elementos | visibilidade.
window.__abrirEnvio = async () => {
  if (document.querySelector('input[type=file][name=Filedata]')) return 'ja aberto';
  document.querySelector('ytcp-button.ytcpAppHeaderCreateIcon button').click();
  await new Promise((r) => setTimeout(r, 900));
  const it = [...document.querySelectorAll('tp-yt-paper-item')].find((e) => e.innerText.trim() === 'Enviar vídeos' && e.getBoundingClientRect().width > 0);
  if (!it) return 'menu sem Enviar vídeos';
  it.click();
  for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 300)); if (document.querySelector('input[type=file][name=Filedata]')) return 'aberto'; }
  return 'sem campo';
};
// Download com cache: a linha do Iuri baixa do GitHub a ~100 KB/s, então os próximos vídeos vão baixando enquanto um é preenchido.
// __prebaixar(url) devolve uma Promise<Blob>; chamar de novo com a mesma url reaproveita. __pre[url].lidos mostra o progresso.
window.__pre = window.__pre || {};
window.__prebaixar = (url) => {
  const p = window.__pre[url];
  if (p && !p.erro) return p.promessa;
  const reg = {lidos: 0, total: 0, erro: null};
  reg.promessa = (async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error('download ' + r.status + ' ' + url);
    reg.total = Number(r.headers.get('content-length')) || 0;
    const leitor = r.body.getReader();
    const partes = [];
    for (;;) { const {done, value} = await leitor.read(); if (done) break; partes.push(value); reg.lidos += value.length; }
    return new Blob(partes);
  })();
  reg.promessa.catch((e) => { reg.erro = String(e); });
  window.__pre[url] = reg;
  return reg.promessa;
};
window.__autoRun = (cfg) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function esperar(fn, ms = 60000, oque = '') {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) {} await sleep(300); }
    throw new Error('demorou: ' + oque);
  }
  const st = window.__auto = {nome: cfg.nome, fase: 'inicio', log: [], erro: null, avisos: [], cfg};
  const L = (m) => { st.fase = m; st.log.push(m); };
  const D = () => document.querySelector('ytcp-uploads-dialog');
  const q = (s, raiz) => (raiz || D() || document).querySelector(s);
  const qa = (s, raiz) => [...(raiz || D() || document).querySelectorAll(s)];
  const visivel = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const porTexto = (sel, re, raiz) => qa(sel, raiz || document).filter(visivel).find((e) => re.test(e.innerText.trim()));
  const escrever = (el, texto) => { el.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, texto); };
  const arquivo = async (url, nome, tipo) => {
    const blob = await window.__prebaixar(url);
    return new File([blob], nome, {type: tipo});
  };
  const colocar = (campo, f) => { const dt = new DataTransfer(); dt.items.add(f); campo.files = dt.files; campo.dispatchEvent(new Event('input', {bubbles: true})); campo.dispatchEvent(new Event('change', {bubbles: true})); };
  const PASSOS = ['enviar', 'detalhes', 'playlist', 'avancado', 'elementos', 'visibilidade'];
  const inicio = Math.max(0, PASSOS.indexOf(cfg.desde || 'enviar'));
  const faz = (p) => PASSOS.indexOf(p) >= inicio;
  const centro = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; };
  st.run = (async () => { try {
    let capa;
    if (faz('enviar')) {
      L('baixando');
      const [v, c] = await Promise.all([arquivo(cfg.video, cfg.nome + '.mp4', 'video/mp4'), arquivo(cfg.capa, cfg.nome + '.jpg', 'image/jpeg')]);
      st.bytes = [v.size, c.size]; capa = c;
      L('abrindo envio');
      if (!document.querySelector('input[type=file][name=Filedata]')) st.abrir = await window.__abrirEnvio();
      colocar(await esperar(() => document.querySelector('input[type=file][name=Filedata]'), 30000, 'campo de envio'), v);
    }
    if (faz('detalhes')) {
      L('detalhes');
      const tit = await esperar(() => q('#title-textarea #textbox'), 120000, 'tela de detalhes');
      await sleep(2000);
      escrever(tit, cfg.titulo);
      escrever(q('#description-textarea #textbox'), cfg.descricao);
      if (!capa) capa = await arquivo(cfg.capa, cfg.nome + '.jpg', 'image/jpeg');
      colocar(await esperar(() => q('input#file-loader'), 20000, 'campo da miniatura'), capa);
    }
    if (faz('playlist')) {
      L('playlist');
      const ja = (q('ytcp-video-metadata-playlists') || {}).innerText || '';
      if (!ja.includes(cfg.playlist)) {
        (await esperar(() => q('ytcp-video-metadata-playlists ytcp-dropdown-trigger, ytcp-video-metadata-playlists [role=button]'), 10000, 'botão de playlist')).click();
        await sleep(1500);
        const caixa = () => qa('ytcp-playlist-dialog tp-yt-paper-dialog, ytcp-playlist-dialog', document).filter(visivel).at(-1);
        await esperar(() => caixa(), 10000, 'diálogo de playlists');
        await sleep(800);
        const alvo = cfg.playlist.trim().toLowerCase();
        const cb = qa('ytcp-checkbox-lit', caixa()).find((e) => { let r = e; for (let i = 0; i < 4 && r && !(r.innerText || '').trim(); i++) r = r.parentElement; return (r?.innerText || '').trim().toLowerCase() === alvo; });
        if (!cb) throw new Error('playlist não existe: ' + cfg.playlist + ' (crie em Criar → Nova playlist e retome com desde: "playlist")');
        const box = cb.querySelector('[role=checkbox]') || cb;
        if (box.getAttribute('aria-checked') !== 'true') box.click();
        await sleep(500);
        const ok = porTexto('ytcp-button, button', /^Concluir$/, caixa());
        if (ok) ok.click();
        await sleep(1000);
      }
    }
    if (faz('avancado')) {
      L('público e avançado');
      q('tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]').click();
      const mais = q('#toggle-button');
      if (mais && /Mostrar mais|avançad/i.test(mais.innerText)) mais.click();
      await sleep(1200);
      const alt = await esperar(() => q('tp-yt-paper-radio-button[name=VIDEO_HAS_ALTERED_CONTENT_NO]'), 10000, 'conteúdo alterado');
      alt.click();
      const chips = () => qa('ytcp-free-text-chip-bar ytcp-chip, #tags-container ytcp-chip').map((e) => e.innerText.trim());
      if (!chips().length) {
        const tagIn = q('ytcp-free-text-chip-bar input, #tags-container input');
        tagIn.focus(); document.execCommand('insertText', false, cfg.tags.join(',') + ',');
        tagIn.dispatchEvent(new Event('change', {bubbles: true}));
        tagIn.blur();
        await esperar(() => chips().length >= cfg.tags.length, 5000, 'tags').catch(() => st.avisos.push('tags não conferidas: ' + JSON.stringify({chips: chips(), valor: tagIn.value})));
      }
      st.conferencia = {
        titulo: q('#title-textarea #textbox').innerText.trim() === cfg.titulo,
        descricao: [q('#description-textarea #textbox').innerText.trim().length, cfg.descricao.trim().length],
        criancas: q('tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]').getAttribute('aria-checked'),
        alterado: alt.getAttribute('aria-checked'),
        tags: chips(),
        playlist: (q('ytcp-video-metadata-playlists') || {}).innerText?.replace(/\s+/g, ' ').trim(),
      };
    }
    if (faz('elementos')) {
      L('elementos');
      q('#next-button').click();
      await sleep(1500);
      if (cfg.relacionado.length) {
        const linha = await esperar(() => qa('ytcp-uploads-video-elements *').filter((e) => e.children.length === 0 && /Vídeo relacionado/.test(e.textContent)).at(0), 15000, 'vídeo relacionado');
        let bloco = linha;
        for (let i = 0; i < 6 && bloco && !porTexto('ytcp-button, button', /^(Adicionar|Editar)$/, bloco); i++) bloco = bloco.parentElement;
        const add = bloco && porTexto('ytcp-button, button', /^Adicionar$/, bloco);
        if (!add) st.avisos.push('relacionado: sem botão Adicionar (já tem?)');
        else {
          add.click();
          await sleep(2500);
          const caixa = qa('ytcp-video-pick-dialog, tp-yt-paper-dialog', document).filter(visivel).at(-1);
          const cards = caixa ? qa('ytcp-entity-card', caixa).filter(visivel) : [];
          const texto = (e) => e.innerText.replace(/\s+/g, ' ').trim();
          let achado;
          for (const p of [...cfg.relacionado, cfg.serieRe].filter(Boolean)) { achado = cards.find((e) => new RegExp(p, 'i').test(texto(e))); if (achado) break; }
          st.cardsVistos = cards.slice(0, 8).map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 50));
          if (achado) { achado.click(); await sleep(1500); st.relacionado = achado.innerText.replace(/\s+/g, ' ').trim().slice(0, 60); }
          else {
            st.avisos.push('relacionado não achado');
            const fechar = caixa && q('#close-button, [aria-label=Fechar]', caixa);
            if (fechar) fechar.click();
            await sleep(800);
          }
        }
      }
      L('verificação');
      q('#next-button').click(); await sleep(1500);
      q('#next-button').click(); await sleep(1500);
    }
    L('visibilidade');
    const exp = await esperar(() => q('ytcp-uploads-review #second-container-expand-button'), 10000, 'programar');
    if (!q('ytcp-uploads-review #datepicker-trigger')) { exp.click(); await sleep(1200); }
    const hora = await esperar(() => q('ytcp-uploads-review #time-of-day-container input'), 10000, 'campo da hora');
    hora.scrollIntoView({block: 'center'}); await sleep(500);
    st.link = (q('a[href*="shorts/"], a[href*="youtu.be"]') || {}).href;
    st.agenda = q('ytcp-uploads-review #second-container').innerText.replace(/\s+/g, ' ');
    L('agendando');
    const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const [ano, mes, dia] = cfg.dia.split('-').map(Number);
    const dataCurta = `${dia} de ${MESES[mes - 1]} de ${ano}`;
    const R = () => q('ytcp-uploads-review');
    const agenda = () => q('#second-container', R()).innerText.replace(/\s+/g, ' ');
    if (!agenda().includes(dataCurta)) {
      // o calendário é um tp-yt-paper-dialog com ytcp-scrollable-calendar; digitar no campo dele não pega, clicar no dia pega
      q('#datepicker-trigger', R()).click();
      const rotuloMes = `${MESES[mes - 1]} de ${ano}`;
      const celula = await esperar(() => {
        const m = qa('ytcp-scrollable-calendar .calendar-month', document).find((e) => e.getAttribute('aria-label') === rotuloMes);
        return m && [...m.querySelectorAll('span.calendar-day')].find((d) => d.textContent.trim() === String(dia));
      }, 8000, 'dia no calendário');
      celula.scrollIntoView({block: 'center'});
      await sleep(300);
      celula.click();
      await sleep(900);
    }
    hora.focus(); hora.select();
    document.execCommand('insertText', false, cfg.hora);
    hora.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true}));
    hora.blur(); await sleep(500);
    const fuso = q('#timezone-select-button', R());
    if (fuso) {
      fuso.click(); await sleep(900);
      const it = [...document.querySelectorAll('tp-yt-paper-item, [role=option]')].find((e) => /^\(GMT-0300\) Horário local/.test(e.innerText.trim()) && visivel(e));
      if (it) it.click(); else st.avisos.push('fuso GMT-0300 não achado');
      await sleep(800);
    }
    st.agenda = agenda();
    st.conferenciaAgenda = {data: st.agenda.includes(dataCurta), hora: hora.value === cfg.hora, fuso: st.agenda.includes('(GMT-0300)')};
    st.alvos = {hora: centro(hora), data: centro(q('#datepicker-trigger', R())), programar: centro(q('#done-button'))};
    if (!(st.conferenciaAgenda.data && st.conferenciaAgenda.hora && st.conferenciaAgenda.fuso)) { L('conferir data e hora'); return; }
    if (!cfg.programar) { L('pronto para programar'); return; }
    L('programando');
    q('#done-button').click();
    const esperado = `${dia} de ${MESES_LONGOS[mes - 1]} de ${ano} às ${cfg.hora}`;
    const conf = await esperar(() => {
      const caixas = qa('tp-yt-paper-dialog, ytcp-dialog', document).filter(visivel);
      const aviso = caixas.find((e) => /Ainda estamos verificando/.test(e.innerText));
      if (aviso) { const ok = qa('ytcp-button, button', aviso).filter(visivel).find((b) => /^Ok$/i.test(b.innerText.trim())); if (ok) { ok.click(); st.avisos.push('aviso de verificação em andamento: ok'); } }
      return caixas.find((e) => /Vídeo programado/.test(e.innerText));
    }, 90000, 'confirmação');
    st.confirmacao = conf.innerText.replace(/\s+/g, ' ').slice(0, 200);
    st.link = ((conf.querySelector('a[href*="shorts/"], a[href*="youtu"]') || {}).href || st.link || '').replace(/\?.*$/, '');
    st.ok = st.confirmacao.includes(esperado);
    L(st.ok ? 'programado' : 'programado com horário diferente');
  } catch (e) { st.erro = String((e && e.message) || e); L('erro'); } })();
  return 'iniciado ' + cfg.nome;
};
'carregado';
