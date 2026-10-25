// Coisas da ilha do Voo 818 que aparecem de longe: lanternas andando na mata (os Homens de Laranja),
// o farol que não está no mapa (feixe girando ou piscando SOS) e o barco da carga.
import React from 'react';
import * as THREE from 'three';
import {Malha, brilho, caixa, capsula, cilindro, cone, esfera, geo, haloMat, toon, translucido} from './base';

// --- lanternas na mata ------------------------------------------------------------------------

/**
 * `quantas` lanternas que vão e voltam numa faixa de `largura` metros (eixo x local), em fileiras
 * para trás (-z local), com o feixe varrendo para a frente (+z local). Com `vultos`, cada luz tem
 * um corpo escuro com o colete laranja, sem rosto.
 */
export const LanternasMata: React.FC<{x: number; z: number; giro: number; t: number; quantas: number; largura: number; vultos: boolean}> = ({
	x,
	z,
	giro,
	t,
	quantas,
	largura,
	vultos,
}) => (
	<group position={[x, 0, z]} rotation={[0, giro, 0]}>
		{Array.from({length: quantas}, (_, i) => {
			const fase = i * 2.3;
			const lx = Math.sin(t * 0.32 + fase) * (largura / 2);
			const lz = -i * 1.4;
			const passo = Math.abs(Math.sin(t * 3.2 + fase));
			const varre = Math.sin(t * 0.9 + fase * 1.7) * 0.6;
			return (
				<group key={i} position={[lx, 0, lz]}>
					{vultos ? (
						<>
							<Malha g={capsula(0.17, 1.15)} m={toon('#141A26')} position={[0, 0.78 + passo * 0.04, 0]} sombra={false} />
							<Malha g={caixa(0.4, 0.42, 0.3)} m={toon('#E8641E')} position={[0, 1.02 + passo * 0.04, 0]} sombra={false} />
							<mesh geometry={caixa(0.42, 0.05, 0.32)} material={brilho('#F4F1E8', 0.5)} position={[0, 0.95 + passo * 0.04, 0]} />
							<Malha g={esfera(0.2, 14, 10)} m={toon('#141A26')} position={[0, 1.56 + passo * 0.04, 0]} sombra={false} />
						</>
					) : null}
					<group position={[0.22, 1.25 + passo * 0.05, 0.12]} rotation={[0, varre, 0]}>
						<mesh geometry={esfera(0.07, 10, 8)} material={brilho('#FFF2C8', 2)} />
						<sprite material={haloMat('#FFE7A8', 0.9)} scale={[1.1, 1.1, 1]} />
						<mesh geometry={cone(1.5, 9, 20)} material={translucido('#FFE9B8', 0.09, true)} rotation={[-Math.PI / 2 - 0.08, 0, 0]} position={[0, -0.36, 4.5]} />
						<pointLight color="#FFE2A0" intensity={3} distance={7} decay={2} position={[0, 0, 0.6]} />
					</group>
				</group>
			);
		})}
	</group>
);

// --- farol ------------------------------------------------------------------------------------

/** SOS em código Morse (· · · — — — · · ·), 1 = aceso; cada casa dura 0,25 s, com pausa no fim. */
const SOS = '1010100011101110111000101010000000';

const ilhota = () =>
	geo('ilhotaFarol', () => {
		const g = new THREE.CylinderGeometry(5.5, 8, 2.4, 9, 1);
		g.translate(0, 0.4, 0);
		return g;
	});

/**
 * Farol de 14 m numa ilhota no mar. `modo`: gira (feixe girando), sos (pisca o SOS) ou apagado.
 * Visto de longe; use `escala` para ajustar ao enquadramento.
 */
export const Farol: React.FC<{x: number; alt: number; z: number; giro: number; escala: number; t: number; modo: string}> = ({x, alt, z, giro, escala, t, modo}) => {
	const aceso = modo === 'gira' || (modo === 'sos' && SOS[Math.floor(t / 0.25) % SOS.length] === '1');
	const angulo = t * 1.1;
	return (
		<group position={[x, alt, z]} rotation={[0, giro, 0]} scale={escala}>
			<Malha g={ilhota()} m={toon('#4E4A58')} contorno={0.08} sombra={false} />
			{/* casa do faroleiro */}
			<Malha g={caixa(3.2, 2.2, 2.6)} m={toon('#E9E4D8')} position={[3.2, 2.7, 1.2]} contorno={0.05} sombra={false} />
			<Malha g={cone(2.4, 1.3, 4)} m={toon('#8A3B32')} position={[3.2, 4.45, 1.2]} rotation={[0, Math.PI / 4, 0]} contorno={0.05} sombra={false} />
			<mesh geometry={caixa(0.5, 0.6, 0.05)} material={aceso ? brilho('#FFD98A', 1.2) : toon('#2A2633')} position={[2.6, 2.9, 2.53]} />
			{/* torre listrada */}
			{[0, 1, 2, 3, 4].map((i) => (
				<Malha
					key={i}
					g={cilindro(1.35 - (i + 1) * 0.1, 1.35 - i * 0.1, 2.4, 20)}
					m={toon(i % 2 ? '#C8372D' : '#F2EEE6')}
					position={[0, 2.8 + i * 2.4, 0]}
					contorno={0.05}
					sombra={false}
				/>
			))}
			{/* galeria, sala da lâmpada e cúpula */}
			<Malha g={cilindro(1.35, 1.35, 0.25, 20)} m={toon('#2B2F3A')} position={[0, 14.6, 0]} contorno={0.04} sombra={false} />
			<mesh geometry={cilindro(0.75, 0.75, 1.3, 16)} material={aceso ? brilho('#FFF4C8', 1.6) : toon('#3A4252')} position={[0, 15.35, 0]} />
			<Malha g={cone(0.95, 0.9, 16)} m={toon('#2B2F3A')} position={[0, 16.45, 0]} contorno={0.04} sombra={false} />
			{aceso ? (
				<group position={[0, 15.35, 0]}>
					<sprite material={haloMat('#FFF0B8', 0.95)} scale={[7, 7, 1]} />
					<pointLight color="#FFF0C0" intensity={30} distance={40} decay={2} />
					{modo === 'gira'
						? [0, Math.PI].map((a) => (
								<group key={a} rotation={[0, angulo + a, 0]}>
									<mesh geometry={cone(4, 70, 24)} material={translucido('#FFF2C4', 0.12, true)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 35]} />
								</group>
							))
						: null}
				</group>
			) : null}
		</group>
	);
};

// --- barco ------------------------------------------------------------------------------------

const casco = () =>
	geo('cascoBarco', () => {
		const s = new THREE.Shape();
		s.moveTo(-5, 1.6);
		s.lineTo(4, 1.6);
		s.lineTo(6, 2.0);
		s.lineTo(4.6, 0);
		s.lineTo(-4.6, 0);
		s.closePath();
		return new THREE.ExtrudeGeometry(s, {depth: 3.2, bevelEnabled: false}).translate(0, -0.6, -1.6);
	});

/** Barco de carga de 11 m (proa em +x local), com cabine, mastro, luzes e caixas no convés. */
export const Barco: React.FC<{x: number; alt: number; z: number; giro: number; escala: number; t: number; luzes: boolean; caixas: boolean}> = ({x, alt, z, giro, escala, t, luzes, caixas}) => {
	const balanco = Math.sin(t * 1.3) * 0.03;
	return (
		<group position={[x, alt + Math.sin(t * 1.1) * 0.08, z]} rotation={[balanco, giro, balanco * 0.6]} scale={escala}>
			<Malha g={casco()} m={toon('#2D3A4E')} contorno={0.06} sombra={false} />
			<Malha g={caixa(10, 0.2, 3.0)} m={toon('#8A6A48')} position={[-0.3, 1.05, 0]} sombra={false} />
			<Malha g={caixa(3, 2.2, 2.4)} m={toon('#E8E4DA')} position={[-2.8, 2.25, 0]} contorno={0.05} sombra={false} />
			{[-1, 1].map((l) => (
				<mesh key={l} geometry={caixa(2.2, 0.6, 0.05)} material={luzes ? brilho('#FFD98A', 1.1) : toon('#1F2734')} position={[-2.8, 2.6, l * 1.23]} />
			))}
			<Malha g={cilindro(0.08, 0.08, 4.5, 8)} m={toon('#9AA3AE')} position={[-2.8, 5.5, 0]} sombra={false} />
			{caixas
				? [
						[1.0, 0.6],
						[2.4, -0.6],
						[1.0, -0.7],
						[2.4, 0.7],
						[1.7, 0],
					].map(([cx, cz], i) => <Malha key={i} g={caixa(0.9, 0.7, 0.9)} m={toon(i === 4 ? '#B08A3E' : '#9A7448')} position={[cx, 1.5 + (i === 4 ? 0.7 : 0), cz]} contorno={0.03} sombra={false} />)
				: null}
			{luzes ? (
				<>
					<mesh geometry={esfera(0.12, 10, 8)} material={brilho('#FF3B30', 2)} position={[-2.8, 7.8, 0]} />
					<sprite material={haloMat('#FF6A5A', 0.8)} position={[-2.8, 7.8, 0]} scale={[1.6, 1.6, 1]} />
					<mesh geometry={esfera(0.16, 10, 8)} material={brilho('#FFF4D0', 2)} position={[5.6, 2.1, 0]} />
					<sprite material={haloMat('#FFF0C0', 0.9)} position={[5.6, 2.1, 0]} scale={[3, 3, 1]} />
					<mesh geometry={cone(2.2, 26, 20)} material={translucido('#FFF2C4', 0.08, true)} rotation={[0, 0, Math.PI / 2]} position={[18.6, 2.1, 0]} />
				</>
			) : null}
		</group>
	);
};
