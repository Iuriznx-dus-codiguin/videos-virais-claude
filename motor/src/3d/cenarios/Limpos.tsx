// Cenários do visual limpo (Como Funciona desde 11/11): lugares de verdade para a coisa do dia
// ficar no tamanho e no contexto dela, como nos vídeos de engenharia que viralizaram.
// vitrine: fundo infinito claro (foto de produto) · cozinha: balcão, azulejo e armários ·
// campo: gramado com morros, árvores e nuvens (obras grandes) · rua: asfalto, calçadas e prédios.
import React from 'react';
import * as THREE from 'three';
import {aleatorio} from '../../util/mat';
import {caixa, cilindro, disco, esfera, geo, ico} from '../base';
import {caixaRedonda, materialLimpo} from '../limpo';

const mat = (cor: string, material = 'fosco', largura = 1, altura = 1, opacidade = 1) => materialLimpo({cor, material, opacidade, largura, altura});

const M: React.FC<{g: THREE.BufferGeometry; m: THREE.Material; p?: [number, number, number]; r?: [number, number, number]; s?: boolean}> = ({g, m, p, r, s = true}) => (
	<mesh geometry={g} material={m} position={p} rotation={r} castShadow={s} receiveShadow />
);

// --- vitrine ------------------------------------------------------------------------------------

const cicloramaGeo = () =>
	geo('ciclorama-limpo', () => {
		// chão que sobe em curva até virar parede (sem quina): perfil girado num arco largo
		const pts: THREE.Vector2[] = [];
		for (let i = 0; i <= 24; i++) {
			const a = (i / 24) * (Math.PI / 2);
			pts.push(new THREE.Vector2(9 - 2.5 + Math.sin(a) * 2.5, 2.5 - Math.cos(a) * 2.5));
		}
		pts.push(new THREE.Vector2(9, 14));
		const g = new THREE.LatheGeometry(pts, 96, Math.PI * 0.5, Math.PI);
		g.computeVertexNormals();
		return g;
	});

export const Vitrine: React.FC<{t: number; nomeClima: string}> = React.memo(() => (
	<>
		<mesh geometry={disco(7, 64)} material={mat('#E9EDF3', 'fosco')} receiveShadow position={[0, 0.001, 0]} />
		<mesh geometry={cicloramaGeo()} material={materialLimpo({cor: '#DDE3EC', material: 'fosco', opacidade: 1, ladoDuplo: true})} receiveShadow position={[0, 0, 1.5]} />
		<pointLight position={[2.5, 3.2, 3]} color="#FFFFFF" intensity={4} distance={12} decay={2} />
		<pointLight position={[-3, 2.5, -2.5]} color="#CFE4FF" intensity={3} distance={10} decay={2} />
	</>
));

// --- cozinha ------------------------------------------------------------------------------------

const PORTAS_X = [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5];

export const Cozinha: React.FC<{t: number; nomeClima: string}> = React.memo(() => {
	const armario = mat('#F3EFE6', 'fosco');
	const puxador = mat('#C9CED6', 'cromado');
	const tampo = mat('#3B3F47', 'ceramica');
	const parede = mat('#EFE6D6', 'fosco');
	return (
		<>
			{/* piso e paredes */}
			<M g={caixa(8, 0.02, 6)} m={mat('#C99A6B', 'madeira', 8, 6)} p={[0, -0.01, 1.5]} s={false} />
			<M g={caixa(8, 2.9, 0.1)} m={parede} p={[0, 1.45, -0.7]} s={false} />
			<M g={caixa(4.6, 0.72, 0.02)} m={mat('#FFFFFF', 'ceramica', 4.6, 0.72)} p={[0, 1.28, -0.64]} s={false} />
			<M g={caixa(0.1, 2.9, 6)} m={parede} p={[-2.6, 1.45, 2.3]} s={false} />
			<M g={caixa(0.1, 2.9, 6)} m={parede} p={[2.6, 1.45, 2.3]} s={false} />
			{/* armários de baixo com portas e puxadores */}
			<M g={caixa(3.8, 0.84, 0.58)} m={armario} p={[0, 0.46, -0.36]} />
			<M g={caixa(3.8, 0.08, 0.5)} m={mat('#2E3138', 'fosco')} p={[0, 0.04, -0.4]} s={false} />
			{PORTAS_X.map((x) => (
				<React.Fragment key={x}>
					<M g={caixaRedonda(0.56, 0.74, 0.02, 0.006)} m={armario} p={[x, 0.5, -0.06]} />
					<M g={caixaRedonda(0.14, 0.02, 0.025, 0.008)} m={puxador} p={[x, 0.78, -0.03]} />
				</React.Fragment>
			))}
			{/* tampo de pedra (topo a 0,92 m) */}
			<M g={caixaRedonda(3.9, 0.04, 0.64, 0.012)} m={tampo} p={[0, 0.9, -0.36]} />
			{/* armários de cima, com janela no meio */}
			{[-1.2, 1.2].map((x) => (
				<React.Fragment key={x}>
					<M g={caixaRedonda(1.3, 0.72, 0.34, 0.01)} m={armario} p={[x, 2.0, -0.48]} />
					<M g={caixaRedonda(0.6, 0.66, 0.02, 0.006)} m={armario} p={[x - 0.32, 2.0, -0.3]} />
					<M g={caixaRedonda(0.6, 0.66, 0.02, 0.006)} m={armario} p={[x + 0.32, 2.0, -0.3]} />
				</React.Fragment>
			))}
			<M g={caixa(1.0, 0.8, 0.02)} m={mat('#E8F4FF', 'luz')} p={[0, 2.05, -0.64]} s={false} />
			<M g={caixa(1.1, 0.06, 0.06)} m={mat('#FFFFFF', 'fosco')} p={[0, 1.62, -0.62]} />
			<M g={caixa(1.1, 0.06, 0.06)} m={mat('#FFFFFF', 'fosco')} p={[0, 2.48, -0.62]} />
			<M g={caixa(0.05, 0.86, 0.06)} m={mat('#FFFFFF', 'fosco')} p={[-0.53, 2.05, -0.62]} />
			<M g={caixa(0.05, 0.86, 0.06)} m={mat('#FFFFFF', 'fosco')} p={[0.53, 2.05, -0.62]} />
			<M g={caixa(0.03, 0.8, 0.04)} m={mat('#FFFFFF', 'fosco')} p={[0, 2.05, -0.62]} />
			{/* vaso de planta, tábua e pote de colheres nas pontas do balcão */}
			<M g={cilindro(0.07, 0.09, 0.16, 20)} m={mat('#D86F4B', 'ceramica')} p={[-1.55, 1.0, -0.45]} />
			<M g={ico(0.12, 1)} m={mat('#4E9F3D', 'fosco')} p={[-1.55, 1.18, -0.45]} />
			<M g={caixaRedonda(0.42, 0.025, 0.28, 0.01)} m={mat('#B07A4A', 'madeira')} p={[1.35, 0.935, -0.42]} r={[0, 0.25, 0]} />
			<M g={cilindro(0.06, 0.06, 0.16, 20)} m={mat('#FFFFFF', 'ceramica')} p={[1.7, 1.0, -0.5]} />
			<M g={cilindro(0.008, 0.008, 0.26, 8)} m={mat('#B07A4A', 'madeira')} p={[1.69, 1.12, -0.5]} r={[0.15, 0, 0.1]} />
			<M g={cilindro(0.008, 0.008, 0.24, 8)} m={puxador} p={[1.72, 1.11, -0.49]} r={[-0.1, 0, -0.15]} />
			<pointLight position={[0, 2.4, 1.6]} color="#FFF4E2" intensity={3.2} distance={6} decay={2} />
		</>
	);
});

// --- campo --------------------------------------------------------------------------------------

const ARVORES_CAMPO = (() => {
	const r = aleatorio(4242);
	const lista: {x: number; z: number; h: number; tom: number}[] = [];
	while (lista.length < 70) {
		const x = (r() - 0.5) * 110;
		const z = -8 - r() * 60;
		if (Math.abs(x) < 9 && z > -16) continue;
		lista.push({x, z, h: 3 + r() * 3.5, tom: r()});
	}
	for (let i = 0; i < 16; i++) {
		const lado = i % 2 ? 1 : -1;
		lista.push({x: lado * (11 + r() * 20), z: -6 + r() * 22, h: 3 + r() * 3, tom: r()});
	}
	return lista;
})();

const NUVENS = [
	[-18, 34, -70, 1.6],
	[14, 40, -80, 2.0],
	[42, 30, -60, 1.3],
	[-46, 38, -55, 1.5],
	[2, 46, -110, 2.4],
] as const;

export const ArvoreLimpa: React.FC<{x: number; z: number; h: number; tom: number; y?: number}> = ({x, z, h, tom, y = 0}) => {
	const folha = tom < 0.5 ? '#5DAA3F' : '#4A9636';
	const escura = tom < 0.5 ? '#478E34' : '#3B7F2C';
	const pinheiro = tom > 0.78;
	return (
		<group position={[x, y, z]}>
			<M g={cilindro(h * 0.05, h * 0.035, h * 0.45, 7)} m={mat('#7A5233', 'madeira')} p={[0, h * 0.225, 0]} />
			{pinheiro ? (
				<>
					<M g={geo(`pinho${h}`, () => new THREE.ConeGeometry(h * 0.26, h * 0.55, 7))} m={mat(escura)} p={[0, h * 0.55, 0]} />
					<M g={geo(`pinho2${h}`, () => new THREE.ConeGeometry(h * 0.2, h * 0.45, 7))} m={mat(folha)} p={[0, h * 0.82, 0]} />
				</>
			) : (
				<>
					<M g={ico(h * 0.27, 0)} m={mat(folha)} p={[0, h * 0.62, 0]} r={[0.3, tom * 6, 0]} />
					<M g={ico(h * 0.2, 0)} m={mat(escura)} p={[h * 0.15, h * 0.78, h * 0.06]} r={[0.8, 0.2, 0.4]} />
					<M g={ico(h * 0.18, 0)} m={mat(folha)} p={[-h * 0.13, h * 0.74, -h * 0.07]} r={[0.1, 1.2, 0.6]} />
				</>
			)}
		</group>
	);
};

const NuvemLimpa: React.FC<{p: readonly [number, number, number, number]}> = ({p: [x, y, z, k]}) => {
	const m = mat('#FFFFFF', 'fosco');
	return (
		<group position={[x, y, z]} scale={k}>
			<M g={ico(3, 1)} m={m} p={[0, 0, 0]} s={false} />
			<M g={ico(2.4, 1)} m={m} p={[3.2, -0.6, 0.4]} s={false} />
			<M g={ico(2.2, 1)} m={m} p={[-3.0, -0.7, 0.2]} s={false} />
			<M g={ico(1.8, 1)} m={m} p={[1.2, 1.6, -0.3]} s={false} />
		</group>
	);
};

export const Campo: React.FC<{t: number; nomeClima: string; corte?: THREE.Plane[] | null}> = React.memo(({corte}) => (
	<>
		<M g={disco(220, 64)} m={materialLimpo({cor: '#79C24F', material: 'grama', opacidade: 1, largura: 60, altura: 60, corte: corte ?? null, chaveCorte: corte ? 'solo' : undefined})} s={false} />
		{/* morros ao fundo */}
		{[
			[-70, -120, 45, 0.35, '#6BAF46'],
			[10, -150, 60, 0.3, '#5FA140'],
			[80, -110, 50, 0.32, '#68AA44'],
			[-130, -60, 55, 0.28, '#6BAF46'],
			[140, -40, 50, 0.3, '#64A843'],
		].map(([x, z, r, k, cor], i) => (
			<mesh key={i} geometry={esfera(1, 32, 16)} material={mat(String(cor))} position={[Number(x), -Number(r) * 0.55, Number(z)]} scale={[Number(r), Number(r) * Number(k) * 2.4, Number(r)]} receiveShadow />
		))}
		{ARVORES_CAMPO.map((a, i) => (
			<ArvoreLimpa key={i} {...a} />
		))}
		{[
			[-6, 4, 0.5],
			[7, 6, 0.4],
			[-10, -4, 0.7],
			[12, -3, 0.6],
		].map(([x, z, r], i) => (
			<M key={`p${i}`} g={ico(r, 0)} m={mat('#9A9A96', 'pedra')} p={[x, r * 0.3, z]} r={[i, i * 2, 0]} />
		))}
		{NUVENS.map((n, i) => (
			<NuvemLimpa key={i} p={n} />
		))}
	</>
));

// --- rua ----------------------------------------------------------------------------------------

const PREDIOS = (() => {
	const r = aleatorio(77);
	const cores = ['#E8D9C4', '#C9D6E3', '#F0E3D0', '#D9C3B0', '#BFD1C6', '#E6E1D8'];
	const lista: {x: number; z: number; l: number; h: number; p: number; cor: string}[] = [];
	let x = -34;
	while (x < 34) {
		const l = 5 + r() * 5;
		lista.push({x: x + l / 2, z: -11 - r() * 2, l: l - 0.4, h: 7 + r() * 16, p: 6, cor: cores[Math.floor(r() * cores.length)]});
		x += l;
	}
	return lista;
})();

const Predio: React.FC<{x: number; z: number; l: number; h: number; p: number; cor: string}> = ({x, z, l, h, p, cor}) => {
	const andares = Math.max(2, Math.floor(h / 3));
	const cols = Math.max(2, Math.floor(l / 1.6));
	const vidro = mat('#9FC3DE', 'vidro', 1, 1, 3);
	return (
		<group position={[x, 0, z]}>
			<M g={caixa(l, h, p)} m={mat(cor, 'concreto', l, h)} p={[0, h / 2, 0]} />
			{Array.from({length: andares - 1}, (_, a) =>
				Array.from({length: cols}, (_, c) => (
					<M key={`${a}-${c}`} g={caixa(0.9, 1.3, 0.05)} m={vidro} p={[-l / 2 + (c + 0.5) * (l / cols), 3.4 + a * 3, p / 2 + 0.02]} s={false} />
				)),
			)}
		</group>
	);
};

export const Rua: React.FC<{t: number; nomeClima: string; corte?: THREE.Plane[] | null}> = React.memo(({corte}) => {
	const solo = (cor: string, material: string, l: number, a: number) => materialLimpo({cor, material, opacidade: 1, largura: l, altura: a, corte: corte ?? null, chaveCorte: corte ? 'solo' : undefined});
	const calcada = mat('#C8C4BC', 'concreto', 10, 3);
	return (
		<>
			<M g={disco(160, 48)} m={solo('#79C24F', 'grama', 50, 50)} p={[0, -0.02, 0]} s={false} />
			<M g={caixa(90, 0.02, 8)} m={solo('#4A4D52', 'asfalto', 90, 8)} p={[0, 0, 0]} s={false} />
			{Array.from({length: 30}, (_, i) => (
				<M key={i} g={caixa(1.6, 0.025, 0.14)} m={mat('#F5F5F0')} p={[-43 + i * 3, 0.005, 0]} s={false} />
			))}
			{[-1, 1].map((lado) => (
				<React.Fragment key={lado}>
					<M g={caixa(90, 0.16, 3.2)} m={calcada} p={[0, 0.08, lado * 5.6]} />
					<M g={caixa(90, 0.18, 0.18)} m={mat('#B5B1A9', 'concreto')} p={[0, 0.09, lado * 4.05]} />
					<M g={caixa(90, 0.02, 0.12)} m={mat('#F2C230')} p={[0, 0.005, lado * 3.75]} s={false} />
				</React.Fragment>
			))}
			{/* postes e árvores da calçada */}
			{[-16, -4, 8, 20].map((x) => (
				<group key={x} position={[x, 0.16, -4.5]}>
					<M g={cilindro(0.07, 0.09, 5.2, 10)} m={mat('#5A6068', 'metal')} p={[0, 2.6, 0]} />
					<M g={caixa(1.2, 0.08, 0.1)} m={mat('#5A6068', 'metal')} p={[0, 5.1, 0.5]} r={[0, Math.PI / 2, 0]} />
					<M g={caixaRedonda(0.35, 0.12, 0.2, 0.03)} m={mat('#FFF6D8', 'luz')} p={[0, 5.05, 1.05]} s={false} />
				</group>
			))}
			{[-10, 2, 14].map((x) => (
				<ArvoreLimpa key={x} x={x} z={-5.6} h={4.2} tom={(x + 20) / 40} y={0.16} />
			))}
			{PREDIOS.map((p, i) => (
				<Predio key={i} {...p} />
			))}
		</>
	);
});
