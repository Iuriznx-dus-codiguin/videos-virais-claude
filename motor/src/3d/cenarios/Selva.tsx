// Selva: clareira com fogueira no meio, trilha vindo de +z, árvores altas em volta, o arbusto
// enorme com um buraco escuro (toca do gigante) e a árvore gigante de raízes altas.
import React from 'react';
import {aleatorio} from '../../util/mat';
import {Malha, basico, cilindro, decalque, disco, esfera, ico, toon, toro} from '../base';
import {Arbusto, Arvore, Cipo, Samambaia} from '../natureza';

const CORES = {tronco: '#5E4433', folha: '#2F6B3A', folhaEscura: '#1F4D2C'};

/** Fica fora da clareira, da trilha, da toca e da árvore das raízes? */
const livre = (x: number, z: number) => {
	if (Math.hypot(x, z) < 4.6) return false;
	if (Math.abs(x + 0.8) < 2.4 && z > 2 && z < 16) return false;
	if (Math.hypot(x - 1.6, z + 6.6) < 3.8) return false;
	if (Math.hypot(x + 6.2, z + 4.6) < 3.6) return false;
	return true;
};

const ARVORES = (() => {
	const r = aleatorio(2024);
	const lista: {x: number; z: number; altura: number; raio: number; semente: number}[] = [];
	let tentativas = 0;
	while (lista.length < 34 && tentativas < 2000) {
		tentativas++;
		const ang = r() * Math.PI * 2;
		const dist = 5 + r() * 21;
		const x = Math.cos(ang) * dist;
		const z = Math.sin(ang) * dist;
		if (!livre(x, z)) continue;
		if (lista.some((a) => Math.hypot(a.x - x, a.z - z) < 3.1)) continue;
		lista.push({x, z, altura: 9 + r() * 6, raio: 0.35 + r() * 0.35, semente: Math.floor(r() * 1e6)});
	}
	return lista;
})();

const MATO = (() => {
	const r = aleatorio(77);
	const lista: {x: number; z: number; tam: number; tipo: 'samambaia' | 'arbusto'; semente: number}[] = [];
	let tentativas = 0;
	while (lista.length < 46 && tentativas < 3000) {
		tentativas++;
		const ang = r() * Math.PI * 2;
		const dist = 3.9 + r() * 18;
		const x = Math.cos(ang) * dist;
		const z = Math.sin(ang) * dist;
		if (Math.hypot(x, z) < 3.9) continue;
		if (Math.abs(x + 0.8) < 1.5 && z > 2 && z < 16) continue;
		if (Math.hypot(x - 1.6, z + 6.6) < 2.6) continue;
		lista.push({x, z, tam: 0.8 + r() * 0.9, tipo: r() < 0.6 ? 'samambaia' : 'arbusto', semente: Math.floor(r() * 1e6)});
	}
	return lista;
})();

/** Arbusto enorme com a abertura escura virada para a clareira. */
const Toca: React.FC = React.memo(() => {
	const blocos: [number, number, number, number][] = [
		[-1.9, 1.1, 0.2, 1.55],
		[1.9, 1.2, 0.0, 1.6],
		[-1.0, 2.75, -0.2, 1.5],
		[1.1, 2.85, -0.3, 1.45],
		[0, 3.4, -0.9, 1.6],
		[-2.6, 0.7, -1.5, 1.3],
		[2.7, 0.8, -1.6, 1.35],
		[0, 1.6, -2.3, 2.2],
		[-0.6, 0.45, 0.95, 0.75],
		[0.9, 0.4, 0.9, 0.7],
	];
	return (
		<group position={[1.6, 0, -6.2]} rotation={[0, -0.2, 0]}>
			{blocos.map(([x, y, z, r], i) => (
				<Malha key={i} g={ico(r, 1)} m={toon(i % 3 === 0 ? '#1F4D2C' : '#2A5E36')} position={[x, y, z]} rotation={[0, i * 0.9, 0]} scale={[1, 0.88, 1]} contorno={0.05} />
			))}
			{/* buraco escuro onde os olhos aparecem */}
			<mesh geometry={esfera(1, 20, 14)} material={basico('#070D09')} position={[0, 1.5, 0.15]} scale={[1.35, 1.05, 0.9]} />
		</group>
	);
});

/** Árvore gigante com raízes em arco (o esconderijo da parte 2 fica embaixo delas). */
const ArvoreRaizes: React.FC = React.memo(() => {
	const m = toon('#5A3F2E');
	return (
		<group position={[-6.9, 0, -4.9]}>
			<Malha g={cilindro(1.7, 1.3, 16, 16)} m={m} position={[0, 8, 0]} contorno={0.06} />
			{[0, 1, 2, 3, 4, 5].map((i) => {
				const ang = (i / 6) * Math.PI * 2 + 0.3;
				return (
					<group key={i} position={[0, 0, 0]} rotation={[0, ang, 0]}>
						<Malha g={toro(1.6, 0.36, 20, 8, Math.PI)} m={m} position={[2.1, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1.35, 1]} contorno={0.04} />
					</group>
				);
			})}
			<mesh geometry={esfera(1, 18, 12)} material={basico('#0A0F0B')} position={[1.3, 0.9, 1.4]} scale={[1.1, 0.95, 0.6]} rotation={[0, 0.6, 0]} />
			{[0, 1, 2, 3, 4].map((i) => (
				<Malha key={i} g={ico(2.6 + (i % 2) * 0.8, 1)} m={toon(i % 2 ? '#1F4D2C' : '#2F6B3A')} position={[Math.cos(i * 1.3) * 3, 15 + (i % 3), Math.sin(i * 1.3) * 3]} contorno={0.06} />
			))}
		</group>
	);
});

const Estatico: React.FC = React.memo(() => (
	<>
		<Malha g={disco(60, 48)} m={toon('#33502A')} position={[0, 0, 0]} sombra={false} />
		<mesh geometry={disco(3.9, 40)} material={decalque('#6B5638')} position={[0, 0.005, 0]} receiveShadow />
		{Array.from({length: 9}, (_, i) => {
			const s = i / 8;
			return <mesh key={i} geometry={disco(1, 24)} material={decalque('#5E4B32')} position={[-0.2 - s * 1.0, 0.006, 3 + s * 11]} scale={[1.0 + 0.2 * (i % 2), 1, 1.4]} receiveShadow />;
		})}
		{ARVORES.map((a, i) => (
			<Arvore key={i} {...a} cores={CORES} />
		))}
		{MATO.map((m, i) =>
			m.tipo === 'samambaia' ? (
				<Samambaia key={i} x={m.x} z={m.z} tam={m.tam} cor={i % 2 ? '#3F8A45' : '#2F6B3A'} semente={m.semente} />
			) : (
				<Arbusto key={i} x={m.x} z={m.z} r={0.7 * m.tam} cor={i % 3 ? '#2A5E36' : '#1F4D2C'} giro={i} />
			),
		)}
		{ARVORES.slice(0, 14).map((a, i) => (
			<Cipo key={i} x={a.x + 0.9} z={a.z + 0.5} topo={a.altura - 0.5} comp={3 + (i % 4)} cor="#4A6B2E" folha="#3F8A45" />
		))}
		<Arbusto x={-1.9} z={2.4} r={0.9} cor="#2A5E36" giro={0.4} />
		<Arbusto x={-2.9} z={3.1} r={1.0} cor="#1F4D2C" giro={1.2} />
		<Toca />
		<ArvoreRaizes />
	</>
));

export const Selva: React.FC<{t: number; nomeClima: string}> = () => <Estatico />;
