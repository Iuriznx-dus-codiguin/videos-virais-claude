// Pose do boneco palito: todos os ângulos e alturas que o componente 3D precisa para um quadro.
// As poses do catálogo são parciais e se misturam por peso (cada camada puxa os valores que
// define para o seu alvo), na ordem: estado do corpo, locomoção, gestos, fala, tremor, rosto.
import {clamp, lerp} from '../util/mat';

// medidas do boneco (altura 1): quadril a 1.19 do chão, cabeça com centro a 2.66
export const MEDIDAS = {
	quadril: 1.19,
	coluna: 1.07,
	pescocoCabeca: 0.4,
	raioCabeca: 0.42,
	ombroY: 0.9,
	ombroX: 0.04,
	braco: 0.46,
	antebraco: 0.44,
	coxa: 0.58,
	canela: 0.57,
	quadrilX: 0.085,
	tornozelo: 0.07,
};

export interface Pose {
	altQuadril: number;
	/** deslocamento do quadril para a frente/lado no espaço do corpo (sustos, recuos) */
	avanco: number;
	lateral: number;
	incl: number;
	rolar: number;
	torcer: number;
	cabPitch: number;
	cabYaw: number;
	cabRoll: number;
	ombroE: number;
	abreE: number;
	giroE: number;
	cotovE: number;
	ombroD: number;
	abreD: number;
	giroD: number;
	cotovD: number;
	/** alvo do tornozelo em relação ao quadril, no plano do corpo (z para a frente, y para cima) */
	peEz: number;
	peEy: number;
	peDz: number;
	peDy: number;
	abrePernas: number;
	// rosto
	olho: number;
	olhoY: number;
	olhoAssim: number;
	pupX: number;
	pupY: number;
	sobY: number;
	sobAng: number;
	sobAssim: number;
	bocaCurva: number;
	bocaAbre: number;
	bocaLarg: number;
	/** 1 = olhos abertos, 0 = fechados */
	palpebra: number;
	/** balanço de cabelo, rabo de cavalo e pontas da bandana */
	balanco: number;
}

export type PoseParcial = Partial<Pose>;

export const chaoPe = (altQuadril: number) => -(altQuadril - MEDIDAS.tornozelo);

export const poseNeutra = (): Pose => ({
	altQuadril: MEDIDAS.quadril,
	avanco: 0,
	lateral: 0,
	incl: 0.02,
	rolar: 0,
	torcer: 0,
	cabPitch: 0,
	cabYaw: 0,
	cabRoll: 0,
	ombroE: 0.05,
	abreE: 0.13,
	giroE: 0,
	cotovE: 0.18,
	ombroD: 0.05,
	abreD: 0.13,
	giroD: 0,
	cotovD: 0.18,
	peEz: 0.02,
	peEy: chaoPe(MEDIDAS.quadril),
	peDz: -0.02,
	peDy: chaoPe(MEDIDAS.quadril),
	abrePernas: 0.03,
	olho: 1,
	olhoY: 1,
	olhoAssim: 0,
	pupX: 0,
	pupY: 0,
	sobY: 0,
	sobAng: 0,
	sobAssim: 0,
	bocaCurva: 0.12,
	bocaAbre: 0,
	bocaLarg: 1,
	palpebra: 1,
	balanco: 0,
});

/** Puxa os valores de `p` para os de `alvo` com peso w (0 a 1). */
export const misturar = (p: Pose, alvo: PoseParcial, w: number) => {
	if (w <= 0) return p;
	const k = Math.min(1, w);
	for (const chave in alvo) {
		const c = chave as keyof Pose;
		p[c] = lerp(p[c], alvo[c] as number, k);
	}
	return p;
};

/** Soma deslocamentos (para tremores e gestos da fala). */
export const somar = (p: Pose, delta: PoseParcial, w = 1) => {
	for (const chave in delta) {
		const c = chave as keyof Pose;
		p[c] += (delta[c] as number) * w;
	}
	return p;
};

// --- poses de corpo (estados) --------------------------------------------------

// agachado = ajoelhado num joelho só (lê melhor que cócoras no boneco de palito): pé esquerdo
// plantado na frente, joelho direito no chão e o antebraço esquerdo apoiado no joelho
const agachado: PoseParcial = {
	altQuadril: 0.62,
	incl: 0.3,
	peEz: 0.34,
	peEy: chaoPe(0.62),
	peDz: -0.42,
	peDy: chaoPe(0.62),
	abrePernas: 0.1,
	cabPitch: 0.22,
	ombroE: 0.8,
	abreE: 0.12,
	giroE: -0.3,
	cotovE: 0.95,
	ombroD: 0.22,
	abreD: 0.2,
	cotovD: 0.4,
};

const escondido: PoseParcial = {
	altQuadril: 0.52,
	incl: 0.72,
	peEz: 0.22,
	peEy: chaoPe(0.52),
	peDz: 0.12,
	peDy: chaoPe(0.52),
	abrePernas: 0.08,
	cabPitch: -0.25,
	ombroE: 0.95,
	abreE: 0.18,
	giroE: -0.5,
	cotovE: 1.7,
	ombroD: 0.95,
	abreD: 0.18,
	giroD: 0.5,
	cotovD: 1.7,
};

const sentado: PoseParcial = {
	altQuadril: 0.36,
	incl: -0.12,
	peEz: 0.78,
	peEy: chaoPe(0.36),
	peDz: 0.7,
	peDy: chaoPe(0.36),
	abrePernas: 0.12,
	cabPitch: 0.08,
	ombroE: 0.95,
	abreE: 0.32,
	giroE: -0.2,
	cotovE: 0.55,
	ombroD: 0.95,
	abreD: 0.32,
	giroD: 0.2,
	cotovD: 0.55,
};

/** Sentado num banco de avião, joelhos dobrados e pés no chão. Feito para personagem com
 * escala ~0,55 na cabine (o assento fica a 0,45 m): o quadril sem escala fica a 0,82. */
const sentadoBanco: PoseParcial = {
	altQuadril: 0.82,
	incl: -0.1,
	peEz: 0.55,
	peEy: chaoPe(0.82),
	peDz: 0.5,
	peDy: chaoPe(0.82),
	abrePernas: 0.1,
	cabPitch: 0.05,
	ombroE: 0.95,
	abreE: 0.28,
	giroE: -0.2,
	cotovE: 0.9,
	ombroD: 0.95,
	abreD: 0.28,
	giroD: 0.2,
	cotovD: 0.9,
};

const medo: PoseParcial = {
	altQuadril: 1.1,
	incl: 0.14,
	peEz: 0.12,
	peEy: chaoPe(1.1),
	peDz: -0.1,
	peDy: chaoPe(1.1),
	abrePernas: 0.07,
	cabPitch: 0.1,
	ombroE: 0.85,
	abreE: 0.3,
	giroE: -0.9,
	cotovE: 1.85,
	ombroD: 0.85,
	abreD: 0.3,
	giroD: 0.9,
	cotovD: 1.85,
};

const maosNaCabeca: PoseParcial = {
	ombroE: 2.45,
	abreE: 0.85,
	giroE: -0.5,
	cotovE: 2.25,
	ombroD: 2.45,
	abreD: 0.85,
	giroD: 0.5,
	cotovD: 2.25,
	cabPitch: -0.05,
};

const bracosCruzados: PoseParcial = {
	ombroE: 0.55,
	abreE: 0.08,
	giroE: -1.25,
	cotovE: 1.95,
	ombroD: 0.6,
	abreD: 0.08,
	giroD: 1.25,
	cotovD: 1.9,
	incl: -0.03,
};

/** Poses de corpo que um personagem pode ter no começo da cena ou por uma ação de estado. */
export const POSES_CORPO: Record<string, PoseParcial> = {
	em_pe: {},
	agachado,
	agachar: agachado,
	escondido,
	esconder: escondido,
	sentado,
	sentar: sentado,
	sentado_banco: sentadoBanco,
	medo,
	maos_na_cabeca: maosNaCabeca,
	bracos_cruzados: bracosCruzados,
	falar: {},
	erguer: {},
};

// --- expressões -------------------------------------------------------------------

type Rosto = Pick<Pose, 'olho' | 'olhoY' | 'olhoAssim' | 'sobY' | 'sobAng' | 'sobAssim' | 'bocaCurva' | 'bocaAbre' | 'bocaLarg'>;

const rosto = (r: Partial<Rosto>): Rosto => ({
	olho: 1,
	olhoY: 1,
	olhoAssim: 0,
	sobY: 0,
	sobAng: 0,
	sobAssim: 0,
	bocaCurva: 0.12,
	bocaAbre: 0,
	bocaLarg: 1,
	...r,
});

/** sobAng > 0 levanta a ponta de dentro da sobrancelha (tristeza, medo); < 0 abaixa (raiva). */
export const EXPRESSAO: Record<string, Rosto> = {
	neutro: rosto({}),
	feliz: rosto({olhoY: 0.82, sobY: 0.02, bocaCurva: 0.85, bocaAbre: 0.28, bocaLarg: 1.15}),
	triste: rosto({olhoY: 0.85, sobY: -0.005, sobAng: 0.42, bocaCurva: -0.6, bocaLarg: 0.85}),
	medo: rosto({olho: 1.22, olhoY: 1.08, sobY: 0.045, sobAng: 0.48, bocaCurva: -0.45, bocaAbre: 0.22, bocaLarg: 0.8}),
	surpreso: rosto({olho: 1.28, olhoY: 1.12, sobY: 0.075, sobAng: 0.12, bocaCurva: 0, bocaAbre: 0.55, bocaLarg: 0.62}),
	bravo: rosto({olhoY: 0.78, sobY: -0.03, sobAng: -0.55, bocaCurva: -0.5, bocaAbre: 0.05}),
	desconfiado: rosto({olhoY: 0.62, olhoAssim: 0.35, sobY: -0.02, sobAng: -0.18, sobAssim: 0.6, bocaCurva: -0.2, bocaLarg: 0.8}),
	cansado: rosto({olhoY: 0.52, sobY: -0.025, sobAng: 0.18, bocaCurva: -0.22, bocaLarg: 0.9}),
	determinado: rosto({olhoY: 0.86, sobY: -0.02, sobAng: -0.32, bocaCurva: 0.28, bocaLarg: 0.95}),
	aliviado: rosto({olhoY: 0.7, sobY: 0.02, sobAng: 0.25, bocaCurva: 0.55, bocaAbre: 0.08}),
	serio: rosto({olhoY: 0.9, sobY: -0.01, sobAng: -0.14, bocaCurva: -0.12, bocaLarg: 0.88}),
	nervoso: rosto({olho: 1.08, sobY: 0.03, sobAng: 0.4, bocaCurva: 0.55, bocaLarg: 1.05, olhoAssim: 0.1}),
};

// --- boca pelas letras da fala -----------------------------------------------------------

/** Abertura da boca por letra (português). Vogais abertas abrem mais; m, b e p fecham. */
export const ABERTURA_LETRA = (c: string): {abre: number; larg: number} => {
	switch (c) {
		case 'a':
		case 'á':
		case 'à':
		case 'â':
		case 'ã':
			return {abre: 1, larg: 1.05};
		case 'o':
		case 'ó':
		case 'ô':
		case 'õ':
			return {abre: 0.8, larg: 0.62};
		case 'e':
		case 'é':
		case 'ê':
			return {abre: 0.68, larg: 1.12};
		case 'u':
		case 'ú':
			return {abre: 0.45, larg: 0.5};
		case 'i':
		case 'í':
			return {abre: 0.38, larg: 1.2};
		case 'm':
		case 'b':
		case 'p':
			return {abre: 0, larg: 0.95};
		case 'f':
		case 'v':
			return {abre: 0.14, larg: 1};
		default:
			return {abre: 0.3, larg: 1};
	}
};

export interface LetraT {
	c: string;
	ini: number;
	fim: number;
}

/** Abertura e largura da boca no instante t, suavizada para a mandíbula não tremer. */
export const bocaFalando = (letras: LetraT[], t: number): {abre: number; larg: number} => {
	if (!letras.length || t < letras[0].ini - 0.1 || t > letras[letras.length - 1].fim + 0.15) return {abre: 0, larg: 1};
	const amostra = (x: number) => {
		// busca binária da letra que contém x
		let a = 0;
		let b = letras.length - 1;
		while (a < b) {
			const m = (a + b + 1) >> 1;
			if (letras[m].ini <= x) a = m;
			else b = m - 1;
		}
		const l = letras[a];
		if (x < l.ini || x > l.fim + 0.04) return {abre: 0, larg: 1};
		return ABERTURA_LETRA(l.c);
	};
	let abre = 0;
	let larg = 0;
	const offs = [-0.06, -0.03, 0, 0.03];
	for (const o of offs) {
		const v = amostra(t + o);
		abre += v.abre;
		larg += v.larg;
	}
	return {abre: clamp(abre / offs.length), larg: larg / offs.length};
};

// --- pernas: cinemática inversa no plano do corpo ------------------------------------------

/**
 * Ângulos de coxa e joelho para o tornozelo chegar em (dz, dy) a partir do quadril.
 * coxa > 0 leva a perna para a frente; joelho > 0 dobra a canela para trás.
 */
export const ikPerna = (dz: number, dy: number, l1 = MEDIDAS.coxa, l2 = MEDIDAS.canela): {coxa: number; joelho: number} => {
	const dMax = l1 + l2 - 1e-4;
	let d = Math.hypot(dz, dy);
	const dMin = Math.abs(l1 - l2) + 0.05;
	d = clamp(d, dMin, dMax);
	const phi = Math.atan2(dz, -dy);
	const interno = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
	const beta = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
	return {coxa: phi + beta, joelho: Math.PI - interno};
};

/** Direção (no espaço do tronco) → ângulos do ombro com o braço esticado nessa direção. */
export const mirarBraco = (dir: [number, number, number], lado: 1 | -1): {ombro: number; abre: number} => {
	const n = Math.hypot(dir[0], dir[1], dir[2]) || 1;
	const dx = dir[0] / n;
	const dy = dir[1] / n;
	const dz = dir[2] / n;
	return {ombro: Math.atan2(dz, -dy), abre: lado * Math.asin(clamp(dx, -1, 1))};
};
