// Praia da ilha (a mesma do teste aprovado): areia, mar em volta, coqueiros e a mata ao fundo.
// 24/11: mar com ondas e brilho do sol (detalhes.tsx), capim na beira da mata, conchas e
// pedrinhas na areia e gaivotas de dia. As marcas não mudam.
import React from 'react';
import * as THREE from 'three';
import {Malha, basico, cilindro, toon, toro} from '../base';
import {clima} from '../luzes';
import {Capim, Gaivotas, Mar, Pedrinhas} from '../detalhes';
import {Arbusto, Nuvem, Palmeira, Pedra} from '../natureza';

export const NIVEL_MAR = -0.12;
const RAIO = 13;

const PALMEIRAS = [
	{x: -6.5, z: -5.5, altura: 7.5, inclinacao: 0.35, direcao: 0.6},
	{x: -2.8, z: -8.2, altura: 8.5, inclinacao: 0.2, direcao: -0.4},
	{x: 6.2, z: -6.2, altura: 7.0, inclinacao: 0.4, direcao: 2.6},
	{x: 8.8, z: -2.8, altura: 6.2, inclinacao: 0.5, direcao: 2.0},
	{x: -9.5, z: 1.5, altura: 6.8, inclinacao: 0.45, direcao: -0.9},
	{x: -0.6, z: -11.5, altura: 9.0, inclinacao: 0.15, direcao: 0.3},
	{x: 10.5, z: -7.5, altura: 8.0, inclinacao: 0.3, direcao: 2.4},
	{x: -10.8, z: -6.5, altura: 7.2, inclinacao: 0.35, direcao: 0.9},
];

const ARBUSTOS = [
	{x: -8.5, z: -6.5, r: 1.6, escuro: false},
	{x: -5.0, z: -7.2, r: 1.9, escuro: false},
	{x: -1.5, z: -7.6, r: 1.7, escuro: false},
	{x: 0.4, z: -8.6, r: 1.5, escuro: false},
	{x: 5.3, z: -7.6, r: 1.8, escuro: false},
	{x: 7.6, z: -6.6, r: 1.6, escuro: false},
	{x: 10.2, z: -4.8, r: 1.4, escuro: false},
	{x: -6.5, z: -9.8, r: 2.4, escuro: true},
	{x: -2.5, z: -10.2, r: 2.6, escuro: true},
	{x: 2.0, z: -11.2, r: 2.5, escuro: true},
	{x: 6.0, z: -10.0, r: 2.4, escuro: true},
	{x: 9.2, z: -8.6, r: 2.2, escuro: true},
	{x: -10.4, z: -3.6, r: 1.5, escuro: false},
	{x: 11.6, z: -1.0, r: 1.2, escuro: false},
];

const PEDRAS = [
	{x: -4.0, z: 9.8, r: 0.7},
	{x: 6.2, z: 5.4, r: 0.9},
	{x: -7.6, z: -2.4, r: 0.6},
	{x: 9.6, z: 2.2, r: 0.5},
	{x: 7.0, z: 6.2, r: 0.45},
];

const Estatico: React.FC<{nomeClima: string}> = React.memo(({nomeClima}) => {
	const c = clima(nomeClima);
	return (
		<>
			<Malha g={cilindro(RAIO + 0.4, RAIO, 0.8, 72)} m={toon('#F2D19B')} position={[0, -0.4, 0]} contorno={0.06} sombra={false} />
			<Malha g={cilindro(RAIO + 1.5, RAIO + 1.0, 0.5, 72)} m={toon('#D9B07A')} position={[0, -0.35, 0]} sombra={false} />
			<Capim chave="praia-mata" regiao={{retangulo: [-11.5, -12, 11.5, -5.8]}} quantos={130} cor="#5E8F3A" semente={41} />
			<Pedrinhas chave="praia-conchas" regiao={{retangulo: [-11, -5, 11, 11.5]}} quantos={70} cor="#F7E7CF" semente={42} tamanho={0.06} />
			<Pedrinhas chave="praia-pedras" regiao={{retangulo: [-11, -5, 11, 11.5]}} quantos={40} cor="#B39A7A" semente={43} />
			<Nuvem pos={[-60, 34, -170]} escala={9} cor={c.nuvem} />
			<Nuvem pos={[35, 46, -190]} escala={12} cor={c.nuvem} />
			<Nuvem pos={[80, 26, -150]} escala={7} cor={c.nuvem} />
			<Nuvem pos={[-40, 30, 160]} escala={10} cor={c.nuvem} />
			<Nuvem pos={[70, 40, 140]} escala={8} cor={c.nuvem} />
			{PALMEIRAS.map((p, i) => (
				<Palmeira key={i} d={p} />
			))}
			{ARBUSTOS.map((a, i) => (
				<Arbusto key={i} x={a.x} z={a.z} r={a.r} cor={a.escuro ? '#1F4D2C' : '#2F6B3A'} giro={i * 0.7} />
			))}
			{PEDRAS.map((p, i) => (
				<Pedra key={i} x={p.x} z={p.z} r={p.r} giro={i * 1.3} />
			))}
		</>
	);
});

/** Espuma da beira: anel que vai e volta com as ondas. */
const Espuma: React.FC<{t: number}> = ({t}) => {
	const k = (RAIO + 1.1 + 0.12 * Math.sin(2.2 * t)) / (RAIO + 1.1);
	return <mesh geometry={toro(RAIO + 1.1, 0.09, 96, 8)} material={basico('#FFFFFF')} position={[0, NIVEL_MAR + 0.01, 0]} scale={[k, 1, k]} />;
};

export const Praia: React.FC<{t: number; nomeClima: string}> = ({t, nomeClima}) => (
	<>
		<Mar nomeClima={nomeClima} t={t} y={NIVEL_MAR} raio={320} raioInterno={RAIO + 1.0} />
		<Estatico nomeClima={nomeClima} />
		<Espuma t={t} />
		{nomeClima.startsWith('noite') ? null : <Gaivotas t={t} centro={[-3, 12, 22]} quantas={4} raio={12} />}
	</>
);
