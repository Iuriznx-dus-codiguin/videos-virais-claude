// Portaria de um prédio residencial à noite (série "Apartamento 0", 11/11): rua na frente (+z),
// calçada, grade com o portão de pedestres e carros, a guarita envidraçada à esquerda (com mesa,
// dois monitores das câmeras, interfone, livro de ocorrências e luz fria acesa), o pátio e a
// fachada de 12 andares no fundo (-z), com o hall iluminado e a boca escura da garagem.
// Escala real: personagens com "escala" 0.6 (o boneco padrão tem 3,1 m).
// As janelas do prédio obedecem ao objeto "luzes_predio" da cena (acesas, apagam, acende).
import React from 'react';
import * as THREE from 'three';
import type {Objeto} from '../../roteiro/tipos';
import {clamp, smoothstep} from '../../util/mat';
import {Malha, basico, brilho, caixa, cilindro, haloMat, memo, toon, translucido} from '../base';

const ANDARES = 12;
const COLUNAS = [-7.6, -3.8, 0, 3.8, 7.6];
const FACHADA_Z = -6;
const ALT_TERREO = 3.2;
const ALT_ANDAR = 2.9;

/** Placa com texto (letreiro do prédio, "PORTARIA"), desenhada num canvas. */
const placa = (texto: string, fundo: string, cor: string) =>
	memo(`placa${texto}${fundo}${cor}`, () => {
		const c = document.createElement('canvas');
		c.width = 1024;
		c.height = 160;
		const g = c.getContext('2d')!;
		g.fillStyle = fundo;
		g.fillRect(0, 0, c.width, c.height);
		g.fillStyle = cor;
		g.font = '900 104px Montserrat, Arial, sans-serif';
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		g.fillText(texto, c.width / 2, c.height / 2 + 6);
		const tx = new THREE.CanvasTexture(c);
		tx.colorSpace = THREE.SRGBColorSpace;
		return new THREE.MeshBasicMaterial({map: tx, toneMapped: false});
	});

/** Tela dos monitores: quatro câmeras em grade (a 4, da garagem, mostra um vulto parado). */
const telaMonitor = (vulto: boolean) =>
	memo(`monitor${vulto}`, () => {
		const c = document.createElement('canvas');
		c.width = 512;
		c.height = 320;
		const g = c.getContext('2d')!;
		g.fillStyle = '#05070A';
		g.fillRect(0, 0, 512, 320);
		const nomes = ['CAM 1 PORTÃO', 'CAM 2 HALL', 'CAM 3 ELEVADOR', 'CAM 4 GARAGEM'];
		nomes.forEach((n, i) => {
			const x = (i % 2) * 256 + 6;
			const y = Math.floor(i / 2) * 160 + 6;
			const grad = g.createLinearGradient(0, y, 0, y + 148);
			grad.addColorStop(0, '#6E7C78');
			grad.addColorStop(1, '#2C3432');
			g.fillStyle = grad;
			g.fillRect(x, y, 244, 148);
			g.fillStyle = '#1A201F';
			g.fillRect(x + 20, y + 60, 200, 80);
			if (i === 3 && vulto) {
				g.fillStyle = '#050505';
				g.beginPath();
				g.arc(x + 122, y + 70, 14, 0, Math.PI * 2);
				g.fill();
				g.fillRect(x + 112, y + 84, 20, 50);
			}
			g.fillStyle = '#E8FFE8';
			g.font = '700 20px Montserrat, Arial, sans-serif';
			g.fillText(n, x + 8, y + 24);
		});
		const tx = new THREE.CanvasTexture(c);
		tx.colorSpace = THREE.SRGBColorSpace;
		return new THREE.MeshBasicMaterial({map: tx, toneMapped: false});
	});

/** Estado das janelas no instante t pelas opções do objeto luzes_predio. */
const janelaAcesa = (andar: number, col: number, t: number, op?: Objeto) => {
	const fracao = (op?.acesas as number) ?? 0.55;
	// cada janela tem um sorteio fixo: acesa se o sorteio ficar abaixo da fração
	const sorteio = Math.abs(Math.sin(andar * 12.9898 + col * 78.233 + ((op?.semente as number) ?? 1) * 3.1)) % 1;
	let acesa = sorteio < fracao ? 1 : 0;
	// "apagam": as luzes apagam andar por andar, de cima para baixo, em ~2,6 s
	const apagam = op?._apagam as number | undefined;
	if (apagam !== undefined) {
		const quando = apagam + ((ANDARES - 1 - andar) / ANDARES) * 2.6;
		if (t >= quando) acesa = 0;
	}
	// "acende": uma janela só (a do "andar" e "coluna" pedidos) acende sozinha
	const acende = op?._acende as number | undefined;
	if (acende !== undefined && andar === ((op?.andar as number) ?? 6) && col === ((op?.coluna as number) ?? 2)) acesa = smoothstep(acende, acende + 0.15, t);
	return acesa;
};

const Janela: React.FC<{x: number; y: number; acesa: number}> = ({x, y, acesa}) => (
	<group position={[x, y, FACHADA_Z + 0.02]}>
		<mesh geometry={caixa(1.9, 1.5, 0.08)} material={toon('#5B5348')} />
		<mesh geometry={caixa(1.7, 1.3, 0.1)} material={acesa > 0.5 ? brilho('#FFC46B', 0.95) : basico('#141A2A')} position={[0, 0, 0.01]} />
		<mesh geometry={caixa(0.06, 1.3, 0.12)} material={toon('#5B5348')} position={[0, 0, 0.02]} />
	</group>
);

const Poste: React.FC<{x: number; z: number}> = ({x, z}) => (
	<group position={[x, 0, z]}>
		<Malha g={cilindro(0.09, 0.07, 6.2, 10)} m={toon('#2E3240')} position={[0, 3.1, 0]} contorno={0.015} />
		<Malha g={caixa(0.12, 0.12, 1.4)} m={toon('#2E3240')} position={[0, 6.1, -0.6]} />
		<mesh geometry={caixa(0.5, 0.14, 0.32)} material={brilho('#FFC680', 1.6)} position={[0, 6.0, -1.25]} />
		<sprite material={haloMat('#FFB45E', 0.55)} position={[0, 5.9, -1.25]} scale={[3.2, 3.2, 1]} />
		<mesh geometry={cilindro(2.4, 0.2, 5.9, 20, )} material={translucido('#FFC680', 0.06, true)} position={[0, 2.95, -1.25]} />
		<pointLight position={[0, 5.6, -1.25]} color="#FFB868" intensity={38} distance={16} decay={1.6} />
	</group>
);

const Carro: React.FC<{x: number; z: number; giro?: number; cor?: string}> = ({x, z, giro = 0, cor = '#3A4A7A'}) => (
	<group position={[x, 0, z]} rotation={[0, giro, 0]}>
		<Malha g={caixa(4.2, 0.75, 1.8)} m={toon(cor)} position={[0, 0.65, 0]} contorno={0.02} />
		<Malha g={caixa(2.3, 0.62, 1.6)} m={toon(cor)} position={[-0.2, 1.33, 0]} contorno={0.02} />
		<mesh geometry={caixa(2.1, 0.5, 1.62)} material={toon('#1A2032')} position={[-0.2, 1.35, 0]} />
		{[-1.35, 1.35].map((wx) =>
			[-0.9, 0.9].map((wz) => <Malha key={`${wx}${wz}`} g={cilindro(0.36, 0.36, 0.26, 14)} m={toon('#111')} position={[wx, 0.36, wz]} rotation={[Math.PI / 2, 0, 0]} />),
		)}
	</group>
);

/** Grade com barras verticais entre x0 e x1, na linha z. */
const Grade: React.FC<{x0: number; x1: number; z: number; alt?: number}> = ({x0, x1, z, alt = 2.4}) => {
	const n = Math.max(2, Math.round((x1 - x0) / 0.22));
	return (
		<group>
			<Malha g={caixa(x1 - x0, 0.9, 0.3)} m={toon('#8A8478')} position={[(x0 + x1) / 2, 0.45, z]} contorno={0.015} />
			<mesh geometry={caixa(x1 - x0, 0.08, 0.08)} material={toon('#22252E')} position={[(x0 + x1) / 2, alt, z]} />
			{Array.from({length: n}, (_, i) => (
				<mesh key={i} geometry={caixa(0.045, alt - 0.9, 0.045)} material={toon('#22252E')} position={[x0 + ((i + 0.5) * (x1 - x0)) / n, 0.9 + (alt - 0.9) / 2, z]} />
			))}
		</group>
	);
};

/** Guarita: base de alvenaria, vidro do meio para cima, teto, mesa, monitores, interfone e luz fria. */
const Guarita: React.FC<{vulto: boolean; t: number}> = ({vulto, t}) => {
	const x0 = -6.4;
	const x1 = -3.6;
	const z0 = 3.4;
	const z1 = 6.0;
	const cx = (x0 + x1) / 2;
	const cz = (z0 + z1) / 2;
	const w = x1 - x0;
	const d = z1 - z0;
	const vidro = translucido('#9FC4E8', 0.13);
	// a luz fria pisca de leve de vez em quando (lâmpada velha)
	const falha = Math.sin(t * 37) > 0.985 ? 0.6 : 1;
	return (
		<group>
			{/* piso, base das paredes e colunas */}
			<mesh geometry={caixa(w, 0.06, d)} material={toon('#6A6458')} position={[cx, 0.03, cz]} receiveShadow />
			{[
				[cx, z1, w, 0.16],
				[cx, z0, w, 0.16],
			].map(([px, pz, sx, sz], i) => (
				<Malha key={`f${i}`} g={caixa(sx, 1.0, sz)} m={toon('#B9AE9A')} position={[px, 0.5, pz]} contorno={0.015} />
			))}
			<Malha g={caixa(0.16, 1.0, d)} m={toon('#B9AE9A')} position={[x0, 0.5, cz]} contorno={0.015} />
			{/* lado do portão: meia parede e a porta (fechada) mais para o fundo */}
			<Malha g={caixa(0.16, 1.0, d * 0.55)} m={toon('#B9AE9A')} position={[x1, 0.5, z1 - d * 0.275]} contorno={0.015} />
			<Malha g={caixa(0.08, 2.2, 0.9)} m={toon('#7A5A3A')} position={[x1, 1.1, z0 + 0.6]} contorno={0.015} />
			{[
				[x0, z0],
				[x0, z1],
				[x1, z0],
				[x1, z1],
			].map(([px, pz], i) => (
				<Malha key={`c${i}`} g={caixa(0.16, 2.5, 0.16)} m={toon('#C9BEA8')} position={[px, 1.25, pz]} contorno={0.015} />
			))}
			{/* vidros (frente, fundo e lados) */}
			<mesh geometry={caixa(w, 1.35, 0.03)} material={vidro} position={[cx, 1.68, z1]} />
			<mesh geometry={caixa(w, 1.35, 0.03)} material={vidro} position={[cx, 1.68, z0]} />
			<mesh geometry={caixa(0.03, 1.35, d)} material={vidro} position={[x0, 1.68, cz]} />
			<mesh geometry={caixa(0.03, 1.35, d * 0.55)} material={vidro} position={[x1, 1.68, z1 - d * 0.275]} />
			{/* teto com beiral e a placa PORTARIA */}
			<Malha g={caixa(w + 0.5, 0.18, d + 0.5)} m={toon('#8F8676')} position={[cx, 2.55, cz]} contorno={0.02} />
			<mesh geometry={caixa(1.7, 0.27, 0.02)} material={placa('PORTARIA', '#1E3A6E', '#FFFFFF')} position={[cx, 2.82, z1 + 0.2]} />
			<mesh geometry={caixa(1.7, 0.3, 0.06)} material={toon('#14284E')} position={[cx, 2.82, z1 + 0.17]} />
			{/* mesa encostada no vidro da frente, monitores virados para dentro, livro aberto */}
			<Malha g={caixa(w - 0.3, 0.06, 0.62)} m={toon('#8C6A48')} position={[cx, 0.8, z1 - 0.42]} contorno={0.012} />
			<Malha g={caixa(w - 0.3, 0.74, 0.04)} m={toon('#6E5238')} position={[cx, 0.42, z1 - 0.12]} />
			{[cx - 0.95, cx - 0.32].map((mx, i) => (
				<group key={i} position={[mx, 0.83, z1 - 0.35]} rotation={[0, Math.PI + (i ? -0.35 : 0.05), 0]}>
					<mesh geometry={caixa(0.1, 0.18, 0.1)} material={toon('#222')} position={[0, 0.09, 0]} />
					<Malha g={caixa(0.66, 0.44, 0.05)} m={toon('#1A1A1E')} position={[0, 0.42, 0]} contorno={0.01} />
					<mesh geometry={caixa(0.6, 0.38, 0.01)} material={telaMonitor(vulto)} position={[0, 0.42, 0.03]} />
				</group>
			))}
			<group position={[cx + 0.95, 0.835, z1 - 0.48]} rotation={[0, 0.25, 0]}>
				<mesh geometry={caixa(0.42, 0.03, 0.3)} material={toon('#F4EEDC')} />
				<mesh geometry={caixa(0.012, 0.035, 0.3)} material={toon('#7A2E1F')} />
				{[-0.09, -0.04, 0.01, 0.06].map((lz) => (
					<mesh key={lz} geometry={caixa(0.16, 0.036, 0.008)} material={toon('#6A7AA8')} position={[-0.11, 0, lz]} />
				))}
			</group>
			{/* interfone na parede do lado do portão */}
			<group position={[x1 - 0.12, 1.35, z1 - 0.9]}>
				<Malha g={caixa(0.08, 0.5, 0.34)} m={toon('#E4DCCB')} contorno={0.01} />
				<mesh geometry={caixa(0.02, 0.1, 0.22)} material={brilho('#7CFFB2', 0.9)} position={[-0.05, 0.13, 0]} />
				<Malha g={capsulaFone} m={toon('#E4DCCB')} position={[-0.07, -0.06, 0]} rotation={[0, 0, 0]} contorno={0.01} />
			</group>
			{/* cadeira */}
			<group position={[cx + 0.25, 0, cz - 0.15]}>
				<Malha g={caixa(0.5, 0.08, 0.5)} m={toon('#222630')} position={[0, 0.5, 0]} contorno={0.01} />
				<Malha g={caixa(0.5, 0.6, 0.08)} m={toon('#222630')} position={[0, 0.85, -0.24]} contorno={0.01} />
				<mesh geometry={cilindro(0.04, 0.04, 0.45, 8)} material={toon('#111')} position={[0, 0.25, 0]} />
			</group>
			{/* luz fria do teto */}
			<mesh geometry={caixa(1.2, 0.05, 0.12)} material={brilho('#E6F4FF', 1.4 * falha)} position={[cx, 2.42, cz]} />
			<pointLight position={[cx, 2.2, cz]} color="#DDEEFF" intensity={6.5 * falha} distance={7} decay={1.9} />
			<sprite material={haloMat('#CFE6FF', 0.35)} position={[cx, 2.38, cz]} scale={[2.2, 1.2, 1]} />
		</group>
	);
};

const capsulaFone = new THREE.CapsuleGeometry(0.035, 0.26, 4, 8);

export const Portaria: React.FC<{t: number; nomeClima: string; objetos?: Objeto[]}> = ({t, objetos}) => {
	const luzes = objetos?.find((o) => o.tipo === 'luzes_predio');
	const vulto = !!luzes?.vulto_monitor;
	// a luz do hall também apaga junto com o térreo quando as luzes "apagam"
	const apagam = luzes?._apagam as number | undefined;
	const hall = apagam !== undefined ? 1 - smoothstep(apagam + 2.6, apagam + 2.8, t) : 1;
	const alturaPredio = ALT_TERREO + ANDARES * ALT_ANDAR;
	return (
		<>
			{/* chão: rua, calçada, pátio */}
			<Malha g={caixa(80, 0.1, 30)} m={toon('#23262F')} position={[0, -0.05, 12]} sombra={false} />
			<Malha g={caixa(80, 0.18, 2.6)} m={toon('#77757A')} position={[0, 0.0, 6.3]} sombra={false} />
			<Malha g={caixa(40, 0.06, 11.2)} m={toon('#5E5C63')} position={[0, 0.0, -0.6]} sombra={false} />
			{Array.from({length: 14}, (_, i) => (
				<mesh key={i} geometry={caixa(1.6, 0.02, 0.16)} material={toon('#D9B34A')} position={[-26 + i * 4, 0.01, 11.2]} />
			))}
			<Malha g={caixa(80, 0.2, 0.25)} m={toon('#9A988F')} position={[0, 0.05, 7.6]} sombra={false} />
			{/* grade da frente: guarita à esquerda, portão no meio, portão da garagem à direita */}
			<Grade x0={-14} x1={-6.4} z={5} />
			<Grade x0={2.0} x1={5.0} z={5} />
			<Grade x0={9.4} x1={16} z={5} />
			{/* portão principal (grade de correr) */}
			<group position={[-0.8, 0, 5.05]}>
				<Malha g={caixa(5.4, 0.1, 0.1)} m={toon('#2A2D36')} position={[0, 2.4, 0]} />
				<Malha g={caixa(5.4, 0.1, 0.1)} m={toon('#2A2D36')} position={[0, 0.12, 0]} />
				{Array.from({length: 26}, (_, i) => (
					<mesh key={i} geometry={caixa(0.05, 2.3, 0.05)} material={toon('#2A2D36')} position={[-2.6 + i * 0.208, 1.25, 0]} />
				))}
				{[-2.75, 2.75].map((px) => (
					<Malha key={px} g={caixa(0.35, 2.8, 0.35)} m={toon('#C9BEA8')} position={[px, 1.4, 0]} contorno={0.015} />
				))}
			</group>
			{/* portão da garagem: chapas fechadas */}
			<group position={[7.2, 0, 5.05]}>
				<Malha g={caixa(4.3, 2.4, 0.08)} m={toon('#4A505E')} position={[0, 1.25, 0]} contorno={0.015} />
				{Array.from({length: 9}, (_, i) => (
					<mesh key={i} geometry={caixa(4.3, 0.04, 0.1)} material={toon('#363A46')} position={[0, 0.2 + i * 0.27, 0]} />
				))}
				<mesh geometry={caixa(1.6, 0.3, 0.02)} material={placa('GARAGEM', '#E5B830', '#1A1A1A')} position={[0, 2.0, 0.06]} />
			</group>
			<Guarita vulto={vulto} t={t} />
			{/* fachada do prédio: térreo com hall e garagem, 12 andares de janelas, caixa d'água */}
			<Malha g={caixa(22, alturaPredio, 12)} m={toon('#6E6C78')} position={[0, alturaPredio / 2, FACHADA_Z - 6]} contorno={0.03} />
			{Array.from({length: ANDARES}, (_, a) => (
				<mesh key={`faixa${a}`} geometry={caixa(22.1, 0.22, 0.1)} material={toon('#4E4C58')} position={[0, ALT_TERREO + a * ALT_ANDAR, FACHADA_Z + 0.03]} />
			))}
			{Array.from({length: ANDARES}, (_, a) =>
				COLUNAS.map((x, c) => <Janela key={`j${a}-${c}`} x={x} y={ALT_TERREO + a * ALT_ANDAR + 1.45} acesa={janelaAcesa(a, c, t, luzes)} />),
			)}
			<Malha g={caixa(4, 2.4, 3)} m={toon('#56545F')} position={[-4, alturaPredio + 1.2, FACHADA_Z - 6]} contorno={0.02} />
			{/* hall: porta de vidro iluminada e letreiro */}
			<mesh geometry={caixa(3.4, 2.6, 0.06)} material={brilho('#FFE9C2', 0.55 + 0.45 * hall)} position={[0, 1.3, FACHADA_Z + 0.02]} />
			<mesh geometry={caixa(0.08, 2.6, 0.1)} material={toon('#3A3A40')} position={[0, 1.3, FACHADA_Z + 0.05]} />
			<Malha g={caixa(3.8, 0.12, 0.12)} m={toon('#3A3A40')} position={[0, 2.66, FACHADA_Z + 0.06]} />
			<mesh geometry={caixa(4.4, 0.62, 0.04)} material={placa('EDIFÍCIO AURORA', '#1C1C24', '#F2D27A')} position={[0, 3.0, FACHADA_Z + 0.1]} />
			{hall > 0.05 ? <pointLight position={[0, 2.0, FACHADA_Z + 1.4]} color="#FFE2B0" intensity={12 * hall} distance={9} decay={1.8} /> : null}
			{/* boca da garagem: escura, com a cancela listrada */}
			<mesh geometry={caixa(3.8, 2.7, 0.06)} material={basico('#06070B')} position={[7.0, 1.35, FACHADA_Z + 0.02]} />
			<Malha g={caixa(4.2, 0.2, 0.2)} m={toon('#8E8676')} position={[7.0, 2.8, FACHADA_Z + 0.1]} />
			<group position={[5.3, 1.0, FACHADA_Z + 0.9]}>
				<Malha g={caixa(0.3, 1.0, 0.3)} m={toon('#E5B830')} position={[0, -0.5, 0]} contorno={0.012} />
				{Array.from({length: 6}, (_, i) => (
					<mesh key={i} geometry={caixa(0.55, 0.1, 0.1)} material={toon(i % 2 ? '#FFFFFF' : '#D63030')} position={[0.4 + i * 0.55, 0, 0]} />
				))}
			</group>
			<mesh geometry={caixa(0.3, 0.12, 0.2)} material={brilho('#FF3B30', clamp(0.6 + 0.4 * Math.sin(t * 3)))} position={[8.6, 2.5, FACHADA_Z + 0.12]} />
			{/* rua: postes, carro estacionado, árvores na calçada */}
			<Poste x={-10} z={7.3} />
			<Poste x={5.5} z={7.3} />
			{/* fora da linha da guarita: câmeras da rua (e o recuo do dolly_zoom) passam livres */}
			<Carro x={-10.5} z={9.6} cor="#5A3A3A" />
			<Carro x={12} z={9.6} cor="#3A4A6A" />
			{[-12.5, 11.5].map((x) => (
				<group key={x} position={[x, 0, 6.3]}>
					<Malha g={cilindro(0.1, 0.13, 2.2, 8)} m={toon('#4A3628')} position={[0, 1.1, 0]} />
					<Malha g={new THREE.IcosahedronGeometry(1.2, 0)} m={toon('#24452E')} position={[0, 2.8, 0]} contorno={0.02} />
				</group>
			))}
			{/* luz da cidade: rebate alaranjado vindo da rua e um azul do céu, para nada ficar preto */}
			<pointLight position={[0, 7, 16]} color="#FF9E5E" intensity={42} distance={40} decay={1.4} />
			<pointLight position={[0, 16, 10]} color="#5F7FD8" intensity={26} distance={44} decay={1.4} />
		</>
	);
};
