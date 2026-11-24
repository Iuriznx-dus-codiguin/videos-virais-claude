// Ilhota do farol vista de perto: pedra, a base do farol (ponha o objeto farol na marca farol),
// cais de madeira e o mar em volta. Os personagens andam na pedra (y = 0).
// 24/11: acabamento (pedido do Iuri): borda de rochas irregulares em camadas, capim e flores nas
// frestas, pedrinhas, liquens, trilha de lajes, cais de tábuas com corda, boia, mar com ondas e
// gaivotas. O chão onde os personagens pisam continua plano em y = 0 (marcas não mudam).
import React from 'react';
import * as THREE from 'three';
import {aleatorio} from '../../util/mat';
import {Malha, caixa, cilindro, decalque, geo, toon} from '../base';
import {BoiaSalvaVidas, Cais, Capim, Flores, Gaivotas, Mar, Pedrinhas, Rocha} from '../detalhes';

/** Platô de pedra: borda irregular (raio varia com o ângulo) e paredes que descem até o mar. */
const pedraIlhota = () =>
	geo('pedraIlhota2', () => {
		const g = new THREE.CylinderGeometry(13, 16, 3, 56, 3);
		const p = g.getAttribute('position') as THREE.BufferAttribute;
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i);
			const y = p.getY(i);
			const z = p.getZ(i);
			const a = Math.atan2(z, x);
			const r = Math.hypot(x, z);
			if (r < 0.5) continue;
			const k = 1 + 0.05 * Math.sin(a * 3 + 1) + 0.035 * Math.sin(a * 7 + 2) + (y < 1.4 ? 0.04 * Math.sin(a * 13 + y * 2) : 0);
			p.setXYZ(i, x * k, y, z * k);
		}
		g.translate(0, -1.5, 0);
		const s = g.toNonIndexed();
		s.computeVertexNormals();
		return s;
	});

/** Rochas da borda em duas camadas (grandes junto do mar, menores por cima), fora da trilha e do cais. */
const ROCHAS = (() => {
	const r = aleatorio(31);
	const lista: {x: number; y: number; z: number; s: [number, number, number]; giro: number; v: number; cor: string}[] = [];
	for (let i = 0; i < 30; i++) {
		const a = (i / 30) * Math.PI * 2 + r() * 0.1;
		// deixa livre a saída para o cais (+z, x entre 1 e 5)
		const rr = 13.2 + r() * 2.6;
		const x = Math.cos(a) * rr;
		const z = Math.sin(a) * rr;
		if (z > 9 && x > 0.5 && x < 5.5) continue;
		const s = 1.3 + r() * 1.6;
		lista.push({x, y: -0.9 - r() * 0.4, z, s: [s * (1 + r() * 0.4), s * (0.6 + r() * 0.4), s], giro: r() * 6, v: i, cor: r() < 0.5 ? '#5F6774' : '#6C7380'});
	}
	for (let i = 0; i < 16; i++) {
		const a = (i / 16) * Math.PI * 2 + 0.2 + r() * 0.15;
		const rr = 11.6 + r() * 1.2;
		const x = Math.cos(a) * rr;
		const z = Math.sin(a) * rr;
		if (z > 8 && x > 0 && x < 6) continue;
		const s = 0.5 + r() * 0.7;
		lista.push({x, y: -0.05, z, s: [s * 1.3, s * 0.7, s], giro: r() * 6, v: i + 3, cor: r() < 0.5 ? '#7A808C' : '#858B96'});
	}
	return lista;
})();

/** Liquens (manchas amareladas) e rachaduras escuras no chão de pedra. */
const MANCHAS = (() => {
	const r = aleatorio(57);
	return Array.from({length: 26}, () => {
		const a = r() * Math.PI * 2;
		const rr = 3 + r() * 8.5;
		return {x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: 0.25 + r() * 0.6, giro: r() * 6, liquen: r() < 0.6};
	});
})();

/** Lajes da trilha até a porta (+z), com juntas. */
const LAJES = (() => {
	const r = aleatorio(13);
	return Array.from({length: 11}, (_, i) => ({x: (r() - 0.5) * 0.25, z: -0.2 + i * 0.66, w: 1.2 + r() * 0.35, d: 0.55 + r() * 0.08, giro: (r() - 0.5) * 0.2, cor: r() < 0.5 ? '#8E929B' : '#9A9EA6'}));
})();

/** Onde nada nasce: trilha, porta, o pé do farol e o caminho do cais. */
const EVITAR: [number, number, number][] = [
	[0, -4, 2.2],
	[0, 0.5, 1.2],
	[0, 3, 1.1],
	[0, 5.5, 1.1],
	[3, 9, 1.8],
	[3, 11.5, 1.8],
];

const Estatico: React.FC = React.memo(() => (
	<>
		<Malha g={pedraIlhota()} m={toon('#5B6370')} contorno={0.04} />
		{ROCHAS.map((p, i) => (
			<Rocha key={i} pos={[p.x, p.y, p.z]} escala={p.s} giro={p.giro} variacao={p.v} cor={p.cor} sombra={false} />
		))}
		{MANCHAS.map((m, i) => (
			<mesh
				key={i}
				geometry={geo('manchaIlhota', () => new THREE.CircleGeometry(1, 9).rotateX(-Math.PI / 2))}
				material={decalque(m.liquen ? '#9AA05A' : '#4C525C')}
				position={[m.x, 0.004 + i * 0.0002, m.z]}
				rotation={[0, m.giro, 0]}
				scale={m.liquen ? [m.s, 1, m.s * 0.7] : [m.s * 1.6, 1, 0.05]}
			/>
		))}
		{LAJES.map((l, i) => (
			<Malha key={i} g={caixa(1, 0.07, 1)} m={toon(l.cor)} position={[l.x, 0.03, l.z]} rotation={[0, l.giro, 0]} scale={[l.w, 1, l.d]} contorno={0.01} sombra={false} />
		))}
		<Capim chave="ilhota-borda" regiao={{centro: [0, 0], rMin: 9.6, rMax: 12.6, evitar: EVITAR}} quantos={170} cor="#6E9A45" semente={21} />
		<Capim chave="ilhota-frestas" regiao={{centro: [0, 0], rMin: 2.5, rMax: 9.6, evitar: EVITAR}} quantos={60} cor="#7FA650" semente={22} escala={0.7} />
		<Flores chave="ilhota" regiao={{centro: [0, 0], rMin: 9.8, rMax: 12.4, evitar: EVITAR}} quantos={50} semente={23} cores={['#FFFFFF', '#FFE066', '#F7A1C4']} />
		<Pedrinhas chave="ilhota" regiao={{centro: [0, 0], rMin: 1.5, rMax: 12.5, evitar: EVITAR}} quantos={140} semente={24} cor="#7D828C" />
		<Cais x={3} z={16} comprimento={12} largura={2.2} y={-0.15} fundo={-1.7} />
		<BoiaSalvaVidas pos={[4.3, 0.55, 11.2]} giro={[0, Math.PI / 2, 0]} />
		{/* cabeços de amarração e um rolo de corda na entrada do cais */}
		{[1.7, 4.3].map((x) => (
			<group key={x} position={[x, 0, 10.4]}>
				<Malha g={cilindro(0.16, 0.2, 0.42, 12)} m={toon('#2E3440')} position={[0, 0.21, 0]} contorno={0.012} />
				<Malha g={cilindro(0.24, 0.24, 0.06, 12)} m={toon('#2E3440')} position={[0, 0.44, 0]} contorno={0.01} />
			</group>
		))}
		<group position={[1.3, 0.06, 9.6]}>
			{[0, 1, 2].map((i) => (
				<mesh key={i} geometry={geo('rolo', () => new THREE.TorusGeometry(0.26, 0.05, 6, 20).rotateX(Math.PI / 2))} material={toon('#D9C49A')} position={[0, i * 0.08, 0]} scale={1 - i * 0.12} />
			))}
		</group>
	</>
));

export const IlhotaFarol: React.FC<{t: number; nomeClima: string}> = ({t, nomeClima}) => (
	<>
		<Mar nomeClima={nomeClima} t={t} y={-1.2} raio={500} />
		<Estatico />
		{nomeClima.startsWith('noite') ? null : <Gaivotas t={t} centro={[4, 14, -2]} quantas={5} raio={12} />}
	</>
);
