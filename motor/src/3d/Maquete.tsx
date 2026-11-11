// Desenho das maquetes: cada peça do roteiro vira uma malha toon com contorno (caixa, cilindro,
// mola, engrenagem, tubo...), presa à peça-mãe, com as animações do instante (giro, calor,
// vidro, vista explodida) e os fluxos de água, corrente ou calor correndo pelos caminhos.
import React from 'react';
import * as THREE from 'three';
import {FLUXOS} from '../catalogo';
import {MaqueteNaCena, alturaDaPeca, estadoPeca, maquetesDaCena} from '../animacao/maquete';
import type {AnimacaoTempo, CenaTempo, LinhaDoTempo, Peca} from '../roteiro/tipos';
import {clamp, smoothstep} from '../util/mat';
import {Contorno, brilho, capsula, caixa, cilindro, cone, esfera, geo, gradiente, haloMat, ico, memo, toon, toro} from './base';
import {caixaRedonda, corDaTampa, ehLimpo, extrusaoGeo, helicePaGeo, materialLimpo, materialTampa, rachaduraGeo, tornoGeo} from './limpo';

const q = (v: number, passo: number) => Math.round(v / passo) * passo;

const curva = (pts: [number, number, number][]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);

const molaGeo = (r: number, h: number, voltas: number, fio: number) =>
	geo(`mola${r},${h},${voltas},${fio}`, () => {
		const pts: THREE.Vector3[] = [];
		const n = Math.max(24, Math.round(voltas * 24));
		for (let i = 0; i <= n; i++) {
			const a = (i / n) * voltas * Math.PI * 2;
			pts.push(new THREE.Vector3(Math.cos(a) * r, (i / n) * h - h / 2, Math.sin(a) * r));
		}
		return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, fio, 8, false);
	});

export const engrenagemGeo = (r: number, esp: number, dentes: number) =>
	geo(`engr${r},${esp},${dentes}`, () => {
		const s = new THREE.Shape();
		const raiz = r * 0.84;
		const n = Math.max(6, Math.round(dentes));
		for (let i = 0; i < n; i++) {
			const a0 = (i / n) * Math.PI * 2;
			const passo = (Math.PI * 2) / n;
			const pts: [number, number][] = [
				[raiz, a0],
				[r, a0 + passo * 0.18],
				[r, a0 + passo * 0.45],
				[raiz, a0 + passo * 0.63],
			];
			pts.forEach(([rr, a], k) => (i === 0 && k === 0 ? s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)));
		}
		s.closePath();
		const furo = new THREE.Path();
		furo.absarc(0, 0, r * 0.22, 0, Math.PI * 2, true);
		s.holes.push(furo);
		const g = new THREE.ExtrudeGeometry(s, {depth: esp, bevelEnabled: false, curveSegments: 6});
		g.translate(0, 0, -esp / 2);
		g.rotateX(-Math.PI / 2);
		g.computeVertexNormals();
		return g;
	});

const tuboGeo = (pts: [number, number, number][], r: number) =>
	geo(`tubo${JSON.stringify(pts)},${r}`, () => new THREE.TubeGeometry(curva(pts), Math.max(16, pts.length * 12), r, 10, false));

/** Geometria da peça (seta e as peças compostas são desenhadas à parte, com várias malhas). */
const geometria = (p: Peca, limpo: boolean, crescer: number): THREE.BufferGeometry | null => {
	const t = p.tam ?? [];
	switch (p.forma) {
		case 'caixa':
			// água e peças que crescem ficam com quina reta (a quina redonda achata quando estica)
			return limpo && p.material !== 'agua' ? caixaRedonda(t[0] ?? 0.2, t[1] ?? 0.2, t[2] ?? 0.2) : caixa(t[0] ?? 0.2, t[1] ?? 0.2, t[2] ?? 0.2);
		case 'cilindro':
			return cilindro(t[0] ?? 0.1, t[2] ?? t[0] ?? 0.1, t[1] ?? 0.2, 32);
		case 'esfera':
			return esfera(t[0] ?? 0.1, 28, 18);
		case 'cone':
			return cone(t[0] ?? 0.1, t[1] ?? 0.2, 28);
		case 'capsula':
			return capsula(t[0] ?? 0.05, t[1] ?? 0.2);
		case 'toro':
			return toro(t[0] ?? 0.2, t[1] ?? 0.04, 48, 12);
		case 'mola':
			return molaGeo(t[0] ?? 0.08, t[1] ?? 0.3, t[2] ?? 6, t[3] ?? 0.012);
		case 'engrenagem':
			return engrenagemGeo(t[0] ?? 0.2, t[1] ?? 0.06, t[2] ?? 12);
		case 'tubo':
			return p.caminho && p.caminho.length >= 2 ? tuboGeo(p.caminho, t[0] ?? 0.025) : null;
		case 'placa':
			return limpo ? caixaRedonda(t[0] ?? 0.3, t[1] ?? 0.3, 0.03, 0.006) : caixa(t[0] ?? 0.3, t[1] ?? 0.3, 0.03);
		case 'torno':
			return p.perfil && p.perfil.length >= 2 ? tornoCentrado(p.perfil) : null;
		case 'extrusao':
			return p.contorno && p.contorno.length >= 3 ? extrusaoGeo(p.contorno, t[0] ?? 0.03) : null;
		case 'rachadura':
			return rachaduraGeo(t[0] ?? 0.5, t[1] ?? 0.012, t[2] ?? 3, p.semente ?? 1, crescer);
		default:
			return null;
	}
};

/** Perfil de torno com o meio da altura na origem (como as outras peças). */
const tornoCentrado = (perfil: [number, number][]) => {
	const ys = perfil.map((x) => x[1]);
	const meio = (Math.min(...ys) + Math.max(...ys)) / 2;
	return tornoGeo(perfil.map(([r, y]) => [r, y - meio] as [number, number]));
};

const COR_QUENTE = new THREE.Color('#FF5A1F');

/** Material da peça no instante: calor puxa para o laranja que brilha, vidro fica translúcido. */
const material = (p: Peca, calor: number, pulso: number, opacidade: number): THREE.Material => {
	const cor = p.cor ?? '#B8C0CC';
	if (p.brilho !== undefined && p.brilho > 0) return brilho(cor, q(p.brilho + pulso * 0.6, 0.05));
	// acima de 1, a peça fica em brasa: brilha sozinha
	if (calor > 1.05) return brilho('#FF4A1A', q(1 + (calor - 1) * 0.8, 0.1));
	const c = q(clamp(calor), 0.1);
	const pu = q(clamp(pulso), 0.1);
	const op = q(clamp(opacidade), 0.05);
	const misturada = c > 0 ? `#${new THREE.Color(cor).lerp(COR_QUENTE, c * 0.85).getHexString()}` : cor;
	const emiss: [number, number, number] | undefined =
		c > 0 ? [1.0 * c, 0.28 * c, 0.04 * c] : pu > 0 ? [0.55 * pu, 0.48 * pu, 0.08 * pu] : undefined;
	if (op >= 0.99) return toon(misturada, emiss);
	return memo(`toonT${misturada}${emiss ?? ''}${op}`, () => {
		const m = new THREE.MeshToonMaterial({color: misturada, gradientMap: gradiente, transparent: true, opacity: op, depthWrite: false});
		if (emiss) m.emissive = new THREE.Color().setRGB(...emiss, THREE.LinearSRGBColorSpace);
		return m;
	});
};

const Fluxo: React.FC<{a: AnimacaoTempo; caminho: [number, number, number][]; t: number}> = ({a, caminho, t}) => {
	const def = FLUXOS[a.tipo ?? 'agua'] ?? FLUXOS.agua;
	if (caminho.length < 2 || t < a.ini || t > a.fim + 0.4) return null;
	const c = curva(caminho);
	const n = a.quantidade ?? 16;
	const vel = a.velocidade ?? 0.45;
	const entra = smoothstep(a.ini, a.ini + 0.35, t) * (1 - smoothstep(a.fim, a.fim + 0.4, t));
	const k = a.intensidade ?? 1;
	const m = def.brilha ? brilho(def.cor, 1.4) : toon(def.cor);
	return (
		<>
			{Array.from({length: n}, (_, i) => {
				// as bolinhas entram pelo começo do caminho: a da frente só aparece quando chega a vez dela
				const andou = (t - a.ini) * vel - i / n;
				if (andou < 0) return null;
				const u = andou % 1;
				const pt = c.getPointAt(u);
				const r = def.raio * k * entra * (0.8 + 0.4 * Math.sin(i * 2.3)) * smoothstep(0, 0.06, u) * (1 - smoothstep(0.94, 1, u));
				if (r <= 0.002) return null;
				return (
					<React.Fragment key={i}>
						<mesh geometry={esfera(1, 10, 7)} material={m} position={pt.toArray()} scale={r} />
						{def.brilha && i % 2 === 0 ? <sprite material={haloMat(def.cor, 0.5)} position={pt.toArray()} scale={[r * 7, r * 7, 1]} /> : null}
					</React.Fragment>
				);
			})}
		</>
	);
};

/** Corte (vista em corte): planos que escondem a parte da frente e a cor do miolo cortado. */
interface Corte {
	planos: THREE.Plane[];
	chave: string;
}

const PLANOS_CORTE = new Map<string, THREE.Plane>();
const EIXOS: Record<string, THREE.Vector3> = {x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1)};

/**
 * Plano de corte da animação "cortar" no instante t: varre da frente ("lado" + do eixo, padrão z,
 * o lado da câmera) até "posicao" (m a partir do apoio, padrão 0) e some no "ate" se for "fechar".
 * O plano é o mesmo objeto a cada quadro; só o valor muda.
 */
/**
 * Meio da peça no sistema da maquete (posições e deslocamentos dela e das mães somados; o giro
 * das mães não entra, que o corte é sempre reto). Sem peça, o centro da maquete.
 */
export const origemDaPeca = (m: MaqueteNaCena, anims: AnimacaoTempo[], t: number, id?: string): THREE.Vector3 => {
	const o = new THREE.Vector3();
	let p = id ? m.pecas.find((x) => x.id === id || `${m.id}.${x.id}` === id) : undefined;
	for (let i = 0; p && i < 20; i++) {
		const e = estadoPeca(m, p, anims, t);
		const pos = p.pos ?? [0, 0, 0];
		o.add(new THREE.Vector3(pos[0] + e.desloc[0], pos[1] + e.desloc[1], pos[2] + e.desloc[2]));
		const pai = p.pai;
		p = pai ? m.pecas.find((x) => x.id === pai) : undefined;
	}
	return o;
};

/** Plano do corte; "posicao" conta a partir do meio da peça cortada (ou do centro da maquete). */
export const planoDeCorte = (m: MaqueteNaCena, a: AnimacaoTempo, t: number, origem?: THREE.Vector3): THREE.Plane | null => {
	if (t < a.ini) return null;
	const chave = `${m.id}|${a.peca}|${a.ini}`;
	let pl = PLANOS_CORTE.get(chave);
	if (!pl) {
		pl = new THREE.Plane();
		PLANOS_CORTE.set(chave, pl);
	}
	const eixo = (EIXOS[a.eixo ?? 'z'] ?? EIXOS.z).clone();
	const sinal = a.angulo !== undefined && a.angulo < 0 ? -1 : 1;
	const alcance = (a.intensidade ?? 1.2) / Math.max(0.05, m.escala);
	const fim = a.posicao ?? 0;
	const u = smoothstep(a.ini, a.ini + Math.max(0.3, Math.min(1.2, a.fim - a.ini)), t);
	const pos = fim + (1 - u) * alcance * sinal;
	// no sistema da maquete: guarda o que fica atrás (lado oposto ao sinal) do plano
	const normalLocal = eixo.multiplyScalar(-sinal);
	const ponto = EIXOS[a.eixo ?? 'z'].clone().multiplyScalar(pos).add(origem ?? new THREE.Vector3());
	const mat = new THREE.Matrix4().compose(new THREE.Vector3(...m.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), m.giro), new THREE.Vector3(m.escala, m.escala, m.escala));
	pl.setFromNormalAndCoplanarPoint(normalLocal, ponto).applyMatrix4(mat);
	return pl;
};

const MATERIAL_PADRAO: Record<string, string> = {engrenagem: 'metal', mola: 'metal', tubo: 'metal', rachadura: 'luz'};

interface Contexto {
	m: MaqueteNaCena;
	anims: AnimacaoTempo[];
	t: number;
	limpo: boolean;
	corteDaMaquete: Corte | null;
}

/** Material da peça em qualquer visual (o limpo ignora contorno e usa material de verdade). */
const materialDaPeca = (c: Contexto, p: Peca, e: ReturnType<typeof estadoPeca>, corte: Corte | null, extra?: {cor?: string; material?: string; largura?: number; altura?: number}) => {
	if (!c.limpo) return material({...p, cor: extra?.cor ?? p.cor}, e.calor, e.pulso, e.opacidade);
	const cor = extra?.cor ?? p.cor;
	const mat = extra?.material ?? p.material ?? MATERIAL_PADRAO[p.forma];
	const calor = clamp(e.calor, 0, 1.5);
	const pulso = clamp(e.pulso);
	let emissivo: [number, number, number] | undefined;
	if (calor > 0.05) emissivo = [1.0 * calor, 0.28 * calor, 0.04 * calor];
	else if (pulso > 0.05) emissivo = [0.55 * pulso, 0.48 * pulso, 0.08 * pulso];
	else if (p.brilho) {
		const k = new THREE.Color(cor ?? '#FFF6C8');
		emissivo = [k.r * p.brilho, k.g * p.brilho, k.b * p.brilho];
	} else if (p.forma === 'seta' && !extra) {
		const k = new THREE.Color(cor ?? '#FF7A1A');
		emissivo = [k.r * 0.35, k.g * 0.35, k.b * 0.35];
	}
	const cheia = cor && p.forma === 'rachadura' ? cor : p.forma === 'rachadura' ? '#26221F' : cor;
	return materialLimpo({cor: cheia, material: mat, opacidade: e.opacidade, emissivo, largura: extra?.largura, altura: extra?.altura, corte: corte?.planos ?? null, chaveCorte: corte?.chave, ladoDuplo: p.forma === 'rachadura' || p.forma === 'extrusao'});
};

/** Uma malha da peça, com a tampa do corte quando ela está cortada. */
const MalhaPeca: React.FC<{
	g: THREE.BufferGeometry;
	mat: THREE.Material;
	corte: Corte | null;
	corTampa: string;
	contorno: number;
	sombra?: boolean;
	position?: [number, number, number];
	rotation?: [number, number, number];
	scale?: [number, number, number] | number;
	renderOrder?: number;
}> = ({g, mat, corte, corTampa, contorno, sombra = true, renderOrder, ...tr}) => (
	<>
		<mesh geometry={g} material={mat} castShadow={sombra} receiveShadow renderOrder={renderOrder} {...tr}>
			{contorno ? <Contorno espessura={contorno} /> : null}
		</mesh>
		{/* vidro e água cortados ficam sem tampa: a tampa pintada aparecia em raios através da transparência */}
		{corte && !(mat.transparent && mat.opacity < 0.95) ? <mesh geometry={g} material={materialTampa(corTampa, corte.planos, corte.chave)} {...tr} /> : null}
	</>
);

/** Camadas padrão do terreno em corte (de cima para baixo, fração da altura). */
const CAMADAS_PADRAO: {material: string; altura: number; cor?: string}[] = [
	{material: 'grama', altura: 0.06},
	{material: 'terra', altura: 0.44},
	{material: 'pedra', altura: 0.5},
];

/** Peças compostas (várias malhas): terreno em corte, hélice, roda, casa, árvore e a seta. */
const Composta: React.FC<{c: Contexto; p: Peca; e: ReturnType<typeof estadoPeca>; corte: Corte | null; contorno: number}> = ({c, p, e, corte, contorno}) => {
	const t = p.tam ?? [];
	const M = (extra?: {cor?: string; material?: string; largura?: number; altura?: number}) => materialDaPeca(c, p, e, corte, extra);
	const tampa = corDaTampa(p.cor ?? '#8A8A8A');
	const mp = (g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], rot?: [number, number, number], k?: string, ct = contorno) => (
		<MalhaPeca key={k ?? `${pos}`} g={g} mat={m} corte={corte} corTampa={tampa} contorno={ct} position={pos} rotation={rot} />
	);
	switch (p.forma) {
		case 'seta': {
			const comp = t[0] ?? 0.4;
			const gr = t[1] ?? 0.03;
			const m = M();
			return (
				<>
					{mp(cilindro(gr, gr, comp * 0.7, 16), m, [0, -comp * 0.15, 0], undefined, 'haste')}
					{mp(cone(gr * 2.4, comp * 0.3, 20), m, [0, comp * 0.35, 0], undefined, 'ponta')}
				</>
			);
		}
		case 'terreno': {
			const [L, H, P] = [t[0] ?? 2, t[1] ?? 1, t[2] ?? 1];
			const camadas = p.camadas?.length ? p.camadas : CAMADAS_PADRAO;
			const soma = camadas.reduce((s, x) => s + x.altura, 0) || 1;
			let topo = H / 2;
			return (
				<>
					{camadas.map((cam, i) => {
						const h = (cam.altura / soma) * H;
						const y = topo - h / 2;
						topo -= h;
						const cor = cam.cor ?? (cam.material === 'grama' ? '#6DBE45' : cam.material === 'terra' ? '#8A5A36' : cam.material === 'pedra' ? '#8E8E8E' : cam.material === 'areia' ? '#E2C68F' : undefined);
						const mat = cam.material === 'areia' ? 'terra' : cam.material;
						return (
							<MalhaPeca key={i} g={caixa(L, h, P)} mat={M({cor, material: mat, largura: L, altura: h})} corte={corte} corTampa={corDaTampa(cor ?? '#8A5A36')} contorno={0} position={[0, y, 0]} />
						);
					})}
				</>
			);
		}
		case 'helice': {
			const [r, larg, n] = [t[0] ?? 0.3, t[1] ?? 0.12, Math.round(t[2] ?? 3)];
			const m = M();
			return (
				<>
					{mp(cilindro(r * 0.16, r * 0.16, larg * 0.5, 24), M({cor: p.cor_detalhe ?? p.cor}), [0, 0, 0], undefined, 'cubo')}
					{Array.from({length: n}, (_, i) => mp(helicePaGeo(r, larg), m, [0, 0, 0], [0, (i / n) * Math.PI * 2, 0.22], `pa${i}`, 0))}
				</>
			);
		}
		case 'roda': {
			const [r, larg, n] = [t[0] ?? 0.35, t[1] ?? 0.05, Math.round(t[2] ?? 16)];
			const pneu = M({cor: p.cor_detalhe ?? '#2A2A2E', material: 'borracha'});
			const aro = M({material: p.material ?? 'metal'});
			const raios = M({cor: '#D9DDE2', material: 'cromado'});
			return (
				<>
					{mp(toro(r - larg * 0.5, larg * 0.5, 64, 16), pneu, [0, 0, 0], [0, 0, Math.PI / 2], 'pneu')}
					{mp(toro(r - larg * 1.05, larg * 0.18, 64, 10), aro, [0, 0, 0], [0, 0, Math.PI / 2], 'aro')}
					{mp(cilindro(larg * 0.45, larg * 0.45, larg * 1.6, 20), aro, [0, 0, 0], [0, 0, Math.PI / 2], 'cubo')}
					{Array.from({length: n}, (_, i) => {
						const a = (i / n) * Math.PI * 2;
						const rr = (r - larg * 1.05) / 2;
						return mp(cilindro(0.004, 0.004, r - larg * 1.05, 6), raios, [0, Math.sin(a) * rr, Math.cos(a) * rr], [Math.PI / 2 - a, 0, 0], `r${i}`, 0);
					})}
				</>
			);
		}
		case 'casa': {
			const [L, H, P] = [t[0] ?? 3, t[1] ?? 2.4, t[2] ?? 3];
			const hTelhado = L * 0.32;
			const parede = M({material: p.material ?? 'tijolo', largura: L, altura: H});
			const telhado = M({cor: p.cor_detalhe ?? '#2F3B57', material: 'fosco'});
			const branco = M({cor: '#F2F2EE', material: 'fosco'});
			const vidro = M({cor: '#BFE3FF', material: 'vidro'});
			const meio = -(H + 0.1 + (p.sem_telhado ? 0 : hTelhado)) / 2;
			const e = Math.min(0.18, L * 0.05);
			const prisma = geo(`prisma${L},${hTelhado},${P}`, () => {
				const s = new THREE.Shape([new THREE.Vector2(-L / 2 - 0.15, 0), new THREE.Vector2(L / 2 + 0.15, 0), new THREE.Vector2(0, hTelhado)]);
				const g = new THREE.ExtrudeGeometry(s, {depth: P + 0.3, bevelEnabled: false});
				g.translate(0, 0, -(P + 0.3) / 2);
				g.computeVertexNormals();
				return g;
			});
			return (
				<>
					{/* paredes ocas (no corte aparece o lado de dentro da casa) */}
					{mp(caixa(L, H, e), parede, [0, meio + H / 2, P / 2 - e / 2], undefined, 'frente', 0)}
					{mp(caixa(L, H, e), parede, [0, meio + H / 2, -P / 2 + e / 2], undefined, 'fundo', 0)}
					{mp(caixa(e, H, P - 2 * e), parede, [-L / 2 + e / 2, meio + H / 2, 0], undefined, 'esq', 0)}
					{mp(caixa(e, H, P - 2 * e), parede, [L / 2 - e / 2, meio + H / 2, 0], undefined, 'dir', 0)}
					{mp(caixa(L - 2 * e, 0.06, P - 2 * e), M({cor: '#E6DCCB', material: 'ceramica'}), [0, meio + 0.03, 0], undefined, 'piso', 0)}
					{mp(caixa(L, 0.1, P), M({cor: '#D9D4CC', material: 'concreto', largura: L, altura: P}), [0, meio + H + 0.05, 0], undefined, 'laje', 0)}
					{p.sem_telhado ? null : mp(prisma, telhado, [0, meio + H + 0.1, 0], undefined, 'telhado', 0)}
					{mp(caixa(L * 0.2, H * 0.55, 0.06), M({cor: '#8A5A36', material: 'madeira'}), [0, meio + H * 0.275, P / 2 + 0.02], undefined, 'porta', 0)}
					{[-0.3, 0.3].map((x) => (
						<React.Fragment key={x}>
							{mp(caixa(L * 0.2, H * 0.28, 0.05), branco, [x * L, meio + H * 0.62, P / 2 + 0.015], undefined, `mold${x}`, 0)}
							{mp(caixa(L * 0.16, H * 0.22, 0.06), vidro, [x * L, meio + H * 0.62, P / 2 + 0.02], undefined, `jan${x}`, 0)}
						</React.Fragment>
					))}
				</>
			);
		}
		case 'arvore': {
			const h = t[0] ?? 3;
			const tronco = M({cor: '#7A5233', material: 'madeira'});
			const folha = M({cor: p.cor ?? '#4E9F3D', material: 'fosco'});
			const folha2 = M({cor: p.cor_detalhe ?? '#3E8A32', material: 'fosco'});
			return (
				<>
					{mp(cilindro(h * 0.05, h * 0.035, h * 0.45, 8), tronco, [0, -h / 2 + h * 0.225, 0], undefined, 'tronco', 0)}
					{mp(ico(h * 0.28, 0), folha, [0, h * 0.1, 0], [0.3, 0.5, 0], 'f1', 0)}
					{mp(ico(h * 0.2, 0), folha2, [h * 0.14, h * 0.28, h * 0.05], [0.8, 0.2, 0.4], 'f2', 0)}
					{mp(ico(h * 0.18, 0), folha, [-h * 0.12, h * 0.25, -h * 0.06], [0.1, 1.2, 0.6], 'f3', 0)}
				</>
			);
		}
		default:
			return null;
	}
};

export const FORMAS_COMPOSTAS = new Set(['seta', 'terreno', 'helice', 'roda', 'casa', 'arvore']);

const PecaMalha: React.FC<{c: Contexto; p: Peca; corteHerdado: Corte | null}> = ({c, p, corteHerdado}) => {
	const {m, anims, t, limpo} = c;
	const e = estadoPeca(m, p, anims, t);
	if (!e.visivel) return null;
	const pos = p.pos ?? [0, 0, 0];
	const g = (p.giro ?? [0, 0, 0]).map((x) => (x * Math.PI) / 180) as [number, number, number];
	const filhos = m.pecas.filter((x) => x.pai === p.id);
	// corte só desta peça (e das filhas)
	const minha = anims.find((a) => a.faz === 'cortar' && (a.peca === p.id || a.peca === `${m.id}.${p.id}`) && t >= a.ini);
	const plMeu = minha ? planoDeCorte(m, minha, t, origemDaPeca(m, anims, t, p.id)) : null;
	const corte: Corte | null = plMeu ? {planos: [plMeu], chave: `${m.id}|${p.id}`} : corteHerdado;
	const vidro = e.opacidade < 0.6;
	const contorno = limpo || p.sem_contorno || vidro ? 0 : 0.012;
	const h = alturaDaPeca(p);
	const tam = p.tam ?? [];
	const fluxos = anims.filter((a) => a.faz === 'fluxo' && (a.peca === p.id || a.peca === `${m.id}.${p.id}`));
	const composta = FORMAS_COMPOSTAS.has(p.forma);
	// a rachadura "cresce" desenhando o traço; as outras esticam de baixo para cima
	const estica = p.forma === 'rachadura' ? 1 : e.crescer;
	const geom = composta ? null : geometria(p, limpo, e.crescer);
	const mat = composta ? null : materialDaPeca(c, p, e, corte, {largura: Math.max(tam[0] ?? 1, tam[2] ?? 0), altura: tam[1] ?? 1});
	const tampa = corDaTampa(p.cor ?? '#9AA0A8');
	return (
		<group position={[pos[0] + e.desloc[0], pos[1] + e.desloc[1], pos[2] + e.desloc[2]]} rotation={g}>
			<group rotation={e.rot} scale={e.escala}>
				{/* crescer: escala em y a partir da base da peça */}
				<group position={[0, (-h / 2) * (1 - estica), 0]} scale={[1, estica, 1]}>
					{composta ? (
						<Composta c={c} p={p} e={e} corte={corte} contorno={contorno} />
					) : geom && mat ? (
						<MalhaPeca g={geom} mat={mat} corte={corte && p.forma !== 'rachadura' ? corte : null} corTampa={tampa} contorno={contorno} sombra={!vidro && p.forma !== 'rachadura'} renderOrder={vidro ? 2 : 0} />
					) : null}
					{e.calor > 0.35 ? <pointLight color="#FF7A2A" intensity={1.6 * e.calor} distance={1.4} decay={2} /> : null}
					{p.brilho && !limpo ? <pointLight color={p.cor ?? '#FFF6C8'} intensity={1.2 * p.brilho} distance={2.2} decay={2} /> : null}
					{p.brilho && limpo && p.luz !== false ? <pointLight color={p.cor ?? '#FFF6C8'} intensity={0.5 * p.brilho} distance={Math.max(0.6, (tam[0] ?? 0.1) * 6)} decay={2} /> : null}
				</group>
				{fluxos.map((a, i) => (
					<Fluxo key={`f${i}`} a={a} caminho={a.caminho ?? p.caminho ?? []} t={t} />
				))}
				{filhos.map((f) => (
					<PecaMalha key={f.id} c={c} p={f} corteHerdado={corte} />
				))}
			</group>
		</group>
	);
};

/**
 * Corte que também abre o chão do cenário (animação "cortar" com "solo": true): no campo e na rua,
 * o gramado e o asfalto somem na frente do corte, e o bloco de terreno mostra as camadas de lado.
 */
export const corteDoSolo = (cena: CenaTempo, linha: LinhaDoTempo, t: number): THREE.Plane[] | null => {
	for (const m of maquetesDaCena(cena, linha)) {
		const a = cena.animacoes.find((x) => x.faz === 'cortar' && x.solo && t >= x.ini && (x.peca === m.id || x.peca === m.modelo || m.pecas.some((p) => p.id === x.peca || `${m.id}.${p.id}` === x.peca)));
		if (a) {
			const daMaquete = a.peca === m.id || a.peca === m.modelo;
			const pl = planoDeCorte(m, {...a, ini: a.ini}, t, daMaquete ? undefined : origemDaPeca(m, cena.animacoes, t, a.peca));
			return pl ? [pl] : null;
		}
	}
	return null;
};

export const Maquetes: React.FC<{cena: CenaTempo; linha: LinhaDoTempo; t: number}> = ({cena, linha, t}) => {
	const limpo = ehLimpo(cena.cenario);
	return (
		<>
			{maquetesDaCena(cena, linha).map((m) => {
				// "aparece" e "some" no objeto maquete: a maquete inteira surge crescendo ou some
				if (m.aparece !== undefined && t < m.aparece) return null;
				if (m.some !== undefined && t >= m.some + 0.35) return null;
				const surge = m.aparece !== undefined ? Math.max(0.001, Math.min(1, (t - m.aparece) / 0.6)) : 1;
				const vai = m.some !== undefined && t >= m.some ? Math.max(0.001, 1 - (t - m.some) / 0.35) : 1;
				const k = (1 - (1 - surge) ** 3) * vai;
				const raiz = m.pecas.filter((p) => !p.pai || !m.pecas.some((x) => x.id === p.pai));
				// fluxos presos à maquete inteira (peca = id da maquete), no sistema dela
				const soltos = cena.animacoes.filter((a) => a.faz === 'fluxo' && (a.peca === m.id || a.peca === m.modelo));
				const aCorte = cena.animacoes.find((a) => a.faz === 'cortar' && (a.peca === m.id || a.peca === m.modelo) && t >= a.ini);
				const pl = aCorte ? planoDeCorte(m, aCorte, t) : null;
				const c: Contexto = {m, anims: cena.animacoes, t, limpo, corteDaMaquete: pl ? {planos: [pl], chave: m.id} : null};
				return (
					<group key={m.id} position={m.pos} rotation={[0, m.giro, 0]} scale={m.escala * k}>
						{raiz.map((p) => (
							<PecaMalha key={p.id} c={c} p={p} corteHerdado={c.corteDaMaquete} />
						))}
						{soltos.map((a, i) => (
							<Fluxo key={i} a={a} caminho={a.caminho ?? []} t={t} />
						))}
					</group>
				);
			})}
		</>
	);
};
