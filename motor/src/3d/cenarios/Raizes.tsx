// Esconderijo debaixo das raízes: chão de terra, parede do fundo (onde ficam os riscos), raízes
// grossas em arco formando teto e paredes, e a abertura para a mata (lado +z).
import React from 'react';
import * as THREE from 'three';
import {aleatorio} from '../../util/mat';
import {Malha, basico, caixa, cilindro, disco, esfera, geo, ico, toon} from '../base';
import {Arvore, Samambaia} from '../natureza';

const COR_RAIZ = '#5A3F2E';
const COR_RAIZ_ESCURA = '#46301F';

/** Tubo grosso ao longo de pontos (raiz). */
const raiz = (chave: string, pts: [number, number, number][], raio: number) =>
	geo(`raiz${chave}`, () => {
		const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
		return new THREE.TubeGeometry(curva, 40, raio, 10, false);
	});

// arcos das raízes: saem do fundo, passam por cima e descem nas laterais da abertura
const RAIZES: {pts: [number, number, number][]; r: number}[] = [
	{pts: [[-2.6, 0, -1.6], [-2.3, 2.2, -1.2], [-1.2, 3.1, -0.2], [-1.6, 2.6, 1.4], [-1.9, 0, 2.4]], r: 0.3},
	{pts: [[2.6, 0, -1.6], [2.3, 2.2, -1.2], [1.2, 3.1, -0.2], [1.6, 2.6, 1.4], [1.9, 0, 2.4]], r: 0.3},
	{pts: [[-2.9, 0, 0.4], [-2.2, 2.4, 0.2], [0, 3.25, 0.4], [2.2, 2.4, 0.3], [2.9, 0, 0.5]], r: 0.34},
	{pts: [[-2.5, 0, 1.7], [-1.9, 2.0, 1.9], [0, 2.75, 2.15], [1.9, 2.0, 1.9], [2.5, 0, 1.7]], r: 0.36},
	{pts: [[-2.2, 0, -1.9], [-1.6, 2.6, -1.8], [0, 3.1, -1.6], [1.6, 2.6, -1.8], [2.2, 0, -1.9]], r: 0.32},
	{pts: [[-3.1, 0, -0.6], [-2.6, 1.4, -0.4], [-2.4, 2.4, 0.9], [-2.7, 1.0, 2.0], [-3.0, 0, 2.6]], r: 0.26},
	{pts: [[3.1, 0, -0.6], [2.6, 1.4, -0.4], [2.4, 2.4, 0.9], [2.7, 1.0, 2.0], [3.0, 0, 2.6]], r: 0.26},
];

const PENDURADAS = (() => {
	const r = aleatorio(5);
	return Array.from({length: 14}, () => ({x: (r() - 0.5) * 3.6, z: -1.4 + r() * 3.2, comp: 0.25 + r() * 0.6, ang: (r() - 0.5) * 0.4}));
})();

const Estatico: React.FC = React.memo(() => (
	<>
		{/* chão: terra dentro, mato fora */}
		<Malha g={disco(40, 40)} m={toon('#2C4426')} position={[0, -0.01, 0]} sombra={false} />
		<Malha g={disco(3.4, 36)} m={toon('#4A3A2A')} position={[0, 0.002, 0]} sombra={false} />
		{/* parede do fundo (terra) e laterais */}
		<Malha g={caixa(6.4, 3.6, 0.4)} m={toon('#5C4632')} position={[0, 1.6, -2.1]} contorno={0.03} />
		{[-1, 1].map((l) => (
			<Malha key={l} g={caixa(0.4, 3.0, 4.2)} m={toon('#4E3B2A')} position={[3.15 * l, 1.4, 0.0]} rotation={[0, -0.12 * l, 0]} contorno={0.03} />
		))}
		{/* teto de terra por cima das raízes */}
		<Malha g={esfera(1, 24, 12)} m={toon('#3F3022')} position={[0, 3.35, 0]} scale={[3.4, 0.55, 2.8]} sombra />
		{RAIZES.map((rz, i) => (
			<Malha key={i} g={raiz(String(i), rz.pts, rz.r)} m={toon(i % 2 ? COR_RAIZ : COR_RAIZ_ESCURA)} contorno={0.03} />
		))}
		{PENDURADAS.map((p, i) => (
			<Malha key={i} g={cilindro(0.025, 0.04, p.comp, 6)} m={toon(COR_RAIZ)} position={[p.x, 3.0 - p.comp / 2, p.z]} rotation={[p.ang, 0, p.ang]} contorno={0.012} sombra={false} />
		))}
		{/* pedrinhas e folhas secas no chão */}
		{Array.from({length: 10}, (_, i) => (
			<Malha key={i} g={ico(0.08 + (i % 3) * 0.03, 0)} m={toon('#6A6878')} position={[Math.cos(i * 2.1) * 2.0, 0.03, Math.sin(i * 2.1) * 1.5]} contorno={0.015} />
		))}
		{/* lado de fora: mata à noite */}
		<Arvore x={-4.5} z={10} altura={12} raio={0.6} semente={11} cores={{tronco: '#4A3628', folha: '#22492B', folhaEscura: '#183620'}} />
		<Arvore x={5.5} z={12} altura={13} raio={0.7} semente={12} cores={{tronco: '#4A3628', folha: '#22492B', folhaEscura: '#183620'}} />
		<Arvore x={1.0} z={16} altura={11} raio={0.5} semente={13} cores={{tronco: '#4A3628', folha: '#22492B', folhaEscura: '#183620'}} />
		<Arvore x={-9} z={6} altura={12} raio={0.6} semente={14} cores={{tronco: '#4A3628', folha: '#22492B', folhaEscura: '#183620'}} />
		<Arvore x={9.5} z={5} altura={12} raio={0.6} semente={15} cores={{tronco: '#4A3628', folha: '#22492B', folhaEscura: '#183620'}} />
		{[
			[-2.6, 4.2],
			[2.8, 4.6],
			[-1.2, 9.5],
			[3.4, 8.8],
		].map(([x, z], i) => (
			<Samambaia key={i} x={x} z={z} tam={1.1} cor="#2F6B3A" semente={i * 31} />
		))}
		{/* escuridão no fundo da mata */}
		<mesh geometry={esfera(1, 16, 10)} material={basico('#060B14')} position={[0, 4, 30]} scale={[30, 10, 2]} />
	</>
));

export const Raizes: React.FC<{t: number; nomeClima: string}> = () => <Estatico />;
