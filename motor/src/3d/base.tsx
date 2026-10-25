// Peças comuns do visual: rampa toon de 3 tons, materiais e geometrias reaproveitados entre
// quadros (cache por chave) e o contorno preto que dá o aspecto de desenho.
import {Outlines} from '@react-three/drei';
import React from 'react';
import * as THREE from 'three';
import type {V3} from '../util/mat';

export const COR_CONTORNO = '#15121C';

// Rampa de 3 tons (sombra, meio-tom, luz), igual à do teste aprovado.
export const gradiente = (() => {
	const t = new THREE.DataTexture(new Uint8Array([0, 0, 128, 255, 255]), 5, 1, THREE.RedFormat);
	t.minFilter = THREE.NearestFilter;
	t.magFilter = THREE.NearestFilter;
	t.needsUpdate = true;
	return t;
})();

export const linear = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

const cacheMat = new Map<string, THREE.Material>();
export const memo = <T extends THREE.Material>(chave: string, criar: () => T): T => {
	if (!cacheMat.has(chave)) cacheMat.set(chave, criar());
	return cacheMat.get(chave) as T;
};

export const toon = (cor: string, emissivo?: V3) =>
	memo(`toon${cor}${emissivo ?? ''}`, () => {
		const m = new THREE.MeshToonMaterial({color: cor, gradientMap: gradiente});
		if (emissivo) m.emissive = linear(...emissivo);
		return m;
	});

/** Material que brilha sozinho (olhos do gigante, brasas, chamas). */
export const brilho = (cor: string, intensidade = 1) =>
	memo(`brilho${cor}${intensidade}`, () => {
		const m = new THREE.MeshBasicMaterial({color: new THREE.Color(cor).multiplyScalar(intensidade), toneMapped: false});
		return m;
	});

export const basico = (cor: string) => memo(`basico${cor}`, () => new THREE.MeshBasicMaterial({color: cor, toneMapped: false}));

/** Material sem luz e semitransparente (fumaça, feixe de lanterna, névoa). */
export const translucido = (cor: string, opacidade: number, aditivo = false) =>
	memo(`transl${cor}${opacidade}${aditivo}`, () =>
		new THREE.MeshBasicMaterial({
			color: cor,
			transparent: true,
			opacity: opacidade,
			depthWrite: false,
			toneMapped: false,
			blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
		}),
	);

/** Toon que fica por cima do chão sem brigar com ele (pegadas, trilhas, manchas). */
export const decalque = (cor: string) =>
	memo(`decal${cor}`, () => {
		const m = new THREE.MeshToonMaterial({color: cor, gradientMap: gradiente});
		m.polygonOffset = true;
		m.polygonOffsetFactor = -2;
		m.polygonOffsetUnits = -2;
		return m;
	});

// --- geometrias ------------------------------------------------------------------------------

const cacheGeo = new Map<string, THREE.BufferGeometry>();
export const geo = (chave: string, criar: () => THREE.BufferGeometry) => {
	if (!cacheGeo.has(chave)) cacheGeo.set(chave, criar());
	return cacheGeo.get(chave)!;
};
export const esfera = (r: number, w = 24, h = 15) => geo(`esf${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
export const capsula = (r: number, comp: number, seg = 16) => geo(`cap${r},${comp},${seg}`, () => new THREE.CapsuleGeometry(r, comp, 6, seg));
export const cilindro = (rBase: number, rTopo: number, h: number, seg = 24) =>
	geo(`cil${rBase},${rTopo},${h},${seg}`, () => new THREE.CylinderGeometry(rTopo, rBase, h, seg));
export const cone = (r: number, h: number, seg = 16) => geo(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
/** Bloco facetado (pedras, folhagem): uma normal por face, como no Blender. */
export const ico = (r: number, detalhe: number) =>
	geo(`ico${r},${detalhe}`, () => {
		const g = new THREE.IcosahedronGeometry(r, detalhe);
		g.computeVertexNormals();
		return g;
	});
export const disco = (r: number, seg = 32) => geo(`disco${r},${seg}`, () => new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2));
export const anel = (rIn: number, rOut: number, seg = 96) =>
	geo(`anel${rIn},${rOut},${seg}`, () => new THREE.RingGeometry(rIn, rOut, seg).rotateX(-Math.PI / 2));
export const toro = (rMaior: number, rMenor: number, seg = 64, segTubo = 12, arco = Math.PI * 2) =>
	geo(`toro${rMaior},${rMenor},${seg},${segTubo},${arco}`, () => new THREE.TorusGeometry(rMaior, rMenor, segTubo, seg, arco).rotateX(Math.PI / 2));
export const caixa = (x: number, y: number, z: number) => geo(`caixa${x},${y},${z}`, () => new THREE.BoxGeometry(x, y, z));

// --- peças ---------------------------------------------------------------------------------------

export type Transf = {position?: V3; rotation?: V3 | [number, number, number, THREE.EulerOrder]; scale?: V3 | number};

// Contorno preto por casca invertida. No drei 10.7 a flag screenspace faz o contrário do nome:
// só com ela ligada a espessura vale em unidades do objeto (sem ela, vale em pixels).
export const Contorno: React.FC<{espessura: number; cor?: string}> = ({espessura, cor = COR_CONTORNO}) => (
	<Outlines thickness={espessura} color={cor} screenspace />
);

export const Malha: React.FC<
	Transf & {g: THREE.BufferGeometry; m: THREE.Material; contorno?: number; sombra?: boolean; recebe?: boolean; visible?: boolean; renderOrder?: number}
> = ({g, m, contorno = 0, sombra = true, recebe = true, ...resto}) => (
	<mesh geometry={g} material={m} castShadow={sombra} receiveShadow={recebe} {...resto}>
		{contorno > 0 ? <Contorno espessura={contorno} /> : null}
	</mesh>
);

/** Textura de brilho radial (halo dos olhos, chamas, luz de lanterna). */
export const texturaHalo = (() => {
	let t: THREE.Texture | null = null;
	return () => {
		if (t) return t;
		const tam = 128;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = tam;
		const ctx = canvas.getContext('2d')!;
		const img = ctx.createImageData(tam, tam);
		for (let y = 0; y < tam; y++) {
			for (let x = 0; x < tam; x++) {
				const r2 = (((x + 0.5) / tam) * 2 - 1) ** 2 + (((y + 0.5) / tam) * 2 - 1) ** 2;
				const a = r2 >= 1 ? 0 : (1 - r2) ** 1.5;
				const i = (y * tam + x) * 4;
				img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
				img.data[i + 3] = Math.round(a * 255);
			}
		}
		ctx.putImageData(img, 0, 0);
		t = new THREE.CanvasTexture(canvas);
		return t;
	};
})();

export const haloMat = (cor: string, opacidade = 0.85) =>
	memo(`halo${cor}${opacidade}`, () =>
		new THREE.SpriteMaterial({map: texturaHalo(), color: cor, opacity: opacidade, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}),
	);

/** Fumaça e névoa: o mesmo brilho radial, mas cinza e misturado por cima (sem somar luz). */
export const fumacaMat = (cor: string, opacidade: number) =>
	memo(`fumaca${cor}${opacidade}`, () =>
		new THREE.SpriteMaterial({map: texturaHalo(), color: cor, opacity: opacidade, depthWrite: false, toneMapped: false}),
	);
