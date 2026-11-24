// Peças de acabamento para os cenários (24/11, pedido do Iuri: "sem elementos mal feitos ou com
// poucos detalhes"): mar com ondas e brilho do sol, rocha irregular com topo mais claro, tufos de
// capim, pedrinhas e flores espalhados (instanciados, leves), tábuas de cais, boia e gaivotas.
// Tudo determinístico (mesma semente → mesmo lugar em todos os quadros).
import React from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {aleatorio} from '../util/mat';
import {Malha, basico, caixa, cilindro, geo, memo, toon, toro} from './base';
import {RAMPA_GLSL, clima} from './luzes';

// --- mar ----------------------------------------------------------------------------------------

/**
 * Água de desenho: degradê do perto para o longe (cores do clima), manchas claras que andam,
 * cristas brancas finas perto da câmera e faíscas do sol. `perto`: a faixa junto da praia.
 */
export const marVivo = (nomeClima: string, perto = true) =>
	memo(`marVivo${nomeClima}${perto}`, () => {
		const c = clima(nomeClima);
		const cores = perto ? c.mar : [c.mar[1], c.mar[1], c.mar[2], c.mar[3], c.mar[4]];
		const noite = nomeClima.startsWith('noite');
		return new THREE.ShaderMaterial({
			fog: false,
			uniforms: {
				cores: {value: cores.map((x) => new THREE.Color(x))},
				paradas: {value: [0, 0.3, 0.62, 0.86, 1]},
				dist: {value: new THREE.Vector2(10, 260)},
				tempo: {value: 0},
				corEspuma: {value: new THREE.Color(noite ? '#9FB8D8' : '#FFFFFF')},
				solDir: {value: new THREE.Vector3(...c.astro.dir).normalize()},
				brilhoSol: {value: noite ? 0.5 : 1.4},
				corSol: {value: new THREE.Color(c.astro.cor)},
			},
			vertexShader: /* glsl */ `
				varying vec3 vMundo;
				void main() {
					vec4 m = modelMatrix * vec4(position, 1.0);
					vMundo = m.xyz;
					gl_Position = projectionMatrix * viewMatrix * m;
				}`,
			fragmentShader: /* glsl */ `
				uniform vec3 cores[5];
				uniform float paradas[5];
				uniform vec2 dist;
				uniform float tempo;
				uniform vec3 corEspuma;
				uniform vec3 solDir;
				uniform float brilhoSol;
				uniform vec3 corSol;
				varying vec3 vMundo;
				${RAMPA_GLSL}
				float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
				float r2(vec2 x) {
					vec2 i = floor(x);
					vec2 f = fract(x);
					f = f * f * (3.0 - 2.0 * f);
					return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
				}
				void main() {
					float d = distance(vMundo, cameraPosition);
					float f = clamp((d - dist.x) / (dist.y - dist.x), 0.0, 1.0);
					vec3 c = rampa(cores, paradas, f);
					vec2 p = vMundo.xz;
					float onda = r2(p * 0.32 + vec2(tempo * 0.22, tempo * 0.08)) * 0.6 + r2(p * 0.85 - vec2(tempo * 0.15, -tempo * 0.27)) * 0.4;
					float perto = 1.0 - smoothstep(0.0, 0.45, f);
					c = mix(c, c * 1.18 + 0.025, smoothstep(0.48, 0.7, onda) * 0.4);
					c = mix(c, c * 0.86, smoothstep(0.35, 0.15, onda) * 0.3 * perto);
					float crista = smoothstep(0.69, 0.715, onda) * (1.0 - smoothstep(0.73, 0.78, onda));
					c = mix(c, corEspuma, crista * perto * 0.7);
					vec3 v = normalize(cameraPosition - vMundo);
					vec3 r = vec3(-v.x, v.y, -v.z);
					float spec = pow(max(dot(r, solDir), 0.0), 40.0);
					float pisca = step(0.62, r2(p * 2.6 + vec2(tempo * 0.6, -tempo * 0.4)));
					c += corSol * spec * pisca * brilhoSol;
					gl_FragColor = vec4(c, 1.0);
					#include <colorspace_fragment>
				}`,
		});
	});

/** Disco ou anel de mar com ondas andando (t em segundos). */
export const Mar: React.FC<{nomeClima: string; t: number; y: number; raio?: number; raioInterno?: number; perto?: boolean}> = ({nomeClima, t, y, raio = 320, raioInterno = 0, perto = true}) => {
	const m = marVivo(nomeClima, perto);
	m.uniforms.tempo.value = t;
	const g = raioInterno > 0 ? geo(`marAnel${raioInterno},${raio}`, () => new THREE.RingGeometry(raioInterno, raio, 128, 6).rotateX(-Math.PI / 2)) : geo(`marDisco${raio}`, () => new THREE.CircleGeometry(raio, 96).rotateX(-Math.PI / 2));
	return <mesh geometry={g} material={m} position={[0, y, 0]} />;
};

// --- rocha --------------------------------------------------------------------------------------

/** Rocha irregular facetada (6 variações), com o topo mais claro e a base mais escura. */
export const rochaGeo = (variacao: number) =>
	geo(`rocha${variacao % 6}`, () => {
		const r = aleatorio(101 + (variacao % 6) * 17);
		const g = new THREE.IcosahedronGeometry(1, 2);
		const pos = g.getAttribute('position') as THREE.BufferAttribute;
		const fase = [r() * 10, r() * 10, r() * 10];
		const v = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			const n = Math.sin(v.x * 2.1 + fase[0]) * Math.sin(v.y * 2.7 + fase[1]) * Math.sin(v.z * 1.9 + fase[2]);
			const k = 1 + 0.22 * n + 0.08 * Math.sin(v.x * 6.3 + v.z * 5.1 + fase[1]);
			v.multiplyScalar(k);
			// base achatada (a rocha assenta no chão)
			if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.25;
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		const solta = g.index ? g.toNonIndexed() : g;
		solta.computeVertexNormals();
		const nrm = solta.getAttribute('normal') as THREE.BufferAttribute;
		const cores = new Float32Array(nrm.count * 3);
		for (let i = 0; i < nrm.count; i++) {
			const ny = nrm.getY(i);
			const k = 0.78 + 0.32 * Math.max(0, ny) - 0.1 * Math.max(0, -ny);
			cores[i * 3] = cores[i * 3 + 1] = cores[i * 3 + 2] = k;
		}
		solta.setAttribute('color', new THREE.BufferAttribute(cores, 3));
		return solta;
	});

const toonCores = (cor: string) =>
	memo(`toonCores${cor}`, () => {
		const m = toon(cor).clone();
		m.vertexColors = true;
		const base = toon(cor);
		m.onBeforeCompile = base.onBeforeCompile;
		m.customProgramCacheKey = () => 'toon-cenario-cores';
		return m;
	});

export const Rocha: React.FC<{pos: [number, number, number]; escala: number | [number, number, number]; cor?: string; giro?: number; variacao?: number; contorno?: number; sombra?: boolean}> = ({
	pos,
	escala,
	cor = '#7C8290',
	giro = 0,
	variacao = 0,
	contorno = 0.035,
	sombra = true,
}) => <Malha g={rochaGeo(variacao)} m={toonCores(cor)} position={pos} rotation={[0, giro, 0]} scale={escala} contorno={contorno} sombra={sombra} />;

// --- espalhados (capim, pedrinhas, flores) ------------------------------------------------------

const tufoGeo = () =>
	geo('tufoCapim', () => {
		const partes: THREE.BufferGeometry[] = [];
		const r = aleatorio(7);
		for (let i = 0; i < 6; i++) {
			const h = 0.22 + r() * 0.2;
			const c = new THREE.ConeGeometry(0.035, h, 4, 1);
			c.translate(0, h / 2, 0);
			c.rotateZ((r() - 0.5) * 0.9);
			c.rotateY((i / 6) * Math.PI * 2);
			c.translate(Math.cos(i) * 0.05, 0, Math.sin(i) * 0.05);
			partes.push(c);
		}
		return mergeGeometries(partes)!;
	});

const pedrinhaGeo = () => geo('pedrinha', () => new THREE.IcosahedronGeometry(1, 0).scale(1, 0.55, 0.8));
const florGeo = () =>
	geo('flor', () => {
		const haste = new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4).translate(0, 0.11, 0);
		const cab = new THREE.IcosahedronGeometry(0.04, 0).translate(0, 0.23, 0);
		haste.deleteAttribute('uv');
		cab.deleteAttribute('uv');
		return mergeGeometries([haste.index ? haste.toNonIndexed() : haste, cab.index ? cab.toNonIndexed() : cab])!;
	});

export interface Regiao {
	/** centro e raios (anel entre rMin e rMax) ou retângulo [x0, z0, x1, z1] */
	centro?: [number, number];
	rMin?: number;
	rMax?: number;
	retangulo?: [number, number, number, number];
	/** círculos [x, z, r] onde nada nasce (trilhas, lugar dos personagens) */
	evitar?: [number, number, number][];
	/** altura do chão */
	y?: number;
}

const pontos = (reg: Regiao, quantos: number, semente: number) => {
	const r = aleatorio(semente);
	const lista: {x: number; z: number; giro: number; s: number; k: number}[] = [];
	let tentativas = 0;
	while (lista.length < quantos && tentativas < quantos * 8) {
		tentativas++;
		let x: number;
		let z: number;
		if (reg.retangulo) {
			const [x0, z0, x1, z1] = reg.retangulo;
			x = x0 + r() * (x1 - x0);
			z = z0 + r() * (z1 - z0);
		} else {
			const [cx, cz] = reg.centro ?? [0, 0];
			const a = r() * Math.PI * 2;
			const rr = Math.sqrt((reg.rMin ?? 0) ** 2 + r() * ((reg.rMax ?? 5) ** 2 - (reg.rMin ?? 0) ** 2));
			x = cx + Math.cos(a) * rr;
			z = cz + Math.sin(a) * rr;
		}
		if (reg.evitar?.some(([ex, ez, er]) => Math.hypot(x - ex, z - ez) < er)) continue;
		lista.push({x, z, giro: r() * Math.PI * 2, s: 0.7 + r() * 0.7, k: r()});
	}
	return lista;
};

const instancias = (chave: string, g: THREE.BufferGeometry, m: THREE.Material, itens: {x: number; y: number; z: number; giro: number; s: number | [number, number, number]; cor: string}[]) =>
	geoInst(chave, () => {
		const im = new THREE.InstancedMesh(g, m, itens.length);
		const o = new THREE.Object3D();
		const c = new THREE.Color();
		itens.forEach((it, i) => {
			o.position.set(it.x, it.y, it.z);
			o.rotation.set(0, it.giro, 0);
			if (Array.isArray(it.s)) o.scale.set(...it.s);
			else o.scale.setScalar(it.s);
			o.updateMatrix();
			im.setMatrixAt(i, o.matrix);
			im.setColorAt(i, c.set(it.cor));
		});
		im.instanceMatrix.needsUpdate = true;
		if (im.instanceColor) im.instanceColor.needsUpdate = true;
		im.receiveShadow = true;
		im.castShadow = false;
		im.frustumCulled = false;
		return im;
	});

const cacheInst = new Map<string, THREE.InstancedMesh>();
const geoInst = (chave: string, criar: () => THREE.InstancedMesh) => {
	if (!cacheInst.has(chave)) cacheInst.set(chave, criar());
	return cacheInst.get(chave)!;
};

const variar = (cor: string, k: number, quanto = 0.18) => {
	const c = new THREE.Color(cor);
	const hsl = {h: 0, s: 0, l: 0};
	c.getHSL(hsl);
	c.setHSL(hsl.h + (k - 0.5) * 0.04, hsl.s, Math.min(1, Math.max(0, hsl.l * (1 + (k - 0.5) * quanto * 2))));
	return '#' + c.getHexString();
};

/** Tufos de capim espalhados numa região (cor com variação de tom). */
export const Capim: React.FC<{chave: string; regiao: Regiao; quantos: number; cor?: string; semente?: number; escala?: number}> = ({chave, regiao, quantos, cor = '#5E9A3E', semente = 3, escala = 1}) => {
	const im = instancias(
		`capim-${chave}`,
		tufoGeo(),
		toon('#FFFFFF'),
		pontos(regiao, quantos, semente).map((p) => ({x: p.x, y: regiao.y ?? 0, z: p.z, giro: p.giro, s: p.s * escala, cor: variar(cor, p.k)})),
	);
	return <primitive object={im} />;
};

/** Pedrinhas soltas no chão. */
export const Pedrinhas: React.FC<{chave: string; regiao: Regiao; quantos: number; cor?: string; semente?: number; tamanho?: number}> = ({chave, regiao, quantos, cor = '#8A8E98', semente = 5, tamanho = 0.07}) => {
	const im = instancias(
		`pedrinhas-${chave}`,
		pedrinhaGeo(),
		toon('#FFFFFF'),
		pontos(regiao, quantos, semente).map((p) => ({x: p.x, y: (regiao.y ?? 0) + 0.01, z: p.z, giro: p.giro, s: p.s * tamanho, cor: variar(cor, p.k, 0.3)})),
	);
	return <primitive object={im} />;
};

/** Florzinhas (haste verde, cabeça colorida) espalhadas. */
export const Flores: React.FC<{chave: string; regiao: Regiao; quantos: number; cores?: string[]; semente?: number}> = ({chave, regiao, quantos, cores = ['#FFFFFF', '#FFD24A', '#FF8FB1', '#B48CFF'], semente = 9}) => {
	const im = instancias(
		`flores-${chave}`,
		florGeo(),
		toon('#FFFFFF'),
		pontos(regiao, quantos, semente).map((p) => ({x: p.x, y: regiao.y ?? 0, z: p.z, giro: p.giro, s: 0.8 + p.s * 0.4, cor: cores[Math.floor(p.k * cores.length) % cores.length]})),
	);
	return <primitive object={im} />;
};

// --- peças de cais e de mar ---------------------------------------------------------------------

/** Cais de tábuas com vãos, vigas por baixo, estacas e uma corda grossa entre as estacas. */
export const Cais: React.FC<{x: number; z: number; giro?: number; largura?: number; comprimento?: number; y?: number; fundo?: number}> = React.memo(({x, z, giro = 0, largura = 2.2, comprimento = 12, y = -0.15, fundo = -1.6}) => {
	const r = aleatorio(77);
	const n = Math.round(comprimento / 0.32);
	return (
		<group position={[x, y, z]} rotation={[0, giro, 0]}>
			{Array.from({length: n}, (_, i) => {
				const k = r();
				return (
					<Malha
						key={i}
						g={caixa(largura, 0.07, 0.27)}
						m={toon(k < 0.33 ? '#8A6446' : k < 0.66 ? '#7A5A3E' : '#94704E')}
						position={[(k - 0.5) * 0.06, 0, -comprimento / 2 + (i + 0.5) * (comprimento / n)]}
						rotation={[0, (k - 0.5) * 0.03, (r() - 0.5) * 0.02]}
						contorno={0.012}
						sombra={false}
					/>
				);
			})}
			{[-1, 1].map((l) => (
				<Malha key={l} g={caixa(0.14, 0.16, comprimento)} m={toon('#5A4030')} position={[l * (largura / 2 - 0.15), -0.12, 0]} sombra={false} />
			))}
			{Array.from({length: Math.ceil(comprimento / 3) + 1}, (_, i) =>
				[-1, 1].map((l) => {
					const pz = -comprimento / 2 + i * (comprimento / Math.ceil(comprimento / 3));
					return (
						<group key={`${i}${l}`}>
							<Malha g={cilindro(0.11, 0.13, 0.9 - fundo, 10)} m={toon('#5A4030')} position={[l * (largura / 2 + 0.05), (0.9 + fundo) / 2 - 0.05, pz]} contorno={0.015} sombra={false} />
							<Malha g={cilindro(0.115, 0.115, 0.06, 10)} m={toon('#3E2C20')} position={[l * (largura / 2 + 0.05), 0.85, pz]} sombra={false} />
						</group>
					);
				}),
			)}
			{[-1, 1].map((l) => (
				<Malha key={`corda${l}`} g={geo(`cordaCais${comprimento}`, () => {
					const pts: THREE.Vector3[] = [];
					const vaos = Math.ceil(comprimento / 3);
					for (let i = 0; i <= vaos * 8; i++) {
						const u = i / 8;
						const s = u - Math.floor(u);
						pts.push(new THREE.Vector3(0, 0.72 - 0.16 * Math.sin(Math.PI * s), -comprimento / 2 + u * (comprimento / vaos)));
					}
					return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), vaos * 16, 0.028, 6, false);
				})} m={toon('#D9C49A')} position={[l * (largura / 2 + 0.05), 0, 0]} sombra={false} />
			))}
		</group>
	);
});

/** Boia salva-vidas (anel vermelho e branco). */
export const BoiaSalvaVidas: React.FC<{pos: [number, number, number]; giro?: [number, number, number]; escala?: number}> = ({pos, giro = [0, 0, 0], escala = 1}) => (
	<group position={pos} rotation={giro} scale={escala}>
		{[0, 1, 2, 3].map((i) => (
			<Malha key={i} g={toro(0.3, 0.09, 16, 10, Math.PI / 2)} m={toon(i % 2 ? '#F2EEE6' : '#D7263D')} rotation={[0, (i * Math.PI) / 2, 0]} contorno={0.012} sombra={false} />
		))}
	</group>
);

/** Gaivotas voando em círculos lá no alto (asas batendo, em V). */
export const Gaivotas: React.FC<{t: number; centro: [number, number, number]; quantas?: number; raio?: number}> = ({t, centro, quantas = 4, raio = 9}) => (
	<group position={centro}>
		{Array.from({length: quantas}, (_, i) => {
			const fase = i * 1.7;
			const a = t * (0.22 + 0.05 * (i % 3)) + fase;
			const rr = raio * (0.65 + 0.35 * ((i * 0.37) % 1));
			const bate = Math.sin(t * 7 + fase * 3) * 0.55;
			return (
				<group key={i} position={[Math.cos(a) * rr, Math.sin(t * 0.7 + fase) * 0.8 + i * 0.6, Math.sin(a) * rr]} rotation={[0, -a, 0.15]}>
					<mesh geometry={geo('gaivotaCorpo', () => new THREE.SphereGeometry(0.12, 8, 6).scale(0.8, 0.7, 2.4))} material={basico('#F4F4F6')} />
					{[-1, 1].map((l) => (
						<group key={l} rotation={[0, 0, l * bate]}>
							<mesh geometry={geo('gaivotaAsa', () => new THREE.SphereGeometry(0.5, 8, 4).scale(1, 0.06, 0.32).translate(0.5, 0, 0))} material={basico('#E8E9EE')} scale={[l, 1, 1]} />
							<mesh geometry={geo('gaivotaPonta', () => new THREE.SphereGeometry(0.18, 6, 4).scale(1, 0.07, 0.5).translate(0.88, 0, -0.02))} material={basico('#2A2D36')} scale={[l, 1, 1]} />
						</group>
					))}
				</group>
			);
		})}
	</group>
);
