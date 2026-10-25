// Cabine do Voo 818 por dentro: corredor comprido (eixo z), bancos azuis dos dois lados, bagageiros,
// luzes de teto e celulares acesos nos bancos vazios. O casco é fechado: use câmera dentro dele.
import React from 'react';
import {Malha, brilho, caixa, cilindro, haloMat, toon} from '../base';
import {Fuselagem} from '../aviao';

const COMP = 26;
const CHAO = -0.55;
const PASSO = 0.95;

/** Bancos que têm um celular aceso: [índice da fileira, lado, faixa]. */
const CELULARES: [number, number, number][] = [
	[3, 1, 1.16],
	[6, -1, 0.62],
	[8, 1, 0.62],
	[11, -1, 1.16],
	[14, 1, 1.16],
	[16, -1, 0.62],
	[19, 1, 0.62],
	[21, -1, 1.16],
];

const Celular: React.FC<{x: number; z: number; fase: number; t: number}> = ({x, z, fase, t}) => {
	const pulsa = Math.sin(t * 7 + fase) > 0.1;
	return (
		<group position={[x, CHAO + 0.47, z]} rotation={[0, fase, 0]}>
			<Malha g={caixa(0.14, 0.012, 0.07)} m={toon('#15181F')} contorno={0.006} sombra={false} />
			<mesh geometry={caixa(0.12, 0.006, 0.058)} material={pulsa ? brilho('#9FD4FF', 1.3) : toon('#1D2A3A')} position={[0, 0.008, 0]} />
			{pulsa ? <sprite material={haloMat('#8FC8FF', 0.55)} position={[0, 0.12, 0]} scale={[0.55, 0.55, 1]} /> : null}
		</group>
	);
};

const Interior: React.FC<{t: number}> = ({t}) => (
	<group position={[0, 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
		<Fuselagem comp={COMP} fechada />
		{/* tapete do corredor */}
		<Malha g={caixa(COMP, 0.02, 0.62)} m={toon('#33405A')} position={[0, CHAO + 0.005, 0]} sombra={false} />
		{/* bagageiros e luzes de teto */}
		{[-1, 1].map((lado) => (
			<React.Fragment key={lado}>
				<Malha g={caixa(COMP, 0.42, 0.52)} m={toon('#D5DAE2')} position={[0, 1.02, lado * 1.22]} rotation={[lado * 0.28, 0, 0]} contorno={0.02} sombra={false} />
				<mesh geometry={caixa(COMP, 0.02, 0.12)} material={brilho('#FFF4DC', 1.2)} position={[0, 1.58, lado * 0.45]} />
			</React.Fragment>
		))}
		{/* fundo e frente da cabine */}
		{[-1, 1].map((p) => (
			<Malha key={p} g={cilindro(1.85, 1.85, 0.1, 32)} m={toon('#8E97A6')} position={[p * (COMP / 2 + 0.05), 0, 0]} rotation={[0, 0, Math.PI / 2]} sombra={false} />
		))}
		{[-9, -3, 3, 9].map((px) => (
			<pointLight key={px} position={[px, 1.4, 0]} color="#FFE9C4" intensity={1.8} distance={8} decay={2} />
		))}
		{CELULARES.map(([i, lado, faixa], k) => (
			<Celular key={k} x={-COMP / 2 + 0.8 + i * PASSO} z={lado * faixa} fase={k * 1.7} t={t} />
		))}
	</group>
);

export const Cabine: React.FC<{t: number; nomeClima: string}> = ({t}) => <Interior t={t} />;
