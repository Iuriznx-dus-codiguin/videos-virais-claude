"""Cena de teste 3D renderizada no Blender por código, sem GPU (EEVEE em software).

Uso:
    python cena.py -- --saida DIR [--quadros 1-300 | --quadros 1,90,200] [--amostras 8] [--escala 100]

Lê ../cena.json, os mesmos dados usados pela versão Three.js (remotion/src/cena.ts).
A cena é montada em coordenadas com Y para cima, dentro de um objeto raiz girado
90 graus, para que posições e ângulos sejam idênticos aos da versão Three.js.
"""
import json
import math
import os
import sys
import time

import warnings

import bpy  # precisa vir antes de bmesh/mathutils quando o Blender é usado como módulo Python
import bmesh
from mathutils import Matrix, Vector

warnings.filterwarnings('ignore', category=DeprecationWarning)

AQUI = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(AQUI, '..', 'cena.json'), encoding='utf-8') as f:
    D = json.load(f)
C = D['cores']
P = D['personagem']
FPS = D['fps']


def argumento(nome, padrao):
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return a[a.index(nome) + 1] if nome in a else padrao


# ---------------------------------------------------------------------------
# Linha do tempo (espelho exato de remotion/src/cena.ts)
# ---------------------------------------------------------------------------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, t):
    return a + (b - a) * t


def lerp3(a, b, t):
    return [lerp(a[i], b[i], t) for i in range(3)]


def smoothstep(a, b, x):
    t = clamp((x - a) / (b - a))
    return t * t * (3 - 2 * t)


def ease_in_out(t):
    t = clamp(t)
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out(t):
    return 1 - (1 - clamp(t)) ** 3


def pos_x(t):
    tb, db, v, x0 = P['freia_em'], P['freio'], P['velocidade'], P['x0']
    if t <= tb:
        return x0 + v * t
    if t <= tb + db:
        dt = t - tb
        return x0 + v * tb + v * (dt - dt * dt / (2 * db))
    return x0 + v * tb + v * db / 2


def vel_fator(t):
    tb, db = P['freia_em'], P['freio']
    if t <= tb:
        return 1.0
    if t <= tb + db:
        return 1 - (t - tb) / db
    return 0.0


def fase(t):
    return 2 * math.pi * P['ciclos_por_unidade'] * (pos_x(t) - P['x0'])


def pose(t):
    a = vel_fator(t)
    ph = fase(t)
    s, c = math.sin(ph), math.cos(ph)
    baixo = smoothstep(5.75, 6.25, t) * (1 - smoothstep(7.15, 7.35, t))
    susto = smoothstep(7.2, 7.4, t)
    recuo = smoothstep(9.0, 9.35, t)
    y = 1.19 - 0.08 * a * s * s - 0.10 * baixo - 0.06 * susto - 0.04 * recuo
    tremor = [0.012 * susto * math.sin(61 * t), 0.008 * susto * math.sin(47 * t + 1), 0.012 * susto * math.sin(53 * t + 2)]
    raiz = [pos_x(t) + tremor[0], y + tremor[1], P['z'] + 0.3 * recuo + tremor[2]]
    pisc = 1.0
    for tp in D['piscadas']:
        d = abs(t - tp)
        if d < 0.09:
            pisc = min(pisc, max(0.1, d / 0.09))
    return {
        'raiz': raiz,
        'yaw': math.pi / 2 + 0.95 * susto,
        'incl': 0.07 * a + 0.22 * baixo - 0.08 * susto - 0.06 * recuo,
        'cab_pitch': 0.03 * a * math.sin(2 * ph) + 0.42 * baixo - 0.08 * susto,
        'cab_yaw': 0.5 * susto,
        'coxa_e': 0.45 * a * s + 0.15 * baixo + 0.1 * susto,
        'coxa_d': -0.45 * a * s + 0.15 * baixo + 0.1 * susto,
        'joelho_e': a * (0.1 + 0.85 * max(0.0, c)) + 0.32 * baixo + 0.2 * susto,
        'joelho_d': a * (0.1 + 0.85 * max(0.0, -c)) + 0.32 * baixo + 0.2 * susto,
        'ombro_e': lerp(-0.5 * a * s, 0.6 + 0.2 * recuo, susto) + 0.05 * baixo,
        'ombro_d': lerp(0.5 * a * s, 0.6 + 0.2 * recuo, susto) + 0.05 * baixo,
        'cotov': lerp(0.3 + 0.25 * a, 1.25 - 0.1 * recuo, susto),
        'abre': lerp(0.12 + 0.05 * baixo, 0.22 + 0.06 * recuo, susto) + 0.03 * susto * math.sin(55 * t),
        'pisc': pisc,
        'olho': 1 + 0.35 * susto,
        'sob_y': 0.17 + 0.05 * susto,
        'sob_ang': 0.22 * baixo + 0.35 * susto,
        'boca_l': lerp(0.11, 0.075, max(baixo, susto)),
        'boca_a': 0.022 + 0.025 * baixo * (1 - susto) + 0.1 * susto,
        'band': 0.35 + 0.25 * a * math.sin(2 * ph) + 0.12 * susto * math.sin(30 * t),
    }


def camera(t):
    """Posição, alvo e campo de visão vertical (graus) da câmera no instante t."""
    if t < 5.8:
        x = pos_x(t)
        e = ease_in_out(t / 2.6)
        dp = lerp3([6, 15, 40], [-1.0, 3.0, 11.5], e)
        da = lerp3([0, 0.5, 0], [x + 0.3, 1.4, 3.5], e)
        tp = [x + 2.7, 1.95, P['z'] + 4.4]
        ta = [x + 0.2, 1.55, P['z']]
        w = smoothstep(1.6, 2.8, t)
        pos, alvo = lerp3(dp, tp, w), lerp3(da, ta, w)
        pos[0] += 0.03 * math.sin(1.7 * t) * w
        pos[1] += 0.02 * math.sin(2.3 * t + 1) * w
        return pos, alvo, lerp(55, 50, w)
    if t < 7.2:
        e = ease_in_out((t - 5.8) / 1.4)
        return lerp3([-2.4, 5.8, 6.8], [-1.7, 5.1, 6.1], e), [1.6, 0.5, 3.6], 48.0
    if t < 8.4:
        e = ease_out((t - 7.2) / 1.2)
        return lerp3([1.35, 2.85, -0.3], [1.08, 2.72, 1.2], e), [0.92, 2.6, 3.55], lerp(46, 40, e)
    o = D['olhos']
    if t < 9.1:
        e = ease_in_out((t - 8.4) / 0.7)
        return lerp3([1.15, 3.6, 7.6], [1.25, 3.45, 7.1], e), lerp3([2.4, 1.7, -6.0], [2.75, 1.5, -7.4], e), lerp(42, 38, e)
    e = ease_out((t - 9.1) / 0.9)
    pos = lerp3([o['x'], o['y'] + 0.2, o['z'] + 6.2], [o['x'], o['y'] + 0.12, o['z'] + 4.8], e)
    k = max(0.0, 1 - (t - 9.1) / 0.5)
    pos[0] += 0.04 * k * math.sin(70 * t)
    pos[1] += 0.04 * k * math.sin(83 * t)
    return pos, [o['x'], o['y'], o['z']], 36.0


def pegadas_gigantes():
    g = D['pegadas_gigantes']
    (x0, z0), (x1, z1) = g['de'], g['ate']
    dx, dz = x1 - x0, z1 - z0
    comp = math.hypot(dx, dz)
    ux, uz = dx / comp, dz / comp
    px, pz = -uz, ux
    yaw = math.atan2(ux, uz)
    res = []
    for i in range(int(comp / g['passo']) + 1):
        lado = g['lado'] * (1 if i % 2 else -1)
        res.append((x0 + ux * g['passo'] * i + px * lado, z0 + uz * g['passo'] * i + pz * lado, yaw))
    return res


def pegadas_leo():
    """Pegadas do Léo: (x, z, instante em que aparece). Pegadas antes de t=0 já existem."""
    ciclo = 1 / P['ciclos_por_unidade']
    parada = pos_x(D['duracao'])
    res = []
    for k in range(-4, 40):
        x = P['x0'] + (0.25 + 0.5 * k) * ciclo + 0.45
        if x > parada + 0.45:
            break
        if x < -12.0:
            continue
        z = P['z'] + (-0.17 if k % 2 == 0 else 0.17)
        res.append((x, z, x - 0.45))
    return res


# ---------------------------------------------------------------------------
# Construção da cena
# ---------------------------------------------------------------------------

def hex_lin(h, mult=(1, 1, 1)):
    h = h.lstrip('#')
    out = []
    for i in range(3):
        c = int(h[2 * i:2 * i + 2], 16) / 255 * mult[i]
        c = min(c, 1.0)
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


SOMBRA = (0.58, 0.52, 0.78)
SOMBRA_CABECA = (0.84, 0.8, 0.95)
MAR_DIST = (12.0, 250.0)
MAR_PARADAS = [(0.3, '#2A7FA0'), (0.62, '#7A6BB0'), (0.86, '#F0A27E'), (1.0, D['cores']['horizonte'])]
_cache_mat = {}


def mat_toon(cor, nevoa=False, sombra=SOMBRA):
    chave = ('toon', cor, nevoa, sombra)
    if chave in _cache_mat:
        return _cache_mat[chave]
    m = bpy.data.materials.new('toon_' + cor)
    m.use_nodes = True
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    n.clear()
    saida = n.new('ShaderNodeOutputMaterial')
    dif = n.new('ShaderNodeBsdfDiffuse')
    dif.inputs['Color'].default_value = (1, 1, 1, 1)
    s2r = n.new('ShaderNodeShaderToRGB')
    rampa = n.new('ShaderNodeValToRGB')
    cr = rampa.color_ramp
    cr.interpolation = 'CONSTANT'
    cr.elements[0].position, cr.elements[0].color = 0.0, (0, 0, 0, 1)
    cr.elements[1].position, cr.elements[1].color = 0.36, (0.5, 0.5, 0.5, 1)
    e3 = cr.elements.new(0.62)
    e3.color = (1, 1, 1, 1)
    mix = n.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.inputs[6].default_value = hex_lin(cor, sombra)
    mix.inputs[7].default_value = hex_lin(cor)
    emi = n.new('ShaderNodeEmission')
    l.new(dif.outputs[0], s2r.inputs[0])
    l.new(s2r.outputs['Color'], rampa.inputs['Fac'])
    l.new(rampa.outputs['Color'], mix.inputs[0])
    cor_final = mix.outputs[2]
    if nevoa:
        cam = n.new('ShaderNodeCameraData')
        mr = n.new('ShaderNodeMapRange')
        mr.inputs[1].default_value, mr.inputs[2].default_value = 35.0, 220.0
        mix2 = n.new('ShaderNodeMix')
        mix2.data_type = 'RGBA'
        mix2.inputs[7].default_value = hex_lin(C['horizonte'])
        l.new(cam.outputs['View Distance'], mr.inputs[0])
        l.new(mr.outputs[0], mix2.inputs[0])
        l.new(cor_final, mix2.inputs[6])
        cor_final = mix2.outputs[2]
    l.new(cor_final, emi.inputs['Color'])
    l.new(emi.outputs[0], saida.inputs['Surface'])
    _cache_mat[chave] = m
    return m


def mat_mar(cor_perto):
    """Água: cor varia com a distância até a câmera, terminando na cor do horizonte."""
    chave = ('mar', cor_perto)
    if chave in _cache_mat:
        return _cache_mat[chave]
    m = bpy.data.materials.new('mar_' + cor_perto)
    m.use_nodes = True
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    n.clear()
    saida = n.new('ShaderNodeOutputMaterial')
    cam = n.new('ShaderNodeCameraData')
    mr = n.new('ShaderNodeMapRange')
    mr.inputs[1].default_value, mr.inputs[2].default_value = MAR_DIST
    rampa = n.new('ShaderNodeValToRGB')
    cr = rampa.color_ramp
    paradas = [(0.0, cor_perto)] + MAR_PARADAS
    cr.elements[0].position, cr.elements[0].color = paradas[0][0], hex_lin(paradas[0][1])
    cr.elements[1].position, cr.elements[1].color = paradas[-1][0], hex_lin(paradas[-1][1])
    for pos, cor in paradas[1:-1]:
        cr.elements.new(pos).color = hex_lin(cor)
    emi = n.new('ShaderNodeEmission')
    l.new(cam.outputs['View Distance'], mr.inputs[0])
    l.new(mr.outputs[0], rampa.inputs['Fac'])
    l.new(rampa.outputs['Color'], emi.inputs['Color'])
    l.new(emi.outputs[0], saida.inputs['Surface'])
    _cache_mat[chave] = m
    return m


def mat_plano(cor, forca=1.0, nome=None):
    chave = ('plano', cor, forca)
    if chave in _cache_mat:
        return _cache_mat[chave]
    m = bpy.data.materials.new(nome or 'plano_' + cor)
    m.use_nodes = True
    n = m.node_tree.nodes
    n.clear()
    saida = n.new('ShaderNodeOutputMaterial')
    emi = n.new('ShaderNodeEmission')
    emi.inputs['Color'].default_value = hex_lin(cor)
    emi.inputs['Strength'].default_value = forca
    m.node_tree.links.new(emi.outputs[0], saida.inputs['Surface'])
    _cache_mat[chave] = m
    return m


def mat_contorno():
    if 'contorno' in _cache_mat:
        return _cache_mat['contorno']
    m = mat_plano(C['contorno'], nome='contorno')
    m = m.copy()
    m.name = 'contorno_casca'
    m.use_backface_culling = True
    m.use_backface_culling_shadow = True
    _cache_mat['contorno'] = m
    return m


def mat_halo(cor):
    """Brilho em disco de raio 1: alfa = 0.85 * (1 - r²)^1.5, igual à textura do sprite na versão Three.js."""
    m = bpy.data.materials.new('halo')
    m.use_nodes = True
    m.surface_render_method = 'BLENDED'
    m.use_backface_culling = False
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    n.clear()
    saida = n.new('ShaderNodeOutputMaterial')
    coord = n.new('ShaderNodeTexCoord')
    raio = n.new('ShaderNodeVectorMath')
    raio.operation = 'LENGTH'
    quad = n.new('ShaderNodeMath')
    quad.operation = 'POWER'
    quad.inputs[1].default_value = 2.0
    inv = n.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.use_clamp = True
    inv.inputs[0].default_value = 1.0
    pot = n.new('ShaderNodeMath')
    pot.operation = 'POWER'
    pot.inputs[1].default_value = 1.5
    mul = n.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = 0.85
    transp = n.new('ShaderNodeBsdfTransparent')
    emi = n.new('ShaderNodeEmission')
    emi.inputs['Color'].default_value = hex_lin(cor)
    emi.inputs['Strength'].default_value = 1.6
    mix = n.new('ShaderNodeMixShader')
    l.new(coord.outputs['Object'], raio.inputs[0])
    l.new(raio.outputs['Value'], quad.inputs[0])
    l.new(quad.outputs[0], inv.inputs[1])
    l.new(inv.outputs[0], pot.inputs[0])
    l.new(pot.outputs[0], mul.inputs[0])
    l.new(mul.outputs[0], mix.inputs[0])
    l.new(transp.outputs[0], mix.inputs[1])
    l.new(emi.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], saida.inputs['Surface'])
    return m


# --- malhas -----------------------------------------------------------------

Y_PARA_CIMA = Matrix.Rotation(-math.pi / 2, 4, 'X')  # eixo Z do bmesh -> eixo Y da cena


def _malha(nome, bm, suave=True, plano_y=None):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    if suave:
        me.shade_smooth()
    if plano_y is not None:
        # tampas planas: faces com normal quase vertical ficam sem suavização
        for pol in me.polygons:
            if abs(pol.normal.y) > plano_y:
                pol.use_smooth = False
    return me


def malha_esfera(nome, r=1.0, seg=24, aneis=15):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=aneis, radius=r)
    return _malha(nome, bm)


def malha_capsula(nome, r, comp, seg=16, aneis=13):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=aneis, radius=r)
    for v in bm.verts:
        v.co.z += comp / 2 if v.co.z > 0 else -comp / 2
    bmesh.ops.transform(bm, matrix=Y_PARA_CIMA, verts=bm.verts)
    return _malha(nome, bm)


def malha_cilindro(nome, r_base, r_topo, altura, seg=24, tampas_planas=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r_base, radius2=r_topo, depth=altura)
    bmesh.ops.transform(bm, matrix=Y_PARA_CIMA, verts=bm.verts)
    return _malha(nome, bm, plano_y=0.9 if tampas_planas else None)


def malha_ico(nome, r, sub=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    return _malha(nome, bm, suave=False)


def malha_disco(nome, r, seg=32, deitado=True):
    """Disco deitado no chão (plano XZ) ou, com deitado=False, em pé virado para +Z."""
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=seg, radius=r)
    if deitado:
        bmesh.ops.transform(bm, matrix=Y_PARA_CIMA, verts=bm.verts)
    return _malha(nome, bm, suave=False)


def malha_anel(nome, r_in, r_out, seg=96):
    bm = bmesh.new()
    vin, vout = [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        vin.append(bm.verts.new((r_in * math.cos(a), 0, -r_in * math.sin(a))))
        vout.append(bm.verts.new((r_out * math.cos(a), 0, -r_out * math.sin(a))))
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((vin[i], vout[i], vout[j], vin[j]))
    bm.normal_update()
    for f in bm.faces:
        if f.normal.y < 0:
            f.normal_flip()
    return _malha(nome, bm, suave=False)


def malha_toro(nome, r_maior, r_menor, seg=64, seg_tubo=12):
    """Toro deitado no plano XZ (eixo de simetria = Y)."""
    bm = bmesh.new()
    grade = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        anel = []
        for j in range(seg_tubo):
            b = 2 * math.pi * j / seg_tubo
            rr = r_maior + r_menor * math.cos(b)
            anel.append(bm.verts.new((rr * math.cos(a), r_menor * math.sin(b), rr * math.sin(a))))
        grade.append(anel)
    for i in range(seg):
        for j in range(seg_tubo):
            i2, j2 = (i + 1) % seg, (j + 1) % seg_tubo
            bm.faces.new((grade[i][j], grade[i][j2], grade[i2][j2], grade[i2][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _malha(nome, bm)


def malha_caixa_arredondada(nome, lx, ly, lz, raio):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(lx, ly, lz), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.verts) + list(bm.edges), offset=raio, segments=3, affect='EDGES', profile=0.5)
    return _malha(nome, bm)


# --- objetos ----------------------------------------------------------------

COL = None
RAIZ = None


def objeto(nome, malha=None, pai=None, loc=(0, 0, 0), rot=(0, 0, 0), esc=(1, 1, 1), mat=None, contorno=0.0, sombra=True):
    ob = bpy.data.objects.new(nome, malha)
    COL.objects.link(ob)
    ob.rotation_mode = 'ZYX'  # equivale à ordem 'XYZ' do Three.js
    ob.parent = pai or RAIZ
    ob.location = loc
    ob.rotation_euler = rot
    ob.scale = esc
    if malha is not None and mat is not None:
        malha.materials.append(mat)
        if contorno > 0:
            malha.materials.append(mat_contorno())
            mod = ob.modifiers.new('contorno', 'SOLIDIFY')
            mod.thickness = contorno
            mod.offset = 1.0
            mod.use_flip_normals = True
            mod.use_rim = False
            mod.material_offset = 1
    if malha is not None and not sombra:
        ob.visible_shadow = False
    return ob


def vazio(nome, pai=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    return objeto(nome, None, pai, loc, rot)


def matriz_olhar(pos, alvo, cima=(0, 1, 0)):
    p = Vector(pos)
    z = (p - Vector(alvo)).normalized()
    x = Vector(cima).cross(z).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = p
    return m


def segmento(nome, a, b, r_a, r_b, mat, contorno, pai=None):
    """Cilindro entre os pontos a e b (coordenadas Y para cima)."""
    va, vb = Vector(a), Vector(b)
    d = vb - va
    me = malha_cilindro(nome, r_a, r_b, d.length, seg=14, tampas_planas=False)
    ob = objeto(nome, me, pai, loc=(va + vb) / 2, mat=mat, contorno=contorno)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = Vector((0, 1, 0)).rotation_difference(d.normalized())
    return ob


def montar_mundo():
    w = bpy.data.worlds.new('ceu')
    w.use_nodes = True
    bpy.context.scene.world = w
    nt = w.node_tree
    n, l = nt.nodes, nt.links
    n.clear()
    saida = n.new('ShaderNodeOutputWorld')
    tc = n.new('ShaderNodeTexCoord')
    norm = n.new('ShaderNodeVectorMath')
    norm.operation = 'NORMALIZE'
    sep = n.new('ShaderNodeSeparateXYZ')
    rampa = n.new('ShaderNodeValToRGB')
    cr = rampa.color_ramp
    paradas = [(0.0, 'horizonte'), (0.12, 'ceu_baixo'), (0.35, 'ceu_meio'), (0.7, 'ceu_alto'), (1.0, 'ceu_topo')]
    cr.elements[0].position, cr.elements[0].color = paradas[0][0], hex_lin(C[paradas[0][1]])
    cr.elements[1].position, cr.elements[1].color = paradas[-1][0], hex_lin(C[paradas[-1][1]])
    for pos, nome in paradas[1:-1]:
        cr.elements.new(pos).color = hex_lin(C[nome])
    # disco do sol + brilho ao redor
    sx, sy, sz = D['sol']['direcao']
    sol = Vector((sx, -sz, sy)).normalized()  # Y para cima -> Z para cima
    dot = n.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = sol
    tam = math.radians(D['sol']['tamanho_graus'])
    disco = n.new('ShaderNodeMapRange')
    disco.inputs[1].default_value, disco.inputs[2].default_value = math.cos(tam * 1.06), math.cos(tam)
    brilho = n.new('ShaderNodeMapRange')
    brilho.inputs[1].default_value, brilho.inputs[2].default_value = math.cos(tam * 4), math.cos(tam)
    brilho.inputs[4].default_value = 0.55
    mix_b = n.new('ShaderNodeMix')
    mix_b.data_type = 'RGBA'
    mix_b.inputs[7].default_value = hex_lin(C['sol'])
    mix_d = n.new('ShaderNodeMix')
    mix_d.data_type = 'RGBA'
    mix_d.inputs[7].default_value = hex_lin(C['sol'])
    fundo = n.new('ShaderNodeBackground')
    ambiente = n.new('ShaderNodeBackground')
    ambiente.inputs['Color'].default_value = hex_lin(C['luz_ceu'])
    ambiente.inputs['Strength'].default_value = 0.35
    caminho = n.new('ShaderNodeLightPath')
    mix_s = n.new('ShaderNodeMixShader')
    l.new(tc.outputs['Generated'], norm.inputs[0])
    l.new(norm.outputs[0], sep.inputs[0])
    l.new(sep.outputs['Z'], rampa.inputs['Fac'])
    l.new(norm.outputs[0], dot.inputs[0])
    l.new(dot.outputs['Value'], disco.inputs[0])
    l.new(dot.outputs['Value'], brilho.inputs[0])
    l.new(brilho.outputs[0], mix_b.inputs[0])
    l.new(rampa.outputs['Color'], mix_b.inputs[6])
    l.new(disco.outputs[0], mix_d.inputs[0])
    l.new(mix_b.outputs[2], mix_d.inputs[6])
    l.new(mix_d.outputs[2], fundo.inputs['Color'])
    l.new(caminho.outputs['Is Camera Ray'], mix_s.inputs[0])
    l.new(ambiente.outputs[0], mix_s.inputs[1])
    l.new(fundo.outputs[0], mix_s.inputs[2])
    l.new(mix_s.outputs[0], saida.inputs['Surface'])


def sol_luz(nome, de, cor, forca, sombra):
    luz = bpy.data.lights.new(nome, 'SUN')
    luz.color = hex_lin(cor)[:3]
    luz.energy = forca
    luz.angle = math.radians(1.5)
    luz.use_shadow = sombra
    ob = objeto(nome, luz)
    ob.matrix_basis = matriz_olhar(Vector(de).normalized() * 30, (0, 0, 0))
    return ob


def montar_cenario():
    nivel = D['ilha']['nivel_mar']
    r = D['ilha']['raio']
    objeto('ilha', malha_cilindro('ilha', r + 0.4, r, 0.8, seg=72), loc=(0, -0.4, 0), mat=mat_toon(C['areia']), contorno=0.06)
    objeto('areia_molhada', malha_cilindro('areia_molhada', r + 1.5, r + 1.0, 0.5, seg=72), loc=(0, -0.35, 0), mat=mat_toon(C['areia_molhada']))
    objeto('mar_raso', malha_anel('mar_raso', r + 1.0, r + 6.0), loc=(0, nivel + 0.002, 0), mat=mat_mar(C['mar_raso']))
    objeto('mar', malha_anel('mar', r + 6.0, 320.0, seg=128), loc=(0, nivel, 0), mat=mat_mar(C['mar']), sombra=False)
    OBJ['espuma'] = objeto('espuma', malha_toro('espuma', r + 1.1, 0.09, seg=96, seg_tubo=8), loc=(0, nivel + 0.01, 0), mat=mat_plano(C['espuma']))

    for i, n in enumerate(D['nuvens']):
        g = vazio(f'nuvem{i}', loc=(n['x'], n['y'], n['z']))
        for j, (ox, oy, oz, rr) in enumerate([(-1.2, 0, 0, 1.0), (0, 0.35, 0, 1.3), (1.3, 0.05, 0, 0.9), (0.5, -0.15, 0.3, 1.0)]):
            e = n['escala']
            objeto(f'nuvem{i}_{j}', malha_esfera(f'nuvem{i}_{j}', 1.0, 16, 9), g, loc=(ox * e, oy * e, oz * e),
                   esc=(rr * e, rr * e * 0.55, rr * e * 0.7), mat=mat_plano(C['nuvem']), sombra=False)

    for i, pm in enumerate(D['palmeiras']):
        montar_palmeira(i, pm)

    for i, a in enumerate(D['arbustos']):
        cor = C['arbusto_escuro'] if a['escuro'] else C['arbusto']
        g = vazio(f'arbusto{i}', loc=(a['x'], 0, a['z']))
        rr = a['r']
        objeto(f'arbusto{i}_a', malha_ico(f'arbusto{i}_a', rr, 2), g, loc=(0, rr * 0.8, 0), esc=(1, 0.85, 1),
               rot=(0, i * 0.7, 0), mat=mat_toon(cor), contorno=0.05)
        objeto(f'arbusto{i}_b', malha_ico(f'arbusto{i}_b', rr * 0.6, 1), g, loc=(-0.3 * rr, 1.35 * rr, -0.2 * rr),
               rot=(0, i * 1.1, 0), mat=mat_toon(cor), contorno=0.05)
        if a.get('mexe'):
            OBJ.setdefault('mexe', []).append(g)

    for i, p in enumerate(D['pedras']):
        objeto(f'pedra{i}', malha_ico(f'pedra{i}', p['r'], 1), loc=(p['x'], p['r'] * 0.2, p['z']), esc=(1, 0.6, 0.85),
               rot=(0, i * 1.3, 0), mat=mat_toon(C['pedra']), contorno=0.04)

    t = D['toca']
    objeto('toca', malha_esfera('toca', t['r'], 20, 13), loc=(t['x'], t['y'], t['z']), mat=mat_plano(C['sombra_mato']), sombra=False)

    o = D['olhos']
    OBJ['olhos'] = []
    for lado in (-1, 1):
        g = vazio(f'olho{lado}', loc=(o['x'] + lado * o['separacao'], o['y'], o['z']))
        objeto(f'olho{lado}_globo', malha_esfera(f'olho{lado}_g', 1.0, 20, 13), g, esc=(0.12, 0.12, 0.05),
               mat=mat_plano(C['olho_brilho'], 3.0), sombra=False)
        objeto(f'olho{lado}_pupila', malha_esfera(f'olho{lado}_p', 1.0, 16, 9), g, loc=(0, 0, 0.05), esc=(0.035, 0.11, 0.03),
               mat=mat_plano('#000000'), sombra=False)
        objeto(f'olho{lado}_palpebra', malha_esfera(f'olho{lado}_pa', 1.0, 16, 9), g, loc=(-0.035 * lado, 0.1, 0.035),
               rot=(0, 0, 0.45 * lado), esc=(0.17, 0.065, 0.07), mat=mat_plano(C['sombra_mato']), sombra=False)
        # disco atrás do globo, virado para a câmera do plano final (como o sprite do Three.js)
        objeto(f'olho{lado}_halo', malha_disco(f'olho{lado}_h', 1.0, 48, deitado=False), g, esc=(0.26, 0.26, 1),
               mat=mat_halo(C['olho_brilho']), sombra=False)
        OBJ['olhos'].append(g)

    for i, (x, z, yaw) in enumerate(pegadas_gigantes()):
        g = vazio(f'pegada_g{i}', loc=(x, 0.012, z), rot=(0, yaw, 0))
        g.scale = (1.3, 1, 1.3)
        objeto(f'pg{i}_sola', malha_disco(f'pg{i}_s', 1.0), g, esc=(0.42, 1, 0.62), mat=mat_toon(C['pegada']), sombra=False)
        for j, (dx, dz) in enumerate([(-0.27, 0.78), (0.0, 0.9), (0.27, 0.78)]):
            objeto(f'pg{i}_dedo{j}', malha_disco(f'pg{i}_d{j}', 0.14), g, loc=(dx, 0, dz), mat=mat_toon(C['pegada']), sombra=False)

    OBJ['pegadas_leo'] = []
    for i, (x, z, quando) in enumerate(pegadas_leo()):
        ob = objeto(f'pegada_leo{i}', malha_disco(f'pl{i}', 1.0, 20), loc=(x, 0.01, z), esc=(0.19, 1, 0.1),
                    mat=mat_toon(C['pegada']), sombra=False)
        OBJ['pegadas_leo'].append((ob, quando))


def montar_palmeira(i, pm):
    h, incl, ang = pm['altura'], pm['inclinacao'], pm['direcao']
    dx, dz = math.sin(ang), math.cos(ang)

    def ponto(s):
        return (pm['x'] + incl * h * s * s * dx, h * s, pm['z'] + incl * h * s * s * dz)

    n = 7
    for k in range(n):
        s0, s1 = k / n, (k + 1) / n
        cor = C['tronco'] if k % 2 == 0 else '#7A4E33'
        segmento(f'palma{i}_tronco{k}', ponto(s0), ponto(s1), lerp(0.3, 0.17, s0), lerp(0.3, 0.17, s1),
                 mat_toon(cor), 0.04)
    topo = ponto(1.0)
    for k in range(7):
        a = ang + k * 2 * math.pi / 7
        g1 = vazio(f'palma{i}_folha{k}', loc=topo, rot=(0, a, 0))
        g2 = vazio(f'palma{i}_folha{k}_b', g1, rot=(-0.15 + 0.1 * (k % 2), 0, 0))
        cor = C['folha'] if k % 2 == 0 else C['folha_escura']
        objeto(f'palma{i}_f{k}_1', malha_esfera(f'p{i}f{k}1', 1.0, 16, 9), g2, loc=(0, 0, 0.85), esc=(0.36, 0.06, 0.9),
               mat=mat_toon(cor), contorno=0.03)
        g3 = vazio(f'palma{i}_folha{k}_c', g2, loc=(0, 0, 1.6), rot=(0.65, 0, 0))
        objeto(f'palma{i}_f{k}_2', malha_esfera(f'p{i}f{k}2', 1.0, 16, 9), g3, loc=(0, 0, 0.75), esc=(0.3, 0.05, 0.85),
               mat=mat_toon(cor), contorno=0.03)
    for k, (ox, oz) in enumerate([(0.15, 0.1), (-0.12, 0.12), (0.0, -0.16)]):
        objeto(f'palma{i}_coco{k}', malha_esfera(f'p{i}c{k}', 0.17, 14, 9), loc=(topo[0] + ox, topo[1] - 0.22, topo[2] + oz),
               mat=mat_toon('#6B4226'), contorno=0.02)


def montar_leo():
    corpo = mat_toon(P['cor_corpo'])
    preto = mat_plano('#0D0D12')
    L = {}
    L['raiz'] = vazio('leo')
    L['tronco'] = vazio('leo_tronco', L['raiz'])
    objeto('leo_tronco_m', malha_capsula('leo_tronco', 0.075, 1.07), L['tronco'], loc=(0, 0.535, 0), mat=corpo, contorno=0.022)
    objeto('leo_mochila', malha_caixa_arredondada('leo_mochila', 0.42, 0.5, 0.2, 0.06), L['tronco'], loc=(0, 0.62, -0.17),
           mat=mat_toon(P['cor_mochila']), contorno=0.022)
    objeto('leo_mochila_tampa', malha_caixa_arredondada('leo_tampa', 0.44, 0.16, 0.22, 0.05), L['tronco'], loc=(0, 0.8, -0.17),
           mat=mat_toon('#E0A21F'), contorno=0.018)
    # cabeça
    L['cabeca'] = vazio('leo_cabeca', L['tronco'], loc=(0, 1.07, 0))
    rc = 0.42
    objeto('leo_cabeca_m', malha_esfera('leo_cabeca', rc, 32, 21), L['cabeca'], loc=(0, 0.4, 0), mat=mat_toon(P['cor_cabeca'], sombra=SOMBRA_CABECA),
           contorno=0.024)
    rosto = vazio('leo_rosto', L['cabeca'], loc=(0, 0.4, 0))

    def na_esfera(x, y, afundar=0.008):
        z = math.sqrt(max(rc * rc - x * x - y * y, 0.0)) - afundar
        return (x, y, z), (-math.asin(y / rc), math.atan2(x, z), 0.0)

    L['olhos'], L['brilhos'], L['sobrancelhas'] = [], [], []
    for lado in (1, -1):
        loc, rot = na_esfera(0.14 * lado, 0.05)
        g = vazio(f'leo_olho{lado}', rosto, loc=loc, rot=rot)
        L['olhos'].append(objeto(f'leo_olho{lado}_m', malha_esfera(f'lo{lado}', 1.0, 16, 11), g, esc=(0.07, 0.1, 0.035), mat=preto,
                                 sombra=False))
        L['brilhos'].append(objeto(f'leo_brilho{lado}', malha_esfera(f'lb{lado}', 0.02, 10, 7), g, loc=(0.02, 0.035, 0.03),
                                   mat=mat_plano('#FFFFFF'), sombra=False))
        gs = vazio(f'leo_sobr{lado}', rosto)
        L['sobrancelhas'].append((gs, lado))
        objeto(f'leo_sobr{lado}_m', malha_capsula(f'ls{lado}', 0.017, 0.11, 10, 7), gs, mat=preto, sombra=False)
    loc, rot = na_esfera(0.0, -0.15)
    L['boca'] = objeto('leo_boca', malha_esfera('leo_boca', 1.0, 16, 11), rosto, loc=loc, rot=rot, esc=(0.11, 0.022, 0.02), mat=preto,
                       sombra=False)
    # bandana
    objeto('leo_bandana', malha_toro('leo_bandana', 0.395, 0.052, 48, 10), rosto, loc=(0, 0.17, 0), rot=(-0.18, 0, 0),
           mat=mat_toon(P['cor_bandana']), contorno=0.015)
    L['pontas'] = []
    for lado in (1, -1):
        g = vazio(f'leo_ponta{lado}', rosto, loc=(0.05 * lado, 0.12, -0.39))
        objeto(f'leo_ponta{lado}_m', malha_esfera(f'lp{lado}', 1.0, 12, 9), g, loc=(0, -0.13, 0), esc=(0.055, 0.15, 0.025),
               mat=mat_toon(P['cor_bandana']), contorno=0.012)
        L['pontas'].append((g, lado))
    # braços
    L['bracos'] = []
    for lado in (1, -1):
        om = vazio(f'leo_ombro{lado}', L['tronco'], loc=(0.04 * lado, 0.9, 0))
        objeto(f'leo_braco{lado}', malha_capsula(f'lbr{lado}', 0.062, 0.46), om, loc=(0, -0.23, 0), mat=corpo, contorno=0.02)
        co = vazio(f'leo_cotovelo{lado}', om, loc=(0, -0.46, 0))
        objeto(f'leo_antebraco{lado}', malha_capsula(f'lab{lado}', 0.058, 0.42), co, loc=(0, -0.21, 0), mat=corpo, contorno=0.02)
        objeto(f'leo_mao{lado}', malha_esfera(f'lm{lado}', 0.085, 14, 9), co, loc=(0, -0.44, 0), mat=corpo, contorno=0.02)
        L['bracos'].append((om, co, lado))
    # pernas
    L['pernas'] = []
    for lado in (1, -1):
        qd = vazio(f'leo_quadril{lado}', L['raiz'], loc=(0.08 * lado, 0, 0))
        objeto(f'leo_coxa{lado}', malha_capsula(f'lcx{lado}', 0.068, 0.58), qd, loc=(0, -0.29, 0), mat=corpo, contorno=0.02)
        jo = vazio(f'leo_joelho{lado}', qd, loc=(0, -0.58, 0))
        objeto(f'leo_canela{lado}', malha_capsula(f'lcn{lado}', 0.064, 0.57), jo, loc=(0, -0.285, 0), mat=corpo, contorno=0.02)
        objeto(f'leo_pe{lado}', malha_esfera(f'lpe{lado}', 1.0, 14, 9), jo, loc=(0, -0.555, 0.06), esc=(0.085, 0.07, 0.16), mat=corpo,
               contorno=0.02)
        L['pernas'].append((qd, jo, lado))
    OBJ['leo'] = L


def atualizar(t):
    p = pose(t)
    L = OBJ['leo']
    L['raiz'].location = p['raiz']
    L['raiz'].rotation_euler = (0, p['yaw'], 0)
    L['tronco'].rotation_euler = (p['incl'], 0, 0)
    L['cabeca'].rotation_euler = (p['cab_pitch'], p['cab_yaw'], 0)
    for ob in L['olhos']:
        ob.scale = (0.07 * p['olho'], 0.1 * p['olho'] * p['pisc'], 0.035)
    for ob in L['brilhos']:
        ob.hide_render = p['pisc'] < 0.5
    for gs, lado in L['sobrancelhas']:
        x, y = 0.14 * lado, p['sob_y']
        z = math.sqrt(0.42 ** 2 - x * x - y * y) - 0.004
        gs.location = (x, y, z)
        gs.rotation_euler = (-math.asin(y / 0.42), math.atan2(x, z), math.pi / 2 - lado * p['sob_ang'])
    L['boca'].scale = (p['boca_l'], p['boca_a'], 0.02)
    for g, lado in L['pontas']:
        g.rotation_euler = (p['band'], 0, 0.35 * lado)
    for om, co, lado in L['bracos']:
        fr = p['ombro_e'] if lado == 1 else p['ombro_d']
        om.rotation_euler = (-fr, 0, lado * p['abre'])
        co.rotation_euler = (-p['cotov'], 0, 0)
    for qd, jo, lado in L['pernas']:
        qd.rotation_euler = (-(p['coxa_e'] if lado == 1 else p['coxa_d']), 0, 0)
        jo.rotation_euler = ((p['joelho_e'] if lado == 1 else p['joelho_d']), 0, 0)

    pos, alvo, fov = camera(t)
    cam = OBJ['camera']
    cam.matrix_basis = matriz_olhar(pos, alvo)
    cam.data.angle_y = math.radians(fov)

    k = (D['ilha']['raio'] + 1.1 + 0.12 * math.sin(2.2 * t)) / (D['ilha']['raio'] + 1.1)
    OBJ['espuma'].scale = (k, 1, k)
    env = smoothstep(8.5, 8.6, t) * (1 - smoothstep(9.05, 9.2, t))
    for i, g in enumerate(OBJ.get('mexe', [])):
        w = 0.1 * env * math.sin(38 * t + i * 1.7)
        g.scale = (1 + w, 1 - w, 1 + w)
        g.rotation_euler = (0, 0, 0.05 * env * math.sin(31 * t + i))
    abre = smoothstep(D['olhos']['abre'], D['olhos']['abre'] + 0.12, t)
    for g in OBJ['olhos']:
        g.hide_render = abre <= 0.001
        for filho in g.children:
            filho.hide_render = abre <= 0.001
        g.scale = (1, max(abre, 0.001), 1)
    x_leo = pos_x(t)
    for ob, quando in OBJ['pegadas_leo']:
        ob.hide_render = x_leo < quando


OBJ = {}


def principal():
    global COL, RAIZ
    saida = argumento('--saida', os.path.join(AQUI, 'quadros'))
    quadros = argumento('--quadros', f"1-{int(D['duracao'] * FPS)}")
    amostras = int(argumento('--amostras', '8'))
    escala = int(argumento('--escala', '100'))
    os.makedirs(saida, exist_ok=True)

    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    COL = sc.collection
    RAIZ = bpy.data.objects.new('raiz_y_para_cima', None)
    COL.objects.link(RAIZ)
    RAIZ.rotation_euler = (math.pi / 2, 0, 0)

    montar_mundo()
    sol_luz('sol', (-8, 14, 10), C['luz_principal'], 3.2, True)
    sol_luz('contra', (5, 6, -12), C['luz_contra'], 0.6, False)
    montar_cenario()
    montar_leo()
    cam_dados = bpy.data.cameras.new('camera')
    cam_dados.sensor_fit = 'VERTICAL'
    cam_dados.clip_start, cam_dados.clip_end = 0.1, 900
    OBJ['camera'] = objeto('camera', cam_dados)
    sc.camera = OBJ['camera']

    r = sc.render
    r.engine = 'BLENDER_EEVEE'
    r.resolution_x, r.resolution_y = D['largura'], D['altura']
    r.resolution_percentage = escala
    r.fps = FPS
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGB'
    r.image_settings.compression = 15
    ee = sc.eevee
    ee.taa_render_samples = amostras
    ee.use_raytracing = False
    ee.use_shadows = True
    ee.use_fast_gi = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    print(f'cena montada em {time.time() - t0:.1f}s, {len(bpy.data.objects)} objetos', flush=True)

    if '-' in quadros:
        a, b = (int(v) for v in quadros.split('-'))
        lista = list(range(a, b + 1))
    else:
        lista = [int(v) for v in quadros.split(',')]
    inicio = time.time()
    for i, q in enumerate(lista):
        tq = time.time()
        atualizar((q - 1) / FPS)
        r.filepath = os.path.join(saida, f'quadro_{q:04d}.png')
        bpy.ops.render.render(write_still=True)
        print(f'quadro {q} em {time.time() - tq:.1f}s ({i + 1}/{len(lista)})', flush=True)
    total = time.time() - inicio
    print(f'TOTAL {total:.1f}s, média {total / len(lista):.2f}s por quadro', flush=True)


if __name__ == '__main__':
    principal()
