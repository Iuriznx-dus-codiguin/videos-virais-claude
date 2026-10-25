// Desenho das maquetes: cada peça do roteiro vira uma malha toon com contorno (caixa, cilindro,
// mola, engrenagem, tubo...), presa à peça-mãe, com as animações do instante (giro, calor,
// vidro, vista explodida) e os fluxos de água, corrente ou calor correndo pelos caminhos.
import React from 'react';
import * as THREE from 'three';
import {FLUXOS} from '../catalogo';
import {MaqueteNaCena, alturaDaPeca, estadoPeca, maquetesDaCena} from '../animacao/maquete';
import type {AnimacaoTempo, CenaTempo, LinhaDoTempo, Peca} from '../roteiro/tipos';
import {clamp, smoothstep} from '../util/mat';
import {Contorno, brilho, capsula, caixa, cilindro, cone, esfera, geo, gradiente, haloMat, memo, toon, toro} from './base';

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

/** Geometria da peça (a seta é desenhada à parte, com duas malhas). */
const geometria = (p: Peca): THREE.BufferGeometry | null => {
	const t = p.tam ?? [];
	switch (p.forma) {
		case 'caixa':
			return caixa(t[0] ?? 0.2, t[1] ?? 0.2, t[2] ?? 0.2);
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
			return caixa(t[0] ?? 0.3, t[1] ?? 0.3, 0.03);
		default:
			return null;
	}
};

const COR_QUENTE = new THREE.Color('#FF5A1F');

/** Material da peça no instante: calor puxa para o laranja que brilha, vidro fica translúcido. */
const material = (p: Peca, calor: number, pulso: number, opacidade: number): THREE.Material => {
	const cor = p.cor ?? '#B8C0CC';
	if (p.brilho !== undefined && p.brilho > 0) return brilho(cor, q(p.brilho + pulso * 0.6, 0.05));
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

const PecaMalha: React.FC<{m: MaqueteNaCena; p: Peca; anims: AnimacaoTempo[]; t: number}> = ({m, p, anims, t}) => {
	const e = estadoPeca(m, p, anims, t);
	if (!e.visivel) return null;
	const pos = p.pos ?? [0, 0, 0];
	const g = (p.giro ?? [0, 0, 0]).map((x) => (x * Math.PI) / 180) as [number, number, number];
	const filhos = m.pecas.filter((x) => x.pai === p.id);
	const mat = material(p, e.calor, e.pulso, e.opacidade);
	const vidro = e.opacidade < 0.6;
	const contorno = p.sem_contorno || vidro ? 0 : 0.012;
	const h = alturaDaPeca(p);
	const geom = geometria(p);
	const tam = p.tam ?? [];
	const fluxos = anims.filter((a) => a.faz === 'fluxo' && (a.peca === p.id || a.peca === `${m.id}.${p.id}`));
	return (
		<group position={[pos[0] + e.desloc[0], pos[1] + e.desloc[1], pos[2] + e.desloc[2]]} rotation={g}>
			<group rotation={e.rot} scale={e.escala}>
				{/* crescer: escala em y a partir da base da peça */}
				<group position={[0, (-h / 2) * (1 - e.crescer), 0]} scale={[1, e.crescer, 1]}>
					{p.forma === 'seta' ? (
						<>
							<mesh geometry={cilindro(tam[1] ?? 0.03, tam[1] ?? 0.03, (tam[0] ?? 0.4) * 0.7, 12)} material={mat} position={[0, -(tam[0] ?? 0.4) * 0.15, 0]} castShadow>
								{contorno ? <Contorno espessura={contorno} /> : null}
							</mesh>
							<mesh geometry={cone((tam[1] ?? 0.03) * 2.4, (tam[0] ?? 0.4) * 0.3, 16)} material={mat} position={[0, (tam[0] ?? 0.4) * 0.35, 0]} castShadow>
								{contorno ? <Contorno espessura={contorno} /> : null}
							</mesh>
						</>
					) : geom ? (
						<mesh geometry={geom} material={mat} castShadow={!vidro} receiveShadow renderOrder={vidro ? 2 : 0}>
							{contorno ? <Contorno espessura={contorno} /> : null}
						</mesh>
					) : null}
					{e.calor > 0.35 ? <pointLight color="#FF7A2A" intensity={1.6 * e.calor} distance={1.4} decay={2} /> : null}
					{p.brilho ? <pointLight color={p.cor ?? '#FFF6C8'} intensity={1.2 * p.brilho} distance={2.2} decay={2} /> : null}
				</group>
				{fluxos.map((a, i) => (
					<Fluxo key={`f${i}`} a={a} caminho={a.caminho ?? p.caminho ?? []} t={t} />
				))}
				{filhos.map((f) => (
					<PecaMalha key={f.id} m={m} p={f} anims={anims} t={t} />
				))}
			</group>
		</group>
	);
};

export const Maquetes: React.FC<{cena: CenaTempo; linha: LinhaDoTempo; t: number}> = ({cena, linha, t}) => (
	<>
		{maquetesDaCena(cena, linha).map((m) => {
			const raiz = m.pecas.filter((p) => !p.pai || !m.pecas.some((x) => x.id === p.pai));
			// fluxos presos à maquete inteira (peca = id da maquete), no sistema dela
			const soltos = cena.animacoes.filter((a) => a.faz === 'fluxo' && (a.peca === m.id || a.peca === m.modelo));
			return (
				<group key={m.id} position={m.pos} rotation={[0, m.giro, 0]} scale={m.escala}>
					{raiz.map((p) => (
						<PecaMalha key={p.id} m={m} p={p} anims={cena.animacoes} t={t} />
					))}
					{soltos.map((a, i) => (
						<Fluxo key={i} a={a} caminho={a.caminho ?? []} t={t} />
					))}
				</group>
			);
		})}
	</>
);
