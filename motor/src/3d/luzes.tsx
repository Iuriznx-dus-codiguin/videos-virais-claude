// Climas de luz (dia, pôr do sol, entardecer, noite): cores do céu, sol ou lua, luz de
// contra, neblina e o reforço que mantém os rostos legíveis no escuro.
import React from 'react';
import * as THREE from 'three';
import type {V3} from '../util/mat';
import {esfera, linear, memo} from './base';

export interface Clima {
	/** luz ambiente (cor das sombras), em RGB linear */
	ambiente: V3;
	/** luz direta; ambiente + sol = 1 faz a parte iluminada mostrar a cor exata do material */
	sol: V3;
	solDir: V3;
	contra: {cor: string; dir: V3; intensidade: number};
	ceu: {cores: [string, string, string, string, string]; paradas: [number, number, number, number, number]};
	/** disco no céu (sol ou lua): direção e tamanho em graus */
	astro: {cor: string; dir: V3; graus: number; halo: number};
	estrelas: number;
	neblina?: {cor: string; perto: number; longe: number};
	/** brilho extra na cabeça dos personagens para o rosto não sumir na sombra */
	reforcoRosto: V3;
	/** cores do mar da perto para longe */
	mar: [string, string, string, string, string];
	nuvem: string;
}

export const CLIMAS: Record<string, Clima> = {
	por_do_sol: {
		ambiente: [0.302, 0.237, 0.579],
		sol: [0.698, 0.763, 0.421],
		solDir: [-8, 14, 10],
		contra: {cor: '#FF8FA3', dir: [5, 6, -12], intensidade: 0.6},
		ceu: {cores: ['#FFB36B', '#FF8A6B', '#C9628C', '#4B3F8F', '#262B63'], paradas: [0, 0.12, 0.35, 0.7, 1]},
		astro: {cor: '#FFF1C7', dir: [-0.08, 0.06, -1], graus: 4, halo: 0.55},
		estrelas: 0,
		reforcoRosto: [0.38, 0.37, 0.31],
		mar: ['#4FC9C2', '#2A7FA0', '#7A6BB0', '#F0A27E', '#FFB36B'],
		nuvem: '#FFC2B0',
	},
	entardecer: {
		ambiente: [0.2, 0.2, 0.36],
		sol: [0.78, 0.5, 0.26],
		solDir: [-10, 8, -6],
		contra: {cor: '#FFB070', dir: [6, 5, -10], intensidade: 0.55},
		ceu: {cores: ['#F7A35C', '#E07A62', '#9A5B8C', '#3C3F82', '#1C2252'], paradas: [0, 0.1, 0.3, 0.65, 1]},
		astro: {cor: '#FFE2A8', dir: [-0.7, 0.12, -0.7], graus: 3.5, halo: 0.5},
		estrelas: 0,
		neblina: {cor: '#5A5F78', perto: 14, longe: 60},
		reforcoRosto: [0.27, 0.25, 0.22],
		mar: ['#3C8C96', '#2A6E8A', '#5B5A96', '#C07A70', '#F7A35C'],
		nuvem: '#E8A090',
	},
	noite: {
		ambiente: [0.055, 0.075, 0.17],
		sol: [0.3, 0.4, 0.62],
		solDir: [9, 14, -7],
		contra: {cor: '#6FA8FF', dir: [-6, 5, -10], intensidade: 0.45},
		ceu: {cores: ['#2B4170', '#1D2E57', '#142142', '#0B1430', '#050914'], paradas: [0, 0.08, 0.25, 0.6, 1]},
		astro: {cor: '#EEF3FF', dir: [0.45, 0.42, -0.79], graus: 3, halo: 0.35},
		estrelas: 1,
		neblina: {cor: '#101B33', perto: 10, longe: 48},
		reforcoRosto: [0.1, 0.12, 0.18],
		mar: ['#16405A', '#0F2E4A', '#13254A', '#1B2E57', '#2B4170'],
		nuvem: '#2A3A62',
	},
	dia: {
		ambiente: [0.32, 0.36, 0.5],
		sol: [0.68, 0.64, 0.5],
		solDir: [-6, 16, 8],
		contra: {cor: '#FFF2D0', dir: [5, 8, -10], intensidade: 0.35},
		ceu: {cores: ['#CFEFFF', '#9ED8FF', '#6BBEF5', '#3E9BE0', '#2A7BC8'], paradas: [0, 0.1, 0.3, 0.65, 1]},
		astro: {cor: '#FFFBEA', dir: [-0.3, 0.75, -0.6], graus: 3.5, halo: 0.4},
		estrelas: 0,
		reforcoRosto: [0.3, 0.3, 0.27],
		mar: ['#5FD8D0', '#2BA6C4', '#2A86C0', '#5AA6DE', '#CFEFFF'],
		nuvem: '#FFFFFF',
	},
	// estúdio do Como Funciona: fundo azul-marinho escuro, luz principal branca e contra azul
	estudio: {
		ambiente: [0.3, 0.33, 0.45],
		sol: [0.7, 0.67, 0.55],
		solDir: [-5, 12, 9],
		contra: {cor: '#5AC8FF', dir: [6, 6, -10], intensidade: 0.7},
		ceu: {cores: ['#16244A', '#111C3C', '#0C1530', '#080F24', '#050A18'], paradas: [0, 0.1, 0.3, 0.65, 1]},
		astro: {cor: '#16244A', dir: [0, -1, 0], graus: 0.1, halo: 0},
		estrelas: 0,
		reforcoRosto: [0.25, 0.25, 0.25],
		mar: ['#16244A', '#16244A', '#16244A', '#16244A', '#16244A'],
		nuvem: '#16244A',
	},
	// oficina antiga: luz quente de lâmpada e de janela, sombras marrons
	oficina: {
		ambiente: [0.28, 0.21, 0.17],
		sol: [0.72, 0.6, 0.4],
		solDir: [-6, 10, 6],
		contra: {cor: '#FFC27A', dir: [5, 6, -8], intensidade: 0.5},
		ceu: {cores: ['#3A2A20', '#2E2119', '#241913', '#1A120D', '#120C08'], paradas: [0, 0.1, 0.3, 0.65, 1]},
		astro: {cor: '#3A2A20', dir: [0, -1, 0], graus: 0.1, halo: 0},
		estrelas: 0,
		reforcoRosto: [0.26, 0.22, 0.18],
		mar: ['#3A2A20', '#3A2A20', '#3A2A20', '#3A2A20', '#3A2A20'],
		nuvem: '#3A2A20',
	},
};

export const clima = (nome: string) => CLIMAS[nome] ?? CLIMAS.dia;

export const RAMPA_GLSL = /* glsl */ `
vec3 rampa(vec3 cores[5], float paradas[5], float f) {
	vec3 c = cores[0];
	for (int i = 0; i < 4; i++) {
		c = mix(c, cores[i + 1], clamp((f - paradas[i]) / (paradas[i + 1] - paradas[i]), 0.0, 1.0));
	}
	return c;
}`;

const ceuMat = (nome: string) =>
	memo(`ceu${nome}`, () => {
		const c = clima(nome);
		const tam = (c.astro.graus * Math.PI) / 180;
		return new THREE.ShaderMaterial({
			side: THREE.BackSide,
			depthWrite: false,
			fog: false,
			uniforms: {
				cores: {value: c.ceu.cores.map((x) => new THREE.Color(x))},
				paradas: {value: c.ceu.paradas},
				astro: {value: new THREE.Vector3(...c.astro.dir).normalize()},
				corAstro: {value: new THREE.Color(c.astro.cor)},
				disco: {value: new THREE.Vector2(Math.cos(tam * 1.06), Math.cos(tam))},
				brilho: {value: new THREE.Vector2(Math.cos(tam * 4), Math.cos(tam))},
				forcaHalo: {value: c.astro.halo},
				estrelas: {value: c.estrelas},
			},
			vertexShader: /* glsl */ `
				varying vec3 vDir;
				void main() {
					vec4 m = modelMatrix * vec4(position, 1.0);
					vDir = m.xyz - cameraPosition;
					gl_Position = projectionMatrix * viewMatrix * m;
					gl_Position.z = gl_Position.w;
				}`,
			fragmentShader: /* glsl */ `
				uniform vec3 cores[5];
				uniform float paradas[5];
				uniform vec3 astro;
				uniform vec3 corAstro;
				uniform vec2 disco;
				uniform vec2 brilho;
				uniform float forcaHalo;
				uniform float estrelas;
				varying vec3 vDir;
				${RAMPA_GLSL}
				float hash(vec3 p) {
					p = fract(p * 0.3183099 + 0.1);
					p *= 17.0;
					return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
				}
				void main() {
					vec3 d = normalize(vDir);
					vec3 c = rampa(cores, paradas, clamp(d.y, 0.0, 1.0));
					if (estrelas > 0.0 && d.y > 0.02) {
						vec3 cel = floor(d * 260.0);
						float h = hash(cel);
						if (h > 0.9965) {
							vec3 centro = (cel + 0.5) / 260.0;
							float dd = length(d - normalize(centro)) * 260.0;
							float b = (1.0 - smoothstep(0.15, 0.55, dd)) * (h - 0.9965) / 0.0035;
							c += vec3(0.85, 0.9, 1.0) * b * estrelas * smoothstep(0.02, 0.25, d.y);
						}
					}
					float dt = dot(d, astro);
					c = mix(c, corAstro, clamp((dt - brilho.x) / (brilho.y - brilho.x), 0.0, 1.0) * forcaHalo);
					c = mix(c, corAstro, clamp((dt - disco.x) / (disco.y - disco.x), 0.0, 1.0));
					gl_FragColor = vec4(c, 1.0);
					#include <colorspace_fragment>
				}`,
		});
	});

/** Esfera do céu que acompanha a câmera (desenhada antes de tudo, atrás de tudo). */
export const Ceu: React.FC<{nome: string; posicao: V3}> = ({nome, posicao}) => (
	<mesh geometry={esfera(500, 48, 24)} material={ceuMat(nome)} position={posicao} renderOrder={-1} frustumCulled={false} />
);

const direcao = (v: V3, dist: number): V3 => {
	const n = Math.hypot(...v);
	return [(v[0] / n) * dist, (v[1] / n) * dist, (v[2] / n) * dist];
};

/** Luz ambiente, sol/lua com sombra e luz de contra, centradas em `foco` para a sombra caber. */
export const Iluminacao: React.FC<{nome: string; foco: V3; alcanceSombra?: number}> = ({nome, foco, alcanceSombra = 22}) => {
	const c = clima(nome);
	const sol = direcao(c.solDir, 30);
	const alvo = React.useMemo(() => new THREE.Object3D(), []);
	alvo.position.set(...foco);
	alvo.updateMatrixWorld();
	return (
		<>
			<ambientLight color={linear(...c.ambiente)} intensity={Math.PI} />
			<primitive object={alvo} />
			<directionalLight
				position={[foco[0] + sol[0], foco[1] + sol[1], foco[2] + sol[2]]}
				target={alvo}
				color={linear(...c.sol)}
				intensity={Math.PI}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-left={-alcanceSombra}
				shadow-camera-right={alcanceSombra}
				shadow-camera-top={alcanceSombra}
				shadow-camera-bottom={-alcanceSombra}
				shadow-camera-near={1}
				shadow-camera-far={80}
				shadow-bias={-0.0004}
				shadow-normalBias={0.05}
			/>
			<directionalLight position={direcao(c.contra.dir, 30)} color={c.contra.cor} intensity={c.contra.intensidade} />
			{c.neblina ? <fog attach="fog" args={[c.neblina.cor, c.neblina.perto, c.neblina.longe]} /> : null}
		</>
	);
};
