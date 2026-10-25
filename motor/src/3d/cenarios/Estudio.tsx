// Estúdio do Como Funciona: chão escuro com grade de planta técnica, pedestal redondo no centro
// para a maquete do dia, fundo curvo azul-marinho com um telão de planta técnica e refletores.
import React from 'react';
import * as THREE from 'three';
import {Malha, brilho, caixa, cilindro, disco, geo, gradiente, haloMat, memo, toon, toro} from '../base';
import {engrenagemGeo} from '../Maquete';

const GRADE = '#2B57A0';

const Grade: React.FC = React.memo(() => {
	const linhas: React.ReactNode[] = [];
	const meio = 7;
	for (let i = -meio; i <= meio; i++) {
		const forte = i % 4 === 0;
		const m = brilho(forte ? '#3D74C9' : GRADE, forte ? 0.75 : 0.5);
		const comp = 2 * Math.sqrt(Math.max(0, 7.6 ** 2 - (i * 0.5) ** 2 * 4));
		linhas.push(<mesh key={`x${i}`} geometry={caixa(comp, 0.004, forte ? 0.03 : 0.016)} material={m} position={[0, 0.003, i]} />);
		linhas.push(<mesh key={`z${i}`} geometry={caixa(forte ? 0.03 : 0.016, 0.004, comp)} material={m} position={[i, 0.003, 0]} />);
	}
	return <>{linhas}</>;
});

const fundoGeo = () =>
	geo('ciclorama', () => {
		const g = new THREE.CylinderGeometry(8.5, 8.5, 9, 64, 1, true, Math.PI * 0.45, Math.PI * 1.1);
		g.translate(0, 4.5, 1.5);
		return g;
	});

const fundoMat = () => memo('ciclorama', () => new THREE.MeshToonMaterial({color: '#122347', gradientMap: gradiente, side: THREE.BackSide}));

/** Telão de planta técnica: quadro azul com grade, engrenagens e traços brancos. */
const Telao: React.FC<{t: number}> = React.memo(({t}) => (
	<group position={[0, 3.6, -6.4]}>
		<Malha g={caixa(7.4, 4.2, 0.08)} m={toon('#173E78')} contorno={0.03} />
		{Array.from({length: 13}, (_, i) => (
			<mesh key={`v${i}`} geometry={caixa(0.014, 4.0, 0.01)} material={brilho('#3E7BD0', 0.7)} position={[-3.6 + i * 0.6, 0, 0.05]} />
		))}
		{Array.from({length: 7}, (_, i) => (
			<mesh key={`h${i}`} geometry={caixa(7.2, 0.014, 0.01)} material={brilho('#3E7BD0', 0.7)} position={[0, -1.8 + i * 0.6, 0.05]} />
		))}
		<mesh geometry={engrenagemGeo(1.05, 0.02, 14)} material={brilho('#CFE6FF', 0.85)} position={[-2.3, 0.4, 0.07]} rotation={[Math.PI / 2, 0, 0]} />
		<mesh geometry={engrenagemGeo(0.62, 0.02, 10)} material={brilho('#CFE6FF', 0.85)} position={[-0.86, -0.45, 0.07]} rotation={[Math.PI / 2, 0, 0]} />
		<mesh geometry={toro(0.9, 0.012, 64, 6)} material={brilho('#CFE6FF', 0.85)} position={[2.2, 0.3, 0.07]} rotation={[Math.PI / 2, 0, 0]} />
		<mesh geometry={toro(0.5, 0.012, 64, 6)} material={brilho('#CFE6FF', 0.85)} position={[2.2, 0.3, 0.07]} rotation={[Math.PI / 2, 0, 0]} />
		<mesh geometry={caixa(2.2, 0.014, 0.01)} material={brilho('#CFE6FF', 0.85)} position={[2.2, 0.3, 0.07]} />
		<mesh geometry={caixa(0.014, 2.2, 0.01)} material={brilho('#CFE6FF', 0.85)} position={[2.2, 0.3, 0.07]} />
		<mesh geometry={caixa(2.4, 0.03, 0.01)} material={brilho('#FFD60A', 0.9)} position={[1.9, -1.5, 0.07]} />
		{/* luz que corre pelo telão, devagar */}
		<mesh geometry={caixa(0.05, 4.0, 0.01)} material={brilho('#9FD0FF', 0.6)} position={[-3.6 + ((t * 0.5) % 7.2), 0, 0.06]} />
	</group>
));

const Refletor: React.FC<{x: number; z: number; mira: number}> = React.memo(({x, z, mira}) => (
	<group position={[x, 0, z]} rotation={[0, mira, 0]}>
		<Malha g={cilindro(0.35, 0.35, 0.05, 20)} m={toon('#2A2F3A')} position={[0, 0.03, 0]} contorno={0.015} />
		<Malha g={cilindro(0.035, 0.035, 2.6, 10)} m={toon('#3A404C')} position={[0, 1.3, 0]} contorno={0.012} />
		<group position={[0, 2.65, 0]} rotation={[0.5, 0, 0]}>
			<Malha g={cilindro(0.26, 0.18, 0.42, 20)} m={toon('#1E222B')} rotation={[Math.PI / 2, 0, 0]} contorno={0.015} />
			<mesh geometry={cilindro(0.22, 0.22, 0.01, 20)} material={brilho('#FFF4DC', 1.4)} position={[0, 0, 0.215]} rotation={[Math.PI / 2, 0, 0]} />
			<sprite material={haloMat('#FFF1D0', 0.6)} position={[0, 0, 0.3]} scale={[1.2, 1.2, 1]} />
		</group>
	</group>
));

export const Estudio: React.FC<{t: number; nomeClima: string}> = ({t}) => (
	<>
		<mesh geometry={disco(16, 64)} material={toon('#0D1832')} receiveShadow />
		<Grade />
		<mesh geometry={fundoGeo()} material={fundoMat()} receiveShadow />
		<Telao t={t} />
		{/* pedestal da maquete */}
		<Malha g={cilindro(1.0, 1.0, 0.12, 40)} m={toon('#2A3550')} position={[0, 0.06, 0]} contorno={0.02} />
		<Malha g={cilindro(0.8, 0.86, 0.88, 40)} m={toon('#E6EAF1')} position={[0, 0.56, 0]} contorno={0.025} />
		<mesh geometry={toro(0.84, 0.02, 64, 8)} material={brilho('#4FD1FF', 1.1)} position={[0, 0.99, 0]} />
		<mesh geometry={toro(0.98, 0.015, 64, 8)} material={brilho('#4FD1FF', 0.9)} position={[0, 0.125, 0]} />
		<Refletor x={-4.2} z={-3.2} mira={0.7} />
		<Refletor x={4.2} z={-3.2} mira={-0.7} />
		<pointLight position={[0, 4.5, 3]} color="#FFF4E0" intensity={6} distance={14} decay={2} />
		<pointLight position={[0, 2.2, -4]} color="#4FA8FF" intensity={3} distance={9} decay={2} />
	</>
);
