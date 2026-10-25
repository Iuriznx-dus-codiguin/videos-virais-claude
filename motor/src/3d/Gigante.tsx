// O Gigante: nunca aparece inteiro. Corpo escuro enorme, pernas grossas, pés de três dedos
// com garras e olhos amarelos que brilham no escuro.
import React from 'react';
import {ikPerna} from '../animacao/pose';
import {EstadoGigante, corpoGigante} from '../animacao/simulacao';
import {clamp, easeInOut, lerp} from '../util/mat';
import {Malha, basico, brilho, capsula, cone, esfera, haloMat, toon} from './base';

const COXA = 2.5;
const CANELA = 2.4;
const TORNOZELO = 0.35;

const Olho: React.FC<{lado: 1 | -1; abre: number; luz: number; yaw: number; pitch: number}> = ({lado, abre, luz, yaw, pitch}) => (
	<group scale={[1, Math.max(0.02, abre), 1]}>
		<mesh geometry={esfera(1, 20, 13)} material={brilho('#FFE14D', luz)} scale={[0.3, 0.24, 0.12]} />
		<mesh geometry={esfera(1, 16, 9)} material={basico('#000000')} position={[clamp(yaw, -0.5, 0.5) * 0.12, -clamp(pitch, -0.5, 0.5) * 0.08, 0.1]} scale={[0.06, 0.2, 0.05]} />
		{/* pálpebra de cima, em ângulo, deixa o olhar bravo */}
		<mesh geometry={esfera(1, 16, 9)} material={basico('#0B120E')} position={[-0.08 * lado, 0.2, 0.06]} rotation={[0, 0, 0.42 * lado]} scale={[0.4, 0.13, 0.14]} />
		<sprite material={haloMat('#FFD23A', 0.7)} scale={[1.3 * luz, 1.3 * luz, 1]} />
	</group>
);

const Pe: React.FC<{cor: string}> = ({cor}) => {
	const m = toon(cor);
	return (
		<group>
			<Malha g={esfera(1, 18, 12)} m={m} position={[0, 0.05, 0.35]} scale={[0.75, 0.32, 1.25]} contorno={0.05} />
			{[-0.42, 0, 0.42].map((x, i) => (
				<group key={i} position={[x * 1.1, 0.02, 1.35 + (i === 1 ? 0.2 : 0)]} rotation={[0, x * 0.5, 0]}>
					<Malha g={esfera(1, 14, 9)} m={m} scale={[0.26, 0.22, 0.55]} contorno={0.04} />
					<Malha g={cone(0.14, 0.42, 8)} m={toon('#D8D2C0')} position={[0, -0.02, 0.6]} rotation={[Math.PI / 2 + 0.25, 0, 0]} contorno={0.03} />
				</group>
			))}
		</group>
	);
};

export const Gigante: React.FC<{e: EstadoGigante}> = ({e}) => {
	const cor = e.bib.visual?.corpo ?? '#34443D';
	const luz = e.brilho;
	if (e.soOlhos && e.pontoOlhos) {
		return (
			<group position={e.pontoOlhos} rotation={[0, e.yaw, 0]} scale={e.escala}>
				{([1, -1] as const).map((lado) => (
					<group key={lado} position={[0.45 * lado, 0, 0]}>
						<Olho lado={lado} abre={e.olhos} luz={luz} yaw={e.olharYaw} pitch={e.olharPitch} />
					</group>
				))}
			</group>
		);
	}
	const c = corpoGigante(e.altura);
	const m = toon(cor);
	const ph = 2 * Math.PI * e.fase;
	const balanco = e.andando * 0.18 * Math.cos(2 * ph);
	const quadril = c.quadril + balanco;
	// pés: em pé ficam embaixo do quadril; agachado, para trás. Andando, ciclo de passos.
	const pe = (desloc: number, lado: 1 | -1) => {
		const agach = 1 - easeInOut(e.altura);
		let z = lerp(0.15, -1.6, agach) * (lado === 1 ? 1 : 0.8);
		let y = -(quadril - TORNOZELO);
		if (e.andando > 0.001) {
			let u = (e.fase + desloc) % 1;
			if (u < 0) u += 1;
			const apoio = 0.6;
			const meio = 2.1;
			let pz: number;
			let py = 0;
			if (u < apoio) pz = lerp(meio, -meio, u / apoio);
			else {
				const k = (u - apoio) / (1 - apoio);
				pz = lerp(-meio, meio, easeInOut(k));
				py = 1.1 * Math.sin(Math.PI * k);
			}
			z = lerp(z, pz, e.andando);
			y += py * e.andando;
		}
		return ikPerna(z, y, COXA, CANELA);
	};
	const pernas = {E: pe(0, 1), D: pe(0.5, -1)};
	return (
		<group position={[e.x, 0, e.z]} rotation={[0, e.yaw, 0]} scale={e.escala}>
			<group position={[0, quadril, 0]}>
				<group rotation={[c.incl - 0.15 * e.rugido + e.agito, 0, 0.04 * e.andando * Math.sin(ph)]}>
					<Malha g={esfera(1, 28, 18)} m={m} position={[0, c.cy, 0]} scale={[2.0, 2.45, 1.75]} contorno={0.08} />
					{/* ombros e braços pendurados */}
					{([1, -1] as const).map((lado) => (
						<group key={lado} position={[1.75 * lado, c.cy + 0.9, 0.2]} rotation={[0.25 * Math.sin(ph + (lado === 1 ? 0 : Math.PI)) * e.andando - 0.15, 0, lado * 0.22]}>
							<Malha g={capsula(0.42, 2.6, 12)} m={m} position={[0, -1.5, 0]} contorno={0.06} />
							{[-0.18, 0, 0.18].map((x, i) => (
								<Malha key={i} g={cone(0.1, 0.45, 8)} m={toon('#D8D2C0')} position={[x, -3.1, 0.12]} rotation={[Math.PI - 0.3, 0, 0]} contorno={0.025} />
							))}
						</group>
					))}
					<group position={[0, c.cy + c.oy, c.oz]}>
						{([1, -1] as const).map((lado) => (
							<group key={lado} position={[0.48 * lado, 0, 0]} rotation={[-c.incl * 0.9, 0, 0]}>
								<Olho lado={lado} abre={e.olhos} luz={luz} yaw={e.olharYaw} pitch={e.olharPitch} />
							</group>
						))}
					</group>
				</group>
				{([1, -1] as const).map((lado) => {
					const ang = lado === 1 ? pernas.E : pernas.D;
					return (
						<group key={lado} position={[0.95 * lado, 0, 0]} rotation={[-ang.coxa, 0, lado * 0.06]}>
							<Malha g={capsula(0.62, COXA, 12)} m={m} position={[0, -COXA / 2, 0]} contorno={0.06} />
							<group position={[0, -COXA, 0]} rotation={[ang.joelho, 0, 0]}>
								<Malha g={capsula(0.5, CANELA, 12)} m={m} position={[0, -CANELA / 2, 0]} contorno={0.06} />
								<group position={[0, -CANELA, 0]} rotation={[ang.coxa - ang.joelho, 0, -lado * 0.06]}>
									<group position={[0, -TORNOZELO + 0.32, 0]}>
										<Pe cor={cor} />
									</group>
								</group>
							</group>
						</group>
					);
				})}
			</group>
		</group>
	);
};
