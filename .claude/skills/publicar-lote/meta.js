// Agendamento de Reels no Meta Business Suite (cole com javascript_tool na aba do Business Suite).
// Precisa da aba ajudante (example.com) aberta por clique real no botão "ajudante" (ver navegador.md):
// o CSP do Business Suite bloqueia fetch do raw, então a ajudante baixa e manda o File por postMessage.
// Uso: __reelPreparar(item) (assíncrono; acompanhe __bsSt). Quando __bsSt.fase === 'pronto', ponha data e
// hora com __reelAgendar(item) e confira com __reelCampos(); por fim __reelFinal() clica no Schedule de baixo.
(() => {
  const esp = (ms) => new Promise((r) => setTimeout(r, ms));
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const botao = (t) => [...document.querySelectorAll('[role=button], button')].find((e) => e.innerText.trim() === t && vis(e));
  const ate = async (fn, ms, oque) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await esp(500); } throw new Error('demorou: ' + oque); };
  window.__recebidos = window.__recebidos || {};
  if (!window.__ouvindoBS) {
    window.addEventListener('message', (e) => {
      if (e.origin !== 'https://example.com' || !e.data) return;
      if (e.data.tipo === 'arquivo') window.__recebidos[e.data.nome] = e.data.arquivo;
      if (e.data.tipo === 'lista') window.__igLista = e.data.lista;
      if (e.data.tipo === 'erro') window.__erroAjudante = e.data;
    });
    window.__ouvindoBS = true;
  }
  if (!window.__interceptado) {
    const orig = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file' && window.__arquivoPendente) {
        const dt = new DataTransfer(); dt.items.add(window.__arquivoPendente); this.files = dt.files;
        window.__arquivoPendente = null; window.__usouInput = { accept: this.accept };
        this.dispatchEvent(new Event('input', { bubbles: true })); this.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      return orig.call(this);
    };
    window.__interceptado = true;
  }
  window.__pedir = (it) => { if (!window.__recebidos[it.nome + '.mp4']) window.__ajudante.postMessage({ tipo: 'baixar', url: it.video, nome: it.nome + '.mp4' }, 'https://example.com'); };

  window.__reelPreparar = async (it, prox) => {
    const st = window.__bsSt = { nome: it.nome, fase: 'abrindo', t0: Date.now() };
    try {
      window.__pedir(it);
      if (!location.pathname.includes('reels_composer')) (await ate(() => botao('Create reel'), 20000, 'Create reel')).click();
      await ate(() => botao('Add Video'), 30000, 'Add Video');
      await esp(800);
      if (!document.body.innerText.includes(it.conta)) throw new Error('conta errada no composer (esperava ' + it.conta + ')');
      st.fase = 'baixando';
      const f = await ate(() => window.__recebidos[it.nome + '.mp4'], 300000, 'download do vídeo');
      if (prox) window.__pedir(prox);
      st.fase = 'enviando';
      window.__arquivoPendente = f; window.__usouInput = null;
      botao('Add Video').click();
      await ate(() => window.__usouInput, 10000, 'campo de arquivo');
      await ate(() => { const m = document.body.innerText.match(/1080 x 1920\s*(\d+)%/); st.envio = m ? m[1] : st.envio; return m && m[1] === '100'; }, 900000, 'envio 100%');
      st.fase = 'legenda';
      const ed = await ate(() => document.querySelector('[contenteditable=true][aria-label^="Describe your reel"]'), 10000, 'campo da legenda');
      ed.focus(); await esp(300);
      const dt = new DataTransfer(); dt.setData('text/plain', it.legenda);
      ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      await esp(1000);
      if (Math.abs(ed.innerText.length - it.legenda.length) > 20) throw new Error('legenda não entrou (' + ed.innerText.length + ' de ' + it.legenda.length + ')');
      st.fase = 'avançando';
      for (let i = 0; i < 3 && !document.body.innerText.includes('Scheduling options'); i++) { (await ate(() => botao('Next'), 15000, 'Next')).click(); await esp(2500); }
      if (!document.body.innerText.includes('Scheduling options')) throw new Error('não chegou na etapa Share');
      const sch = [...document.querySelectorAll('[role=button]')].filter((e) => e.innerText.trim() === 'Schedule' && vis(e)).sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y)[0];
      sch.click();
      await ate(() => document.querySelector('input[placeholder="mm/dd/yyyy"]'), 10000, 'campo da data');
      delete window.__recebidos[it.nome + '.mp4'];
      st.fase = 'pronto';
    } catch (e) { st.fase = 'erro'; st.erro = String(e.message || e); }
    st.seg = Math.round((Date.now() - st.t0) / 1000);
  };

  // Campos da etapa Share, com o centro de cada um em coordenadas da página.
  window.__reelCampos = () => {
    const ins = [...document.querySelectorAll('input')].filter(vis);
    const c = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; };
    const data = ins.find((i) => i.placeholder === 'mm/dd/yyyy');
    const h = ins.find((i) => i.getAttribute('aria-label') === 'hours');
    const m = ins.find((i) => i.getAttribute('aria-label') === 'minutes');
    const ap = ins.find((i) => i.getAttribute('aria-label') === 'meridiem');
    const fin = [...document.querySelectorAll('[role=button]')].filter((e) => e.innerText.trim() === 'Schedule' && vis(e)).sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y)[0];
    return { data: data && data.value, h: h && h.getAttribute('aria-valuenow'), m: m && m.getAttribute('aria-valuenow'), ap: ap && ap.getAttribute('aria-valuetext'),
      pos: { data: c(data), h: c(h), m: c(m), ap: c(ap), final: c(fin) }, largura: innerWidth };
  };

  // Clica no botão final e espera o aviso de sucesso.
  window.__reelFinal = async (it) => {
    const st = window.__bsSt;
    const k = window.__reelCampos();
    const alvo = { h: String(it.h), m: String(Number(it.m)), ap: it.ap };
    const mesNome = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][it.mes - 1];
    if (k.data !== `${mesNome} ${it.dia}, 2026` || k.h !== alvo.h || k.m !== alvo.m || k.ap !== alvo.ap) return 'não bate: ' + JSON.stringify([k.data, k.h, k.m, k.ap]);
    const fin = [...document.querySelectorAll('[role=button]')].filter((e) => e.innerText.trim() === 'Schedule' && vis(e)).sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y)[0];
    fin.click();
    try {
      await ate(() => /published according to your chosen publishing options|scheduled_posts/.test(document.body.innerText + location.pathname), 60000, 'confirmação');
      st.fase = 'agendado';
      return 'agendado';
    } catch (e) { st.fase = 'erro'; st.erro = String(e.message || e); return st.erro; }
  };
  return 'meta.js carregado';
})();
