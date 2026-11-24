// O mundo 3D de um quadro: escolhe a cena do instante, posiciona a câmera pelo plano atual
// e desenha cenário, objetos e personagens.
import {PerspectiveCamera} from '@react-three/drei';
import React, {useLayoutEffect, useRef} from 'react';
import * as THREE from 'three';
import {Camera, cameraNoTempo} from '../animacao/camera';
import {cenaNoTempo, simulacao} from '../animacao/simulacao';
import type {CenaTempo, LinhaDoTempo} from '../roteiro/tipos';
import {V3, len3, lerp3, sub3} from '../util/mat';
import {Boneco} from './Boneco';
import {Gigante} from './Gigante';
import {Ceu, Iluminacao, posDoClima} from './luzes';
import {AjustePos, PosProcesso} from './posprocesso';
import {Objetos} from './objetos';
import {Atmosfera} from './atmosfera';
import {Praia} from './cenarios/Praia';
import {Selva} from './cenarios/Selva';
import {Raizes} from './cenarios/Raizes';
import {Montanha} from './cenarios/Montanha';
import {Cabine} from './cenarios/Cabine';
import {Estudio} from './cenarios/Estudio';
import {Oficina} from './cenarios/Oficina';
import {Maquetes} from './Maquete';
import {Mirante} from './cenarios/Mirante';
import {Adega} from './cenarios/Adega';
import {SalaFarol} from './cenarios/SalaFarol';
import {IlhotaFarol} from './cenarios/IlhotaFarol';
import {Portaria} from './cenarios/Portaria';

const CameraCena: React.FC<{c: Camera; nomeClima: string; t: number}> = ({c, nomeClima, t}) => {
	const ref = useRef<THREE.PerspectiveCamera>(null);
	useLayoutEffect(() => {
		const cam = ref.current!;
		cam.position.set(...c.pos);
		cam.fov = c.fov;
		cam.updateProjectionMatrix();
		cam.up.set(0, 1, 0);
		cam.lookAt(...c.alvo);
		cam.rotateZ(c.rolar);
		cam.updateMatrixWorld();
	});
	return (
		<>
			<PerspectiveCamera ref={ref} makeDefault near={0.05} far={900} />
			<Ceu nome={nomeClima} posicao={c.pos} t={t} />
		</>
	);
};

/** Raio máximo do desfoque de fundo (px num vídeo de 1080 de largura) por tipo de plano. */
const DESFOQUE: Record<string, number> = {
	close: 11,
	detalhe: 10,
	ombro: 8,
	nuca: 7,
	medio: 7,
	americano: 4.5,
	baixo: 4,
	pov: 3,
	aberto: 1.5,
	geral: 0,
	drone: 0,
};

/** Foco e desfoque do quadro: foco na distância do assunto do plano (rosto, peça ou ponto). */
const ajusteDoQuadro = (cena: CenaTempo, sim: ReturnType<typeof simulacao>, cam: Camera, t: number): AjustePos => {
	const plano = cena.planos.find((p) => t >= p.ini && t < p.fim) ?? cena.planos[cena.planos.length - 1];
	let foco = len3(sub3(cam.alvo, cam.pos));
	if (plano && (plano.tipo === 'ombro' || plano.tipo === 'pov' || plano.tipo === 'nuca') && plano.alvo2 !== undefined) {
		const b: V3 | null = sim.ponto(plano.alvo2, t);
		if (b) foco = len3(sub3(b, cam.pos));
	}
	const mult = plano?.desfoque ?? 1;
	return {...posDoClima(cena.luz, cena.cenario), foco: Math.max(0.3, foco), desfoque: (DESFOQUE[plano?.tipo ?? 'medio'] ?? 4) * mult};
};

export const Mundo: React.FC<{linha: LinhaDoTempo; t: number; aspecto?: number}> = ({linha, t, aspecto}) => {
	const cena = cenaNoTempo(linha, t);
	const sim = simulacao(linha, cena);
	const cam = cameraNoTempo(cena, sim, t, aspecto);
	const ajuste = ajusteDoQuadro(cena, sim, cam, t);
	const nomeClima = cena.luz;
	// a sombra acompanha a região que a câmera enxerga
	const foco = lerp3(cam.alvo, cam.pos, 0.3);
	const estados = Object.keys(cena.personagens)
		.map((id) => sim.estado(id, t, cam.pos))
		.filter((e) => e !== null);
	return (
		<>
			<CameraCena c={cam} nomeClima={nomeClima} t={t} />
			<PosProcesso ajuste={ajuste} />
			<Iluminacao nome={nomeClima} foco={[foco[0], 0, foco[2]]} alcanceSombra={cena.cenario === 'montanha' ? 60 : cena.cenario === 'mirante' ? 24 : 18} alcanceNeblina={cena.cenario === 'mirante' ? 3.5 : 1} />
			{cena.cenario === 'praia' ? <Praia t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'selva' ? <Selva t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'raizes' ? <Raizes t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'montanha' ? <Montanha t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'adega' ? <Adega t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'sala_farol' ? <SalaFarol t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'ilhota_farol' ? <IlhotaFarol t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'mirante' ? <Mirante t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'cabine' ? <Cabine t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'estudio' ? <Estudio t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'oficina' ? <Oficina t={t} nomeClima={nomeClima} /> : null}
			{cena.cenario === 'portaria' ? <Portaria t={t} nomeClima={nomeClima} objetos={cena.objetos} /> : null}
			<Objetos lista={cena.objetos} cenario={cena.cenario} t={t} />
			<Atmosfera cena={cena} t={t} />
			<Maquetes cena={cena} linha={linha} t={t} />
			{estados.map((e) => (e.tipo === 'gigante' ? <Gigante key={e.id} e={e} /> : <Boneco key={e.id} e={e} nomeClima={nomeClima} />))}
		</>
	);
};
