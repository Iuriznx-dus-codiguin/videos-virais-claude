// Oficina antiga de inventor: piso de tábuas, parede de tijolo com janela iluminada, bancada de
// madeira com ferramentas, prateleira de engrenagens, caixotes e uma lâmpada pendurada.
import React from 'react';
import {Malha, brilho, caixa, cilindro, esfera, haloMat, toon, translucido} from '../base';
import {engrenagemGeo} from '../Maquete';
import {aleatorio} from '../../util/mat';

const MADEIRA = ['#8A5A36', '#7C4F2F', '#94653F'];

const Piso: React.FC = React.memo(() => (
	<>
		{Array.from({length: 22}, (_, i) => (
			<Malha key={i} g={caixa(0.42, 0.06, 9)} m={toon(MADEIRA[i % 3])} position={[-4.4 + i * 0.42, -0.03, 1.5]} sombra={false} />
		))}
	</>
));

// Centro da janela na parede e o vão (moldura por fora) que os tijolos não podem invadir.
const JANELA: [number, number] = [-2.6, 1.82];
const VAO = {x0: JANELA[0] - 0.82, x1: JANELA[0] + 0.82, y0: JANELA[1] - 0.85, y1: JANELA[1] + 0.85};
const TIJOLO = {l: 0.68, a: 0.24};

/** Pedaços do tijolo [x0, x1, y0, y1] que ficam fora do vão da janela (tijolo inteiro se não encosta nele). */
const foraDoVao = (x0: number, x1: number, y0: number, y1: number): [number, number, number, number][] => {
	if (x1 <= VAO.x0 || x0 >= VAO.x1 || y1 <= VAO.y0 || y0 >= VAO.y1) return [[x0, x1, y0, y1]];
	const partes: [number, number, number, number][] = [];
	if (x0 < VAO.x0) partes.push([x0, VAO.x0, y0, y1]);
	if (x1 > VAO.x1) partes.push([VAO.x1, x1, y0, y1]);
	const mx0 = Math.max(x0, VAO.x0);
	const mx1 = Math.min(x1, VAO.x1);
	if (y0 < VAO.y0) partes.push([mx0, mx1, y0, VAO.y0]);
	if (y1 > VAO.y1) partes.push([mx0, mx1, VAO.y1, y1]);
	// pedaço fino demais vira só argamassa
	return partes.filter(([a, b, c, d]) => b - a > 0.06 && d - c > 0.06);
};

const Parede: React.FC = React.memo(() => {
	const r = aleatorio(17);
	const tijolos: React.ReactNode[] = [];
	for (let lin = 0; lin < 16; lin++) {
		for (let col = 0; col < 13; col++) {
			const x = -4.6 + col * 0.72 + (lin % 2 ? 0.36 : 0);
			const y = 0.14 + lin * 0.28;
			const tom = ['#9C5A3C', '#8E5034', '#A86444', '#874A30'][Math.floor(r() * 4)];
			// o tijolo que encosta na janela é cortado rente à moldura (antes, o tijolo vizinho tapava parte do vidro)
			foraDoVao(x - TIJOLO.l / 2, x + TIJOLO.l / 2, y - TIJOLO.a / 2, y + TIJOLO.a / 2).forEach(([x0, x1, y0, y1], k) =>
				tijolos.push(
					<mesh
						key={`${lin}-${col}-${k}`}
						geometry={caixa(+(x1 - x0).toFixed(3), +(y1 - y0).toFixed(3), 0.08)}
						material={toon(tom)}
						position={[(x0 + x1) / 2, (y0 + y1) / 2, -2.98]}
						receiveShadow
					/>,
				),
			);
		}
	}
	return (
		<>
			<mesh geometry={caixa(10, 4.6, 0.1)} material={toon('#5A3424')} position={[0, 2.3, -3.06]} receiveShadow />
			{tijolos}
			{[-1, 1].map((l) => (
				<mesh key={l} geometry={caixa(0.1, 4.6, 8)} material={toon('#6E4330')} position={[l * 4.6, 2.3, 1]} receiveShadow />
			))}
		</>
	);
});

const Janela: React.FC = React.memo(() => (
	<group position={[JANELA[0], JANELA[1], -2.95]}>
		<mesh geometry={caixa(1.5, 1.55, 0.02)} material={brilho('#FFE2A6', 1.15)} />
		<Malha g={caixa(1.62, 0.08, 0.12)} m={toon('#5A3A24')} position={[0, 0.8, 0.02]} contorno={0.012} />
		<Malha g={caixa(1.62, 0.08, 0.12)} m={toon('#5A3A24')} position={[0, -0.8, 0.02]} contorno={0.012} />
		<Malha g={caixa(0.08, 1.62, 0.12)} m={toon('#5A3A24')} position={[-0.78, 0, 0.02]} contorno={0.012} />
		<Malha g={caixa(0.08, 1.62, 0.12)} m={toon('#5A3A24')} position={[0.78, 0, 0.02]} contorno={0.012} />
		<Malha g={caixa(0.06, 1.5, 0.08)} m={toon('#5A3A24')} position={[0, 0, 0.03]} />
		<Malha g={caixa(1.5, 0.06, 0.08)} m={toon('#5A3A24')} position={[0, 0, 0.03]} />
		{/* feixe de luz entrando */}
		<mesh geometry={caixa(1.3, 1.3, 4.2)} material={translucido('#FFE6B0', 0.07, true)} position={[0.9, -0.9, 2.0]} rotation={[0.45, 0.35, 0]} />
		<pointLight position={[0.3, -0.2, 1.2]} color="#FFE2A6" intensity={4} distance={6} decay={2} />
	</group>
));

const Bancada: React.FC = React.memo(() => (
	<group position={[0, 0, -1.3]}>
		<Malha g={caixa(2.6, 0.09, 0.85)} m={toon('#8F5E37')} position={[0, 0.875, 0]} contorno={0.02} />
		{[-1.15, 1.15].map((x) =>
			[-0.32, 0.32].map((z) => <Malha key={`${x}${z}`} g={caixa(0.1, 0.84, 0.1)} m={toon('#6E4529')} position={[x, 0.42, z]} contorno={0.015} />),
		)}
		<Malha g={caixa(2.4, 0.05, 0.7)} m={toon('#7A4E2E')} position={[0, 0.2, 0]} contorno={0.012} />
		{/* martelo, alicate e potes em cima */}
		<Malha g={cilindro(0.025, 0.025, 0.36, 8)} m={toon('#B07A44')} position={[-0.95, 0.94, 0.15]} rotation={[0, 0, Math.PI / 2]} contorno={0.008} />
		<Malha g={caixa(0.06, 0.06, 0.16)} m={toon('#59606B')} position={[-0.78, 0.95, 0.15]} contorno={0.008} />
		<Malha g={cilindro(0.08, 0.08, 0.2, 14)} m={toon('#4F7A5A')} position={[1.0, 1.02, -0.2]} contorno={0.01} />
		<Malha g={cilindro(0.06, 0.06, 0.15, 14)} m={toon('#B9853F')} position={[1.18, 0.995, -0.05]} contorno={0.01} />
		{/* morsa */}
		<Malha g={caixa(0.18, 0.16, 0.2)} m={toon('#3F4A5A')} position={[0.85, 1.0, 0.25]} contorno={0.01} />
		{/* papéis com desenhos */}
		<mesh geometry={caixa(0.42, 0.005, 0.3)} material={toon('#F1E6CC')} position={[-0.25, 0.925, -0.12]} rotation={[0, 0.2, 0]} />
		<mesh geometry={caixa(0.42, 0.005, 0.3)} material={toon('#E8DBBB')} position={[-0.05, 0.928, -0.2]} rotation={[0, -0.15, 0]} />
	</group>
));

const Prateleira: React.FC = React.memo(() => (
	<group position={[2.25, 0, -2.75]}>
		{[1.3, 2.0].map((y) => (
			<Malha key={y} g={caixa(1.7, 0.06, 0.38)} m={toon('#7C4F2F')} position={[0, y, 0]} contorno={0.015} />
		))}
		<mesh geometry={engrenagemGeo(0.26, 0.05, 12)} material={toon('#B98A3E')} position={[-0.5, 1.6, 0.05]} rotation={[Math.PI / 2, 0, 0.3]} />
		<mesh geometry={engrenagemGeo(0.17, 0.05, 9)} material={toon('#9AA3AE')} position={[-0.12, 1.5, 0.05]} rotation={[Math.PI / 2, 0, 0]} />
		<Malha g={caixa(0.3, 0.26, 0.26)} m={toon('#A0703F')} position={[0.5, 1.46, 0]} contorno={0.012} />
		<Malha g={cilindro(0.09, 0.09, 0.3, 14)} m={toon('#6D8FA8')} position={[-0.4, 2.18, 0]} contorno={0.01} />
		<Malha g={esfera(0.1, 14, 10)} m={toon('#E9D9A6')} position={[0.1, 2.13, 0]} contorno={0.01} />
		<mesh geometry={engrenagemGeo(0.2, 0.05, 10)} material={toon('#B98A3E')} position={[0.5, 2.24, 0.05]} rotation={[Math.PI / 2, 0, 0]} />
	</group>
));

const Lampada: React.FC<{t: number}> = ({t}) => {
	const tremula = 0.94 + 0.06 * Math.sin(t * 7.1);
	return (
		<group position={[0, 2.55, -0.5]}>
			<mesh geometry={cilindro(0.008, 0.008, 2.2, 6)} material={toon('#1B1B1F')} position={[0, 1.18, 0]} />
			<Malha g={cilindro(0.045, 0.045, 0.1, 12)} m={toon('#7A6A4A')} position={[0, 0.1, 0]} contorno={0.008} />
			<mesh geometry={esfera(0.085, 18, 12)} material={brilho('#FFD99A', 1.5)} />
			<sprite material={haloMat('#FFC872', 0.55)} scale={[1.1, 1.1, 1]} />
			<pointLight color="#FFC27A" intensity={7 * tremula} distance={9} decay={2} castShadow={false} />
		</group>
	);
};

const Caixotes: React.FC = React.memo(() => (
	<>
		{[
			[3.4, -2.2, 0.3, 0.7],
			[3.6, -1.3, -0.2, 0.55],
			[-3.6, 0.6, 0.5, 0.6],
		].map(([x, z, g, s], i) => (
			<group key={i} position={[x, s / 2, z]} rotation={[0, g, 0]}>
				<Malha g={caixa(s, s, s)} m={toon('#A0703F')} contorno={0.02} />
				<mesh geometry={caixa(s + 0.02, 0.04, s + 0.02)} material={toon('#7A5230')} />
			</group>
		))}
	</>
));

export const Oficina: React.FC<{t: number; nomeClima: string}> = ({t}) => (
	<>
		<Piso />
		<Parede />
		<Janela />
		<Bancada />
		<Prateleira />
		<Caixotes />
		<Lampada t={t} />
	</>
);
