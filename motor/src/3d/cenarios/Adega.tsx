// Adega de pedra embaixo do farol: abóbada baixa, barris, uma lâmpada pendurada e os passageiros
// do Voo 818 dormindo sentados nas duas paredes. Escada e porta no fundo (-z).
import React from 'react';
import {Malha, brilho, caixa, cilindro, disco, haloMat, toon} from '../base';
import {FileiraDorminhocos} from '../dorminhocos';

const Barril: React.FC<{x: number; z: number; deitado?: boolean}> = ({x, z, deitado}) => (
	<group position={[x, deitado ? 0.35 : 0.45, z]} rotation={deitado ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
		<Malha g={cilindro(0.33, 0.33, 0.9, 16)} m={toon('#7A5232')} contorno={0.02} />
		{[-0.3, 0.3].map((y) => (
			<mesh key={y} geometry={cilindro(0.345, 0.345, 0.06, 16)} material={toon('#3A3A44')} position={[0, y, 0]} />
		))}
	</group>
);

export const Adega: React.FC<{t: number; nomeClima: string}> = ({t}) => {
	const balanco = Math.sin(t * 0.9) * 0.06;
	return (
		<>
			<Malha g={disco(9, 24)} m={toon('#4A4440')} sombra={false} />
			{/* paredes laterais, fundo e abóbada */}
			{[-1, 1].map((l) => (
				<Malha key={l} g={caixa(0.5, 3.2, 14)} m={toon('#6B625A')} position={[l * 3.6, 1.6, 0]} contorno={0.03} />
			))}
			<Malha g={caixa(7.6, 3.2, 0.5)} m={toon('#625A52')} position={[0, 1.6, -6.2]} contorno={0.03} />
			<Malha g={caixa(7.8, 0.4, 14)} m={toon('#57504A')} position={[0, 3.4, 0]} sombra={false} />
			{[-4, -1, 2, 5].map((z) => (
				<Malha key={z} g={caixa(7.4, 0.25, 0.3)} m={toon('#5A4030')} position={[0, 3.1, z]} contorno={0.02} sombra={false} />
			))}
			{/* blocos de pedra nas paredes */}
			{Array.from({length: 18}, (_, i) => (
				<mesh key={i} geometry={caixa(0.04, 0.5, 0.9)} material={toon('#5A524B')} position={[(i % 2 ? 1 : -1) * 3.34, 0.6 + (i % 3) * 0.9, -5 + Math.floor(i / 2) * 1.2]} />
			))}
			{/* porta e escada no fundo */}
			<Malha g={caixa(1.3, 2.2, 0.1)} m={toon('#4A3424')} position={[0, 1.1, -5.9]} contorno={0.02} />
			{[0, 1, 2].map((i) => (
				<Malha key={i} g={caixa(1.5, 0.2, 0.4)} m={toon('#6B625A')} position={[0, 0.1 + i * 0.2, -5.3 + i * -0.2]} sombra={false} />
			))}
			<Barril x={-2.6} z={-4.6} />
			<Barril x={-2.0} z={-4.9} />
			<Barril x={2.5} z={-4.7} deitado />
			{/* passageiros dormindo nas duas paredes, olhando o corredor */}
			<FileiraDorminhocos x={-3.0} z={0} giro={Math.PI / 2} quantos={14} passo={0.6} t={t} semente={1} />
			<FileiraDorminhocos x={3.0} z={0} giro={-Math.PI / 2} quantos={14} passo={0.6} t={t} semente={40} />
			<FileiraDorminhocos x={-2.2} z={0.3} giro={Math.PI / 2} quantos={10} passo={0.68} t={t} semente={80} />
			<FileiraDorminhocos x={2.2} z={0.3} giro={-Math.PI / 2} quantos={10} passo={0.68} t={t} semente={120} />
			{/* lâmpada pendurada balançando */}
			<group position={[0, 3.0, 0.5]} rotation={[balanco, 0, balanco * 0.5]}>
				<mesh geometry={cilindro(0.008, 0.008, 0.9, 4)} material={toon('#222')} position={[0, -0.45, 0]} />
				<mesh geometry={cilindro(0.1, 0.22, 0.16, 12)} material={toon('#3A3A44')} position={[0, -0.95, 0]} />
				<mesh geometry={cilindro(0.06, 0.06, 0.08, 10)} material={brilho('#FFE2A0', 2)} position={[0, -1.06, 0]} />
				<sprite material={haloMat('#FFD98A', 0.7)} position={[0, -1.1, 0]} scale={[1.4, 1.4, 1]} />
				<pointLight position={[0, -1.15, 0]} color="#FFD58A" intensity={9} distance={11} decay={2} />
			</group>
		</>
	);
};
