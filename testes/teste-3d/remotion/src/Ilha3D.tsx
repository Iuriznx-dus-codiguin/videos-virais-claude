// Versão Three.js da cena de teste (mesmos dados e linha do tempo da versão Blender).
import {Outlines, PerspectiveCamera, RoundedBox} from '@react-three/drei';
import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {C, D, V3, camera, lerp, pegadasGigantes, pegadasLeo, pose, posX, smoothstep} from './cena';

const P = D.personagem;

// --- materiais -------------------------------------------------------------

// Rampa de 3 tons (sombra, meio-tom, luz) aplicada à luz direta, como no material toon do Blender.
const gradiente = (() => {
	const t = new THREE.DataTexture(new Uint8Array([0, 0, 128, 255, 255]), 5, 1, THREE.RedFormat);
	t.minFilter = THREE.NearestFilter;
	t.magFilter = THREE.NearestFilter;
	t.needsUpdate = true;
	return t;
})();

const linear = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
// Tom das sombras (0.58, 0.52, 0.78 em sRGB, igual ao Blender) e reforço da cabeça para ela ficar clara na sombra.
const AMBIENTE = linear(0.302, 0.237, 0.579);
// Luz do sol = complemento do ambiente: na parte iluminada a soma dá exatamente a cor base (como no Blender).
const LUZ_SOL = linear(0.698, 0.763, 0.421);
const REFORCO_CABECA: V3 = [0.38, 0.37, 0.31];

const cacheMat = new Map<string, THREE.Material>();
const memo = <T extends THREE.Material>(chave: string, criar: () => T): T => {
	if (!cacheMat.has(chave)) cacheMat.set(chave, criar());
	return cacheMat.get(chave) as T;
};

const toon = (cor: string, emissivo?: V3) =>
	memo(`toon${cor}${emissivo}`, () => {
		const m = new THREE.MeshToonMaterial({color: cor, gradientMap: gradiente});
		if (emissivo) m.emissive = linear(...emissivo);
		return m;
	});

const basico = (cor: string) => memo(`basico${cor}`, () => new THREE.MeshBasicMaterial({color: cor, toneMapped: false}));

const pegadaMat = () =>
	memo('pegada', () => {
		const m = new THREE.MeshToonMaterial({color: C.pegada, gradientMap: gradiente});
		m.polygonOffset = true;
		m.polygonOffsetFactor = -2;
		m.polygonOffsetUnits = -2;
		return m;
	});

const RAMPA_GLSL = /* glsl */ `
vec3 rampa(vec3 cores[5], float paradas[5], float f) {
	vec3 c = cores[0];
	for (int i = 0; i < 4; i++) {
		c = mix(c, cores[i + 1], clamp((f - paradas[i]) / (paradas[i + 1] - paradas[i]), 0.0, 1.0));
	}
	return c;
}`;

// Água: cor varia com a distância até a câmera e termina na cor do horizonte.
const marMat = (corPerto: string) =>
	memo(`mar${corPerto}`, () => new THREE.ShaderMaterial({
		uniforms: {
			cores: {value: [corPerto, '#2A7FA0', '#7A6BB0', '#F0A27E', C.horizonte].map((c) => new THREE.Color(c))},
			paradas: {value: [0, 0.3, 0.62, 0.86, 1]},
			dist: {value: new THREE.Vector2(12, 250)},
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
			varying vec3 vMundo;
			${RAMPA_GLSL}
			void main() {
				float f = clamp((distance(vMundo, cameraPosition) - dist.x) / (dist.y - dist.x), 0.0, 1.0);
				gl_FragColor = vec4(rampa(cores, paradas, f), 1.0);
				#include <colorspace_fragment>
			}`,
	}));

const ceuMat = memo('ceu', () => {
	const tam = (D.sol.tamanho_graus * Math.PI) / 180;
	return new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: {
			cores: {value: [C.horizonte, C.ceu_baixo, C.ceu_meio, C.ceu_alto, C.ceu_topo].map((c) => new THREE.Color(c))},
			paradas: {value: [0, 0.12, 0.35, 0.7, 1]},
			sol: {value: new THREE.Vector3(...D.sol.direcao).normalize()},
			corSol: {value: new THREE.Color(C.sol)},
			disco: {value: new THREE.Vector2(Math.cos(tam * 1.06), Math.cos(tam))},
			brilho: {value: new THREE.Vector2(Math.cos(tam * 4), Math.cos(tam))},
		},
		vertexShader: /* glsl */ `
			varying vec3 vDir;
			void main() {
				vec4 m = modelMatrix * vec4(position, 1.0);
				vDir = m.xyz - cameraPosition;
				gl_Position = projectionMatrix * viewMatrix * m;
				gl_Position.z = gl_Position.w;
			}`,
		fragmentShader: /* glsl */ `
			uniform vec3 cores[5];
			uniform float paradas[5];
			uniform vec3 sol;
			uniform vec3 corSol;
			uniform vec2 disco;
			uniform vec2 brilho;
			varying vec3 vDir;
			${RAMPA_GLSL}
			void main() {
				vec3 d = normalize(vDir);
				vec3 c = rampa(cores, paradas, clamp(d.y, 0.0, 1.0));
				float dt = dot(d, sol);
				c = mix(c, corSol, clamp((dt - brilho.x) / (brilho.y - brilho.x), 0.0, 1.0) * 0.55);
				c = mix(c, corSol, clamp((dt - disco.x) / (disco.y - disco.x), 0.0, 1.0));
				gl_FragColor = vec4(c, 1.0);
				#include <colorspace_fragment>
			}`,
	});
});

// Brilho dos olhos: disco sempre virado para a câmera, com transparência radial.
const haloMat = memo('halo', () => {
	const tam = 128;
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = tam;
	const ctx = canvas.getContext('2d')!;
	const img = ctx.createImageData(tam, tam);
	for (let y = 0; y < tam; y++) {
		for (let x = 0; x < tam; x++) {
			const r2 = ((x + 0.5) / tam * 2 - 1) ** 2 + ((y + 0.5) / tam * 2 - 1) ** 2;
			const a = r2 >= 1 ? 0 : (1 - r2) ** 1.5 * 0.85;
			const i = (y * tam + x) * 4;
			img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
			img.data[i + 3] = Math.round(a * 255);
		}
	}
	ctx.putImageData(img, 0, 0);
	return new THREE.SpriteMaterial({map: new THREE.CanvasTexture(canvas), color: '#FFFF61', depthWrite: false, toneMapped: false});
});

// --- geometrias --------------------------------------------------------------

const cacheGeo = new Map<string, THREE.BufferGeometry>();
const geo = (chave: string, criar: () => THREE.BufferGeometry) => {
	if (!cacheGeo.has(chave)) cacheGeo.set(chave, criar());
	return cacheGeo.get(chave)!;
};
const esfera = (r: number, w = 24, h = 15) => geo(`esf${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const capsula = (r: number, comp: number) => geo(`cap${r},${comp}`, () => new THREE.CapsuleGeometry(r, comp, 6, 16));
const cilindro = (rBase: number, rTopo: number, h: number, seg = 24) =>
	geo(`cil${rBase},${rTopo},${h},${seg}`, () => new THREE.CylinderGeometry(rTopo, rBase, h, seg));
// Facetado como no Blender: com detalhe > 0 o Three.js gera normais suaves, e o material toon não tem flatShading.
const ico = (r: number, detalhe: number) =>
	geo(`ico${r},${detalhe}`, () => {
		const g = new THREE.IcosahedronGeometry(r, detalhe);
		g.computeVertexNormals(); // geometria sem índice: uma normal por face
		return g;
	});
const disco = (r: number, seg = 32) => geo(`disco${r},${seg}`, () => new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2));
const anel = (rIn: number, rOut: number, seg = 96) =>
	geo(`anel${rIn},${rOut},${seg}`, () => new THREE.RingGeometry(rIn, rOut, seg).rotateX(-Math.PI / 2));
const toro = (rMaior: number, rMenor: number, seg = 64, segTubo = 12) =>
	geo(`toro${rMaior},${rMenor},${seg},${segTubo}`, () => new THREE.TorusGeometry(rMaior, rMenor, segTubo, seg).rotateX(Math.PI / 2));

// --- peças -------------------------------------------------------------------

type Transf = {position?: V3; rotation?: V3; scale?: V3 | number};

// Contorno preto por casca invertida, como o Solidify da versão Blender. No drei 10.7 a flag
// screenspace faz o contrário do nome: só com ela ligada a espessura vale em unidades do objeto;
// sem ela, vale em pixels e um contorno de 0.02 some.
const Contorno: React.FC<{espessura: number}> = ({espessura}) => (
	<Outlines thickness={espessura} color={C.contorno} screenspace />
);

const Malha: React.FC<Transf & {g: THREE.BufferGeometry; m: THREE.Material; contorno?: number; sombra?: boolean; visible?: boolean}> = ({
	g,
	m,
	contorno = 0,
	sombra = true,
	...resto
}) => (
	<mesh geometry={g} material={m} castShadow={sombra} receiveShadow {...resto}>
		{contorno > 0 ? <Contorno espessura={contorno} /> : null}
	</mesh>
);

const Palmeira: React.FC<{i: number}> = ({i}) => {
	const pm = D.palmeiras[i];
	const {altura: h, inclinacao: incl, direcao: ang} = pm;
	const dx = Math.sin(ang);
	const dz = Math.cos(ang);
	const ponto = (s: number): THREE.Vector3 =>
		new THREE.Vector3(pm.x + incl * h * s * s * dx, h * s, pm.z + incl * h * s * s * dz);
	const n = 7;
	const segmentos = Array.from({length: n}, (_, k) => {
		const a = ponto(k / n);
		const b = ponto((k + 1) / n);
		const dir = b.clone().sub(a);
		const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
		return (
			<mesh
				key={k}
				geometry={cilindro(lerp(0.3, 0.17, k / n), lerp(0.3, 0.17, (k + 1) / n), dir.length(), 14)}
				material={toon(k % 2 === 0 ? C.tronco : '#7A4E33')}
				position={a.clone().add(b).multiplyScalar(0.5)}
				quaternion={q}
				castShadow
				receiveShadow
			>
				<Contorno espessura={0.04} />
			</mesh>
		);
	});
	const topo = ponto(1);
	return (
		<group>
			{segmentos}
			{Array.from({length: 7}, (_, k) => {
				const cor = k % 2 === 0 ? C.folha : C.folha_escura;
				return (
					<group key={k} position={topo} rotation={[0, ang + (k * 2 * Math.PI) / 7, 0]}>
						<group rotation={[-0.15 + 0.1 * (k % 2), 0, 0]}>
							<Malha g={esfera(1, 16, 9)} m={toon(cor)} position={[0, 0, 0.85]} scale={[0.36, 0.06, 0.9]} contorno={0.03} />
							<group position={[0, 0, 1.6]} rotation={[0.65, 0, 0]}>
								<Malha g={esfera(1, 16, 9)} m={toon(cor)} position={[0, 0, 0.75]} scale={[0.3, 0.05, 0.85]} contorno={0.03} />
							</group>
						</group>
					</group>
				);
			})}
			{[
				[0.15, 0.1],
				[-0.12, 0.12],
				[0, -0.16],
			].map(([ox, oz], k) => (
				<Malha key={k} g={esfera(0.17, 14, 9)} m={toon('#6B4226')} position={[topo.x + ox, topo.y - 0.22, topo.z + oz]} contorno={0.02} />
			))}
		</group>
	);
};

const Nuvem: React.FC<{i: number}> = ({i}) => {
	const n = D.nuvens[i];
	const e = n.escala;
	return (
		<group position={[n.x, n.y, n.z]}>
			{[
				[-1.2, 0, 0, 1.0],
				[0, 0.35, 0, 1.3],
				[1.3, 0.05, 0, 0.9],
				[0.5, -0.15, 0.3, 1.0],
			].map(([ox, oy, oz, rr], j) => (
				<mesh key={j} geometry={esfera(1, 16, 9)} material={basico(C.nuvem)} position={[ox * e, oy * e, oz * e]} scale={[rr * e, rr * e * 0.55, rr * e * 0.7]} />
			))}
		</group>
	);
};

const Arbusto: React.FC<{i: number; t: number; ordem: number}> = ({i, t, ordem}) => {
	const a = D.arbustos[i] as {x: number; z: number; r: number; escuro: boolean; mexe?: boolean};
	const cor = a.escuro ? C.arbusto_escuro : C.arbusto;
	const env = a.mexe ? smoothstep(8.5, 8.6, t) * (1 - smoothstep(9.05, 9.2, t)) : 0;
	const w = 0.1 * env * Math.sin(38 * t + ordem * 1.7);
	const r = a.r;
	return (
		<group position={[a.x, 0, a.z]} scale={[1 + w, 1 - w, 1 + w]} rotation={[0, 0, 0.05 * env * Math.sin(31 * t + ordem)]}>
			<Malha g={ico(r, 1)} m={toon(cor)} position={[0, r * 0.8, 0]} scale={[1, 0.85, 1]} rotation={[0, i * 0.7, 0]} contorno={0.05} />
			<Malha g={ico(r * 0.6, 0)} m={toon(cor)} position={[-0.3 * r, 1.35 * r, -0.2 * r]} rotation={[0, i * 1.1, 0]} contorno={0.05} />
		</group>
	);
};

const Olhos: React.FC<{t: number}> = ({t}) => {
	const o = D.olhos;
	const abre = smoothstep(o.abre, o.abre + 0.12, t);
	if (abre <= 0.001) return null;
	return (
		<>
			{[-1, 1].map((lado) => (
				<group key={lado} position={[o.x + lado * o.separacao, o.y, o.z]} scale={[1, abre, 1]}>
					<mesh geometry={esfera(1, 20, 13)} material={basico('#FFFF82')} scale={[0.12, 0.12, 0.05]} />
					<mesh geometry={esfera(1, 16, 9)} material={basico('#000000')} position={[0, 0, 0.05]} scale={[0.035, 0.11, 0.03]} />
					<mesh
						geometry={esfera(1, 16, 9)}
						material={basico(C.sombra_mato)}
						position={[-0.035 * lado, 0.1, 0.035]}
						rotation={[0, 0, 0.45 * lado]}
						scale={[0.17, 0.065, 0.07]}
					/>
					<sprite material={haloMat} scale={[0.52, 0.52, 1]} />
				</group>
			))}
		</>
	);
};

const Cenario: React.FC<{t: number}> = ({t}) => {
	const nivel = D.ilha.nivel_mar;
	const r = D.ilha.raio;
	const k = (r + 1.1 + 0.12 * Math.sin(2.2 * t)) / (r + 1.1);
	const xLeo = posX(t);
	let ordem = 0;
	return (
		<>
			<Malha g={cilindro(r + 0.4, r, 0.8, 72)} m={toon(C.areia)} position={[0, -0.4, 0]} contorno={0.06} sombra={false} />
			<Malha g={cilindro(r + 1.5, r + 1.0, 0.5, 72)} m={toon(C.areia_molhada)} position={[0, -0.35, 0]} sombra={false} />
			<mesh geometry={anel(r + 1.0, r + 6.0)} material={marMat(C.mar_raso)} position={[0, nivel + 0.002, 0]} />
			<mesh geometry={anel(r + 6.0, 320, 128)} material={marMat(C.mar)} position={[0, nivel, 0]} />
			<mesh geometry={toro(r + 1.1, 0.09, 96, 8)} material={basico(C.espuma)} position={[0, nivel + 0.01, 0]} scale={[k, 1, k]} />
			{D.nuvens.map((_, i) => (
				<Nuvem key={i} i={i} />
			))}
			{D.palmeiras.map((_, i) => (
				<Palmeira key={i} i={i} />
			))}
			{D.arbustos.map((a, i) => (
				<Arbusto key={i} i={i} t={t} ordem={(a as {mexe?: boolean}).mexe ? ordem++ : 0} />
			))}
			{D.pedras.map((p, i) => (
				<Malha
					key={i}
					g={ico(p.r, 0)}
					m={toon(C.pedra)}
					position={[p.x, p.r * 0.2, p.z]}
					scale={[1, 0.6, 0.85]}
					rotation={[0, i * 1.3, 0]}
					contorno={0.04}
				/>
			))}
			<mesh geometry={esfera(D.toca.r, 20, 13)} material={basico(C.sombra_mato)} position={[D.toca.x, D.toca.y, D.toca.z]} />
			<Olhos t={t} />
			{pegadasGigantes().map(([x, z, yaw], i) => (
				<group key={i} position={[x, 0.012, z]} rotation={[0, yaw, 0]} scale={[1.3, 1, 1.3]}>
					<mesh geometry={disco(1)} material={pegadaMat()} scale={[0.42, 1, 0.62]} receiveShadow />
					{[
						[-0.27, 0.78],
						[0, 0.9],
						[0.27, 0.78],
					].map(([dx, dz], j) => (
						<mesh key={j} geometry={disco(0.14)} material={pegadaMat()} position={[dx, 0, dz]} receiveShadow />
					))}
				</group>
			))}
			{pegadasLeo().map(([x, z, quando], i) => (
				<mesh key={i} geometry={disco(1, 20)} material={pegadaMat()} position={[x, 0.01, z]} scale={[0.19, 1, 0.1]} visible={xLeo >= quando} receiveShadow />
			))}
		</>
	);
};

const RC = 0.42; // raio da cabeça

const naEsfera = (x: number, y: number, afundar = 0.008): {position: V3; rotation: V3} => {
	const z = Math.sqrt(Math.max(RC * RC - x * x - y * y, 0)) - afundar;
	return {position: [x, y, z], rotation: [-Math.asin(y / RC), Math.atan2(x, z), 0]};
};

const Leo: React.FC<{t: number}> = ({t}) => {
	const p = pose(t);
	const corpo = toon(P.cor_corpo);
	const preto = basico('#0D0D12');
	return (
		<group position={p.raiz} rotation={[0, p.yaw, 0]}>
			<group rotation={[p.incl, 0, 0]}>
				<Malha g={capsula(0.075, 1.07)} m={corpo} position={[0, 0.535, 0]} contorno={0.022} />
				<RoundedBox args={[0.42, 0.5, 0.2]} radius={0.06} smoothness={3} position={[0, 0.62, -0.17]} material={toon(P.cor_mochila)} castShadow receiveShadow>
					<Contorno espessura={0.022} />
				</RoundedBox>
				<RoundedBox args={[0.44, 0.16, 0.22]} radius={0.05} smoothness={3} position={[0, 0.8, -0.17]} material={toon('#E0A21F')} castShadow receiveShadow>
					<Contorno espessura={0.018} />
				</RoundedBox>
				{/* cabeça */}
				<group position={[0, 1.07, 0]} rotation={[p.cabPitch, p.cabYaw, 0]}>
					<Malha g={esfera(RC, 32, 21)} m={toon(P.cor_cabeca, REFORCO_CABECA)} position={[0, 0.4, 0]} contorno={0.024} />
					<group position={[0, 0.4, 0]}>
						{[1, -1].map((lado) => {
							const olho = naEsfera(0.14 * lado, 0.05);
							const sx = 0.14 * lado;
							const sy = p.sobY;
							const sz = Math.sqrt(RC * RC - sx * sx - sy * sy) - 0.004;
							return (
								<React.Fragment key={lado}>
									<group {...olho}>
										<mesh geometry={esfera(1, 16, 11)} material={preto} scale={[0.07 * p.olho, 0.1 * p.olho * p.pisc, 0.035]} />
										<mesh geometry={esfera(0.02, 10, 7)} material={basico('#FFFFFF')} position={[0.02, 0.035, 0.03]} visible={p.pisc >= 0.5} />
									</group>
									<group position={[sx, sy, sz]} rotation={[-Math.asin(sy / RC), Math.atan2(sx, sz), Math.PI / 2 - lado * p.sobAng]}>
										<mesh geometry={capsula(0.017, 0.11)} material={preto} />
									</group>
								</React.Fragment>
							);
						})}
						<mesh geometry={esfera(1, 16, 11)} material={preto} {...naEsfera(0, -0.15)} scale={[p.bocaL, p.bocaA, 0.02]} />
						{/* bandana */}
						<Malha g={toro(0.395, 0.052, 48, 10)} m={toon(P.cor_bandana)} position={[0, 0.17, 0]} rotation={[-0.18, 0, 0]} contorno={0.015} />
						{[1, -1].map((lado) => (
							<group key={lado} position={[0.05 * lado, 0.12, -0.39]} rotation={[p.band, 0, 0.35 * lado]}>
								<Malha g={esfera(1, 12, 9)} m={toon(P.cor_bandana)} position={[0, -0.13, 0]} scale={[0.055, 0.15, 0.025]} contorno={0.012} />
							</group>
						))}
					</group>
				</group>
				{/* braços */}
				{[1, -1].map((lado) => (
					<group key={lado} position={[0.04 * lado, 0.9, 0]} rotation={[-(lado === 1 ? p.ombroE : p.ombroD), 0, lado * p.abre]}>
						<Malha g={capsula(0.062, 0.46)} m={corpo} position={[0, -0.23, 0]} contorno={0.02} />
						<group position={[0, -0.46, 0]} rotation={[-p.cotov, 0, 0]}>
							<Malha g={capsula(0.058, 0.42)} m={corpo} position={[0, -0.21, 0]} contorno={0.02} />
							<Malha g={esfera(0.085, 14, 9)} m={corpo} position={[0, -0.44, 0]} contorno={0.02} />
						</group>
					</group>
				))}
			</group>
			{/* pernas */}
			{[1, -1].map((lado) => (
				<group key={lado} position={[0.08 * lado, 0, 0]} rotation={[-(lado === 1 ? p.coxaE : p.coxaD), 0, 0]}>
					<Malha g={capsula(0.068, 0.58)} m={corpo} position={[0, -0.29, 0]} contorno={0.02} />
					<group position={[0, -0.58, 0]} rotation={[lado === 1 ? p.joelhoE : p.joelhoD, 0, 0]}>
						<Malha g={capsula(0.064, 0.57)} m={corpo} position={[0, -0.285, 0]} contorno={0.02} />
						<Malha g={esfera(1, 14, 9)} m={corpo} position={[0, -0.555, 0.06]} scale={[0.085, 0.07, 0.16]} contorno={0.02} />
					</group>
				</group>
			))}
		</group>
	);
};

const Camera: React.FC<{t: number}> = ({t}) => {
	const ref = useRef<THREE.PerspectiveCamera>(null);
	const {pos, alvo, fov} = camera(t);
	useLayoutEffect(() => {
		const c = ref.current!;
		c.position.set(...pos);
		c.fov = fov;
		c.updateProjectionMatrix();
		c.lookAt(...alvo);
		c.updateMatrixWorld();
	});
	return (
		<>
			<PerspectiveCamera ref={ref} makeDefault near={0.1} far={900} />
			<mesh geometry={esfera(500, 48, 24)} material={ceuMat} position={pos} renderOrder={-1} />
		</>
	);
};

const direcao = (v: V3, dist: number): V3 => {
	const n = Math.hypot(...v);
	return [(v[0] / n) * dist, (v[1] / n) * dist, (v[2] / n) * dist];
};

export const Ilha3D: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	return (
		<>
			<Camera t={t} />
			<ambientLight color={AMBIENTE} intensity={Math.PI} />
			<directionalLight
				position={direcao([-8, 14, 10], 30)}
				color={LUZ_SOL}
				intensity={Math.PI}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-left={-22}
				shadow-camera-right={22}
				shadow-camera-top={22}
				shadow-camera-bottom={-22}
				shadow-camera-near={1}
				shadow-camera-far={80}
				shadow-bias={-0.0004}
				shadow-normalBias={0.05}
			/>
			<directionalLight position={direcao([5, 6, -12], 30)} color={C.luz_contra} intensity={0.6} />
			<Cenario t={t} />
			<Leo t={t} />
		</>
	);
};
