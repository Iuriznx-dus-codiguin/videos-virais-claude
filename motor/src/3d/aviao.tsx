// O avião do Voo 818: inteiro (caindo), em pedaços na praia (fuselagem aberta, cauda, asa, malas)
// e a fuselagem por dentro. Tudo em medidas de avião de corredor único: fuselagem de 1,9 m de raio.
import React from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {aleatorio, easeIn, clamp, lerp3, type V3} from '../util/mat';
import {Malha, brilho, caixa, cilindro, cone, esfera, fumacaMat, geo, gradiente, haloMat, memo, toon} from './base';

export const COR_CASCO = '#E9EDF2';
export const COR_FAIXA = '#2A5BA8';
const COR_BANCO = '#2A5BA8';
const COR_METAL = '#9AA3AE';

/** Toon visível dos dois lados (casco aberto, visto por dentro). */
const toonDuplo = (cor: string) =>
	memo(`toonD${cor}`, () => new THREE.MeshToonMaterial({color: cor, gradientMap: gradiente, side: THREE.DoubleSide}));

/** Casco: cilindro deitado no eixo x. `abertura` (rad) é o vão cortado no topo, centrado em +y. */
const casco = (raio: number, comp: number, abertura: number) =>
	geo(`casco${raio},${comp},${abertura}`, () =>
		new THREE.CylinderGeometry(raio, raio, comp, 40, 1, true, Math.PI / 2 + abertura / 2, Math.PI * 2 - abertura).rotateZ(Math.PI / 2),
	);

const derivaDaCauda = () =>
	geo('derivaCauda', () => {
		const s = new THREE.Shape();
		s.moveTo(0, 0);
		s.lineTo(3.4, 0);
		s.lineTo(2.2, 5.2);
		s.lineTo(0.9, 5.2);
		s.closePath();
		return new THREE.ExtrudeGeometry(s, {depth: 0.22, bevelEnabled: false}).translate(-1.7, 0, -0.11);
	});

// --- peças soltas ---------------------------------------------------------------------------

export const Cauda: React.FC<{x?: number; y?: number; z?: number; giro?: number; inclina?: number}> = ({x = 0, y = 0, z = 0, giro = 0, inclina = 0}) => (
	<group position={[x, y, z]} rotation={[inclina, giro, 0]}>
		<Malha g={derivaDaCauda()} m={toon(COR_FAIXA)} contorno={0.05} />
		<Malha g={cilindro(0.55, 0.55, 0.03, 20)} m={toon('#FFFFFF')} position={[0.2, 3.3, 0.14]} rotation={[Math.PI / 2, 0, 0]} />
		<Malha g={caixa(2.6, 0.18, 4.4)} m={toon(COR_CASCO)} position={[0.4, 0.3, 0]} contorno={0.04} />
	</group>
);

export const Asa: React.FC<{x?: number; y?: number; z?: number; giro?: number; inclina?: number; rola?: number}> = ({x = 0, y = 0, z = 0, giro = 0, inclina = 0, rola = 0}) => (
	<group position={[x, y, z]} rotation={[rola, giro, inclina]}>
		<Malha g={caixa(3.4, 0.24, 11)} m={toon(COR_CASCO)} position={[0, 0, 5.5]} rotation={[0, 0.35, 0]} contorno={0.045} />
		<Malha g={cilindro(0.62, 0.55, 2.6, 18)} m={toon(COR_METAL)} position={[0.4, -0.7, 3.2]} rotation={[0, 0, Math.PI / 2]} contorno={0.04} />
	</group>
);

const MALAS = [
	['#C0392B', 0.9, 0.55, 0.35],
	['#2C3E50', 0.75, 0.5, 0.3],
	['#27AE60', 0.8, 0.5, 0.32],
	['#8E5BB5', 0.6, 0.42, 0.28],
	['#D4A017', 0.85, 0.52, 0.34],
	['#16A5B8', 0.7, 0.46, 0.3],
] as const;

/** Malas espalhadas no chão ao redor de (x, z). */
export const Malas: React.FC<{x: number; z: number; quantas?: number; raio?: number; semente?: number}> = ({x, z, quantas = 8, raio = 5, semente = 3}) => {
	const r = aleatorio(semente);
	return (
		<>
			{Array.from({length: quantas}, (_, i) => {
				const [cor, w, h, d] = MALAS[i % MALAS.length];
				const a = r() * Math.PI * 2;
				const dist = 1.2 + r() * raio;
				return (
					<group key={i} position={[x + Math.cos(a) * dist, h / 2, z + Math.sin(a) * dist]} rotation={[0, r() * 6, i % 3 === 0 ? 0.25 : 0]}>
						<Malha g={caixa(w, h, d)} m={toon(cor)} contorno={0.025} />
						<Malha g={caixa(0.06, h * 0.9, d + 0.02)} m={toon('#1B1B22')} position={[w * 0.18, 0, 0]} />
					</group>
				);
			})}
		</>
	);
};

/**
 * Cintos abertos de todos os assentos: as duas metades caídas no estofado, sem fechar. Tiras e
 * fivelas viram duas geometrias só (dois desenhos por fuselagem, por mais bancos que ela tenha).
 */
const cintos = (de: number, ate: number, passo: number, chao: number, parte: 'tiras' | 'fivelas') =>
	geo(`cintos-${parte}${de},${ate},${passo},${chao}`, () => {
		const pecas: THREE.BufferGeometry[] = [];
		const r = aleatorio(818);
		const banco = new THREE.Matrix4();
		const metade = new THREE.Matrix4();
		const ponta = new THREE.Matrix4();
		for (let x = de; x <= ate; x += passo) {
			for (const z of [-1.16, -0.62, 0.62, 1.16]) {
				banco.makeTranslation(x, chao, z);
				// [lado, comprimento, recuo para o encosto, giro]
				for (const [lado, comp, recuo, giro] of [
					[-1, 0.15, -0.07, 0.2 + r() * 0.35],
					[1, 0.13, -0.02, -0.25 - r() * 0.4],
				]) {
					metade.makeRotationY(giro).setPosition(recuo, 0.452, lado * (0.24 - comp / 2));
					metade.premultiply(banco);
					if (parte === 'tiras') pecas.push(caixa(0.07, 0.012, comp).clone().applyMatrix4(metade));
					else {
						ponta.makeTranslation(0, 0.004, -lado * (comp / 2 + 0.03));
						pecas.push(caixa(lado < 0 ? 0.05 : 0.07, lado < 0 ? 0.012 : 0.022, 0.06).clone().applyMatrix4(metade.clone().multiply(ponta)));
					}
				}
			}
		}
		return mergeGeometries(pecas);
	});

/** Fileira de bancos azuis de um lado e do outro do corredor, com os cintos abertos. */
const Bancos: React.FC<{de: number; ate: number; passo?: number; chao: number}> = ({de, ate, passo = 0.95, chao}) => {
	const itens: React.ReactNode[] = [
		<mesh key="tiras" geometry={cintos(de, ate, passo, chao, 'tiras')} material={toon('#7A828E')} receiveShadow />,
		<mesh key="fivelas" geometry={cintos(de, ate, passo, chao, 'fivelas')} material={toon('#D9DEE6')} />,
	];
	for (let x = de, i = 0; x <= ate; x += passo, i++) {
		for (const lado of [-1, 1]) {
			for (const faixa of [0.62, 1.16]) {
				const z = lado * faixa;
				itens.push(
					<group key={`${i}-${lado}-${faixa}`} position={[x, chao, z]}>
						<Malha g={caixa(0.55, 0.45, 0.48)} m={toon(COR_BANCO)} position={[0, 0.22, 0]} contorno={0.02} />
						<Malha g={caixa(0.14, 0.85, 0.46)} m={toon(COR_BANCO)} position={[-0.22, 0.65, 0]} contorno={0.02} />
						<Malha g={caixa(0.08, 0.2, 0.3)} m={toon('#E9EDF2')} position={[-0.27, 1.0, 0]} />
					</group>,
				);
			}
		}
	}
	return <>{itens}</>;
};

// --- fuselagem partida na praia ----------------------------------------------------------------

/**
 * Pedaço da fuselagem deitado, aberto por cima (a câmera vê o interior), com bancos, janelas e a
 * faixa azul. O eixo é x; a ponta quebrada fica em +x. `y` é a altura do eixo (o casco está meio enterrado).
 */
export const Fuselagem: React.FC<{comp?: number; raio?: number; fechada?: boolean; bancos?: boolean}> = ({comp = 11, raio = 1.9, fechada = false, bancos = true}) => {
	const chao = -0.55;
	return (
		<>
			<Malha g={casco(raio, comp, fechada ? 0.0001 : 1.9)} m={toonDuplo(COR_CASCO)} contorno={0.05} />
			<Malha g={caixa(comp, 0.08, 2 * Math.sqrt(raio * raio - chao * chao) - 0.1)} m={toon('#C7CDD6')} position={[0, chao - 0.04, 0]} sombra={false} />
			{[-1, 1].map((lado) => (
				<React.Fragment key={lado}>
					<Malha g={caixa(comp, 0.2, 0.04)} m={toon(COR_FAIXA)} position={[0, -0.12, lado * (raio - 0.01)]} sombra={false} />
					{Array.from({length: Math.floor(comp / 0.95)}, (_, i) => (
						<Malha key={i} g={caixa(0.3, 0.38, 0.05)} m={toon('#1A2233')} position={[-comp / 2 + 0.7 + i * 0.95, 0.5, lado * (raio - 0.015)]} sombra={false} />
					))}
				</React.Fragment>
			))}
			{bancos ? <Bancos de={-comp / 2 + 0.8} ate={comp / 2 - 0.8} chao={chao} /> : null}
		</>
	);
};

const Fumaca: React.FC<{t: number; altura?: number; quantos?: number; opacidade?: number; tam?: number}> = ({t, altura = 9, quantos = 10, opacidade = 0.3, tam = 1.6}) => (
	<>
		{Array.from({length: quantos}, (_, i) => {
			const ciclo = 6;
			const fase = ((t + i * (ciclo / quantos)) % ciclo) / ciclo;
			const op = Math.sin(Math.PI * fase) ** 1.4 * opacidade;
			const s = tam * (0.6 + fase * 2.4);
			return <sprite key={i} material={fumacaMat('#4B4854', Math.round(op * 40) / 40)} position={[Math.sin(fase * 3 + i) * 0.5 + fase * 1.2, 0.5 + fase * altura, Math.cos(i) * 0.4]} scale={[s, s, 1]} />;
		})}
	</>
);

/** Os destroços na praia: fuselagem aberta, cauda erguida, asa cravada na areia, malas e fumaça. */
export const Destrocos: React.FC<{x: number; z: number; giro: number; escala: number; t: number}> = ({x, z, giro, escala, t}) => (
	<group position={[x, 0, z]} rotation={[0, giro, 0]} scale={escala}>
		<group position={[0, 1.15, 0]} rotation={[0.04, 0, -0.12]}>
			<Fuselagem />
		</group>
		<Cauda x={-9.5} y={0.2} z={1.2} giro={0.5} inclina={-0.18} />
		<Asa x={-1.5} y={0.5} z={-3.2} giro={Math.PI} rola={0.3} inclina={0.35} />
		<Malas x={0} z={5.5} quantas={9} raio={6} />
		<group position={[4.6, 1.2, 0.4]}>
			<Fumaca t={t} />
		</group>
		<group position={[-2.2, 0.6, -0.5]}>
			<Fumaca t={t + 2.1} altura={7} quantos={7} opacidade={0.22} tam={1.2} />
		</group>
		<sprite material={haloMat('#FF8A2A', 0.5 + 0.12 * Math.sin(t * 9))} position={[5.2, 0.7, 1.2]} scale={[2.6, 2.6, 1]} />
		<pointLight position={[5.2, 1.4, 1.2]} color="#FF8A3A" intensity={6 + 1.5 * Math.sin(t * 13)} distance={9} decay={2} />
	</group>
);

// --- avião inteiro, caindo --------------------------------------------------------------------

const Aeronave: React.FC<{fogo: boolean; t: number}> = ({fogo, t}) => (
	<group scale={1.0}>
		<Malha g={cilindro(1.9, 1.9, 30, 28)} m={toon(COR_CASCO)} rotation={[0, 0, Math.PI / 2]} contorno={0.06} />
		<Malha g={cone(1.9, 5, 28)} m={toon(COR_CASCO)} position={[17.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} contorno={0.06} />
		<Malha g={cone(1.9, 6, 28)} m={toon(COR_CASCO)} position={[-18, 0.4, 0]} rotation={[0, 0, Math.PI / 2 - 0.15]} contorno={0.06} />
		<Malha g={caixa(30, 0.25, 0.04)} m={toon(COR_FAIXA)} position={[0, -0.1, 1.9]} />
		<Malha g={caixa(30, 0.25, 0.04)} m={toon(COR_FAIXA)} position={[0, -0.1, -1.9]} />
		<Cauda x={-17} y={1.4} giro={0} />
		<Asa x={2} y={-0.5} z={1.4} giro={0} />
		<Asa x={2} y={-0.5} z={-1.4} giro={Math.PI} />
		<Malha g={cilindro(0.7, 0.62, 3.2, 18)} m={toon(COR_METAL)} position={[3.3, -1.9, 7.6]} rotation={[0, 0, Math.PI / 2]} contorno={0.04} />
		<Malha g={cilindro(0.7, 0.62, 3.2, 18)} m={toon(COR_METAL)} position={[3.3, -1.9, -7.6]} rotation={[0, 0, Math.PI / 2]} contorno={0.04} />
		{fogo ? (
			<>
				<mesh geometry={cone(0.9, 4.2, 10)} material={brilho('#FF8A2A', 1.4)} position={[-1.5, -1.9, 7.6]} rotation={[0, 0, Math.PI / 2]} scale={[1 + 0.15 * Math.sin(t * 25), 1, 1 + 0.15 * Math.cos(t * 21)]} />
				<mesh geometry={cone(0.6, 3, 10)} material={brilho('#FFD25A', 1.4)} position={[0.2, -1.9, 7.6]} rotation={[0, 0, Math.PI / 2]} />
				<sprite material={haloMat('#FF7A2A', 0.7)} position={[1, -1.9, 7.6]} scale={[9, 9, 1]} />
			</>
		) : null}
	</group>
);

export interface PropsAviao {
	de: V3;
	ate: V3;
	/** instante, em segundos do vídeo, em que começa e termina o trajeto */
	ini: number;
	fim: number;
	t: number;
	/** inclinação do mergulho em graus */
	mergulho?: number;
	fogo?: boolean;
}

/** O avião cruza o céu de `de` a `ate`, em mergulho, deixando um rastro de fumaça e fogo. */
export const AviaoCaindo: React.FC<PropsAviao> = ({de, ate, ini, fim, t, mergulho = 28, fogo = true}) => {
	const k = clamp((t - ini) / Math.max(0.01, fim - ini));
	if (t < ini - 0.001 || t > fim + 0.001) return null;
	const pos = lerp3(de, ate, easeIn(k) * 0.35 + k * 0.65);
	const dir = new THREE.Vector3(ate[0] - de[0], ate[1] - de[1], ate[2] - de[2]).normalize();
	const yaw = Math.atan2(-dir.z, dir.x);
	const pitch = Math.asin(dir.y) + 0.1 * Math.sin(t * 3);
	const rola = 0.5 * Math.sin(t * 2.2) + 0.3 * k;
	const rastro = Array.from({length: 22}, (_, i) => {
		const kk = Math.max(0, k - (i + 1) * 0.022);
		const p = lerp3(de, ate, easeIn(kk) * 0.35 + kk * 0.65);
		const s = 4 + i * 1.5;
		const op = (1 - i / 22) * 0.55;
		return <sprite key={i} material={fumacaMat(i < 5 ? '#2B2830' : '#5A5663', Math.round(op * 40) / 40)} position={p} scale={[s, s, 1]} />;
	});
	return (
		<>
			<group position={pos} rotation={[rola, yaw, pitch + (mergulho * Math.PI) / 180 * 0, 'YZX']}>
				<Aeronave fogo={fogo} t={t} />
			</group>
			{rastro}
		</>
	);
};
