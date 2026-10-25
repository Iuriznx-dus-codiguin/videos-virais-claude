// Montanha à noite vista do alto da mata: copas escuras na frente, a montanha com a caverna no
// meio e névoa na base. Os olhos do gigante aparecem dentro da caverna.
import React from 'react';
import * as THREE from 'three';
import {aleatorio} from '../../util/mat';
import {Malha, basico, disco, esfera, geo, ico, toon, translucido} from '../base';

/** Montanha: icosaedro subdividido e deformado por ruído fixo, achatado embaixo. */
const montanha = () =>
	geo('montanha', () => {
		const g = new THREE.IcosahedronGeometry(1, 3);
		const pos = g.attributes.position as THREE.BufferAttribute;
		const r = aleatorio(3);
		const desloc = Array.from({length: 40}, () => [r() * 6.28, r() * 6.28, 0.04 + r() * 0.06] as const);
		for (let i = 0; i < pos.count; i++) {
			const v = new THREE.Vector3().fromBufferAttribute(pos, i);
			let k = 1;
			for (const [a, b, amp] of desloc) k += amp * Math.sin(v.x * 3.1 + a) * Math.sin(v.z * 2.7 + b) * Math.cos(v.y * 2.3 + a);
			v.multiplyScalar(k);
			if (v.y < 0) v.y *= 0.2;
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		g.computeVertexNormals();
		return g;
	});

const COPAS = (() => {
	const r = aleatorio(19);
	return Array.from({length: 26}, (_, i) => ({
		x: (r() - 0.5) * (14 + i * 1.6),
		y: -2.5 - i * 0.35 + r() * 1.2,
		z: 2 - i * 1.6,
		s: 2.2 + r() * 1.6,
	}));
})();

const Estatico: React.FC = React.memo(() => (
	<>
		<Malha g={montanha()} m={toon('#3B4A5E')} position={[0, 0, -78]} scale={[38, 46, 26]} contorno={0.25} sombra={false} />
		<Malha g={montanha()} m={toon('#2E3A4C')} position={[-48, 0, -95]} scale={[30, 28, 20]} rotation={[0, 1.2, 0]} sombra={false} />
		<Malha g={montanha()} m={toon('#2E3A4C')} position={[52, 0, -100]} scale={[34, 32, 22]} rotation={[0, 2.4, 0]} sombra={false} />
		{/* boca da caverna: escuridão funda, com borda de pedra */}
		<group position={[0, 16, -55.5]} rotation={[-0.25, 0, 0]}>
			<mesh geometry={esfera(1, 24, 16)} material={basico('#05070C')} scale={[7.5, 6.2, 2.2]} />
			{Array.from({length: 12}, (_, i) => {
				const a = (i / 12) * Math.PI * 2;
				return <Malha key={i} g={ico(1.6 + (i % 3) * 0.5, 0)} m={toon('#4A586C')} position={[Math.cos(a) * 7.6, Math.sin(a) * 6.3, 0.6]} rotation={[a, a * 2, 0]} contorno={0.08} sombra={false} />;
			})}
		</group>
		{/* copas de árvores no primeiro plano, descendo a encosta */}
		{COPAS.map((c, i) => (
			<Malha key={i} g={ico(1, 1)} m={toon(i % 2 ? '#183620' : '#22492B')} position={[c.x, c.y, c.z]} scale={[c.s, c.s * 0.7, c.s]} rotation={[0, i, 0]} contorno={0.08} sombra={false} />
		))}
		{/* névoa na base da montanha */}
		{[0, 1, 2].map((i) => (
			<mesh key={i} geometry={disco(1, 32)} material={translucido('#6F84A8', 0.12)} position={[0, 3 + i * 2.5, -50 - i * 6]} scale={[90, 1, 26]} />
		))}
		<mesh geometry={disco(400, 32)} material={toon('#0E1A2A')} position={[0, -8, -60]} />
	</>
));

export const Montanha: React.FC<{t: number; nomeClima: string}> = () => <Estatico />;
