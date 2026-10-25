// Câmera: transforma o plano do roteiro (tipo, alvo, lado, movimento) em posição, ponto de
// mira e lente a cada instante, enquadrando para vídeo vertical (9:16). Se outro personagem
// tapar a lente, a câmera gira em volta do assunto até achar um ângulo livre. Efeitos de
// tremor e soco de zoom e os passos do gigante entram por cima.
import {CENARIOS} from '../catalogo';
import type {CenaTempo, PlanoTempo} from '../roteiro/tipos';
import {V3, add3, clamp, easeInOut, frenteDe, len3, lerp, lerp3, mul3, norm3, ruido, smoothstep, sub3} from '../util/mat';
import {SimulacaoCena, olhosGigante} from './simulacao';

export interface Camera {
	pos: V3;
	alvo: V3;
	/** campo de visão vertical em graus */
	fov: number;
	rolar: number;
}

interface Enquadramento {
	/** altura visível na distância do assunto */
	vis: number;
	fov: number;
	/** onde o rosto fica na tela, de cima (0) para baixo (1) */
	rosto: number;
	/** câmera acima do rosto (positivo = de cima para baixo) */
	alt: number;
}

const ENQ: Record<string, Enquadramento> = {
	close: {vis: 1.85, fov: 36, rosto: 0.42, alt: 0.06},
	medio: {vis: 3.4, fov: 42, rosto: 0.38, alt: 0.2},
	americano: {vis: 4.8, fov: 45, rosto: 0.36, alt: 0.35},
	aberto: {vis: 7.6, fov: 48, rosto: 0.36, alt: 0.9},
	nuca: {vis: 2.4, fov: 46, rosto: 0.42, alt: 0.15},
};

const ELEV: Record<string, {vis: number; fov: number; elev: number}> = {
	geral: {vis: 18, fov: 50, elev: 0.42},
	detalhe: {vis: 2.6, fov: 40, elev: 0.68},
	drone: {vis: 24, fov: 52, elev: 0.95},
};

const LADO: Record<string, number> = {
	frente: 0,
	tres_quartos_direita: 0.72,
	direita: Math.PI / 2,
	costas: Math.PI,
	esquerda: -Math.PI / 2,
	tres_quartos_esquerda: -0.72,
};

const UP: V3 = [0, 1, 0];

/** O rosto do gigante é ~2,3 vezes o de um boneco: um close nele precisa caber os dois olhos. */
const CABECA_GIGANTE = 2.3;

/** Desvios de lado tentados, em ordem, quando alguém tapa o assunto. */
const DESVIOS = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35];

/** Planos que olham o assunto de fora e por isso podem ser tapados por outro personagem. */
const DESVIA = new Set(['close', 'medio', 'americano', 'aberto', 'detalhe', 'baixo']);

/** Valor da grade [de, ate] cujo f fica mais perto de `meta` (o menor, se vários chegam lá). */
const buscar = (f: (x: number) => number, meta: number, de: number, ate: number, passos = 48) => {
	let melhor = de;
	let erro = Infinity;
	for (let i = 0; i <= passos; i++) {
		const x = lerp(de, ate, i / passos);
		const e = Math.abs(f(x) - meta);
		if (e < erro - 1e-4) {
			erro = e;
			melhor = x;
		}
	}
	return melhor;
};

/**
 * Por cima do ombro, em quadro vertical: só um pedaço da cabeça (enorme) aparece num canto de
 * baixo e o alvo fica no alto do quadro. Acha a altura e o desvio lateral da câmera que separam
 * os dois na tela. Alvo baixo e perto demais (um objeto no chão) não tem como: devolve null e
 * quem chamou usa a visão do personagem.
 */
const sobreOmbro = (cab: V3, alvo: V3, lado: number, escala: number) => {
	const dx = alvo[0] - cab[0];
	const dz = alvo[2] - cab[2];
	const L = Math.max(0.6, Math.hypot(dx, dz));
	const frente: V3 = [dx / L, 0, dz / L];
	const direita: V3 = [-frente[2], 0, frente[0]];
	const recuo = 3.0 * escala;
	const desnivel = cab[1] - alvo[1];
	const META_V = 0.28;
	const sepV = (h: number) => Math.atan(h / recuo) - Math.atan((h + desnivel) / (recuo + L));
	const u = buscar(sepV, META_V, -0.2 * escala, 2.4 * escala);
	if (sepV(u) < META_V * 0.6) return null;
	const s = buscar((x) => Math.atan(x / recuo) - Math.atan(x / (recuo + L)), 0.24, 0.15 * escala, 2.2 * escala);
	const pos = add3(cab, add3(mul3(frente, -recuo), add3(mul3(direita, s * lado), mul3(UP, u))));
	const paraCab = norm3(sub3(cab, pos));
	const paraAlvo = norm3(sub3(alvo, pos));
	const eixo = norm3(add3(mul3(paraCab, 0.32), mul3(paraAlvo, 0.68)));
	return {pos, mira: add3(pos, mul3(eixo, 5))};
};

/** Cenários com uma frente (+z): planos em pontos e peças olham de frente, não a partir do personagem. */
const FRENTE_FIXA = new Set(['estudio', 'oficina']);

/** Limite da câmera por cenário (esconderijo: precisa ficar dentro da toca). */
const LIMITES: Record<string, (p: V3, plano: PlanoTempo) => V3> = {
	// cabine: a parede fica a ±1,7 m do eixo; a câmera nunca passa de ±1,3 m nem do teto e do chão
	cabine: (p) => [clamp(p[0], -1.3, 1.3), clamp(p[1], 0.25, 1.65), clamp(p[2], -12.6, 12.6)],
	// estúdio: dentro do fundo curvo (raio 8,5 em volta de z = 1,5)
	estudio: (p) => {
		const dx = p[0];
		const dz = p[2] - 1.5;
		const n = Math.hypot(dx, dz);
		const k = n > 7.6 ? 7.6 / n : 1;
		return [dx * k, clamp(p[1], 0.2, 8), 1.5 + dz * k];
	},
	// oficina: entre as paredes e na frente da parede de tijolo
	oficina: (p) => [clamp(p[0], -4.3, 4.3), clamp(p[1], 0.2, 4.2), Math.max(p[2], -2.75)],
	raizes: (p, plano) => {
		if (plano.tipo === 'pov') return p;
		const centro: V3 = [0, 1.35, 0.25];
		const d = sub3(p, centro);
		const n = len3(d);
		const raio = 2.0;
		return n > raio ? add3(centro, mul3(d, raio / n)) : p;
	},
};

const pontoDoCenario = (cena: CenaTempo, nome: string): V3 | null => {
	const def = CENARIOS[cena.cenario];
	const p = def?.pontos?.[nome];
	if (p) return p;
	const m = def?.marcas[nome];
	return m ? [m[0], 1.7, m[1]] : null;
};

/** Esferas que cobrem o corpo de um personagem (para saber se ele tapa a lente). */
const esferasDoAtor = (sim: SimulacaoCena, id: string, t: number): {c: V3; r: number}[] => {
	const ator = sim.atores.get(id);
	if (!ator) return [];
	const est = sim.estado(id, t);
	if (est?.tipo === 'gigante') {
		const olhos = olhosGigante(est);
		if (est.soOlhos) return [{c: olhos, r: 1.0 * est.escala}];
		const corpo: V3 = [lerp(est.x, olhos[0], 0.5), olhos[1] * 0.6, lerp(est.z, olhos[2], 0.5)];
		return [
			{c: olhos, r: 1.5 * est.escala},
			{c: corpo, r: 2.3 * est.escala},
		];
	}
	const cab = sim.rosto(id, t);
	const [x, z] = sim.posicao(id, t);
	return [
		{c: cab, r: 0.5 * ator.escala},
		{c: [lerp(x, cab[0], 0.6), cab[1] * 0.6, lerp(z, cab[2], 0.6)], r: 0.42 * ator.escala},
	];
};

/**
 * A esfera fica na frente do assunto (mais perto da lente que ele) e invade o miolo do quadro,
 * um cone de meia abertura `folga` (rad) em volta da linha câmera → assunto?
 */
const tapa = (cam: V3, ponto: V3, e: {c: V3; r: number}, folga: number) => {
	const d = sub3(ponto, cam);
	const L = len3(d);
	if (L < 1e-3) return false;
	const rel = sub3(e.c, cam);
	const dc = len3(rel);
	if (dc < e.r) return true;
	const proj = (rel[0] * d[0] + rel[1] * d[1] + rel[2] * d[2]) / L;
	if (proj < 0.02 * L || proj > 0.92 * L) return false;
	const ang = Math.acos(clamp(proj / dc, -1, 1));
	return ang - Math.asin(Math.min(1, e.r / dc)) < folga;
};

export const cameraNoTempo = (cena: CenaTempo, sim: SimulacaoCena, t: number): Camera => {
	const idx = Math.max(0, cena.planos.findIndex((p) => t >= p.ini && t < p.fim));
	const plano = cena.planos[idx] ?? cena.planos[cena.planos.length - 1];
	const dur = Math.max(0.3, plano.fim - plano.ini);
	const k = plano.intensidade ?? 1;
	const t0 = plano.ini;
	const ehAtor = (a: unknown): a is string => typeof a === 'string' && sim.atores.has(a);
	const alvoNome = plano.alvo ?? Object.keys(cena.personagens)[0];
	const tipo = plano.tipo;
	const acompanha = plano.movimento === 'acompanhar';

	// ponto do assunto (rosto, se for personagem) no começo do plano
	const assunto = (tt: number): V3 => sim.ponto(alvoNome ?? null, tt) ?? [0, 1.5, 0];
	const a0 = assunto(t0);

	// direção de onde a câmera olha (yaw do lado), relativa à frente do personagem; no close e
	// no médio vale para onde o rosto aponta (cabeça virada conta), nos outros, o corpo
	let yawAssunto = ehAtor(alvoNome) ? sim.yaw(alvoNome, t0) : 0;
	const est0 = ehAtor(alvoNome) ? sim.estado(alvoNome, t0) : null;
	if (est0?.tipo === 'palito' && (tipo === 'close' || tipo === 'medio')) {
		yawAssunto += est0.pose.torcer + est0.pose.cabYaw * (tipo === 'close' ? 0.9 : 0.5);
	}
	const ladoPadrao = idx % 2 === 0 ? 0.35 : -0.35;
	const angBase = plano.lado !== undefined ? (LADO[plano.lado] ?? 0) : ladoPadrao;

	// alvo sem frente (ponto ou objeto) e sem lado: olha a partir do personagem principal
	let dirPonto: [number, number] | null = null;
	if (!ehAtor(alvoNome) && plano.lado === undefined && !FRENTE_FIXA.has(cena.cenario)) {
		const quem = Object.keys(cena.personagens).find((id) => !sim.atores.get(id)?.gigante);
		if (quem) {
			const [px, pz] = sim.posicao(quem, t0);
			const dx = px - a0[0];
			const dz = pz - a0[2];
			const n = Math.hypot(dx, dz);
			// detalhe: do outro lado do objeto (o personagem fica atrás dele, não na frente da lente)
			const sinal = tipo === 'detalhe' ? -1 : 1;
			if (n > 0.3) dirPonto = [(sinal * dx) / n, (sinal * dz) / n];
		}
	}

	/** Quadro do plano no instante tt, com a câmera girada `desvio` em volta do assunto. */
	const quadro = (tt: number, desvio: number): {pos: V3; alvo: V3; fov: number} => {
		const u = easeInOut((tt - plano.ini) / dur);
		const aT = assunto(tt);
		const base = acompanha ? aT : a0;
		let angLado = angBase + desvio;
		if (plano.movimento === 'orbitar') angLado += lerp(-0.4, 0.4, u) * k;
		let dirCam = frenteDe(yawAssunto - angLado);
		if (dirPonto) {
			const c = Math.cos(desvio);
			const s = Math.sin(desvio);
			dirCam = [dirPonto[0] * c - dirPonto[1] * s, dirPonto[0] * s + dirPonto[1] * c];
		}

		if (plano.camera !== undefined) {
			const c = Array.isArray(plano.camera) ? plano.camera : (pontoDoCenario(cena, plano.camera) ?? [0, 2, 10]);
			const ap = plano.movimento === 'aproximar' ? 0.3 * k * u : plano.movimento === 'afastar' ? -0.2 * k * u : 0;
			return {pos: lerp3(c, aT, ap), alvo: aT, fov: ELEV[tipo]?.fov ?? ENQ[tipo]?.fov ?? 45};
		}

		if (tipo === 'ombro' || tipo === 'pov' || tipo === 'nuca') {
			const quem = ehAtor(alvoNome) ? alvoNome : Object.keys(cena.personagens)[0];
			const cab = sim.rosto(quem, acompanha ? tt : t0);
			const outro = plano.alvo2 !== undefined ? sim.ponto(plano.alvo2, tt) : null;
			const yawQ = sim.yaw(quem, t0);
			const frente = outro ? norm3([outro[0] - cab[0], 0, outro[2] - cab[2]]) : ([frenteDe(yawQ)[0], 0, frenteDe(yawQ)[1]] as V3);
			const direita: V3 = [-frente[2], 0, frente[0]];
			const lado = plano.lado === 'esquerda' || plano.lado === 'tres_quartos_esquerda' ? -1 : 1;
			const zoom = plano.movimento === 'aproximar' ? lerp(1, 1 - 0.15 * k, u) : 1;
			if (tipo === 'ombro') {
				const escala = sim.atores.get(quem)?.escala ?? 1;
				const c = sobreOmbro(cab, outro ?? add3(cab, add3(mul3(frente, 5), [0, -0.3, 0])), lado, escala);
				if (c) return {pos: c.pos, alvo: c.mira, fov: 46 * zoom};
			}
			if (tipo === 'nuca') {
				return {
					pos: add3(cab, add3(mul3(frente, -1.25), add3(mul3(direita, 0.2 * lado), mul3(UP, 0.18)))),
					alvo: outro ?? add3(cab, mul3(frente, 4)),
					fov: ENQ.nuca.fov * zoom,
				};
			}
			// visão do personagem (também quando o por cima do ombro não tem como funcionar)
			const pos = add3(sim.rosto(quem, tt), mul3(frente, 0.3));
			return {pos, alvo: outro ?? add3(pos, mul3(frente, 5)), fov: 58 * zoom};
		}

		if (tipo === 'baixo') {
			const altRosto = Math.max(1.5, aT[1]);
			const d = lerp(0.95, 0.75, altRosto > 5 ? 1 : 0) * altRosto;
			let pos: V3 = [base[0] + dirCam[0] * d, 0.32, base[2] + dirCam[1] * d];
			if (plano.movimento === 'subir') pos = add3(pos, [0, lerp(0, 0.5, u) * k, 0]);
			return {pos, alvo: [aT[0], aT[1] * 0.92, aT[2]], fov: 64};
		}

		const el = ELEV[tipo];
		if (el) {
			let elev = el.elev;
			// detalhe: o tamanho do que precisa caber vem do cenário, quando ele diz
			const tamanho = tipo === 'detalhe' && typeof alvoNome === 'string' ? CENARIOS[cena.cenario]?.tamanhos?.[alvoNome] : undefined;
			// tamanho do plano = largura do que precisa caber no quadro vertical (com folga nas bordas)
			const vis = plano.tamanho !== undefined ? plano.tamanho * 1.9 : (tamanho ?? el.vis);
			let dist = vis / 2 / Math.tan((el.fov * Math.PI) / 360);
			const foco: V3 = tipo === 'detalhe' ? base : [base[0], ehAtor(alvoNome) ? base[1] * 0.45 : base[1], base[2]];
			if (plano.movimento === 'descer' || (tipo === 'drone' && plano.movimento === undefined)) {
				elev = lerp(1.15, 0.32, u);
				dist *= lerp(1.25, 0.42, u);
			} else if (plano.movimento === 'aproximar') dist *= lerp(1 + 0.25 * k, 1 - 0.2 * k, u);
			else if (plano.movimento === 'afastar') dist *= lerp(1 - 0.15 * k, 1 + 0.3 * k, u);
			const dir: V3 = [dirCam[0] * Math.cos(elev), Math.sin(elev), dirCam[1] * Math.cos(elev)];
			if (plano.movimento === 'panoramica' && plano.alvo2 !== undefined) {
				const b = sim.ponto(plano.alvo2, tt) ?? foco;
				return {pos: add3(lerp3(foco, b, 0.5), mul3(dir, dist)), alvo: lerp3(foco, b, u), fov: el.fov};
			}
			return {pos: add3(foco, mul3(dir, dist)), alvo: foco, fov: el.fov};
		}

		const e = ENQ[tipo] ?? ENQ.medio;
		let d = e.vis / 2 / Math.tan((e.fov * Math.PI) / 360);
		if (plano.movimento === 'aproximar') d *= lerp(1 + 0.25 * k, 1 - 0.15 * k, u);
		else if (plano.movimento === 'afastar') d *= lerp(1 - 0.15 * k, 1 + 0.3 * k, u);
		// tamanho do personagem (não a altura atual do rosto: sentado ou agachado o quadro é o mesmo)
		const ator = ehAtor(alvoNome) ? sim.atores.get(alvoNome)! : undefined;
		const esc = Math.max(0.6, Math.min(ator ? ator.escala * (ator.gigante ? CABECA_GIGANTE : 1) : 1, 12));
		const visEsc = e.vis * esc;
		const dd = d * esc;
		let altura = base[1] + e.alt * esc;
		// rosto virado para o chão: a câmera desce para continuar vendo o rosto (e não o cocuruto)
		if (est0?.tipo === 'palito' && (tipo === 'close' || tipo === 'medio')) {
			altura -= dd * Math.sin(clamp(est0.pose.incl + est0.pose.cabPitch - 0.2, 0, 0.6)) * 0.7;
		}
		if (plano.movimento === 'subir') altura += lerp(-0.4, 1.2, u) * k * (visEsc / 3.4);
		if (plano.movimento === 'descer') altura += lerp(1.2, -0.3, u) * k * (visEsc / 3.4);
		// dois personagens: centraliza entre eles e afasta para caberem
		let centro: V3 = base;
		let extra = 0;
		if (plano.alvo2 !== undefined && tipo !== 'close') {
			const b = sim.ponto(plano.alvo2, acompanha ? tt : t0);
			if (b) {
				centro = lerp3(base, b, 0.5);
				const lateral = Math.abs((b[0] - base[0]) * dirCam[1] - (b[2] - base[2]) * dirCam[0]);
				extra = Math.max(0, (lateral + 1.2) / (2 * Math.tan((e.fov * Math.PI) / 360) * (9 / 16)) - dd) * 0.9;
			}
		}
		const dist = dd + extra;
		const alvoRosto: V3 = acompanha ? aT : lerp3(a0, aT, 0.85);
		const centroAlvo: V3 = plano.alvo2 !== undefined && tipo !== 'close' ? lerp3(alvoRosto, centro, 0.5) : alvoRosto;
		return {
			pos: [centro[0] + dirCam[0] * dist, altura, centro[2] + dirCam[1] * dist],
			alvo: [centroAlvo[0], centroAlvo[1] - (0.5 - e.rosto) * visEsc, centroAlvo[2]],
			fov: e.fov,
		};
	};

	// alguém na frente da lente (no começo ou no meio do plano)? gira até achar um ângulo livre
	let desvio = 0;
	if (DESVIA.has(tipo) && plano.camera === undefined) {
		const outros = [...sim.atores.keys()].filter((id) => id !== alvoNome && id !== plano.alvo2);
		const livre = (dv: number) =>
			[t0, t0 + dur / 2].every((tt) => {
				const q = quadro(tt, dv);
				const ponto = assunto(tt);
				// miolo = 60% da meia largura do quadro vertical
				const folga = 0.6 * Math.atan(Math.tan((q.fov * Math.PI) / 360) * (9 / 16));
				return outros.every((id) => esferasDoAtor(sim, id, tt).every((e) => !tapa(q.pos, ponto, e, folga)));
			});
		desvio = DESVIOS.find(livre) ?? 0;
	}
	let {pos, alvo, fov} = quadro(t, desvio);

	// câmera na mão: respiração leve, mais forte no tremer
	const mao = plano.movimento === 'tremer' ? 0.05 * k : 0.012;
	const dist = len3(sub3(pos, alvo));
	const amp = mao * Math.sqrt(Math.max(dist, 0.5));
	pos = add3(pos, [amp * ruido(t * 0.9, 1), amp * 0.7 * ruido(t * 0.8, 2), amp * ruido(t * 0.7, 3)]);
	alvo = add3(alvo, [amp * 0.6 * ruido(t * 1.1, 4), amp * 0.5 * ruido(t, 5), 0]);
	let rolar = 0.004 * ruido(t * 0.6, 6) + (plano.movimento === 'tremer' ? 0.02 * k * ruido(t * 9, 7) : 0);

	// efeitos de câmera
	for (const ef of cena.efeitos) {
		if (t < ef.ini || t > ef.fim + 0.6) continue;
		const intens = ef.intensidade ?? 1;
		if (ef.efeito === 'tremor') {
			const env = smoothstep(ef.ini, ef.ini + 0.05, t) * (1 - smoothstep(ef.fim - 0.15, ef.fim + 0.3, t));
			const a = 0.09 * intens * env;
			pos = add3(pos, [a * Math.sin(t * 61), a * Math.sin(t * 73 + 1), a * Math.sin(t * 57 + 2)]);
			rolar += 0.025 * intens * env * Math.sin(t * 47);
		}
		if (ef.efeito === 'zoom_soco') {
			const x = t - ef.ini;
			const bump = x < 0.08 ? smoothstep(0, 0.08, x) : Math.exp(-(x - 0.08) * 4.5);
			fov *= 1 - 0.2 * intens * bump;
		}
	}
	for (const p of sim.passosGigante) {
		const x = t - p.t;
		if (x < 0 || x > 0.7) continue;
		const d = Math.hypot(p.pos[0] - pos[0], p.pos[2] - pos[2]);
		const a = 0.12 * Math.exp(-x * 7) * clamp(1 - d / 30);
		pos = add3(pos, [a * Math.sin(t * 67), a * Math.sin(t * 79 + 1), 0]);
		rolar += 0.02 * Math.exp(-x * 7) * clamp(1 - d / 30) * Math.sin(t * 53);
	}

	// limite do cenário: perto demais da parede, aproxima e abre a lente para manter o quadro
	const lim = LIMITES[cena.cenario];
	if (lim) {
		const antes = len3(sub3(pos, alvo));
		const novo = lim(pos, plano);
		const depois = len3(sub3(novo, alvo));
		if (depois < antes - 1e-3 && depois > 0.05) {
			fov = Math.min(80, (2 * Math.atan((Math.tan((fov * Math.PI) / 360) * antes) / depois) * 180) / Math.PI);
		}
		pos = novo;
	}
	if (pos[1] < 0.12) pos[1] = 0.12;
	return {pos, alvo, fov, rolar};
};

/** Instante em que o plano atual começou e como ele entra (corte, flash, preto). */
export const transicaoNoTempo = (cena: CenaTempo, t: number) => {
	const plano = cena.planos.find((p) => t >= p.ini && t < p.fim);
	if (!plano || !plano.transicao || plano.transicao === 'corte') return null;
	return {tipo: plano.transicao, desde: t - plano.ini};
};

export const tipoDoPlano = (cena: CenaTempo, t: number) => (cena.planos.find((p) => t >= p.ini && t < p.fim) ?? cena.planos[0])?.tipo;
