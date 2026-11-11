// Visual "limpo" (Como Funciona desde 11/11): materiais de verdade em vez do desenho com contorno.
// Metal brilha e reflete, vidro e água deixam ver o miolo, concreto, tijolo, terra e madeira têm
// textura, caixas têm quina arredondada. É o jeito dos vídeos de engenharia que viralizaram (a
// barragem e o muro de arrimo que o Iuri mandou): cenário de verdade, luz de dia, sem contorno.
// Os cenários de histórias continuam no visual de desenho (toon + contorno).
import React from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {CENARIOS} from '../catalogo';
import {MATERIAIS} from '../materiais';
import {aleatorio, clamp} from '../util/mat';
import {geo, linear, memo} from './base';

/** O cenário usa o visual limpo? */
export const ehLimpo = (cenario: string) => CENARIOS[cenario]?.visual === 'limpo';

// --- reflexos ---------------------------------------------------------------------------------

let ambienteRefl: THREE.Texture | null = null;
let rendererDoRefl: THREE.WebGLRenderer | null = null;

/** Mapa de reflexo de uma sala clara (sem baixar nada): dá brilho ao metal, ao vidro e à água. */
export const reflexo = () => ambienteRefl;

/**
 * Liga o que o visual limpo precisa no renderizador: corte (clipping) e o mapa de reflexo.
 * Fica dentro do Canvas; não desenha nada.
 */
export const PrepararLimpo: React.FC = () => {
	const gl = useThree((s) => s.gl);
	gl.localClippingEnabled = true;
	if (rendererDoRefl !== gl) {
		const pm = new THREE.PMREMGenerator(gl);
		ambienteRefl = pm.fromScene(new RoomEnvironment(), 0.04).texture;
		pm.dispose();
		rendererDoRefl = gl;
		cacheMat.clear();
	}
	return null;
};

// --- texturas desenhadas no canvas ------------------------------------------------------------

const cacheTex = new Map<string, THREE.Texture>();
const textura = (chave: string, tam: number, desenhar: (ctx: CanvasRenderingContext2D, tam: number) => void) => {
	if (!cacheTex.has(chave)) {
		const c = document.createElement('canvas');
		c.width = c.height = tam;
		const ctx = c.getContext('2d')!;
		desenhar(ctx, tam);
		const t = new THREE.CanvasTexture(c);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 4;
		cacheTex.set(chave, t);
	}
	return cacheTex.get(chave)!;
};

const corCss = (c: THREE.Color, k = 1) => `rgb(${Math.round(clamp(c.r * k) * 255)},${Math.round(clamp(c.g * k) * 255)},${Math.round(clamp(c.b * k) * 255)})`;

/** Desenho de cada textura, em cima da cor da peça (a textura é clara: multiplica a cor). */
const DESENHOS: Record<string, (ctx: CanvasRenderingContext2D, tam: number) => void> = {
	concreto: (ctx, tam) => {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, tam, tam);
		const r = aleatorio(11);
		for (let i = 0; i < 2600; i++) {
			const v = 200 + Math.floor(r() * 55);
			ctx.fillStyle = `rgba(${v},${v},${v},0.55)`;
			ctx.fillRect(r() * tam, r() * tam, 1 + r() * 2.5, 1 + r() * 2.5);
		}
		// marcas das formas de madeira (faixas horizontais leves)
		ctx.strokeStyle = 'rgba(150,150,150,0.25)';
		ctx.lineWidth = 2;
		for (let y = tam / 4; y < tam; y += tam / 4) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(tam, y);
			ctx.stroke();
		}
	},
	tijolo: (ctx, tam) => {
		ctx.fillStyle = '#d8d2c8';
		ctx.fillRect(0, 0, tam, tam);
		const linhas = 8;
		const h = tam / linhas;
		const w = tam / 4;
		const r = aleatorio(7);
		for (let j = 0; j < linhas; j++) {
			const off = j % 2 ? w / 2 : 0;
			for (let i = -1; i < 5; i++) {
				const k = 0.86 + r() * 0.18;
				ctx.fillStyle = `rgb(${Math.round(255 * k)},${Math.round(236 * k)},${Math.round(226 * k)})`;
				ctx.fillRect(i * w + off + 3, j * h + 3, w - 6, h - 6);
			}
		}
	},
	terra: (ctx, tam) => {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, tam, tam);
		const r = aleatorio(5);
		for (let i = 0; i < 160; i++) {
			const v = 120 + Math.floor(r() * 70);
			ctx.fillStyle = `rgb(${v},${Math.round(v * 0.92)},${Math.round(v * 0.85)})`;
			ctx.beginPath();
			ctx.ellipse(r() * tam, r() * tam, 2 + r() * 5, 1.5 + r() * 4, r() * 3, 0, Math.PI * 2);
			ctx.fill();
		}
		for (let i = 0; i < 1800; i++) {
			const v = 205 + Math.floor(r() * 50);
			ctx.fillStyle = `rgba(${v},${v},${v},0.6)`;
			ctx.fillRect(r() * tam, r() * tam, 1.5, 1.5);
		}
	},
	pedra: (ctx, tam) => {
		ctx.fillStyle = '#9a9a9a';
		ctx.fillRect(0, 0, tam, tam);
		const r = aleatorio(3);
		for (let i = 0; i < 70; i++) {
			const v = 185 + Math.floor(r() * 70);
			ctx.fillStyle = `rgb(${v},${v},${v})`;
			ctx.beginPath();
			const x = r() * tam;
			const y = r() * tam;
			const rr = 10 + r() * 18;
			ctx.moveTo(x + rr, y);
			for (let k = 1; k <= 7; k++) {
				const a = (k / 7) * Math.PI * 2;
				const q = rr * (0.7 + r() * 0.3);
				ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.75);
			}
			ctx.fill();
		}
	},
	madeira: (ctx, tam) => {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, tam, tam);
		const r = aleatorio(9);
		for (let i = 0; i < 46; i++) {
			const y = r() * tam;
			const v = 200 + Math.floor(r() * 40);
			ctx.strokeStyle = `rgba(${v},${Math.round(v * 0.9)},${Math.round(v * 0.8)},0.8)`;
			ctx.lineWidth = 1 + r() * 3;
			ctx.beginPath();
			ctx.moveTo(0, y);
			for (let x = 0; x <= tam; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
			ctx.stroke();
		}
	},
	grama: (ctx, tam) => {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, tam, tam);
		const r = aleatorio(13);
		for (let i = 0; i < 3000; i++) {
			const v = 200 + Math.floor(r() * 55);
			ctx.fillStyle = `rgba(${Math.round(v * 0.9)},${v},${Math.round(v * 0.85)},0.7)`;
			ctx.fillRect(r() * tam, r() * tam, 1.5, 3);
		}
	},
	azulejo: (ctx, tam) => {
		ctx.fillStyle = '#c9ccd2';
		ctx.fillRect(0, 0, tam, tam);
		const linhas = 8;
		const h = tam / linhas;
		const w = tam / 4;
		for (let j = 0; j < linhas; j++) {
			const off = j % 2 ? w / 2 : 0;
			for (let i = -1; i < 5; i++) {
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(i * w + off + 2, j * h + 2, w - 4, h - 4);
			}
		}
	},
	asfalto: (ctx, tam) => {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, tam, tam);
		const r = aleatorio(17);
		for (let i = 0; i < 4000; i++) {
			const v = 170 + Math.floor(r() * 85);
			ctx.fillStyle = `rgba(${v},${v},${v},0.7)`;
			ctx.fillRect(r() * tam, r() * tam, 1.5, 1.5);
		}
	},
};

/** Tamanho (m) que um ladrilho da textura cobre: tijolo de 20 cm, pedra de 60 cm... */
const LADRILHO: Record<string, number> = {concreto: 2.4, tijolo: 0.9, terra: 0.7, pedra: 1.0, madeira: 0.8, grama: 1.2, azulejo: 0.6, asfalto: 2.0};

export const texturaDoMaterial = (nome: string, largura = 1, altura = 1) => {
	const desenho = DESENHOS[nome];
	if (!desenho) return undefined;
	const base = textura(`tex-${nome}`, 256, desenho);
	const l = LADRILHO[nome] ?? 1;
	const rx = Math.max(1, Math.round((largura / l) * 2) / 2);
	const ry = Math.max(1, Math.round((altura / l) * 2) / 2);
	const chave = `tex-${nome}-${rx}-${ry}`;
	if (!cacheTex.has(chave)) {
		const t = base.clone();
		t.repeat.set(rx, ry);
		t.needsUpdate = true;
		cacheTex.set(chave, t);
	}
	return cacheTex.get(chave)!;
};

// --- materiais ---------------------------------------------------------------------------------

const cacheMat = new Map<string, THREE.Material>();

export interface PedidoMaterial {
	cor?: string;
	material?: string;
	opacidade: number;
	/** cor de brilho próprio (calor, pulso), em RGB linear */
	emissivo?: [number, number, number];
	/** tamanho da face para repetir a textura */
	largura?: number;
	altura?: number;
	/** id do plano de corte que esta peça respeita */
	corte?: THREE.Plane[] | null;
	chaveCorte?: string;
	ladoDuplo?: boolean;
}

const q = (v: number, passo: number) => Math.round(v / passo) * passo;

/** Material de verdade (PBR) da peça, guardado por chave para não criar um por quadro. */
export const materialLimpo = (p: PedidoMaterial): THREE.Material => {
	const def = MATERIAIS[p.material ?? 'plastico'] ?? MATERIAIS.plastico;
	const cor = p.cor ?? def.cor;
	const op = q(clamp(p.opacidade * (def.opacidade ?? 1)), 0.05);
	const em = p.emissivo?.map((x) => q(x, 0.05)) as [number, number, number] | undefined;
	const tex = def.textura ? texturaDoMaterial(def.textura, p.largura ?? 1, p.altura ?? 1) : undefined;
	const chave = `L|${p.material}|${cor}|${op}|${em ?? ''}|${tex?.uuid ?? ''}|${p.chaveCorte ?? ''}|${p.ladoDuplo ? 2 : 1}`;
	let m = cacheMat.get(chave);
	if (!m) {
		if (p.material === 'luz') {
			m = new THREE.MeshBasicMaterial({color: new THREE.Color(cor).multiplyScalar(1.15), toneMapped: false, transparent: op < 0.99, opacity: op});
		} else {
			const s = new THREE.MeshStandardMaterial({
				color: cor,
				roughness: def.rugosidade,
				metalness: def.metal,
				map: tex ?? null,
				transparent: op < 0.99,
				opacity: op,
				depthWrite: op >= 0.99,
				side: p.ladoDuplo || op < 0.99 ? THREE.DoubleSide : THREE.FrontSide,
			});
			const refl = reflexo();
			if (refl && def.reflexo > 0) {
				s.envMap = refl;
				s.envMapIntensity = def.reflexo;
			}
			if (em) s.emissive = linear(...em);
			m = s;
		}
		cacheMat.set(chave, m);
	}
	// o plano de corte muda a cada quadro, mas o objeto THREE.Plane é o mesmo: basta apontar para ele
	m.clippingPlanes = p.corte ?? null;
	m.clipShadows = !!p.corte;
	return m;
};

/** Tampa do corte: o lado de dentro da peça pintado de uma cor lisa (parece maciço cortado). */
export const materialTampa = (cor: string, planos: THREE.Plane[], chave: string) => {
	const k = `tampa|${cor}|${chave}`;
	let m = cacheMat.get(k) as THREE.MeshBasicMaterial | undefined;
	if (!m) {
		m = new THREE.MeshBasicMaterial({color: cor, side: THREE.BackSide});
		cacheMat.set(k, m);
	}
	m.clippingPlanes = planos;
	return m;
};

/** Cor da tampa do corte: a da peça mais escura (o miolo maciço). */
export const corDaTampa = (cor: string) => `#${new THREE.Color(cor).multiplyScalar(0.72).getHexString()}`;

// --- geometrias ----------------------------------------------------------------------------------

/** Caixa com quina arredondada (raio ~8% do lado menor). */
export const caixaRedonda = (x: number, y: number, z: number, raio?: number) => {
	const r = Math.min(raio ?? Math.min(x, y, z) * 0.08, Math.min(x, y, z) * 0.45, 0.06);
	return geo(`rbox${x},${y},${z},${r}`, () => (r < 0.002 ? new THREE.BoxGeometry(x, y, z) : new RoundedBoxGeometry(x, y, z, 3, r)));
};

/** Peça de torno: perfil [[raio, altura], ...] girado em volta do eixo y (copo, garrafa, bocal, lâmpada). */
export const tornoGeo = (perfil: [number, number][]) =>
	geo(`torno${JSON.stringify(perfil)}`, () => {
		const pts = perfil.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
		const g = new THREE.LatheGeometry(pts, 48);
		g.computeVertexNormals();
		return g;
	});

/** Peça recortada: contorno [[x, y], ...] no plano da frente, com espessura em z (pá, ponteiro, suporte). */
export const extrusaoGeo = (contorno: [number, number][], esp: number) =>
	geo(`extr${JSON.stringify(contorno)},${esp}`, () => {
		const s = new THREE.Shape(contorno.map(([x, y]) => new THREE.Vector2(x, y)));
		const bisel = Math.min(esp * 0.25, 0.01);
		const g = new THREE.ExtrudeGeometry(s, {depth: Math.max(0.001, esp - bisel * 2), bevelEnabled: bisel > 0.0005, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 2, curveSegments: 12});
		g.translate(0, 0, -esp / 2 + bisel);
		g.computeVertexNormals();
		return g;
	});

/** Rachadura: traço quebrado que desce a partir da origem (no plano da frente), com ramos. */
export const rachaduraGeo = (comp: number, larg: number, ramos: number, semente: number, fracao: number) => {
	const passos = 24;
	const f = Math.round(clamp(fracao) * passos) / passos;
	return geo(`rach${comp},${larg},${ramos},${semente},${f}`, () => {
		const r = aleatorio(semente * 97 + 13);
		const segs: [THREE.Vector2, THREE.Vector2, number][] = [];
		const galho = (x0: number, y0: number, ang: number, L: number, grossura: number, ordem: number, ini: number) => {
			let x = x0;
			let y = y0;
			const n = Math.max(3, Math.round(L / (comp / 10)));
			for (let i = 0; i < n; i++) {
				const a = ang + (r() - 0.5) * 1.1;
				const d = L / n;
				const nx = x + Math.sin(a) * d;
				const ny = y - Math.cos(a) * d;
				const quando = ini + (i / n) * (1 - ini) * (ordem === 0 ? 1 : 0.6);
				segs.push([new THREE.Vector2(x, y), new THREE.Vector2(nx, ny), quando]);
				if (ordem < 2 && r() < ramos / n) galho(nx, ny, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), L * 0.45, grossura * 0.6, ordem + 1, quando);
				x = nx;
				y = ny;
			}
		};
		galho(0, 0, (r() - 0.5) * 0.4, comp, larg, 0, 0);
		const pos: number[] = [];
		for (const [a, b, quando] of segs) {
			if (quando > f) continue;
			const d = b.clone().sub(a);
			const n = new THREE.Vector2(-d.y, d.x).normalize().multiplyScalar(larg / 2);
			pos.push(a.x - n.x, a.y - n.y, 0, a.x + n.x, a.y + n.y, 0, b.x + n.x, b.y + n.y, 0);
			pos.push(a.x - n.x, a.y - n.y, 0, b.x + n.x, b.y + n.y, 0, b.x - n.x, b.y - n.y, 0);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos.length ? pos : [0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
		g.computeVertexNormals();
		return g;
	});
};

/** Pás de hélice ou ventoinha em volta do eixo y: cada pá é uma gota achatada e torcida. */
export const helicePaGeo = (raio: number, largura: number) =>
	geo(`pa${raio},${largura}`, () => {
		const s = new THREE.Shape();
		const w = largura / 2;
		s.moveTo(0, -w * 0.5);
		s.bezierCurveTo(raio * 0.35, -w * 1.1, raio * 0.85, -w * 0.9, raio, 0);
		s.bezierCurveTo(raio * 0.85, w * 0.9, raio * 0.35, w * 1.1, 0, w * 0.5);
		s.closePath();
		const g = new THREE.ExtrudeGeometry(s, {depth: largura * 0.06, bevelEnabled: true, bevelThickness: largura * 0.03, bevelSize: largura * 0.03, bevelSegments: 2, curveSegments: 10});
		g.rotateX(Math.PI / 2);
		g.computeVertexNormals();
		return g;
	});
