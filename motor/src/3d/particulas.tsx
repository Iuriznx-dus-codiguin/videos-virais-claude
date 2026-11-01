// Partículas e feixes de luz: poeira na luz, fagulhas, fumaça, vapor, folhas caindo, vaga-lumes,
// faíscas elétricas, bolhas e confete, mais o cone de luz visível de refletores, do sol entrando na
// mata ou da janela. Tudo é função do tempo (cada quadro é desenhado sozinho no render) e sai em
// poucas chamadas de desenho para caber no render por CPU.
import React from 'react';
import * as THREE from 'three';
import {V3, aleatorio, clamp, hashTexto, lerp, smoothstep} from '../util/mat';
import {fumacaMat, geo, gradiente, memo, texturaHalo} from './base';

interface Grao {
	x: number;
	y: number;
	z: number;
	f: number;
	ph: number;
	v: number;
	c: number;
}

const graos = (semente: number, n: number): Grao[] => {
	const r = aleatorio(semente);
	return Array.from({length: n}, () => ({x: r() * 2 - 1, y: r(), z: r() * 2 - 1, f: 0.6 + r() * 0.8, ph: r() * Math.PI * 2, v: r(), c: r()}));
};

/** Geometria de pontos reaproveitada por sistema (posições e cores reescritas a cada quadro). */
const pontosGeo = (chave: string, n: number) =>
	geo(`pts${chave}`, () => {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
		g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
		return g;
	}) as THREE.BufferGeometry;

const pontosMat = (tam: number, aditivo: boolean) =>
	memo(`ptsmat${tam}${aditivo}`, () =>
		new THREE.PointsMaterial({
			size: tam,
			map: texturaHalo(),
			vertexColors: true,
			transparent: true,
			depthWrite: false,
			toneMapped: false,
			sizeAttenuation: true,
			blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
		}),
	);

type Calc = (g: Grao, i: number, t: number) => {p: V3; brilho: number} | null;

/** Desenha n grãos como pontos brilhantes; `calc` diz onde cada um está e quanto brilha. */
const Pontos: React.FC<{chave: string; lista: Grao[]; t: number; cor: string; tam: number; aditivo?: boolean; calc: Calc}> = ({chave, lista, t, cor, tam, aditivo = true, calc}) => {
	const g = pontosGeo(chave, lista.length);
	const pos = g.getAttribute('position') as THREE.BufferAttribute;
	const col = g.getAttribute('color') as THREE.BufferAttribute;
	const base = new THREE.Color(cor);
	lista.forEach((gr, i) => {
		const r = calc(gr, i, t);
		if (!r) {
			pos.setXYZ(i, 0, -999, 0);
			col.setXYZ(i, 0, 0, 0);
			return;
		}
		pos.setXYZ(i, r.p[0], r.p[1], r.p[2]);
		const b = clamp(r.brilho, 0, 2);
		col.setXYZ(i, base.r * b, base.g * b, base.b * b);
	});
	pos.needsUpdate = true;
	col.needsUpdate = true;
	g.computeBoundingSphere();
	return <points geometry={g} material={pontosMat(tam, aditivo)} frustumCulled={false} renderOrder={5} />;
};

/** Peças chatas que caem girando (folhas, confete), numa malha instanciada só. */
const Pedacos: React.FC<{chave: string; lista: Grao[]; t: number; cores: string[]; tam: [number, number]; calc: (g: Grao, i: number, t: number) => {p: V3; rot: V3} | null}> = ({chave, lista, t, cores, tam, calc}) => {
	const malha = React.useMemo(() => {
		const g = new THREE.PlaneGeometry(tam[0], tam[1]);
		const m = new THREE.MeshToonMaterial({gradientMap: gradiente, side: THREE.DoubleSide});
		const im = new THREE.InstancedMesh(g, m, lista.length);
		im.frustumCulled = false;
		lista.forEach((gr, i) => im.setColorAt(i, new THREE.Color(cores[Math.floor(gr.c * cores.length) % cores.length])));
		return im;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [chave]);
	const obj = new THREE.Object3D();
	lista.forEach((gr, i) => {
		const r = calc(gr, i, t);
		if (!r) obj.position.set(0, -999, 0);
		else {
			obj.position.set(...r.p);
			obj.rotation.set(...r.rot);
		}
		obj.scale.setScalar(r ? 1 : 0.0001);
		obj.updateMatrix();
		malha.setMatrixAt(i, obj.matrix);
	});
	malha.instanceMatrix.needsUpdate = true;
	return <primitive object={malha} />;
};

/** Fumaça e vapor: bolas macias que sobem crescendo e somem (sprites com opacidade própria). */
const Fumaca: React.FC<{chave: string; x: number; y: number; z: number; t: number; cor: string; n: number; altura: number; raio: number; vel: number; tam: [number, number]; opac: number}> = ({chave, x, y, z, t, cor, n, altura, raio, vel, tam, opac}) => {
	const lista = React.useMemo(() => graos(hashTexto(chave), n), [chave, n]);
	return (
		<>
			{lista.map((g, i) => {
				const a = (t * vel * g.f * 0.6 + i / n) % 1;
				const mat = memo(`fum${chave}${i}`, () => fumacaMat(cor, 1).clone() as THREE.SpriteMaterial);
				mat.opacity = opac * Math.sin(Math.PI * Math.min(1, a * 1.15)) * (1 - a * 0.5);
				const s = lerp(tam[0], tam[1], a);
				const vento = a * a * raio * 1.6;
				return (
					<sprite
						key={i}
						material={mat}
						position={[x + g.x * raio * 0.35 + vento + Math.sin(t * 0.7 + g.ph) * 0.15 * a, y + a * altura, z + g.z * raio * 0.35]}
						scale={[s, s, 1]}
						renderOrder={6}
					/>
				);
			})}
		</>
	);
};

const CORES_CONFETE = ['#FFD60A', '#FF3B30', '#34C759', '#0A84FF', '#FF2D9A', '#FFFFFF', '#AF52DE'];
const CORES_FOLHA = ['#3F8A3A', '#2F6B3A', '#6FA83A', '#C98A2B', '#8FB14A'];

export interface OpcoesParticulas {
	particula: string;
	x: number;
	z: number;
	/** altura da base */
	alt: number;
	raio: number;
	altura: number;
	quantas?: number;
	cor?: string;
	t: number;
	/** instante em que liga (confete estoura aqui) */
	ini: number;
	/** chave única (posição na cena) para os caches */
	chave: string;
}

export const Particulas: React.FC<OpcoesParticulas> = (o) => {
	const {particula, x, z, alt: y0, raio, altura, t, ini, chave} = o;
	const n = (padrao: number) => Math.max(1, Math.min(400, Math.round(o.quantas ?? padrao)));
	const tl = t - ini;
	switch (particula) {
		case 'poeira': {
			const lista = graos(hashTexto(chave), n(110));
			return (
				<Pontos
					chave={chave}
					lista={lista}
					t={t}
					cor={o.cor ?? '#FFF0D2'}
					tam={0.045}
					calc={(g) => {
						const yy = (g.y + t * 0.035 * g.f) % 1;
						return {
							p: [x + g.x * raio + Math.sin(t * 0.31 * g.f + g.ph) * 0.22, y0 + yy * altura, z + g.z * raio + Math.cos(t * 0.27 * g.f + g.ph) * 0.22],
							brilho: (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.7 * g.f + g.ph))) * Math.sin(Math.PI * yy) * smoothstep(0, 0.6, tl),
						};
					}}
				/>
			);
		}
		case 'fagulhas': {
			const lista = graos(hashTexto(chave), n(45));
			return (
				<Pontos
					chave={chave}
					lista={lista}
					t={t}
					cor={o.cor ?? '#FF9A3C'}
					tam={0.06}
					calc={(g) => {
						const P = 1.1 + g.v * 1.3;
						const a = ((t + g.ph) % P) / P;
						return {
							p: [x + g.x * raio * 0.3 + Math.sin(a * 7 + g.ph) * 0.18 + a * 0.35, y0 + a * altura, z + g.z * raio * 0.3 + Math.cos(a * 6 + g.ph) * 0.14],
							brilho: 1.6 * (1 - a) ** 1.4 * (0.6 + 0.4 * Math.sin(t * 23 * g.f + g.ph)) * smoothstep(0, 0.3, tl),
						};
					}}
				/>
			);
		}
		case 'vagalumes': {
			const lista = graos(hashTexto(chave), n(28));
			return (
				<Pontos
					chave={chave}
					lista={lista}
					t={t}
					cor={o.cor ?? '#D7FF6A'}
					tam={0.11}
					calc={(g) => ({
						p: [
							x + g.x * raio + Math.sin(t * 0.4 * g.f + g.ph) * 0.6,
							y0 + 0.3 + g.y * altura + Math.sin(t * 0.9 * g.f + g.ph * 2) * 0.25,
							z + g.z * raio + Math.cos(t * 0.35 * g.f + g.ph) * 0.6,
						],
						brilho: 1.5 * Math.max(0, Math.sin(t * 1.9 * g.f + g.ph)) ** 3 * smoothstep(0, 0.5, tl),
					})}
				/>
			);
		}
		case 'faiscas': {
			// estouros curtos: a cada ~0,7 s um novo, cada um com 16 faíscas que caem
			const POR = 16;
			const lista = graos(hashTexto(chave), POR * 3);
			return (
				<Pontos
					chave={chave}
					lista={lista}
					t={t}
					cor={o.cor ?? '#FFF1A8'}
					tam={0.045}
					calc={(g, i) => {
						const fila = Math.floor(i / POR);
						const ciclo = 0.72;
						const tt = tl - fila * (ciclo / 3);
						if (tt < 0) return null;
						const k = Math.floor(tt / ciclo);
						const vida = tt - k * ciclo;
						if (vida > 0.42) return null;
						const r = aleatorio(hashTexto(chave) + k * 31 + fila * 7 + (i % POR));
						const ang = r() * Math.PI * 2;
						const sobe = 0.8 + r() * 2.2;
						const lado = (0.6 + r() * 1.6) * raio;
						return {
							p: [x + Math.cos(ang) * lado * vida, y0 + sobe * vida - 4.9 * vida * vida, z + Math.sin(ang) * lado * vida],
							brilho: 1.9 * (1 - vida / 0.42),
						};
					}}
				/>
			);
		}
		case 'bolhas': {
			const lista = graos(hashTexto(chave), n(36));
			return (
				<Pontos
					chave={chave}
					lista={lista}
					t={t}
					cor={o.cor ?? '#BFEAFF'}
					tam={0.07}
					calc={(g) => {
						const a = (g.y + t * 0.32 * g.f) % 1;
						return {
							p: [x + g.x * raio * 0.6 + Math.sin(t * 3 * g.f + g.ph) * 0.04, y0 + a * altura, z + g.z * raio * 0.6],
							brilho: 0.9 * Math.sin(Math.PI * a) * smoothstep(0, 0.4, tl),
						};
					}}
				/>
			);
		}
		case 'folhas': {
			const lista = graos(hashTexto(chave), n(34));
			return (
				<Pedacos
					chave={chave}
					lista={lista}
					t={t}
					cores={o.cor ? [o.cor] : CORES_FOLHA}
					tam={[0.16, 0.1]}
					calc={(g) => {
						const a = (g.y + t * 0.09 * g.f) % 1;
						return {
							p: [x + g.x * raio + Math.sin(t * 1.1 * g.f + g.ph) * 0.45, y0 + altura * (1 - a), z + g.z * raio + Math.cos(t * 0.8 * g.f + g.ph) * 0.3],
							rot: [t * 2.1 * g.f + g.ph, t * 1.3 + g.ph, Math.sin(t * 2 + g.ph) * 0.8],
						};
					}}
				/>
			);
		}
		case 'confete': {
			const lista = graos(hashTexto(chave), n(90));
			return (
				<Pedacos
					chave={chave}
					lista={lista}
					t={t}
					cores={o.cor ? [o.cor] : CORES_CONFETE}
					tam={[0.07, 0.04]}
					calc={(g) => {
						if (tl < 0) return null;
						if (ini < -50) {
							// sem "aparece": chuva de confete contínua caindo de cima
							const a = (g.y + t * 0.12 * g.f) % 1;
							return {
								p: [x + g.x * raio * 2 + Math.sin(t * 1.7 * g.f + g.ph) * 0.2, y0 + altura * (1 - a), z + g.z * raio * 2],
								rot: [t * 5 * g.f + g.ph, t * 3.3 + g.ph, t * 4 * g.v],
							};
						}
						// estouro: sobe rápido, freia no ar e cai devagar balançando
						const c = 2.2;
						const vt = 0.55;
						const ang = g.ph;
						const vh = (0.6 + g.v * 1.6) * raio;
						const vy = 3.2 + g.f * 2.4;
						const freio = (1 - Math.exp(-c * tl)) / c;
						const yy = y0 + ((vy + vt) / c) * (1 - Math.exp(-c * tl)) - vt * tl;
						if (yy < -0.2) return null;
						return {
							p: [x + Math.cos(ang) * vh * freio + Math.sin(tl * 2.3 + g.ph) * 0.12, Math.max(0.01, yy), z + Math.sin(ang) * vh * freio],
							rot: [tl * 6 * g.f + g.ph, tl * 4 + g.ph, tl * 5 * g.v],
						};
					}}
				/>
			);
		}
		case 'fumaca':
			return <Fumaca chave={chave} x={x} y={y0} z={z} t={t} cor={o.cor ?? '#5E5A66'} n={n(16)} altura={altura} raio={raio} vel={0.22} tam={[0.6, 2.6]} opac={0.55 * smoothstep(0, 0.8, tl)} />;
		case 'vapor':
			return <Fumaca chave={chave} x={x} y={y0} z={z} t={t} cor={o.cor ?? '#F4F8FF'} n={n(14)} altura={altura} raio={raio} vel={0.5} tam={[0.18, 1.1]} opac={0.3 * smoothstep(0, 0.5, tl)} />;
		default:
			return null;
	}
};

// --- feixe de luz -----------------------------------------------------------------------------

const feixeMat = (cor: string, intensidade: number) =>
	memo(`feixe${cor}${intensidade}`, () =>
		new THREE.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
			blending: THREE.AdditiveBlending,
			toneMapped: false,
			// a borda macia e o fim apagado comem ~2/3 da luz: intensidade 1 = feixe forte
			uniforms: {cor: {value: new THREE.Color(cor)}, forca: {value: intensidade * 2.5}},
			vertexShader: /* glsl */ `
				varying float vAlong;
				varying vec3 vNormal;
				varying vec3 vView;
				void main() {
					vAlong = uv.y;
					vec4 mv = modelViewMatrix * vec4(position, 1.0);
					vNormal = normalize(normalMatrix * normal);
					vView = normalize(-mv.xyz);
					gl_Position = projectionMatrix * mv;
				}`,
			fragmentShader: /* glsl */ `
				uniform vec3 cor;
				uniform float forca;
				varying float vAlong;
				varying vec3 vNormal;
				varying vec3 vView;
				void main() {
					// forte perto da fonte (uv.y = 1 no topo do cone) e macio nas bordas do cone
					float borda = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.6);
					float ao_longo = smoothstep(0.0, 0.35, vAlong) * (0.35 + 0.65 * vAlong);
					gl_FragColor = vec4(cor * forca * borda * ao_longo, 1.0);
				}`,
		}),
	);

/** Cone de luz visível de `de` até `para`, com raio `largura` no fim; `varrer` balança (graus). */
export const FeixeLuz: React.FC<{de: V3; para: V3; largura: number; cor: string; intensidade: number; varrer: number; t: number}> = ({de, para, largura, cor, intensidade, varrer, t}) => {
	const dir = new THREE.Vector3(para[0] - de[0], para[1] - de[1], para[2] - de[2]);
	const comp = Math.max(0.1, dir.length());
	dir.normalize();
	if (varrer) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), ((varrer * Math.PI) / 180) * Math.sin(t * 0.6));
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
	const meio = new THREE.Vector3(...de).addScaledVector(dir, comp / 2);
	const g = geo(`feixe${largura}`, () => new THREE.CylinderGeometry(largura * 0.08, largura, 1, 32, 1, true));
	return <mesh geometry={g} material={feixeMat(cor, intensidade)} position={meio} quaternion={q} scale={[1, comp, 1]} renderOrder={7} frustumCulled={false} />;
};
