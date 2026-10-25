// Passageiros adormecidos: palitos sentados no chão, encostados, de olhos fechados e cabeça
// caída. Peça fixa de cenário (sem animação além da respiração), barata para pôr dezenas.
import React from 'react';
import {Malha, capsula, caixa, esfera, toon} from './base';

const CORES = ['#22232A', '#2A3550', '#3A2A40', '#20343A', '#3B3226', '#2C2C3C'];

export const Dorminhoco: React.FC<{x: number; z: number; giro: number; t: number; semente: number}> = ({x, z, giro, t, semente}) => {
	const cor = CORES[semente % CORES.length];
	const tomba = ((semente * 37) % 7) / 7 - 0.5;
	const resp = Math.sin(t * 1.4 + semente) * 0.012;
	return (
		<group position={[x, 0, z]} rotation={[0, giro, 0]}>
			{/* pernas dobradas para a frente (+z) */}
			{[-0.1, 0.1].map((lx) => (
				<React.Fragment key={lx}>
					<Malha g={capsula(0.045, 0.42)} m={toon(cor)} position={[lx, 0.32, 0.2]} rotation={[-0.75, 0, 0]} sombra={false} />
					<Malha g={capsula(0.045, 0.36)} m={toon(cor)} position={[lx, 0.2, 0.47]} rotation={[0.6, 0, 0]} sombra={false} />
				</React.Fragment>
			))}
			{/* tronco encostado (para trás, -z) */}
			<group position={[0, 0.12, 0]} rotation={[-0.25 + resp, 0, tomba * 0.2]}>
				<Malha g={capsula(0.06, 0.62)} m={toon(cor)} position={[0, 0.42, 0]} sombra={false} />
				<Malha g={capsula(0.04, 0.4)} m={toon(cor)} position={[-0.16, 0.42, 0.14]} rotation={[0.9, 0, 0.3]} sombra={false} />
				<Malha g={capsula(0.04, 0.4)} m={toon(cor)} position={[0.16, 0.42, 0.14]} rotation={[0.9, 0, -0.3]} sombra={false} />
				<group position={[0, 0.98, 0.02]} rotation={[0.35, 0, tomba * 0.9]}>
					<Malha g={esfera(0.24, 18, 12)} m={toon('#FFFFFF')} contorno={0.012} sombra={false} />
					{[-0.08, 0.08].map((ox) => (
						<mesh key={ox} geometry={caixa(0.07, 0.014, 0.01)} material={toon('#15121C')} position={[ox, 0.02, 0.235]} />
					))}
				</group>
			</group>
		</group>
	);
};

/** Fileira de `quantos` adormecidos ao longo do eixo x local, olhando para +z local. */
export const FileiraDorminhocos: React.FC<{x: number; z: number; giro: number; quantos: number; passo?: number; t: number; semente: number}> = ({
	x,
	z,
	giro,
	quantos,
	passo = 0.62,
	t,
	semente,
}) => (
	<group position={[x, 0, z]} rotation={[0, giro, 0]}>
		{Array.from({length: quantos}, (_, i) => (
			<Dorminhoco key={i} x={(i - (quantos - 1) / 2) * passo} z={(i % 2) * 0.12} giro={((i * 13) % 5) * 0.08 - 0.16} t={t} semente={semente + i} />
		))}
	</group>
);
