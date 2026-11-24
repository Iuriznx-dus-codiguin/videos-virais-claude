// Pós-produção do 3D (pedido do Iuri em 24/11: vídeo "mais bonito e bem elaborado"). O quadro é
// desenhado numa textura com profundidade e passa por uma última etapa que dá cara de filme de
// animação: profundidade de campo (fundo desfocado nos closes, foco no rosto), névoa de distância
// (o longe clareia na cor do horizonte), brilho em volta das luzes acesas, correção de cor por clima
// (com piso de luz na noite, para nunca virar quadro preto) e vinheta leve. Tudo depende só do
// quadro atual (cada quadro do Remotion é independente) e roda na CPU (SwiftShader).
import {useFrame, useThree} from '@react-three/fiber';
import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';

/** Ajustes da pós-produção para um quadro (vêm do plano e do clima da cena, em Mundo.tsx). */
export interface AjustePos {
	/** distância (m) da câmera até o que está em foco */
	foco: number;
	/** raio máximo do desfoque em px do vídeo 1080 de largura (0 = tudo nítido) */
	desfoque: number;
	/** névoa de distância: cor (a do horizonte) e densidade por metro (0 = sem névoa) */
	nevoaCor: string;
	nevoaDensidade: number;
	/** metros sem névoa a partir da câmera */
	nevoaInicio: number;
	/** cor: ganho (exposição), saturação, contraste, piso das sombras e tom das sombras / das luzes */
	ganho: number;
	saturacao: number;
	contraste: number;
	piso: number;
	tomSombra: string;
	tomLuz: string;
	/** força da vinheta (0 a 1) e do brilho em volta das luzes */
	vinheta: number;
	brilho: number;
}

const VERTICE = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/** Brilho: só o que passa bem de 1 (lâmpadas, chamas, sol) entra, reduzido a 1/4 da tela. */
const LIMIAR = /* glsl */ `
uniform sampler2D tCor;
uniform vec2 passo;
varying vec2 vUv;
void main() {
	vec3 c = vec3(0.0);
	c += texture2D(tCor, vUv + passo * vec2(-1.0, -1.0)).rgb;
	c += texture2D(tCor, vUv + passo * vec2( 1.0, -1.0)).rgb;
	c += texture2D(tCor, vUv + passo * vec2(-1.0,  1.0)).rgb;
	c += texture2D(tCor, vUv + passo * vec2( 1.0,  1.0)).rgb;
	c *= 0.25;
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	float k = smoothstep(1.3, 1.9, l);
	gl_FragColor = vec4(c * k, 1.0);
}`;

/** Borrão gaussiano separável (9 amostras) na textura pequena do brilho. */
const BORRAO = /* glsl */ `
uniform sampler2D tCor;
uniform vec2 direcao;
varying vec2 vUv;
void main() {
	vec3 c = texture2D(tCor, vUv).rgb * 0.227;
	c += texture2D(tCor, vUv + direcao * 1.385).rgb * 0.316;
	c += texture2D(tCor, vUv - direcao * 1.385).rgb * 0.316;
	c += texture2D(tCor, vUv + direcao * 3.231).rgb * 0.070;
	c += texture2D(tCor, vUv - direcao * 3.231).rgb * 0.070;
	gl_FragColor = vec4(c, 1.0);
}`;

const FINAL = /* glsl */ `
#include <packing>
uniform sampler2D tCor;
uniform sampler2D tProf;
uniform sampler2D tBrilho;
uniform vec2 resolucao;
uniform float perto;
uniform float longe;
uniform float foco;
uniform float desfoque;
uniform vec3 nevoaCor;
uniform float nevoaDensidade;
uniform float nevoaInicio;
uniform float ganho;
uniform float saturacao;
uniform float contraste;
uniform float piso;
uniform vec3 tomSombra;
uniform vec3 tomLuz;
uniform float vinheta;
uniform float forcaBrilho;
varying vec2 vUv;

float distancia(vec2 uv) {
	float d = texture2D(tProf, uv).x;
	if (d >= 0.99999) return longe;
	return -perspectiveDepthToViewZ(d, perto, longe);
}

/** raio do desfoque (px) de um ponto a z metros: zona nítida em volta do foco, cresce com a distância */
float raioDe(float z) {
	float zona = 0.12 * foco + 0.12;
	float dz = max(abs(z - foco) - zona, 0.0);
	return desfoque * clamp(dz / max(z, 0.05) * 1.7, 0.0, 1.0);
}

vec3 comNevoa(vec3 c, float z) {
	if (nevoaDensidade <= 0.0 || z >= longe * 0.999) return c;
	float f = 1.0 - exp(-max(z - nevoaInicio, 0.0) * nevoaDensidade);
	return mix(c, nevoaCor, clamp(f, 0.0, 0.85));
}

vec3 paraSRGB(vec3 c) {
	c = max(c, vec3(0.0));
	vec3 baixo = c * 12.92;
	vec3 alto = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
	return mix(baixo, alto, step(vec3(0.0031308), c));
}

float aleatorio(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
	float z0 = distancia(vUv);
	vec3 c0 = comNevoa(texture2D(tCor, vUv).rgb, z0);
	float r0 = raioDe(z0);
	vec3 cor = c0;
	if (r0 > 0.6) {
		// juntar amostras numa espiral (ângulo de ouro); uma amostra só entra se o próprio desfoque
		// dela alcança este pixel, para o rosto nítido não vazar como auréola no fundo borrado
		vec3 soma = c0;
		float peso = 1.0;
		const int N = 22;
		for (int i = 0; i < N; i++) {
			float fi = float(i) + 0.5;
			float r = r0 * sqrt(fi / float(N));
			float a = fi * 2.39996323;
			vec2 uv = vUv + vec2(cos(a), sin(a)) * r / resolucao;
			float z = distancia(uv);
			float rs = raioDe(z);
			float w = clamp((rs - r) / 1.5 + 1.0, 0.0, 1.0);
			soma += comNevoa(texture2D(tCor, uv).rgb, z) * w;
			peso += w;
		}
		cor = soma / peso;
	}
	cor += texture2D(tBrilho, vUv).rgb * forcaBrilho;
	cor *= ganho;
	// tom: sombras puxam para uma cor, luzes para outra (mistura leve, guiada pela luminância)
	float l = dot(cor, vec3(0.2126, 0.7152, 0.0722));
	cor *= mix(tomSombra, tomLuz, smoothstep(0.05, 0.6, l));
	vec3 s = paraSRGB(cor);
	// piso: as sombras mais escuras sobem um pouco (noite nunca vira preto chapado)
	s = s + piso * (1.0 - s) * (1.0 - s);
	float ls = dot(s, vec3(0.2126, 0.7152, 0.0722));
	s = mix(vec3(ls), s, saturacao);
	s = mix(s, s * s * (3.0 - 2.0 * s), contraste);
	vec2 dv = (vUv - 0.5) * vec2(1.0, 1.25);
	s *= 1.0 - vinheta * smoothstep(0.22, 0.78, length(dv));
	s += (aleatorio(gl_FragCoord.xy) - 0.5) / 255.0;
	gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
}`;

const tela = (() => {
	let g: THREE.BufferGeometry | null = null;
	return () => {
		if (!g) {
			g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
			g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
		}
		return g;
	};
})();

const passe = (fragmento: string, uniforms: Record<string, THREE.IUniform>) =>
	new THREE.ShaderMaterial({vertexShader: VERTICE, fragmentShader: fragmento, uniforms, depthTest: false, depthWrite: false, toneMapped: false});

const cor = (hex: string) => new THREE.Color(hex);

/**
 * Assume o desenho do quadro (useFrame com prioridade 1: o R3F deixa de desenhar sozinho).
 * Sem `ajuste`, desenha direto na tela como antes.
 */
export const PosProcesso: React.FC<{ajuste: AjustePos}> = ({ajuste}) => {
	const {gl, size} = useThree();
	const dpr = gl.getPixelRatio();
	const w = Math.max(2, Math.round(size.width * dpr));
	const h = Math.max(2, Math.round(size.height * dpr));

	const recursos = useMemo(() => {
		const prof = new THREE.DepthTexture(w, h);
		prof.type = THREE.UnsignedIntType;
		const cena = new THREE.WebGLRenderTarget(w, h, {type: THREE.HalfFloatType, samples: 4, depthTexture: prof, depthBuffer: true});
		const pw = Math.max(2, Math.round(w / 4));
		const ph = Math.max(2, Math.round(h / 4));
		const opc = {type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter};
		const b1 = new THREE.WebGLRenderTarget(pw, ph, opc);
		const b2 = new THREE.WebGLRenderTarget(pw, ph, opc);
		const limiar = passe(LIMIAR, {tCor: {value: cena.texture}, passo: {value: new THREE.Vector2(1 / w, 1 / h)}});
		const borrao = passe(BORRAO, {tCor: {value: b1.texture}, direcao: {value: new THREE.Vector2()}});
		const final = passe(FINAL, {
			tCor: {value: cena.texture},
			tProf: {value: prof},
			tBrilho: {value: b1.texture},
			resolucao: {value: new THREE.Vector2(w, h)},
			perto: {value: 0.05},
			longe: {value: 900},
			foco: {value: 4},
			desfoque: {value: 0},
			nevoaCor: {value: new THREE.Color()},
			nevoaDensidade: {value: 0},
			nevoaInicio: {value: 10},
			ganho: {value: 1},
			saturacao: {value: 1},
			contraste: {value: 0},
			piso: {value: 0},
			tomSombra: {value: new THREE.Color(1, 1, 1)},
			tomLuz: {value: new THREE.Color(1, 1, 1)},
			vinheta: {value: 0},
			forcaBrilho: {value: 0},
		});
		const malha = new THREE.Mesh(tela(), final);
		malha.frustumCulled = false;
		const cenaTela = new THREE.Scene();
		cenaTela.add(malha);
		const camTela = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		return {cena, b1, b2, limiar, borrao, final, malha, cenaTela, camTela, pw, ph};
	}, [w, h]);

	useEffect(
		() => () => {
			recursos.cena.dispose();
			recursos.b1.dispose();
			recursos.b2.dispose();
		},
		[recursos],
	);

	useFrame((state) => {
		const {scene, camera} = state;
		const r = recursos;
		const u = r.final.uniforms;
		const cam = camera as THREE.PerspectiveCamera;
		u.perto.value = cam.near;
		u.longe.value = cam.far;
		u.foco.value = ajuste.foco;
		// o raio vem em px de um vídeo de 1080 de largura
		u.desfoque.value = ajuste.desfoque * (Math.min(w, h) / 1080);
		(u.nevoaCor.value as THREE.Color).set(ajuste.nevoaCor).convertSRGBToLinear();
		u.nevoaDensidade.value = ajuste.nevoaDensidade;
		u.nevoaInicio.value = ajuste.nevoaInicio;
		u.ganho.value = ajuste.ganho;
		u.saturacao.value = ajuste.saturacao;
		u.contraste.value = ajuste.contraste;
		u.piso.value = ajuste.piso;
		(u.tomSombra.value as THREE.Color).copy(cor(ajuste.tomSombra));
		(u.tomLuz.value as THREE.Color).copy(cor(ajuste.tomLuz));
		u.vinheta.value = ajuste.vinheta;
		u.forcaBrilho.value = ajuste.brilho;

		gl.setRenderTarget(r.cena);
		gl.clear();
		gl.render(scene, camera);

		// brilho em 1/4 da tela: limiar, borrão horizontal, borrão vertical
		r.malha.material = r.limiar;
		gl.setRenderTarget(r.b1);
		gl.render(r.cenaTela, r.camTela);
		r.malha.material = r.borrao;
		r.borrao.uniforms.tCor.value = r.b1.texture;
		(r.borrao.uniforms.direcao.value as THREE.Vector2).set(1.6 / r.pw, 0);
		gl.setRenderTarget(r.b2);
		gl.render(r.cenaTela, r.camTela);
		r.borrao.uniforms.tCor.value = r.b2.texture;
		(r.borrao.uniforms.direcao.value as THREE.Vector2).set(0, 1.6 / r.ph);
		gl.setRenderTarget(r.b1);
		gl.render(r.cenaTela, r.camTela);

		r.malha.material = r.final;
		gl.setRenderTarget(null);
		gl.render(r.cenaTela, r.camTela);
	}, 1);

	return null;
};
