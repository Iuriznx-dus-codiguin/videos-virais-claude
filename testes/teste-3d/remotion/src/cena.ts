// Linha do tempo da cena de teste. Espelho exato de blender/cena.py:
// qualquer mudança aqui precisa ser feita lá também, para as duas versões baterem.
import dados from '../../cena.json';

export const D = dados;
export const C = dados.cores;
const P = dados.personagem;

export type V3 = [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const smoothstep = (a: number, b: number, x: number) => {
	const t = clamp((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => {
	t = clamp(t);
	return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
};
export const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;

export const posX = (t: number) => {
	const {freia_em: tb, freio: db, velocidade: v, x0} = P;
	if (t <= tb) return x0 + v * t;
	if (t <= tb + db) {
		const dt = t - tb;
		return x0 + v * tb + v * (dt - (dt * dt) / (2 * db));
	}
	return x0 + v * tb + (v * db) / 2;
};

export const velFator = (t: number) => {
	const {freia_em: tb, freio: db} = P;
	if (t <= tb) return 1;
	if (t <= tb + db) return 1 - (t - tb) / db;
	return 0;
};

export const fase = (t: number) => 2 * Math.PI * P.ciclos_por_unidade * (posX(t) - P.x0);

export interface Pose {
	raiz: V3;
	yaw: number;
	incl: number;
	cabPitch: number;
	cabYaw: number;
	coxaE: number;
	coxaD: number;
	joelhoE: number;
	joelhoD: number;
	ombroE: number;
	ombroD: number;
	cotov: number;
	abre: number;
	pisc: number;
	olho: number;
	sobY: number;
	sobAng: number;
	bocaL: number;
	bocaA: number;
	band: number;
}

export const pose = (t: number): Pose => {
	const a = velFator(t);
	const ph = fase(t);
	const s = Math.sin(ph);
	const c = Math.cos(ph);
	const baixo = smoothstep(5.75, 6.25, t) * (1 - smoothstep(7.15, 7.35, t));
	const susto = smoothstep(7.2, 7.4, t);
	const recuo = smoothstep(9.0, 9.35, t);
	const y = 1.19 - 0.08 * a * s * s - 0.1 * baixo - 0.06 * susto - 0.04 * recuo;
	const tremor: V3 = [
		0.012 * susto * Math.sin(61 * t),
		0.008 * susto * Math.sin(47 * t + 1),
		0.012 * susto * Math.sin(53 * t + 2),
	];
	let pisc = 1;
	for (const tp of D.piscadas) {
		const d = Math.abs(t - tp);
		if (d < 0.09) pisc = Math.min(pisc, Math.max(0.1, d / 0.09));
	}
	return {
		raiz: [posX(t) + tremor[0], y + tremor[1], P.z + 0.3 * recuo + tremor[2]],
		yaw: Math.PI / 2 + 0.95 * susto,
		incl: 0.07 * a + 0.22 * baixo - 0.08 * susto - 0.06 * recuo,
		cabPitch: 0.03 * a * Math.sin(2 * ph) + 0.42 * baixo - 0.08 * susto,
		cabYaw: 0.5 * susto,
		coxaE: 0.45 * a * s + 0.15 * baixo + 0.1 * susto,
		coxaD: -0.45 * a * s + 0.15 * baixo + 0.1 * susto,
		joelhoE: a * (0.1 + 0.85 * Math.max(0, c)) + 0.32 * baixo + 0.2 * susto,
		joelhoD: a * (0.1 + 0.85 * Math.max(0, -c)) + 0.32 * baixo + 0.2 * susto,
		ombroE: lerp(-0.5 * a * s, 0.6 + 0.2 * recuo, susto) + 0.05 * baixo,
		ombroD: lerp(0.5 * a * s, 0.6 + 0.2 * recuo, susto) + 0.05 * baixo,
		cotov: lerp(0.3 + 0.25 * a, 1.25 - 0.1 * recuo, susto),
		abre: lerp(0.12 + 0.05 * baixo, 0.22 + 0.06 * recuo, susto) + 0.03 * susto * Math.sin(55 * t),
		pisc,
		olho: 1 + 0.35 * susto,
		sobY: 0.17 + 0.05 * susto,
		sobAng: 0.22 * baixo + 0.35 * susto,
		bocaL: lerp(0.11, 0.075, Math.max(baixo, susto)),
		bocaA: 0.022 + 0.025 * baixo * (1 - susto) + 0.1 * susto,
		band: 0.35 + 0.25 * a * Math.sin(2 * ph) + 0.12 * susto * Math.sin(30 * t),
	};
};

/** Posição, alvo e campo de visão vertical (graus) da câmera no instante t. */
export const camera = (t: number): {pos: V3; alvo: V3; fov: number} => {
	if (t < 5.8) {
		const x = posX(t);
		const e = easeInOut(t / 2.6);
		const dp = lerp3([6, 15, 40], [-1.0, 3.0, 11.5], e);
		const da = lerp3([0, 0.5, 0], [x + 0.3, 1.4, 3.5], e);
		const tp: V3 = [x + 2.7, 1.95, P.z + 4.4];
		const ta: V3 = [x + 0.2, 1.55, P.z];
		const w = smoothstep(1.6, 2.8, t);
		const pos = lerp3(dp, tp, w);
		const alvo = lerp3(da, ta, w);
		pos[0] += 0.03 * Math.sin(1.7 * t) * w;
		pos[1] += 0.02 * Math.sin(2.3 * t + 1) * w;
		return {pos, alvo, fov: lerp(55, 50, w)};
	}
	if (t < 7.2) {
		const e = easeInOut((t - 5.8) / 1.4);
		return {pos: lerp3([-2.4, 5.8, 6.8], [-1.7, 5.1, 6.1], e), alvo: [1.6, 0.5, 3.6], fov: 48};
	}
	if (t < 8.4) {
		const e = easeOut((t - 7.2) / 1.2);
		return {pos: lerp3([1.35, 2.85, -0.3], [1.08, 2.72, 1.2], e), alvo: [0.92, 2.6, 3.55], fov: lerp(46, 40, e)};
	}
	const o = D.olhos;
	if (t < 9.1) {
		const e = easeInOut((t - 8.4) / 0.7);
		return {
			pos: lerp3([1.15, 3.6, 7.6], [1.25, 3.45, 7.1], e),
			alvo: lerp3([2.4, 1.7, -6.0], [2.75, 1.5, -7.4], e),
			fov: lerp(42, 38, e),
		};
	}
	const e = easeOut((t - 9.1) / 0.9);
	const pos = lerp3([o.x, o.y + 0.2, o.z + 6.2], [o.x, o.y + 0.12, o.z + 4.8], e);
	const k = Math.max(0, 1 - (t - 9.1) / 0.5);
	pos[0] += 0.04 * k * Math.sin(70 * t);
	pos[1] += 0.04 * k * Math.sin(83 * t);
	return {pos, alvo: [o.x, o.y, o.z], fov: 36};
};

/** Pegadas gigantes: [x, z, yaw]. */
export const pegadasGigantes = (): V3[] => {
	const g = D.pegadas_gigantes;
	const [x0, z0] = g.de;
	const [x1, z1] = g.ate;
	const dx = x1 - x0;
	const dz = z1 - z0;
	const comp = Math.hypot(dx, dz);
	const ux = dx / comp;
	const uz = dz / comp;
	const yaw = Math.atan2(ux, uz);
	const res: V3[] = [];
	for (let i = 0; i < Math.floor(comp / g.passo) + 1; i++) {
		const lado = g.lado * (i % 2 ? 1 : -1);
		res.push([x0 + ux * g.passo * i - uz * lado, z0 + uz * g.passo * i + ux * lado, yaw]);
	}
	return res;
};

/** Pegadas do Léo: [x, z, posição x do Léo a partir da qual a pegada aparece]. */
export const pegadasLeo = (): V3[] => {
	const ciclo = 1 / P.ciclos_por_unidade;
	const parada = posX(D.duracao);
	const res: V3[] = [];
	for (let k = -4; k < 40; k++) {
		const x = P.x0 + (0.25 + 0.5 * k) * ciclo + 0.45;
		if (x > parada + 0.45) break;
		if (x < -12) continue;
		res.push([x, P.z + (k % 2 === 0 ? -0.17 : 0.17), x - 0.45]);
	}
	return res;
};
