// Elementos de natureza usados pelos cenários: coqueiro, arbusto, pedra, nuvem, árvore da
// mata, samambaia e cipó. Todos estáticos (memorizados) para não pesar a cada quadro.
import React from 'react';
import * as THREE from 'three';
import {V3, aleatorio, lerp} from '../util/mat';
import {Contorno, Malha, basico, cilindro, esfera, geo, ico, toon} from './base';

export interface DefPalmeira {
	x: number;
	z: number;
	altura: number;
	inclinacao: number;
	direcao: number;
}

export const Palmeira: React.FC<{d: DefPalmeira; tronco?: string; folha?: string; folhaEscura?: string}> = React.memo(
	({d, tronco = '#8A5A3B', folha = '#3FA34D', folhaEscura = '#2E7D3A'}) => {
		const {altura: h, inclinacao: incl, direcao: ang} = d;
		const dx = Math.sin(ang);
		const dz = Math.cos(ang);
		const ponto = (s: number) => new THREE.Vector3(d.x + incl * h * s * s * dx, h * s, d.z + incl * h * s * s * dz);
		const n = 7;
		const listra = '#' + new THREE.Color(tronco).multiplyScalar(0.88).getHexString();
		const topo = ponto(1);
		return (
			<group>
				{Array.from({length: n}, (_, k) => {
					const a = ponto(k / n);
					const b = ponto((k + 1) / n);
					const dir = b.clone().sub(a);
					const qt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
					return (
						<mesh
							key={k}
							geometry={cilindro(lerp(0.3, 0.17, k / n), lerp(0.3, 0.17, (k + 1) / n), dir.length(), 14)}
							material={toon(k % 2 === 0 ? tronco : listra)}
							position={a.clone().add(b).multiplyScalar(0.5)}
							quaternion={qt}
							castShadow
							receiveShadow
						>
							<Contorno espessura={0.04} />
						</mesh>
					);
				})}
				{Array.from({length: 7}, (_, k) => {
					const cor = k % 2 === 0 ? folha : folhaEscura;
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
	},
);

export const Arbusto: React.FC<{x: number; z: number; r: number; cor: string; giro?: number; y?: number}> = React.memo(({x, z, r, cor, giro = 0, y = 0}) => (
	<group position={[x, y, z]} rotation={[0, giro, 0]}>
		<Malha g={ico(r, 1)} m={toon(cor)} position={[0, r * 0.8, 0]} scale={[1, 0.85, 1]} contorno={0.05} />
		<Malha g={ico(r * 0.6, 0)} m={toon(cor)} position={[-0.3 * r, 1.35 * r, -0.2 * r]} rotation={[0, 1.1, 0]} contorno={0.05} />
	</group>
));

export const Pedra: React.FC<{x: number; z: number; r: number; cor?: string; giro?: number; achatada?: number; y?: number}> = React.memo(
	({x, z, r, cor = '#8C8A99', giro = 0, achatada = 0.6, y = 0}) => (
		<Malha g={ico(r, 0)} m={toon(cor)} position={[x, y + r * 0.2, z]} scale={[1, achatada, 0.85]} rotation={[0, giro, 0]} contorno={0.04} />
	),
);

export const Nuvem: React.FC<{pos: V3; escala: number; cor: string}> = React.memo(({pos, escala: e, cor}) => (
	<group position={pos}>
		{[
			[-1.2, 0, 0, 1.0],
			[0, 0.35, 0, 1.3],
			[1.3, 0.05, 0, 0.9],
			[0.5, -0.15, 0.3, 1.0],
		].map(([ox, oy, oz, rr], j) => (
			<mesh key={j} geometry={esfera(1, 16, 9)} material={basico(cor)} position={[ox * e, oy * e, oz * e]} scale={[rr * e, rr * e * 0.55, rr * e * 0.7]} />
		))}
	</group>
));

/** Árvore da mata: tronco grosso levemente torto, raízes na base e copa em blocos. */
export const Arvore: React.FC<{x: number; z: number; altura: number; raio: number; semente: number; cores: {tronco: string; folha: string; folhaEscura: string}}> = React.memo(
	({x, z, altura, raio, semente, cores}) => {
		const r = aleatorio(semente);
		const curva = (r() - 0.5) * 0.6;
		const dirA = r() * Math.PI * 2;
		const ponto = (s: number) => new THREE.Vector3(x + Math.sin(dirA) * curva * s * s * altura * 0.3, altura * s, z + Math.cos(dirA) * curva * s * s * altura * 0.3);
		const n = 5;
		const topo = ponto(1);
		const blocos = Array.from({length: 6}, () => [r() - 0.5, r() * 0.6, r() - 0.5, 0.75 + r() * 0.5] as const);
		return (
			<group>
				{Array.from({length: n}, (_, k) => {
					const a = ponto(k / n);
					const b = ponto((k + 1) / n);
					const dir = b.clone().sub(a);
					const qt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
					return (
						<mesh
							key={k}
							geometry={cilindro(raio * lerp(1, 0.6, k / n), raio * lerp(1, 0.6, (k + 1) / n), dir.length() * 1.02, 12)}
							material={toon(cores.tronco)}
							position={a.clone().add(b).multiplyScalar(0.5)}
							quaternion={qt}
							castShadow
							receiveShadow
						>
							<Contorno espessura={0.05} />
						</mesh>
					);
				})}
				{[0, 1, 2, 3].map((k) => {
					const ang = dirA + (k * Math.PI) / 2 + 0.4;
					return (
						<Malha
							key={k}
							g={esfera(1, 10, 7)}
							m={toon(cores.tronco)}
							position={[x + Math.sin(ang) * raio * 1.1, raio * 0.35, z + Math.cos(ang) * raio * 1.1]}
							rotation={[0, ang, 0]}
							scale={[raio * 0.45, raio * 0.55, raio * 1.3]}
							contorno={0.04}
						/>
					);
				})}
				{blocos.map(([ox, oy, oz, s], k) => (
					<Malha
						key={k}
						g={ico(1, 1)}
						m={toon(k % 2 ? cores.folha : cores.folhaEscura)}
						position={[topo.x + ox * altura * 0.45, topo.y + oy * 1.6 - 0.3, topo.z + oz * altura * 0.45]}
						scale={[s * altura * 0.24, s * altura * 0.17, s * altura * 0.24]}
						rotation={[0, k * 1.3, 0]}
						contorno={0.06}
					/>
				))}
			</group>
		);
	},
);

const folhaSamambaia = () =>
	geo('samambaia', () => {
		const g = new THREE.SphereGeometry(1, 10, 6);
		g.scale(0.16, 0.03, 0.7);
		g.translate(0, 0, 0.7);
		return g;
	});

/** Samambaia: leque de folhas compridas saindo do chão. */
export const Samambaia: React.FC<{x: number; z: number; tam: number; cor: string; semente: number}> = React.memo(({x, z, tam, cor, semente}) => {
	const r = aleatorio(semente);
	const n = 7;
	return (
		<group position={[x, 0.02, z]} scale={tam}>
			{Array.from({length: n}, (_, k) => (
				<group key={k} rotation={[0, (k / n) * Math.PI * 2 + r(), 0]}>
					<Malha g={folhaSamambaia()} m={toon(cor)} rotation={[-0.55 - r() * 0.35, 0, 0]} contorno={0.02} />
				</group>
			))}
		</group>
	);
});

/** Cipó pendurado: cilindro fino que cai da copa, com folhinhas. */
export const Cipo: React.FC<{x: number; z: number; topo: number; comp: number; cor: string; folha: string}> = React.memo(({x, z, topo, comp, cor, folha}) => (
	<group position={[x, topo - comp / 2, z]}>
		<Malha g={cilindro(0.035, 0.035, comp, 6)} m={toon(cor)} contorno={0.015} sombra={false} />
		{[0.2, 0.45, 0.7].map((s, k) => (
			<Malha key={k} g={esfera(1, 8, 6)} m={toon(folha)} position={[0.07 * (k % 2 ? 1 : -1), comp / 2 - s * comp, 0]} scale={[0.12, 0.05, 0.07]} contorno={0.012} sombra={false} />
		))}
	</group>
));
