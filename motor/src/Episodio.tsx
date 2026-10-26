// Composição de um episódio: mundo 3D, camada 2D e trilha sonora, tudo a partir da linha do
// tempo resolvida no calculateMetadata (ver Root.tsx).
import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camada2D} from './2d/Camada2D';
import {Mundo} from './3d/Mundo';
import {Trilha} from './audio/Trilha';
import type {LinhaDoTempo} from './roteiro/tipos';

/** Supersampling: desenha o 3D 1,5x maior e reduz, para bordas e sombras lisas. */
const DPR = 1.5;

export interface PropsEpisodio extends Record<string, unknown> {
	serie: string;
	parte: number;
	/** preenchido pelo calculateMetadata */
	linha?: LinhaDoTempo;
	semVoz?: boolean;
	/** desliga o áudio (para gerar quadros de teste sem os arquivos de som) */
	semAudio?: boolean;
}

export const Episodio: React.FC<PropsEpisodio> = ({linha, semVoz = true, semAudio = false}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	if (!linha) return null;
	const t = frame / fps;
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<ThreeCanvas width={width} height={height} flat shadows="percentage" dpr={DPR} gl={{antialias: true}}>
				<Mundo linha={linha} t={t} />
			</ThreeCanvas>
			<Camada2D linha={linha} t={t} frame={frame} fps={fps} semVoz={semVoz} />
			{semAudio ? null : <Trilha linha={linha} />}
		</AbsoluteFill>
	);
};
