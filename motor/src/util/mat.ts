// Funções numéricas puras usadas pela animação e pela câmera (tudo é função do tempo t).

export type V2 = [number, number];
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
export const easeIn = (t: number) => clamp(t) ** 3;
/** Sobe e volta: 0 → 1 → 0 dentro de [0, 1], com subida em `sobe` e descida em `desce` (frações). */
export const envelope = (p: number, sobe = 0.2, desce = 0.25) =>
	p <= 0 || p >= 1 ? 0 : Math.min(smoothstep(0, sobe, p), 1 - smoothstep(1 - desce, 1, p));

/** Ângulo equivalente em (-π, π]. */
export const normAng = (a: number) => {
	a = (a + Math.PI) % (2 * Math.PI);
	if (a < 0) a += 2 * Math.PI;
	return a - Math.PI;
};
export const lerpAng = (a: number, b: number, t: number) => a + normAng(b - a) * t;

export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm3 = (a: V3): V3 => {
	const l = len3(a) || 1;
	return [a[0] / l, a[1] / l, a[2] / l];
};
export const dist2 = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Direção no chão para um ângulo de yaw (0 = olhando para +z). */
export const frenteDe = (yaw: number): V2 => [Math.sin(yaw), Math.cos(yaw)];
/** Yaw que aponta de `de` para `para` no plano do chão. */
export const yawPara = (de: V2, para: V2) => Math.atan2(para[0] - de[0], para[1] - de[1]);

/** Gerador pseudoaleatório determinístico (mulberry32): o mesmo número de semente dá a mesma sequência. */
export const aleatorio = (semente: number) => {
	let s = semente >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

export const hashTexto = (s: string) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
};

/** Ruído suave em 1D (soma de senos com fases fixas), entre -1 e 1. */
export const ruido = (t: number, semente = 0) =>
	(Math.sin(t * 1.31 + semente * 12.9898) * 0.5 +
		Math.sin(t * 2.17 + semente * 78.233 + 1.3) * 0.3 +
		Math.sin(t * 3.73 + semente * 37.719 + 2.1) * 0.2);
