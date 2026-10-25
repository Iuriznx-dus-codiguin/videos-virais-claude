// Mirante no alto da ilha: laje de pedra na beira de um penhasco, olhando o mar lá embaixo (+z).
// O mar fica 35 m abaixo; ponha farol e barco com alt: -35. O farol fica em "farol" e o barco no cais.
import React from 'react';
import * as THREE from 'three';
import {aleatorio} from '../../util/mat';
import {Malha, caixa, disco, geo, ico, toon} from '../base';
import {Samambaia} from '../natureza';

export const NIVEL_MAR = -35;

const laje = () =>
	geo('lajeMirante', () => {
		const g = new THREE.CylinderGeometry(7, 9, 4, 11, 1);
		g.translate(0, -2, 0);
		return g;
	});

const ROCHAS = (() => {
	const r = aleatorio(23);
	// só atrás e dos lados da laje (a frente, +z, fica livre para a vista)
	return Array.from({length: 12}, (_, i) => {
		const a = Math.PI * (1.05 + (i / 11) * 0.9);
		return {x: Math.cos(a) * (8 + r() * 2), y: -4 - r() * 6, z: -3 + Math.sin(a) * (7 + r() * 2), s: 1.5 + r() * 1.5};
	});
})();

const Estatico: React.FC = React.memo(() => (
	<>
		<Malha g={laje()} m={toon('#5B6370')} position={[0, 0, -3]} contorno={0.06} />
		<Malha g={disco(7.05, 11)} m={toon('#4F6A45')} position={[0, 0.01, -4.2]} scale={[1, 1, 0.75]} sombra={false} />
		{ROCHAS.map((p, i) => (
			<Malha key={i} g={ico(1, 0)} m={toon(i % 2 ? '#4E5562' : '#5D6573')} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 2.2, p.s]} rotation={[i, i * 2, 0]} contorno={0.06} sombra={false} />
		))}
		{/* penhasco descendo até o mar */}
		<Malha g={ico(1, 1)} m={toon('#4A505C')} position={[0, -21, -6]} scale={[14, 19, 10]} contorno={0.1} sombra={false} />
		{/* mar, enseada e cais */}
		<mesh geometry={disco(500, 48)} material={toon('#2A6A9A', [0.02, 0.07, 0.13])} position={[0, NIVEL_MAR, 0]} />
		<Malha g={disco(1, 24)} m={toon('#D8C49A')} position={[10, NIVEL_MAR + 0.05, 38]} scale={[30, 1, 12]} sombra={false} />
		<Malha g={caixa(2, 0.6, 16)} m={toon('#7A5A3E')} position={[14, NIVEL_MAR + 0.6, 52]} contorno={0.05} sombra={false} />
		{[
			[-40, 140, 9],
			[55, 170, 12],
			[-80, 90, 7],
		].map(([x, z, s], i) => (
			<Malha key={i} g={ico(1, 1)} m={toon('#33503B')} position={[x, NIVEL_MAR, z]} scale={[s * 2, s, s * 1.6]} contorno={0.1} sombra={false} />
		))}
		{[
			[-3.2, -4.2],
			[3.6, -3.5],
			[-4.4, -0.5],
		].map(([x, z], i) => (
			<Samambaia key={i} x={x} z={z} tam={1.2} cor="#2F6B3A" semente={i * 17} />
		))}
	</>
));

export const Mirante: React.FC<{t: number; nomeClima: string}> = () => <Estatico />;
