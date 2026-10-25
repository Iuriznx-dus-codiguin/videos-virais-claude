// Ilhota do farol vista de perto: pedra, a base do farol (ponha o objeto farol na marca farol),
// cais de madeira e o mar em volta. Os personagens andam na pedra (y = 0).
import React from 'react';
import * as THREE from 'three';
import {aleatorio} from '../../util/mat';
import {Malha, caixa, cilindro, disco, geo, ico, toon} from '../base';

const pedraIlhota = () =>
	geo('pedraIlhota', () => {
		const g = new THREE.CylinderGeometry(13, 16, 3, 13, 1);
		g.translate(0, -1.5, 0);
		return g;
	});

const PEDRAS = (() => {
	const r = aleatorio(31);
	return Array.from({length: 16}, (_, i) => {
		const a = (i / 16) * Math.PI * 2;
		return {x: Math.cos(a) * (13 + r() * 3), z: Math.sin(a) * (13 + r() * 3), s: 1.2 + r() * 1.8};
	});
})();

export const IlhotaFarol: React.FC<{t: number; nomeClima: string}> = React.memo(() => (
	<>
		<mesh geometry={disco(500, 40)} material={toon('#24577F')} position={[0, -1.2, 0]} />
		<Malha g={pedraIlhota()} m={toon('#5B6370')} contorno={0.06} />
		{PEDRAS.map((p, i) => (
			<Malha key={i} g={ico(1, 0)} m={toon(i % 2 ? '#4E5562' : '#5D6573')} position={[p.x, -0.8, p.z]} scale={[p.s, p.s, p.s]} rotation={[i, i * 2, 0]} contorno={0.05} sombra={false} />
		))}
		{/* trilha de pedra até a porta e o cais (+z) */}
		<Malha g={caixa(1.4, 0.06, 7)} m={toon('#7A7F8A')} position={[0, 0.03, 3.2]} sombra={false} />
		<Malha g={caixa(2.2, 0.3, 12)} m={toon('#7A5A3E')} position={[3, -0.3, 16]} contorno={0.04} sombra={false} />
		{[0, 1, 2, 3].map((i) => (
			<Malha key={i} g={cilindro(0.15, 0.15, 2.4, 8)} m={toon('#5A4030')} position={[i % 2 ? 4 : 2, -1.2, 11 + Math.floor(i / 2) * 9]} sombra={false} />
		))}
	</>
));
