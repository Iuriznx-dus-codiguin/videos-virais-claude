"""Imprime a chamada `__autoRun({...})` de um vídeo do lote para colar na aba do YouTube Studio.

Uso: python3 .claude/skills/publicar-lote/cfg_youtube.py <nome> [passo-para-retomar]
     python3 .claude/skills/publicar-lote/cfg_youtube.py --fila <primeiro>..<ultimo>   (imprime __rodarFila([...]))
Lê motor/out/lote/lote.json (gerado por `npm run fila -- lote`).
"""
import json, os, re, sys

LOTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'motor', 'out', 'lote', 'lote.json')
itens = {i['nome']: i for i in json.load(open(LOTE))['itens']}
def cfg_de(nome, desde=None):
    x = itens[nome]
    y = x['youtube']
    serie, n = re.match(r'(.+)-ep(\d+)$', nome).groups()
    n = int(n)
    # Vídeo relacionado = parte anterior: pelo título novo (se ela está no lote) ou pelo número no título antigo.
    padroes = []
    anterior = (itens.get(f'{serie}-ep{n - 1:02d}') or {}).get('youtube') or {}
    if anterior.get('titulo'):
        padroes.append(re.escape(anterior['titulo'][:40]))
    rotulo = re.sub(r'[-_]', ' ', serie)
    padroes.append(rf'{re.escape(rotulo)}\s*(ep|parte|#)?\s*0?{n - 1}\b')
    cfg = dict(nome=nome, video=x['video'], capa=x['capa'], titulo=y['titulo'], descricao=y['descricao'],
               tags=y['tags'], playlist=y['playlist'], relacionado=padroes if n > 1 else [],
               serieRe=rf'^{re.escape(rotulo)}' if n > 1 else None, programar=True,
               hora=y['horario']['hora'], dia=y['horario']['dia'], texto=y['horario']['texto'])
    if desde:
        cfg['desde'] = desde
    return cfg


if sys.argv[1] == '--fila':
    # --fila nome1 nome2 ...  ou  --fila primeiro..ultimo (na ordem de horário do YouTube)
    pendentes = sorted([i for i in itens.values() if (i.get('youtube') or {}).get('acao') == 'subir'],
                       key=lambda i: i['youtube']['horario']['utc'])
    ordem = [i['nome'] for i in pendentes]
    nomes = []
    for a in sys.argv[2:]:
        if '..' in a:
            de, ate = a.split('..')
            nomes += ordem[ordem.index(de):ordem.index(ate) + 1]
        else:
            nomes.append(a)
    print('__rodarFila(' + json.dumps([cfg_de(n) for n in nomes], ensure_ascii=False) + ')')
else:
    print('__autoRun(' + json.dumps(cfg_de(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None), ensure_ascii=False) + ')')
