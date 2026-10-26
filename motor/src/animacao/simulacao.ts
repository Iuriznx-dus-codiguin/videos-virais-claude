// Simulação de uma cena: a partir das ações resolvidas, calcula onde cada personagem está,
// para onde olha e qual pose faz em qualquer instante t. É tudo determinístico e sem estado
// entre quadros: cada quadro pode ser desenhado sozinho, em qualquer ordem (o Remotion
// renderiza em paralelo).
import {ACOES, CENARIOS} from '../catalogo';
import type {AcaoTempo, Alvo, CenaTempo, FalaTempo, LinhaDoTempo, Lugar, PersonagemBiblia} from '../roteiro/tipos';
import {
	V2,
	V3,
	aleatorio,
	clamp,
	dist2,
	easeInOut,
	envelope,
	frenteDe,
	hashTexto,
	lerp,
	lerpAng,
	normAng,
	ruido,
	smoothstep,
	yawPara,
} from '../util/mat';
import {
	EXPRESSAO,
	MEDIDAS,
	POSES_CORPO,
	Pose,
	bocaFalando,
	chaoPe,
	ikPerna,
	mirarBraco,
	misturar,
	poseNeutra,
	somar,
} from './pose';
import {centroCabeca, matrizTronco, ombroMundo, paraTronco} from './rig';
import {pontoDaPeca} from './maquete';

// --- locomoção ------------------------------------------------------------------

interface DefPasso {
	vmax: number;
	acel: number;
	freio: number;
	/** distância percorrida em um ciclo completo (dois passos) */
	ciclo: number;
	/** fração do ciclo com o pé no chão */
	apoio: number;
	elevacao: number;
}

const PASSOS: Record<string, DefPasso> = {
	andar: {vmax: 1.7, acel: 0.35, freio: 0.45, ciclo: 1.35, apoio: 0.6, elevacao: 0.12},
	correr: {vmax: 4.2, acel: 0.3, freio: 0.4, ciclo: 2.9, apoio: 0.38, elevacao: 0.26},
	recuar: {vmax: 1.0, acel: 0.3, freio: 0.4, ciclo: 1.1, apoio: 0.62, elevacao: 0.08},
	mancar: {vmax: 0.9, acel: 0.4, freio: 0.45, ciclo: 1.0, apoio: 0.62, elevacao: 0.09},
	gigante: {vmax: 2.6, acel: 0.6, freio: 0.8, ciclo: 7.0, apoio: 0.6, elevacao: 1.1},
};

interface Segmento {
	t0: number;
	t1: number;
	de: V2;
	para: V2;
	tipo: string;
	def: DefPasso;
	vmax: number;
	acel: number;
	freio: number;
	dist: number;
	/** fase acumulada (em ciclos) no início do segmento */
	fase0: number;
}

/** Perfil trapezoidal: acelera, anda em velocidade constante e freia. */
const perfil = (dist: number, vmax: number, acel: number, freio: number) => {
	const rampas = (vmax * (acel + freio)) / 2;
	if (dist >= rampas) return {vmax, acel, freio, total: acel + (dist - rampas) / vmax + freio};
	const k = Math.sqrt(dist / Math.max(rampas, 1e-6));
	return {vmax: vmax * k, acel: acel * k, freio: freio * k, total: (acel + freio) * k};
};

const distanciaNoSegmento = (s: Segmento, t: number) => {
	const tau = clamp(t - s.t0, 0, s.t1 - s.t0);
	const {vmax: v, acel: a, freio: f} = s;
	const cruzeiro = s.t1 - s.t0 - a - f;
	if (tau < a) return (v * tau * tau) / (2 * a);
	if (tau < a + cruzeiro) return (v * a) / 2 + v * (tau - a);
	const r = tau - a - cruzeiro;
	return Math.min(s.dist, (v * a) / 2 + v * cruzeiro + v * r - (v * r * r) / (2 * f));
};

const velocidadeNoSegmento = (s: Segmento, t: number) => {
	const tau = t - s.t0;
	if (tau <= 0 || t >= s.t1) return 0;
	const cruzeiro = s.t1 - s.t0 - s.acel - s.freio;
	if (tau < s.acel) return (s.vmax * tau) / s.acel;
	if (tau < s.acel + cruzeiro) return s.vmax;
	return s.vmax * Math.max(0, 1 - (tau - s.acel - cruzeiro) / s.freio);
};

// --- cadeias de valores (mudam em instantes e fazem transição suave) ---------------

interface Chave<T> {
	t: number;
	valor: T;
	dur: number;
}

const amostrarAngulo = (chaves: Chave<number>[], t: number): number => {
	let atual = chaves[0].valor;
	let partida = atual;
	for (let i = 1; i < chaves.length; i++) {
		const k = chaves[i];
		if (k.t > t) break;
		// valor no instante em que esta chave começa (a anterior pode estar no meio da transição)
		const ant = chaves[i - 1];
		const noInicio = i === 1 ? ant.valor : lerpAng(partida, ant.valor, easeInOut((k.t - ant.t) / Math.max(ant.dur, 1e-3)));
		partida = noInicio;
		atual = lerpAng(partida, k.valor, easeInOut((t - k.t) / Math.max(k.dur, 1e-3)));
	}
	return normAng(atual);
};

// --- tipos públicos ------------------------------------------------------------------

export interface EstadoPalito {
	tipo: 'palito';
	id: string;
	x: number;
	z: number;
	yaw: number;
	escala: number;
	pose: Pose;
	segura?: string;
	/** 0 a 1: lanterna/tocha acesa */
	luz: number;
	bib: PersonagemBiblia;
	/** 0 a 1: quanto está se movendo (para o balanço de acessórios) */
	movendo: number;
}

export interface EstadoGigante {
	tipo: 'gigante';
	id: string;
	x: number;
	z: number;
	yaw: number;
	escala: number;
	/** 0 = agachado atrás do mato, 1 = em pé */
	altura: number;
	/** fase dos passos em ciclos e quanto está andando (0 a 1) */
	fase: number;
	andando: number;
	olhos: number;
	brilho: number;
	rugido: number;
	/** tremida do corpo enquanto ruge */
	agito: number;
	olharYaw: number;
	olharPitch: number;
	soOlhos: boolean;
	pontoOlhos?: V3;
	bib: PersonagemBiblia;
}

export type EstadoAtor = EstadoPalito | EstadoGigante;

interface Camada {
	nome: string;
	ini: number;
	fim: number;
	sobe: number;
	desce: number;
}

interface Ator {
	id: string;
	gigante: boolean;
	bib: PersonagemBiblia;
	escala: number;
	inicio: V2;
	segs: Segmento[];
	yaws: Chave<number>[];
	olhares: {t: number; alvo: Alvo | null}[];
	expressoes: {t: number; nome: string}[];
	estados: Camada[];
	gestos: AcaoTempo[];
	modificadores: AcaoTempo[];
	falas: FalaTempo[];
	olhos: {t: number; aberto: boolean}[];
	luzes: {t: number; acesa: boolean}[];
	alturas: {t: number; dur: number; valor: number}[];
	/** o que está na mão direita a partir de cada instante (pegar e largar mudam) */
	itens: {t: number; item?: string}[];
	/** perna machucada (tala): 1 = esquerda, -1 = direita, 0 = nenhuma */
	manca: number;
	piscadas: number[];
	soOlhos: boolean;
	pontoOlhos?: V3;
	semente: number;
}

const ALTURA_OBJETO: Record<string, number> = {
	fogueira: 0.25,
	sos: 0,
	pegadas_gigantes: 0,
	tronco: 0.35,
	lanterna: 0.1,
	riscos: 1.3,
	caixote: 0.4,
	garrafa: 0.15,
	mantimentos: 0.12,
	radio: 0.25,
	mascaras: 1.3,
};

/** Quanto o item troca de mão depois do início de pegar/largar (o roteiro sincroniza o objeto com isso). */
export const TROCA_ITEM = 0.5;

export class SimulacaoCena {
	readonly atores = new Map<string, Ator>();
	/** instantes em que um pé do gigante bate no chão (para som e tremor da câmera) */
	readonly passosGigante: {t: number; pos: V3; quem: string}[] = [];

	constructor(
		readonly cena: CenaTempo,
		readonly linha: LinhaDoTempo,
	) {
		const def = CENARIOS[cena.cenario];
		for (const [id, pc] of Object.entries(cena.personagens)) {
			const bib = linha.personagens[id] ?? {nome: id};
			const gigante = bib.tipo === 'gigante';
			const soOlhos = gigante && pc.pose === 'so_olhos';
			const pontoOlhos = soOlhos && typeof pc.em === 'string' ? def?.pontos?.[pc.em] : undefined;
			this.atores.set(id, {
				id,
				gigante,
				bib,
				escala: (pc.escala ?? 1) * (gigante ? 1 : (bib.visual?.altura ?? 1)),
				inicio: this.lugar(pc.em),
				segs: [],
				yaws: [],
				olhares: [{t: -1e9, alvo: pc.olhando ?? null}],
				expressoes: [{t: -1e9, nome: pc.expressao ?? 'neutro'}],
				estados: [],
				gestos: [],
				modificadores: [],
				falas: linha.falas.filter((f) => f.quem === id && !f.off && f.fim > cena.ini && f.ini < cena.fim),
				olhos: [{t: -1e9, aberto: !pc.olhos_fechados}],
				luzes: [{t: -1e9, acesa: false}],
				alturas: [{t: -1e9, dur: 0, valor: pc.pose === 'agachado' ? 0 : 1}],
				itens: [{t: -1e9, item: pc.segura}],
				manca: ladoTala(bib),
				piscadas: [],
				soOlhos,
				pontoOlhos,
				semente: hashTexto(`${cena.id}:${id}`),
			});
		}
		this.montarMovimentos();
		this.montarCamadas();
		this.montarYaws();
		this.montarPiscadas();
		this.montarPassosGigante();
	}

	// --- lugares e alvos ---------------------------------------------------------------

	lugar(l: Lugar | Alvo | undefined): V2 {
		if (l === undefined) return [0, 0];
		if (Array.isArray(l)) return l.length === 3 ? [l[0], l[2]] : [l[0], l[1]];
		const def = CENARIOS[this.cena.cenario];
		const m = def?.marcas[l];
		if (m) return m;
		const p = def?.pontos?.[l];
		if (p) return [p[0], p[2]];
		const o = this.objeto(l);
		if (o) return [o[0], o[2]];
		return [0, 0];
	}

	objeto(nome: string): V3 | undefined {
		const o = this.cena.objetos.find((ob) => ob.id === nome || ob.tipo === nome || (ob.tipo === 'maquete' && ob.modelo === nome));
		if (!o) return undefined;
		if (o.tipo === 'maquete') return pontoDaPeca(this.cena, this.linha, String(o.id ?? o.modelo), 0) ?? undefined;
		const [x, z] = Array.isArray(o.em) ? (o.em as V2) : (CENARIOS[this.cena.cenario]?.marcas[o.em] ?? [0, 0]);
		return [x, ALTURA_OBJETO[o.tipo] ?? 0.3, z];
	}

	/** Ponto 3D de um alvo no instante t (rosto, se for personagem). */
	ponto(alvo: Alvo | null | undefined, t: number, camera?: V3, paraMirar = false): V3 | null {
		if (alvo === null || alvo === undefined) return null;
		if (Array.isArray(alvo)) return alvo;
		if (alvo === 'camera') return camera ?? null;
		if (this.atores.has(alvo)) {
			const r = this.rosto(alvo, t);
			if (paraMirar && !this.atores.get(alvo)!.gigante) {
				const [x, z] = this.posicao(alvo, t);
				return [x, 1.85 * this.atores.get(alvo)!.escala, z];
			}
			return r;
		}
		const def = CENARIOS[this.cena.cenario];
		const p = def?.pontos?.[alvo];
		if (p) return p;
		const m = def?.marcas[alvo];
		if (m) return [m[0], 1.0, m[1]];
		const peca = pontoDaPeca(this.cena, this.linha, alvo, t);
		if (peca) return peca;
		return this.objeto(alvo) ?? null;
	}

	// --- movimentos -------------------------------------------------------------------------

	private montarMovimentos() {
		const movs = this.cena.acoes.filter((a) => a.faz && ACOES[a.faz]?.tipo === 'movimento' && this.atores.has(a.quem));
		movs.sort((a, b) => a.ini - b.ini);
		for (const a of movs) {
			const ator = this.atores.get(a.quem)!;
			const t0 = a.ini;
			// segmento anterior em andamento termina aqui
			const ant = ator.segs[ator.segs.length - 1];
			if (ant && ant.t1 > t0) {
				const d = distanciaNoSegmento(ant, t0);
				const k = ant.dist > 0 ? d / ant.dist : 1;
				ant.para = [lerp(ant.de[0], ant.para[0], k), lerp(ant.de[1], ant.para[1], k)];
				ant.dist = d;
				ant.t1 = t0;
			}
			const de = this.posicao(a.quem, t0);
			let para: V2;
			const alvo = a.para;
			if (typeof alvo === 'string' && this.atores.has(alvo)) {
				// para perto de outro personagem, sem encostar
				const pos = this.posicao(alvo, t0);
				const d = dist2(de, pos);
				const parar = Math.min(0.95, d);
				para = d > 1e-3 ? [pos[0] + ((de[0] - pos[0]) / d) * parar, pos[1] + ((de[1] - pos[1]) / d) * parar] : pos;
			} else if (alvo !== undefined) para = this.lugar(alvo);
			else {
				// recuar sem destino: 1.2 para trás
				const f = frenteDe(this.yawBase(ator, t0));
				para = [de[0] - f[0] * 1.2, de[1] - f[1] * 1.2];
			}
			const tipo = ator.gigante ? 'gigante' : (a.faz as string);
			const defP = PASSOS[tipo] ?? PASSOS.andar;
			const mult = a.velocidade ?? 1;
			const dist = dist2(de, para);
			if (dist < 0.02) continue;
			const pf = perfil(dist, defP.vmax * mult * (ator.gigante ? ator.escala : 1), defP.acel, defP.freio);
			const fase0 = this.fase(ator, t0);
			ator.segs.push({t0, t1: t0 + pf.total, de, para, tipo, def: defP, vmax: pf.vmax, acel: pf.acel, freio: pf.freio, dist, fase0});
		}
	}

	private segmentoEm(ator: Ator, t: number) {
		let s: Segmento | undefined;
		for (const seg of ator.segs) {
			if (seg.t0 <= t) s = seg;
			else break;
		}
		return s;
	}

	posicao(id: string, t: number): V2 {
		const ator = this.atores.get(id);
		if (!ator) return [0, 0];
		const s = this.segmentoEm(ator, t);
		if (!s) return ator.inicio;
		const d = distanciaNoSegmento(s, t);
		const k = s.dist > 0 ? d / s.dist : 1;
		return [lerp(s.de[0], s.para[0], k), lerp(s.de[1], s.para[1], k)];
	}

	private fase(ator: Ator, t: number) {
		const s = this.segmentoEm(ator, t);
		if (!s) return 0;
		return s.fase0 + distanciaNoSegmento(s, t) / (s.def.ciclo * (ator.gigante ? ator.escala : 1) * Math.sqrt(s.vmax / s.def.vmax || 1));
	}

	private movimento(ator: Ator, t: number) {
		const s = this.segmentoEm(ator, t);
		if (!s || t >= s.t1) return {s, fator: 0, vel: 0};
		const vel = velocidadeNoSegmento(s, t);
		return {s, fator: clamp(vel / Math.max(s.def.vmax * 0.35, 1e-3)), vel};
	}

	// --- camadas de pose, olhar, expressão ------------------------------------------------------

	private montarCamadas() {
		const pcs = this.cena.personagens;
		for (const ator of this.atores.values()) {
			const minhas = this.cena.acoes.filter((a) => a.quem === ator.id);
			const pc = pcs[ator.id];
			// pose inicial dura até a primeira ação que muda o corpo
			const poseIni = pc.pose && pc.pose !== 'em_pe' && !ator.gigante ? pc.pose : undefined;
			if (poseIni) {
				const fimIni = minhas
					.filter((a) => a.faz && (ACOES[a.faz]?.tipo === 'estado' || ACOES[a.faz]?.tipo === 'movimento' || a.faz === 'levantar'))
					.map((a) => a.ini)
					.reduce((m, x) => Math.min(m, x), this.cena.fim + 10);
				ator.estados.push({nome: poseIni, ini: -1e9, fim: fimIni, sobe: 0.01, desce: 0.55});
			}
			for (const a of minhas) {
				if (a.olhar !== undefined) ator.olhares.push({t: a.ini, alvo: a.olhar});
				if (a.expressao) ator.expressoes.push({t: a.ini, nome: a.expressao});
				if (!a.faz) continue;
				const tipo = ACOES[a.faz]?.tipo;
				if (tipo === 'estado') {
					// quem encerra o estado define a velocidade da saída (levantar é mais lento)
					const encerra = minhas.find((o) => o.ini >= a.fim - 1e-3 && o.ini <= a.fim + 1e-3 && o !== a);
					ator.estados.push({
						nome: a.faz,
						ini: a.ini,
						fim: a.fim,
						sobe: a.faz === 'sentar' ? 0.7 : 0.35,
						desce: encerra?.faz === 'levantar' ? 0.6 : 0.3,
					});
					if (a.faz === 'erguer') ator.gestos.push(a);
				} else if (tipo === 'gesto') {
					if (a.faz === 'acender' || a.faz === 'apagar') ator.luzes.push({t: a.ini + 0.15, acesa: a.faz === 'acender'});
					else if (a.faz === 'abrir_olhos' || a.faz === 'fechar_olhos') ator.olhos.push({t: a.ini, aberto: a.faz === 'abrir_olhos'});
					else if (a.faz === 'levantar_gigante') ator.alturas.push({t: a.ini, dur: a.fim - a.ini, valor: 1});
					else {
						ator.gestos.push(a);
						if (a.faz === 'pegar') {
							ator.itens.push({t: a.ini + TROCA_ITEM, item: a.item});
							if (a.acesa) ator.luzes.push({t: a.ini + TROCA_ITEM, acesa: true});
						}
						if (a.faz === 'largar') ator.itens.push({t: a.ini + TROCA_ITEM, item: undefined});
					}
				} else if (tipo === 'modificador') ator.modificadores.push(a);
			}
			ator.olhares.sort((a, b) => a.t - b.t);
			ator.expressoes.sort((a, b) => a.t - b.t);
			ator.luzes.sort((a, b) => a.t - b.t);
			ator.olhos.sort((a, b) => a.t - b.t);
			ator.itens.sort((a, b) => a.t - b.t);
		}
	}

	private olharEm(ator: Ator, t: number) {
		let atual = ator.olhares[0];
		let anterior = ator.olhares[0];
		for (const o of ator.olhares) {
			if (o.t <= t) {
				anterior = atual;
				atual = o;
			} else break;
		}
		return {atual, anterior, w: smoothstep(atual.t, atual.t + 0.35, t)};
	}

	/** Yaw do corpo sem movimento (para recuar sem destino). */
	private yawBase(ator: Ator, t: number) {
		if (!ator.yaws.length) {
			const alvo = this.ponto(ator.olhares[0].alvo, this.cena.ini);
			return alvo ? yawPara(ator.inicio, [alvo[0], alvo[2]]) : 0;
		}
		return amostrarAngulo(ator.yaws, t);
	}

	private montarYaws() {
		// primeiro todos os yaws iniciais (olhar para outro personagem usa a posição dele)
		for (const ator of this.atores.values()) {
			const alvo = this.ponto(ator.olhares[0].alvo, this.cena.ini);
			const y0 = alvo ? yawPara(ator.inicio, [alvo[0], alvo[2]]) : 0;
			ator.yaws = [{t: -1e9, valor: y0, dur: 0}];
		}
		for (const ator of this.atores.values()) {
			const eventos: {t: number; f: () => Chave<number> | null}[] = [];
			for (const s of ator.segs) {
				const recua = s.tipo === 'recuar';
				const dir = yawPara(s.de, s.para) + (recua ? Math.PI : 0);
				eventos.push({t: s.t0, f: () => ({t: s.t0, valor: dir, dur: ator.gigante ? 0.8 : 0.25})});
				eventos.push({
					t: s.t1,
					f: () => {
						// ao chegar, vira para onde está olhando
						const o = this.olharEm(ator, s.t1).atual.alvo;
						const p = this.ponto(o, s.t1);
						if (!p) return null;
						return {t: s.t1, valor: yawPara(s.para, [p[0], p[2]]), dur: 0.5};
					},
				});
			}
			for (const g of ator.gestos) {
				if (!g.para) continue;
				eventos.push({
					t: g.ini,
					f: () => {
						const p = this.ponto(g.para, g.ini);
						if (!p) return null;
						const pos = this.posicao(ator.id, g.ini);
						const alvoYaw = yawPara(pos, [p[0], p[2]]);
						const atual = amostrarAngulo(ator.yaws, g.ini);
						const dif = normAng(alvoYaw - atual);
						if (g.faz === 'virar') return {t: g.ini, valor: alvoYaw, dur: Math.max(0.3, g.fim - g.ini)};
						if (Math.abs(dif) < 0.9) return null;
						return {t: g.ini, valor: atual + dif * 0.8, dur: 0.45};
					},
				});
			}
			for (const o of ator.olhares.slice(1)) {
				eventos.push({
					t: o.t,
					f: () => {
						if (this.movimento(ator, o.t).fator > 0.2) return null;
						const p = this.ponto(o.alvo, o.t);
						if (!p) return null;
						const pos = this.posicao(ator.id, o.t);
						const alvoYaw = yawPara(pos, [p[0], p[2]]);
						const atual = amostrarAngulo(ator.yaws, o.t);
						const dif = normAng(alvoYaw - atual);
						// a cabeça vira até ~65°; além disso o corpo acompanha
						if (Math.abs(dif) < 1.15) return null;
						return {t: o.t, valor: alvoYaw - Math.sign(dif) * 0.35, dur: ator.gigante ? 1.0 : 0.6};
					},
				});
			}
			eventos.sort((a, b) => a.t - b.t);
			for (const ev of eventos) {
				const k = ev.f();
				if (k) ator.yaws.push(k);
			}
		}
	}

	private montarPiscadas() {
		for (const ator of this.atores.values()) {
			const r = aleatorio(ator.semente);
			let t = this.cena.ini + 0.4 + r() * 1.5;
			while (t < this.cena.fim + 1) {
				ator.piscadas.push(t);
				t += 1.8 + r() * 2.6;
			}
			for (const g of ator.gestos) if (g.faz === 'susto') ator.piscadas.push(g.ini + 0.02);
			for (const e of ator.expressoes.slice(1)) ator.piscadas.push(e.t);
			ator.piscadas.sort((a, b) => a - b);
		}
	}

	private montarPassosGigante() {
		for (const ator of this.atores.values()) {
			if (!ator.gigante) continue;
			for (const s of ator.segs) {
				let antes = this.fase(ator, s.t0);
				for (let t = s.t0 + 1 / 120; t <= s.t1; t += 1 / 120) {
					const f = this.fase(ator, t);
					// pé esquerdo pousa na fase inteira, o direito na meia fase
					for (const off of [0, 0.5]) {
						if (Math.floor(antes - off) !== Math.floor(f - off)) {
							const [x, z] = this.posicao(ator.id, t);
							this.passosGigante.push({t, pos: [x, 0, z], quem: ator.id});
						}
					}
					antes = f;
				}
			}
		}
		this.passosGigante.sort((a, b) => a.t - b.t);
	}

	// --- amostragem ---------------------------------------------------------------------------

	private yawEm(ator: Ator, t: number) {
		return amostrarAngulo(ator.yaws, t);
	}

	/** Pose só com os estados do corpo, sem ruído nem passos: usada para enquadrar o rosto. */
	private poseEstavel(ator: Ator, t: number) {
		const p = poseNeutra();
		const {fator} = this.movimento(ator, t);
		for (const c of ator.estados) {
			const w = pesoCamada(c, t) * (1 - fator);
			const alvo = POSES_CORPO[c.nome];
			if (alvo) misturar(p, alvo, w);
		}
		// estender a mão inclina o corpo e leva a cabeça junto
		for (const g of ator.gestos) if (g.faz === 'estender_mao') p.incl += INCLINA_ESTENDER * pesoGesto(g, t);
		return p;
	}

	rosto(id: string, t: number): V3 {
		const ator = this.atores.get(id);
		if (!ator) return [0, 2, 0];
		const [x, z] = this.posicao(id, t);
		if (ator.gigante) {
			const g = this.estadoGigante(ator, t);
			return olhosGigante(g);
		}
		const p = this.poseEstavel(ator, t);
		const m = matrizTronco(x, z, this.yawEm(ator, t), ator.escala, p);
		return centroCabeca(m);
	}

	/** Direção do corpo (yaw) no instante t. */
	yaw(id: string, t: number) {
		const ator = this.atores.get(id);
		return ator ? this.yawEm(ator, t) : 0;
	}

	estado(id: string, t: number, camera?: V3): EstadoAtor | null {
		const ator = this.atores.get(id);
		if (!ator) return null;
		return ator.gigante ? this.estadoGigante(ator, t) : this.estadoPalito(ator, t, camera);
	}

	private estadoGigante(ator: Ator, t: number): EstadoGigante {
		const [x, z] = this.posicao(ator.id, t);
		const yaw = this.yawEm(ator, t);
		let altura = ator.alturas[0].valor;
		for (const a of ator.alturas.slice(1)) {
			if (a.t <= t) altura = lerp(altura, a.valor, easeInOut((t - a.t) / Math.max(a.dur, 1e-3)));
		}
		const {fator} = this.movimento(ator, t);
		let olhos = ator.olhos[0].aberto ? 1 : 0;
		for (const o of ator.olhos.slice(1)) if (o.t <= t) olhos = lerp(olhos, o.aberto ? 1 : 0, smoothstep(o.t, o.t + 0.25, t));
		let pisc = 1;
		for (const tp of ator.piscadas) {
			const d = Math.abs(t - tp - 0.08);
			if (d < 0.1) pisc = Math.min(pisc, d / 0.1);
		}
		let rugido = 0;
		for (const g of ator.gestos) if (g.faz === 'rugir') rugido = Math.max(rugido, envelope((t - g.ini) / (g.fim - g.ini), 0.15, 0.4));
		// olhar: cabeça vira pouco (é enorme); o resto vem do corpo
		const o = this.olharEm(ator, t);
		const base: Omit<EstadoGigante, 'olharYaw' | 'olharPitch'> = {
			tipo: 'gigante',
			id: ator.id,
			x,
			z,
			yaw,
			escala: ator.escala,
			altura,
			fase: this.fase(ator, t),
			andando: fator,
			olhos: olhos * pisc,
			brilho: 1 + 0.9 * rugido,
			rugido,
			agito: rugido * 0.05 * Math.sin(t * 43),
			soOlhos: ator.soOlhos,
			pontoOlhos: ator.pontoOlhos,
			bib: ator.bib,
		};
		const est: EstadoGigante = {...base, olharYaw: 0, olharPitch: 0};
		const olhosPos = olhosGigante(est);
		const dirDe = (alvo: Alvo | null) => {
			const p = this.ponto(alvo, t);
			if (!p) return {yaw: 0, pitch: 0};
			const dx = p[0] - olhosPos[0];
			const dy = p[1] - olhosPos[1];
			const dz = p[2] - olhosPos[2];
			return {yaw: normAng(Math.atan2(dx, dz) - yaw), pitch: Math.atan2(-dy, Math.hypot(dx, dz))};
		};
		const a = dirDe(o.atual.alvo);
		const b = dirDe(o.anterior.alvo);
		est.olharYaw = clamp(lerp(b.yaw, a.yaw, o.w), -0.6, 0.6);
		est.olharPitch = clamp(lerp(b.pitch, a.pitch, o.w), -0.5, 0.6);
		return est;
	}

	private estadoPalito(ator: Ator, t: number, camera?: V3): EstadoPalito {
		const [x, z] = this.posicao(ator.id, t);
		const yaw = this.yawEm(ator, t);
		const sem = ator.semente % 1000;
		const P = poseNeutra();
		const {s, fator} = this.movimento(ator, t);

		// respiração e microvariações (cada personagem com fase própria)
		P.incl += 0.012 * Math.sin((2 * Math.PI * t) / 3.6 + sem);
		P.altQuadril += 0.004 * Math.sin((2 * Math.PI * t) / 3.6 + sem);
		P.cabPitch += 0.025 * ruido(t * 0.55, sem);
		P.cabYaw += 0.05 * ruido(t * 0.4, sem + 1);
		P.abreE += 0.025 * ruido(t * 0.5, sem + 2);
		P.abreD += 0.025 * ruido(t * 0.5, sem + 3);

		// estados do corpo
		for (const c of ator.estados) {
			const w = pesoCamada(c, t) * (1 - fator);
			const alvo = POSES_CORPO[c.nome];
			if (alvo && w > 0) misturar(P, alvo, w);
		}

		// arrumar: as mãos se revezam pegando e ajeitando coisas no chão
		for (const c of ator.estados) {
			if (c.nome !== 'arrumar') continue;
			const w = pesoCamada(c, t) * (1 - fator);
			if (w <= 0) continue;
			const ph = 2 * Math.PI * 0.75 * (t - c.ini);
			somar(P, {
				ombroE: 0.28 * Math.sin(ph),
				ombroD: 0.28 * Math.sin(ph + Math.PI),
				cotovE: 0.25 * Math.max(0, Math.cos(ph)),
				cotovD: 0.25 * Math.max(0, -Math.cos(ph)),
				torcer: 0.08 * Math.sin(ph),
				cabYaw: 0.12 * Math.sin(ph * 0.5),
			}, w);
		}

		// locomoção
		if (s && fator > 0.001) misturar(P, ciclo(s.tipo, this.fase(ator, t), s.def, ator.manca || -1), fator);

		// olhar
		const tronco = matrizTronco(x, z, yaw, ator.escala, P);
		const direcao = (alvo: Alvo | null) => {
			const p = this.ponto(alvo, t, camera);
			if (!p) return null;
			const l = paraTronco(tronco, p);
			// relativo ao centro da cabeça, no espaço do tronco
			const dx = l[0];
			const dy = l[1] - (MEDIDAS.coluna + MEDIDAS.pescocoCabeca);
			const dz = l[2];
			let yawC = Math.atan2(dx, dz);
			// alvo muito atrás: olha para a frente
			if (Math.abs(yawC) > 1.9) return null;
			if (fator > 0.3 && Math.abs(yawC) > 1.3) return null;
			yawC = clamp(yawC, -1.15, 1.15);
			const pitch = clamp(Math.atan2(-dy, Math.hypot(dx, dz)), -0.6, 0.75);
			return {yaw: yawC, pitch};
		};
		const o = this.olharEm(ator, t);
		// gestos com alvo também puxam o olhar
		let alvoGesto: Alvo | null = null;
		let wGesto = 0;
		for (const g of ator.gestos) {
			if (!g.para || g.faz === 'virar') continue;
			const w = pesoGesto(g, t);
			if (w > wGesto) {
				wGesto = w;
				alvoGesto = g.para;
			}
		}
		const dA = direcao(o.atual.alvo);
		const dB = direcao(o.anterior.alvo);
		const dG = alvoGesto ? direcao(alvoGesto) : null;
		let olharYaw = lerp(dB?.yaw ?? 0, dA?.yaw ?? 0, o.w);
		let olharPitch = lerp(dB?.pitch ?? P.cabPitch, dA?.pitch ?? P.cabPitch, o.w);
		if (dG) {
			olharYaw = lerp(olharYaw, dG.yaw, wGesto);
			olharPitch = lerp(olharPitch, dG.pitch, wGesto);
		}
		if (dA || dB || dG) {
			// cabeça faz ~80% do giro e os olhos o resto
			P.cabYaw = olharYaw * 0.85 + P.cabYaw * 0.3;
			P.cabPitch = olharPitch * 0.85 + (P.cabPitch - poseNeutra().cabPitch) * 0.3;
			P.pupX = clamp(olharYaw * 0.15, -0.6, 0.6);
			P.pupY = clamp(-olharPitch * 0.2, -0.6, 0.6);
		}

		// gestos
		let rostoSusto = 0;
		for (const g of ator.gestos) {
			const w = pesoGesto(g, t);
			if (w <= 0) continue;
			const p = clamp((t - g.ini) / Math.max(g.fim - g.ini, 1e-3));
			let alvo = g.para !== undefined ? this.ponto(g.para, t, camera, true) : g.faz === 'erguer' ? this.ponto(o.atual.alvo, t, camera, true) : null;
			// largar sem destino: no chão, logo à frente
			if (!alvo && g.faz === 'largar') {
				const f = frenteDe(yaw);
				alvo = [x + f[0] * 0.7 * ator.escala, 0.1, z + f[1] * 0.7 * ator.escala];
			}
			switch (g.faz) {
				case 'pegar':
				case 'largar': {
					// alvo baixo: dobra o corpo e os joelhos para alcançar (quem já está ajoelhado não precisa)
					if (alvo) {
						const ajoelhado = ator.estados.reduce((m, c) => (c.nome === 'agachar' || c.nome === 'agachado' || c.nome === 'arrumar' ? Math.max(m, pesoCamada(c, t)) : m), 0);
						const baixo = clamp((0.95 * ator.escala - alvo[1]) / (0.6 * ator.escala));
						if (baixo > 0) {
							misturar(P, ABAIXAR, w * baixo * (1 - ajoelhado));
							// ajoelhado, só debruça mais para a mão chegar ao chão
							somar(P, {incl: 0.4, cabPitch: 0.1}, w * baixo * ajoelhado);
						}
						const tr = matrizTronco(x, z, yaw, ator.escala, P);
						const ombro = ombroMundo(tr, -1);
						const l = paraTronco(tr, alvo);
						const lo = paraTronco(tr, ombro);
						const mira = mirarBraco([l[0] - lo[0], l[1] - lo[1], l[2] - lo[2]], -1);
						misturar(P, {ombroD: mira.ombro, abreD: mira.abre, giroD: 0, cotovD: 0.3}, w);
					}
					break;
				}
				case 'apontar':
				case 'estender_mao':
				case 'erguer':
				case 'puxar': {
					if (g.faz === 'estender_mao') P.incl += INCLINA_ESTENDER * w;
					let alcance = 1;
					if (g.faz === 'puxar' && p > 0.45) alcance = 1 - smoothstep(0.45, 0.85, p);
					const tr = matrizTronco(x, z, yaw, ator.escala, P);
					if (alvo) {
						const ombro = ombroMundo(tr, -1);
						const l = paraTronco(tr, alvo);
						const lo = paraTronco(tr, ombro);
						const mira = mirarBraco([l[0] - lo[0], l[1] - lo[1], l[2] - lo[2]], -1);
						const cot = g.faz === 'estender_mao' ? 0.35 : g.faz === 'erguer' ? 0.3 : 0.1;
						misturar(P, {ombroD: mira.ombro, abreD: mira.abre, giroD: 0, cotovD: cot}, w * alcance);
					}
					if (g.faz === 'puxar' && p > 0.45) {
						const k = smoothstep(0.45, 0.8, p);
						misturar(P, {ombroD: 0.5, abreD: 0.25, cotovD: 1.7, incl: -0.12}, w * k);
					}
					break;
				}
				case 'acenar':
					misturar(P, {ombroD: 2.7, abreD: 0.45, giroD: 0, cotovD: 0.55 + 0.45 * Math.sin(2 * Math.PI * 3 * p)}, w);
					break;
				case 'olhar_em_volta':
					P.cabYaw += 0.85 * Math.sin(2 * Math.PI * p) * w;
					P.torcer += 0.18 * Math.sin(2 * Math.PI * p) * w;
					break;
				case 'susto': {
					const k = envelope(p, 0.12, 0.7);
					somar(P, {ombroE: 0.55, ombroD: 0.55, abreE: 0.3, abreD: 0.3, cotovE: 0.9, cotovD: 0.9, cabPitch: -0.2, avanco: -0.1, incl: -0.1}, k);
					rostoSusto = Math.max(rostoSusto, k);
					break;
				}
			}
		}

		// gestos da fala (só quem fala em cena)
		for (const f of ator.falas) {
			const w = smoothstep(f.ini - 0.15, f.ini + 0.2, t) * (1 - smoothstep(f.fim - 0.1, f.fim + 0.35, t));
			if (w <= 0) continue;
			const lado = hashTexto(f.id) % 2 ? 'E' : 'D';
			const ruidoF = ruido(t * 1.7, sem + 7);
			const gesto = lado === 'E'
				? {ombroE: 0.6 + 0.12 * ruidoF, abreE: 0.25, giroE: -0.5, cotovE: 1.3 + 0.25 * ruido(t * 2.3, sem)}
				: {ombroD: 0.6 + 0.12 * ruidoF, abreD: 0.25, giroD: 0.5, cotovD: 1.3 + 0.25 * ruido(t * 2.3, sem)};
			if (wGesto < 0.3) misturar(P, gesto, w * 0.8);
			for (const pal of f.palavras) {
				const d = t - pal.ini;
				if (d < -0.2 || d > 0.5) continue;
				const k = Math.exp(-(((d - 0.08) / 0.12) ** 2)) * w;
				P.cabPitch += (pal.enfase ? 0.1 : 0.045) * k;
				if (pal.enfase) P.sobY += 0.02 * k;
			}
		}

		// tremor
		for (const m of ator.modificadores) {
			const w = smoothstep(m.ini, m.ini + 0.3, t) * (1 - smoothstep(m.fim - 0.2, m.fim + 0.2, t));
			if (w <= 0 || m.faz !== 'tremer') continue;
			somar(P, {
				avanco: 0.008 * Math.sin(53 * t),
				lateral: 0.009 * Math.sin(61 * t + 1),
				altQuadril: 0.005 * Math.sin(71 * t),
				ombroE: 0.05 * Math.sin(47 * t),
				ombroD: 0.05 * Math.sin(43 * t + 2),
				cotovE: 0.06 * Math.sin(59 * t + 3),
				cotovD: 0.06 * Math.sin(41 * t + 1),
				cabRoll: 0.03 * Math.sin(57 * t),
			}, w);
		}

		// rosto: expressão, susto, piscadas, olhos fechados e boca
		let atual = ator.expressoes[0];
		let anterior = ator.expressoes[0];
		for (const e of ator.expressoes) {
			if (e.t <= t) {
				anterior = atual;
				atual = e;
			} else break;
		}
		const ea = EXPRESSAO[atual.nome] ?? EXPRESSAO.neutro;
		const eb = EXPRESSAO[anterior.nome] ?? EXPRESSAO.neutro;
		const we = smoothstep(atual.t, atual.t + 0.25, t);
		for (const k of Object.keys(ea) as (keyof typeof ea)[]) P[k] = lerp(eb[k], ea[k], we);
		if (rostoSusto > 0) somar(P, {olho: 0.3, olhoY: 0.12, sobY: 0.05}, rostoSusto);

		let palp = 1;
		for (const tp of ator.piscadas) {
			const d = Math.abs(t - tp - 0.07);
			if (d < 0.08) palp = Math.min(palp, d / 0.08);
		}
		let aberto = ator.olhos[0].aberto ? 1 : 0;
		for (const ol of ator.olhos.slice(1)) if (ol.t <= t) aberto = lerp(aberto, ol.aberto ? 1 : 0, smoothstep(ol.t, ol.t + 0.2, t));
		P.palpebra = Math.min(palp, aberto);

		for (const f of ator.falas) {
			if (t < f.ini - 0.1 || t > f.fim + 0.15) continue;
			const b = bocaFalando(f.letras, t);
			P.bocaAbre = Math.max(P.bocaAbre * 0.35, b.abre * 0.85);
			P.bocaLarg *= lerp(1, b.larg, clamp(b.abre * 2));
		}

		P.balanco = (s ? clamp(this.movimento(ator, t).vel / 4) : 0) + 0.12 * ruido(t * 0.9, sem + 5);

		// truque de animação: olhando para baixo, o rosto não aponta mais que ~45° para o chão
		// (continua legível na câmera) e os olhos completam o olhar
		const excesso = Math.max(0, P.incl + P.cabPitch - 0.8);
		if (excesso > 0) {
			P.cabPitch -= excesso;
			P.pupY = clamp(P.pupY - excesso * 0.5, -0.6, 0.6);
		}

		let luz = ator.luzes[0].acesa ? 1 : 0;
		for (const l of ator.luzes.slice(1)) if (l.t <= t) luz = l.acesa ? smoothstep(l.t, l.t + 0.08, t) : 1 - smoothstep(l.t, l.t + 0.08, t);

		let segura: string | undefined;
		for (const it of ator.itens) if (it.t <= t) segura = it.item;

		// pernas por cinemática inversa a partir do alvo dos pés
		return {tipo: 'palito', id: ator.id, x, z, yaw, escala: ator.escala, pose: P, segura, luz, bib: ator.bib, movendo: fator};
	}
}

/** Quanto o tronco inclina para a frente ao estender a mão. */
const INCLINA_ESTENDER = 0.18;

/** Corpo dobrado para pegar ou pôr algo no chão (joelhos flexionados, tronco para a frente). */
const ABAIXAR: Partial<Pose> = {altQuadril: 0.8, incl: 0.62, peEz: 0.3, peEy: chaoPe(0.8), peDz: -0.16, peDy: chaoPe(0.8), cabPitch: 0.22};

/** Lado da perna com tala (o acessório "tala" com "lado": "E" ou "D"; padrão direita). */
const ladoTala = (bib: PersonagemBiblia) => {
	const tala = bib.visual?.acessorios?.find((a) => a.tipo === 'tala');
	if (!tala) return 0;
	return tala.lado === 'E' ? 1 : -1;
};

const pesoCamada = (c: Camada, t: number) => smoothstep(c.ini, c.ini + c.sobe, t) * (1 - smoothstep(c.fim, c.fim + c.desce, t));

const pesoGesto = (g: AcaoTempo, t: number) => {
	if (t < g.ini || t > g.fim + 0.35) return 0;
	const dur = Math.max(g.fim - g.ini, 0.2);
	if (ACOES[g.faz ?? '']?.tipo === 'estado') return smoothstep(g.ini, g.ini + 0.35, t) * (1 - smoothstep(g.fim, g.fim + 0.35, t));
	return envelope((t - g.ini) / dur, Math.min(0.35, 0.3 / dur), Math.min(0.35, 0.35 / dur));
};

/**
 * Pose do ciclo de passos na fase `fase` (em ciclos). Mancando, a perna machucada (`ladoRuim`:
 * 1 esquerda, -1 direita) quase não dobra nem sobe, pisa rápido, e o corpo afunda e pende para
 * o lado bom enquanto ela segura o peso.
 */
const ciclo = (tipo: string, fase: number, def: DefPasso, ladoRuim = -1): Partial<Pose> => {
	const correndo = tipo === 'correr';
	const recuando = tipo === 'recuar';
	const mancando = tipo === 'mancar';
	const ph = 2 * Math.PI * fase;
	const h = correndo ? 1.03 + 0.05 * Math.abs(Math.sin(ph)) : 1.13 + 0.025 * Math.cos(2 * ph);
	const pe = (desloc: number) => {
		let u = (fase + desloc) % 1;
		if (u < 0) u += 1;
		const meio = (def.ciclo * def.apoio) / 2;
		let pz: number;
		let py = chaoPe(h);
		if (u < def.apoio) pz = lerp(meio, -meio, u / def.apoio);
		else {
			const k = (u - def.apoio) / (1 - def.apoio);
			pz = lerp(-meio, meio, easeInOut(k));
			py += def.elevacao * Math.sin(Math.PI * k);
		}
		return {z: recuando ? -pz : pz, y: py};
	};
	const e = pe(0);
	const d = pe(0.5);
	const balanco = Math.sin(ph);
	if (mancando) {
		const ruim = ladoRuim === 1 ? e : d;
		const bom = ladoRuim === 1 ? d : e;
		// a perna ruim sobe pouco (joelho duro) e a boa sobe mais para compensar
		const chao = chaoPe(1.13);
		ruim.y = chao + (ruim.y - chao) * 0.35;
		bom.y = chao + (bom.y - chao) * 1.25;
		let u = (fase + (ladoRuim === 1 ? 0 : 0.5)) % 1;
		if (u < 0) u += 1;
		const peso = u < def.apoio ? Math.sin((Math.PI * u) / def.apoio) : 0;
		return {
			altQuadril: 1.13 - 0.09 * peso,
			incl: 0.12 + 0.05 * peso,
			rolar: -ladoRuim * 0.11 * peso,
			torcer: 0.05 * balanco,
			cabRoll: ladoRuim * 0.06 * peso,
			peEz: e.z,
			peEy: e.y,
			peDz: d.z,
			peDy: d.y,
			abrePernas: 0.06,
			ombroE: -0.25 * balanco + (ladoRuim === -1 ? 0.25 * peso : 0),
			ombroD: 0.25 * balanco + (ladoRuim === 1 ? 0.25 * peso : 0),
			cotovE: 0.35,
			cotovD: 0.35,
			abreE: 0.18 + (ladoRuim === -1 ? 0.25 * peso : 0),
			abreD: 0.18 + (ladoRuim === 1 ? 0.25 * peso : 0),
		};
	}
	const bracos = correndo
		? {ombroE: -0.85 * balanco + 0.25, ombroD: 0.85 * balanco + 0.25, cotovE: 1.55, cotovD: 1.55, abreE: 0.22, abreD: 0.22, giroE: -0.3, giroD: 0.3}
		: recuando
			? {ombroE: 0.5, ombroD: 0.5, cotovE: 1.0, cotovD: 1.0, abreE: 0.25, abreD: 0.25}
			: {ombroE: -0.42 * balanco, ombroD: 0.42 * balanco, cotovE: 0.25 + 0.15 * Math.max(0, -balanco), cotovD: 0.25 + 0.15 * Math.max(0, balanco), abreE: 0.12, abreD: 0.12};
	return {
		altQuadril: h,
		incl: correndo ? 0.3 : recuando ? -0.05 : 0.07,
		torcer: (correndo ? 0.12 : 0.06) * balanco,
		peEz: e.z,
		peEy: e.y,
		peDz: d.z,
		peDy: d.y,
		abrePernas: 0.03,
		...bracos,
	};
};

/** Ângulos de coxa e joelho dos dois lados a partir dos alvos dos pés da pose. */
export const pernasDaPose = (p: Pose) => ({
	E: ikPerna(p.peEz, p.peEy),
	D: ikPerna(p.peDz, p.peDy),
});

/** Posição dos olhos do gigante (centro entre os dois) no mundo. */
export const olhosGigante = (g: EstadoGigante | Omit<EstadoGigante, 'olharYaw' | 'olharPitch'>): V3 => {
	if (g.soOlhos && g.pontoOlhos) return g.pontoOlhos;
	const r = corpoGigante(g.altura);
	const f = frenteDe(g.yaw);
	const e = g.escala;
	return [g.x + f[0] * r.olhosFrente * e, r.olhosY * e, g.z + f[1] * r.olhosFrente * e];
};

/**
 * Proporções do gigante para uma altura (0 agachado, 1 em pé): altura do quadril, inclinação
 * do corpo e onde ficam os olhos. O corpo inclina para a frente quando ele se abaixa.
 */
export const corpoGigante = (altura: number) => {
	const a = easeInOut(altura);
	const quadril = lerp(1.0, 4.4, a);
	const incl = lerp(1.15, 0.1, a);
	// centro do corpo 2.0 acima do quadril; olhos 1.75 acima do centro e 1.3 à frente (no espaço do corpo)
	const cy = 2.0;
	const oy = 1.75;
	const oz = 1.3;
	const olhosY = quadril + Math.cos(incl) * (cy + oy) - Math.sin(incl) * oz;
	const olhosFrente = Math.sin(incl) * (cy + oy) + Math.cos(incl) * oz;
	return {quadril, incl, olhosY, olhosFrente, cy, oy, oz};
};

const cache = new Map<string, SimulacaoCena>();
/** Simulação de uma cena, criada uma vez por aba do navegador e reutilizada em todos os quadros. */
export const simulacao = (linha: LinhaDoTempo, cena: CenaTempo) => {
	const chave = `${linha.serie}:${linha.parte}:${cena.id}:${linha.duracao}`;
	let s = cache.get(chave);
	if (!s) {
		s = new SimulacaoCena(cena, linha);
		cache.set(chave, s);
	}
	return s;
};

export const cenaNoTempo = (linha: LinhaDoTempo, t: number) =>
	linha.cenas.find((c) => t >= c.ini && t < c.fim) ?? linha.cenas[linha.cenas.length - 1];

