// Sala da lâmpada no alto do farol: sala redonda envidraçada, a lente enorme no meio, um painel
// com o rádio e a chave do SOS, e a porta da escada. Lá fora, o céu (e a tempestade, com o efeito chuva).
// A lente acende conforme o objeto luz_farol (modo acesa, sos ou apagada); sem ele, fica apagada.
// 24/11: acabamento (pedido do Iuri): piso de tábuas com tapete, armário baixo com livros, lampião
// e garrafa, cadeira, rolo de corda, boia na janela, mar com ondas lá embaixo e gaivotas passando.
import React from 'react';
import * as THREE from 'three';
import {aleatorio} from '../../util/mat';
import {Malha, caixa, cilindro, cone, decalque, disco, geo, toon, translucido} from '../base';
import {BoiaSalvaVidas, Gaivotas, Mar} from '../detalhes';

const R = 3.2;

const LIVROS = (() => {
	const r = aleatorio(41);
	const cores = ['#8C2F39', '#2F5D8A', '#3F7D4E', '#C9A227', '#6B4A8C', '#A0522D'];
	return Array.from({length: 9}, (_, i) => ({h: 0.2 + r() * 0.08, w: 0.05 + r() * 0.03, cor: cores[i % cores.length], inc: i === 8 ? 0.4 : (r() - 0.5) * 0.06}));
})();

/** Móveis encostados na parede baixa, longe do painel (+x -z), da porta (-x) e da lente (centro). */
const Moveis: React.FC = React.memo(() => {
	let x = -0.42;
	return (
		<>
			{/* piso de tábuas (juntas escuras) e tapete redondo */}
			{Array.from({length: 13}, (_, i) => (
				<mesh key={i} geometry={geo('juntaPiso', () => new THREE.PlaneGeometry(0.018, 6.6).rotateX(-Math.PI / 2))} material={decalque('#3E2F24')} position={[-3 + i * 0.5, 0.003, 0]} />
			))}
			<mesh geometry={disco(1.25, 40)} material={decalque('#8C3B32')} position={[-0.6, 0.006, 1.1]} />
			<mesh geometry={geo('aneltapete', () => new THREE.RingGeometry(1.0, 1.1, 40).rotateX(-Math.PI / 2))} material={decalque('#E8C27A')} position={[-0.6, 0.008, 1.1]} />
			{/* armário baixo atrás (-z, à esquerda do painel) com livros, lampião e garrafa em cima */}
			<group position={[-1.25, 0, -2.55]} rotation={[0, 0.42, 0]}>
				<Malha g={caixa(1.3, 0.78, 0.42)} m={toon('#6B4A2E')} position={[0, 0.39, 0]} contorno={0.015} />
				<Malha g={caixa(1.36, 0.05, 0.46)} m={toon('#5A3D26')} position={[0, 0.8, 0]} sombra={false} />
				{[-0.32, 0.32].map((px) => (
					<group key={px}>
						<Malha g={caixa(0.58, 0.62, 0.02)} m={toon('#7A5638')} position={[px, 0.39, 0.215]} sombra={false} />
						<mesh geometry={cilindro(0.02, 0.02, 0.03, 8)} material={toon('#C9A227')} position={[px + (px < 0 ? 0.22 : -0.22), 0.42, 0.235]} rotation={[Math.PI / 2, 0, 0]} />
					</group>
				))}
				{LIVROS.map((l, i) => {
					x += l.w + 0.004;
					return <Malha key={i} g={caixa(l.w, l.h, 0.17)} m={toon(l.cor)} position={[x, 0.825 + l.h / 2, 0]} rotation={[0, 0, l.inc]} contorno={0.006} sombra={false} />;
				})}
				{/* lampião a querosene */}
				<group position={[0.32, 0.83, 0]}>
					<Malha g={cilindro(0.08, 0.1, 0.06, 12)} m={toon('#8A6A2E')} position={[0, 0.03, 0]} sombra={false} />
					<mesh geometry={cilindro(0.06, 0.06, 0.16, 12)} material={translucido('#FFE8B0', 0.45)} position={[0, 0.14, 0]} />
					<Malha g={cone(0.08, 0.07, 12)} m={toon('#8A6A2E')} position={[0, 0.25, 0]} sombra={false} />
					<mesh geometry={geo('alcaLampiao', () => new THREE.TorusGeometry(0.07, 0.008, 6, 16, Math.PI))} material={toon('#5A4A2E')} position={[0, 0.29, 0]} />
				</group>
				<Malha g={cilindro(0.04, 0.045, 0.2, 10)} m={toon('#2E6B4A')} position={[0.5, 0.93, 0.05]} contorno={0.006} sombra={false} />
			</group>
			{/* cadeira de madeira perto da janela da frente (+z, longe da câmera do painel) */}
			<group position={[-2.2, 0, 1.6]} rotation={[0, 2.2, 0]}>
				<Malha g={caixa(0.5, 0.05, 0.5)} m={toon('#7A5638')} position={[0, 0.48, 0]} contorno={0.01} />
				{[
					[-0.21, -0.21],
					[0.21, -0.21],
					[-0.21, 0.21],
					[0.21, 0.21],
				].map(([cx, cz], i) => (
					<Malha key={i} g={cilindro(0.025, 0.025, 0.48, 8)} m={toon('#5A3D26')} position={[cx, 0.24, cz]} sombra={false} />
				))}
				<Malha g={caixa(0.5, 0.42, 0.04)} m={toon('#7A5638')} position={[0, 0.76, -0.23]} contorno={0.01} />
			</group>
			{/* rolo de corda e balde no chão, perto da porta */}
			<group position={[-2.35, 0.03, -0.75]}>
				{[0, 1, 2, 3].map((i) => (
					<mesh key={i} geometry={geo('roloSala', () => new THREE.TorusGeometry(0.22, 0.045, 6, 20).rotateX(Math.PI / 2))} material={toon('#D9C49A')} position={[0, i * 0.07, 0]} scale={1 - i * 0.1} />
				))}
			</group>
			<group position={[-1.9, 0, -1.6]}>
				<Malha g={cilindro(0.17, 0.14, 0.3, 14)} m={toon('#5C6670')} position={[0, 0.15, 0]} contorno={0.01} />
				<mesh geometry={geo('alcaBalde', () => new THREE.TorusGeometry(0.16, 0.008, 6, 16, Math.PI))} material={toon('#3A424C')} position={[0, 0.3, 0]} rotation={[0, 0.5, 0]} />
			</group>
			{/* boia pendurada no caixilho de trás */}
			<BoiaSalvaVidas pos={[0.95, 1.55, -3.05]} giro={[0, -0.3, 0]} escala={0.9} />
		</>
	);
});

export const SalaFarol: React.FC<{t: number; nomeClima: string}> = ({t, nomeClima}) => (
	<>
		{/* lá embaixo, o mar com ondas (visto pelas janelas) e gaivotas passando */}
		<Mar nomeClima={nomeClima} t={t} y={-24} raio={400} />
		{nomeClima.startsWith('noite') ? null : <Gaivotas t={t} centro={[0, 1.2, 0]} quantas={4} raio={11} />}
		<SalaEstatica />
		{/* luz quente de dentro (o teto em cone deixa o piso na sombra do sol: sem ela a sala fica azul-escura) */}
		<pointLight position={[-0.6, 2.9, 0.8]} color="#FFD9A8" intensity={nomeClima.startsWith('noite') ? 5 : 7} distance={7} decay={1.6} />
	</>
);

const SalaEstatica: React.FC = React.memo(() => (
	<>
		<Moveis />
		{/* piso e parede baixa */}
		<Malha g={disco(R + 0.3, 32)} m={toon('#5A4636')} position={[0, 0.001, 0]} sombra={false} />
		<Malha g={cilindro(R + 0.2, R + 0.2, 1.0, 32, )} m={toon('#C8372D')} position={[0, -0.5, 0]} sombra={false} />
		<Malha g={cilindro(R, R, 0.9, 32)} m={toon('#E9E4D8')} position={[0, 0.45, 0]} sombra={false} />
		{/* janelas: vidro escuro com caixilhos */}
		<mesh geometry={cilindro(R, R, 2.2, 32)} material={translucido('#9FB7D8', 0.12)} position={[0, 2.0, 0]} />
		{Array.from({length: 10}, (_, i) => {
			const a = (i / 10) * Math.PI * 2;
			return <Malha key={i} g={caixa(0.08, 2.2, 0.08)} m={toon('#2B2F3A')} position={[Math.cos(a) * R, 2.0, Math.sin(a) * R]} sombra={false} />;
		})}
		<Malha g={cilindro(R + 0.05, R + 0.05, 0.1, 32)} m={toon('#2B2F3A')} position={[0, 0.95, 0]} sombra={false} />
		<Malha g={cilindro(R + 0.05, R + 0.05, 0.1, 32)} m={toon('#2B2F3A')} position={[0, 3.1, 0]} sombra={false} />
		{/* teto em cone */}
		<Malha g={cone(R + 0.3, 1.6, 32)} m={toon('#2B2F3A')} position={[0, 3.95, 0]} sombra={false} />
		{/* pedestal da lente */}
		<Malha g={cilindro(0.35, 0.5, 0.9, 16)} m={toon('#3A3F4C')} position={[0, 0.45, 0]} contorno={0.02} />
		{/* painel com rádio e a chave do SOS (perto da marca painel) */}
		<group position={[1.9, 0, -1.9]} rotation={[0, -Math.PI / 4, 0]}>
			<Malha g={caixa(1.3, 0.9, 0.5)} m={toon('#4B5563')} position={[0, 0.45, 0]} contorno={0.02} />
			<Malha g={caixa(1.2, 0.08, 0.6)} m={toon('#6B4A2E')} position={[0, 0.94, 0.04]} sombra={false} />
			<Malha g={caixa(0.42, 0.3, 0.26)} m={toon('#3A4252')} position={[-0.3, 1.13, 0]} contorno={0.015} />
			<Malha g={caixa(0.3, 0.06, 0.2)} m={toon('#C8372D')} position={[0.3, 1.0, 0.05]} sombra={false} />
		</group>
		{/* porta da escada */}
		<Malha g={caixa(0.9, 1.9, 0.12)} m={toon('#4A3424')} position={[-R + 0.12, 0.95, 0.6]} rotation={[0, Math.PI / 2, 0]} contorno={0.02} />
	</>
));
