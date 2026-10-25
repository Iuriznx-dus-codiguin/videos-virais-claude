// Maquetes: objetos do dia a dia montados peça por peça no roteiro (chuveiro, motor, elevador...).
// Aqui fica a parte sem desenho: o estado de cada peça no instante t (deslocamento, giro, calor,
// transparência, vista explodida) e onde ela está no mundo, para a câmera mirar e as etiquetas
// 2D apontarem para ela. Tudo é função de t, como o resto do motor.
import * as THREE from 'three';
import {CENARIOS} from '../catalogo';
import type {AnimacaoTempo, CenaTempo, LinhaDoTempo, Objeto, Peca} from '../roteiro/tipos';
import {V2, V3, clamp, easeInOut, easeOut, ruido, smoothstep} from '../util/mat';

export interface EstadoPeca {
	visivel: boolean;
	desloc: V3;
	/** giro extra (rad) por eixo, aplicado depois do giro fixo da peça */
	rot: V3;
	escala: V3;
	/** quanto a peça cresceu de baixo para cima (1 = inteira) */
	crescer: number;
	opacidade: number;
	calor: number;
	pulso: number;
}

export interface MaqueteNaCena {
	id: string;
	modelo: string;
	pecas: Peca[];
	/** apoio [x, y, z] no cenário */
	pos: V3;
	giro: number;
	escala: number;
}

const EIXO: Record<string, number> = {x: 0, y: 1, z: 2};

/** Pulinho no fim (passa de 1 e volta), para peças que aparecem. */
const easeOutBack = (x: number) => {
	const c = 1.9;
	const k = clamp(x) - 1;
	return 1 + (c + 1) * k ** 3 + c * k ** 2;
};

export const apoioObjeto = (o: Objeto, cenario: string): V3 => {
	const def = CENARIOS[cenario];
	const [x, z] = Array.isArray(o.em) ? (o.em as V2) : (def?.marcas[o.em] ?? [0, 0]);
	const alt = typeof o.alt === 'number' ? o.alt : typeof o.em === 'string' ? (def?.alturas?.[o.em] ?? 0) : 0;
	return [x, alt, z];
};

export const maquetesDaCena = (cena: CenaTempo, linha: LinhaDoTempo): MaqueteNaCena[] =>
	cena.objetos
		.filter((o) => o.tipo === 'maquete')
		.map((o) => {
			const modelo = String(o.modelo ?? '');
			return {
				id: String(o.id ?? modelo),
				modelo,
				pecas: linha.modelos[modelo] ?? [],
				pos: apoioObjeto(o, cena.cenario),
				giro: ((o.giro ?? 0) * Math.PI) / 180,
				escala: o.escala ?? 1,
			};
		});

/** A animação vale para esta peça? ("peca", "maquete.peca") */
const casa = (a: AnimacaoTempo, m: MaqueteNaCena, p: Peca) => a.peca === p.id || a.peca === `${m.id}.${p.id}`;

/** Altura da peça no eixo y local (para crescer a partir da base). */
export const alturaDaPeca = (p: Peca): number => {
	const t = p.tam ?? [];
	switch (p.forma) {
		case 'caixa':
			return t[1] ?? 0.2;
		case 'cilindro':
		case 'cone':
			return t[1] ?? 0.2;
		case 'esfera':
			return 2 * (t[0] ?? 0.1);
		case 'capsula':
			return (t[1] ?? 0.2) + 2 * (t[0] ?? 0.05);
		case 'mola':
			return t[1] ?? 0.3;
		case 'seta':
			return t[0] ?? 0.4;
		case 'placa':
			return t[1] ?? 0.3;
		default:
			return 0.2;
	}
};

/** Fator da vista explodida da maquete no instante t (0 = montada, 1 = explodida). */
export const fatorExplosao = (m: MaqueteNaCena, anims: AnimacaoTempo[], t: number) => {
	let f = 0;
	for (const a of anims) {
		if ((a.faz !== 'explodir' && a.faz !== 'montar') || (a.peca !== m.id && a.peca !== m.modelo) || t < a.ini) continue;
		const dur = Math.max(0.2, a.fim - a.ini);
		const alvo = a.faz === 'explodir' ? 1 : 0;
		f = f + (alvo - f) * easeInOut((t - a.ini) / dur);
	}
	return f;
};

export const estadoPeca = (m: MaqueteNaCena, p: Peca, anims: AnimacaoTempo[], t: number): EstadoPeca => {
	const e: EstadoPeca = {visivel: !p.oculta, desloc: [0, 0, 0], rot: [0, 0, 0], escala: [1, 1, 1], crescer: 1, opacidade: p.opacidade ?? 1, calor: 0, pulso: 0};
	for (const a of anims) {
		if (!casa(a, m, p) || t < a.ini) continue;
		const dur = Math.max(0.05, a.fim - a.ini);
		const u = clamp((t - a.ini) / dur);
		const k = a.intensidade ?? 1;
		const eixo = EIXO[a.eixo ?? 'y'] ?? 1;
		switch (a.faz) {
			case 'girar': {
				// arranca em 0,4 s e gira em velocidade constante até "ate"
				const x = Math.min(t, a.fim) - a.ini;
				const r = 0.4;
				const giro = x < r ? (x * x) / (2 * r) : x - r / 2;
				e.rot[eixo] += 2 * Math.PI * (a.voltas ?? 1) * giro;
				break;
			}
			case 'girar_para':
				e.rot[eixo] += (((a.angulo ?? 90) * Math.PI) / 180) * easeInOut(u);
				break;
			case 'mover': {
				const d = a.desloc ?? [0, 0, 0];
				const s = easeInOut(u);
				e.desloc = [e.desloc[0] + d[0] * s, e.desloc[1] + d[1] * s, e.desloc[2] + d[2] * s];
				break;
			}
			case 'aparecer': {
				e.visivel = true;
				const s = Math.max(0.001, easeOutBack((t - a.ini) / 0.45));
				e.escala = [e.escala[0] * s, e.escala[1] * s, e.escala[2] * s];
				break;
			}
			case 'crescer':
				e.visivel = true;
				e.crescer = Math.max(0.001, easeOut(u));
				break;
			case 'sumir': {
				const s = 1 - easeInOut((t - a.ini) / 0.35);
				if (s <= 0.001) e.visivel = false;
				e.escala = [e.escala[0] * s, e.escala[1] * s, e.escala[2] * s];
				break;
			}
			case 'aquecer':
				e.calor = Math.max(e.calor, k * smoothstep(a.ini, a.ini + Math.min(dur, 1.6), t));
				break;
			case 'esfriar':
				e.calor *= 1 - smoothstep(a.ini, a.ini + Math.min(dur, 1.2), t);
				break;
			case 'pulsar':
				if (t <= a.fim) e.pulso = Math.max(e.pulso, k * (0.55 + 0.45 * Math.sin((t - a.ini) * 9)) * smoothstep(a.ini, a.ini + 0.2, t));
				break;
			case 'transparente':
				e.opacidade += ((a.opacidade ?? 0.25) - e.opacidade) * smoothstep(a.ini, a.ini + 0.6, t);
				break;
			case 'tremer':
				if (t <= a.fim) {
					const amp = 0.012 * k * smoothstep(a.ini, a.ini + 0.15, t);
					e.desloc = [e.desloc[0] + amp * ruido(t * 41, 1), e.desloc[1] + amp * ruido(t * 37, 2), e.desloc[2] + amp * ruido(t * 43, 3)];
				}
				break;
		}
	}
	const f = fatorExplosao(m, anims, t);
	if (f > 0 && p.explode) e.desloc = [e.desloc[0] + p.explode[0] * f, e.desloc[1] + p.explode[1] * f, e.desloc[2] + p.explode[2] * f];
	return e;
};

const GRAU = Math.PI / 180;

/** Matriz local da peça (em relação à mãe) no instante t. */
export const matrizLocal = (m: MaqueteNaCena, p: Peca, anims: AnimacaoTempo[], t: number): THREE.Matrix4 => {
	const e = estadoPeca(m, p, anims, t);
	const pos = p.pos ?? [0, 0, 0];
	const g = p.giro ?? [0, 0, 0];
	const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(g[0] * GRAU, g[1] * GRAU, g[2] * GRAU));
	q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e.rot[0], e.rot[1], e.rot[2])));
	const v = e.visivel ? 1 : 0.0001;
	return new THREE.Matrix4().compose(
		new THREE.Vector3(pos[0] + e.desloc[0], pos[1] + e.desloc[1], pos[2] + e.desloc[2]),
		q,
		new THREE.Vector3(e.escala[0] * v, e.escala[1] * v, e.escala[2] * v),
	);
};

export const matrizRaiz = (m: MaqueteNaCena) =>
	new THREE.Matrix4().compose(
		new THREE.Vector3(...m.pos),
		new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), m.giro),
		new THREE.Vector3(m.escala, m.escala, m.escala),
	);

/** Centro da peça no sistema dela. */
const centroLocal = (p: Peca): V3 => {
	if (p.forma === 'tubo' && p.caminho?.length) {
		const n = p.caminho.length;
		const s = p.caminho.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]] as V3, [0, 0, 0] as V3);
		return [s[0] / n, s[1] / n, s[2] / n];
	}
	return [0, 0, 0];
};

/** Acha a peça "nome" ou "maquete.nome" entre as maquetes da cena. */
export const acharPeca = (maquetes: MaqueteNaCena[], nome: string): {m: MaqueteNaCena; p: Peca} | null => {
	const [a, b] = nome.includes('.') ? nome.split('.', 2) : [undefined, nome];
	for (const m of maquetes) {
		if (a !== undefined && a !== m.id && a !== m.modelo) continue;
		const p = m.pecas.find((x) => x.id === b);
		if (p) return {m, p};
	}
	return null;
};

/** Ponto no mundo do centro da peça (ou da maquete inteira, se o nome for o id dela). */
export const pontoDaPeca = (cena: CenaTempo, linha: LinhaDoTempo, nome: string, t: number): V3 | null => {
	const maquetes = maquetesDaCena(cena, linha);
	const inteira = maquetes.find((m) => m.id === nome || m.modelo === nome);
	if (inteira) {
		const alto = Math.max(0.2, ...inteira.pecas.filter((p) => !p.pai).map((p) => (p.pos?.[1] ?? 0) + alturaDaPeca(p) / 2));
		return [inteira.pos[0], inteira.pos[1] + (alto / 2) * inteira.escala, inteira.pos[2]];
	}
	const achada = acharPeca(maquetes, nome);
	if (!achada) return null;
	const {m} = achada;
	let mat = new THREE.Matrix4();
	// sobe pela cadeia de mães
	let atual: Peca | undefined = achada.p;
	const cadeia: Peca[] = [];
	while (atual && cadeia.length < 20) {
		cadeia.unshift(atual);
		atual = atual.pai ? m.pecas.find((x) => x.id === atual!.pai) : undefined;
	}
	mat = matrizRaiz(m);
	for (const p of cadeia) mat.multiply(matrizLocal(m, p, cena.animacoes, t));
	const c = new THREE.Vector3(...centroLocal(achada.p)).applyMatrix4(mat);
	return [c.x, c.y, c.z];
};
