// Composição de um episódio: mundo 3D, camada 2D e trilha sonora, tudo a partir da linha do
// tempo resolvida no calculateMetadata (ver Root.tsx).
import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camada2D} from './2d/Camada2D';
import {Mundo} from './3d/Mundo';
import {cenaNoTempo} from './animacao/simulacao';
import {forcaNoCorte, transicaoAtiva} from './animacao/transicoes';
import {Trilha} from './audio/Trilha';
import type {LinhaDoTempo} from './roteiro/tipos';

/**
 * Pixels do 3D por pixel do vídeo. 1 é a qualidade média (render mais rápido e arquivo menor,
 * pedido do Iuri em 01/11: o tempo vai para a produção, não para nitidez). 1.5 é o antigo "alta".
 */
export const DPR_PADRAO = 1;

export interface PropsEpisodio extends Record<string, unknown> {
	serie: string;
	parte: number;
	/** preenchido pelo calculateMetadata */
	linha?: LinhaDoTempo;
	semVoz?: boolean;
	/** desliga o áudio (para gerar quadros de teste sem os arquivos de som) */
	semAudio?: boolean;
	/** pixels do 3D por pixel do vídeo (padrão DPR_PADRAO) */
	dpr?: number;
}

/** Filtro CSS de cada "filtro" de cena (só no 3D: legenda e etiquetas ficam com a cor certa). */
const FILTRO_CSS: Record<string, string> = {
	quente: 'sepia(0.22) saturate(1.25) contrast(1.05) brightness(1.03)',
	frio: 'saturate(0.85) hue-rotate(12deg) contrast(1.08) brightness(0.96)',
	dramatico: 'contrast(1.22) saturate(0.78) brightness(0.94)',
	vivo: 'saturate(1.38) contrast(1.06)',
	sepia: 'sepia(0.75) contrast(1.05) brightness(1.02)',
	noir: 'grayscale(1) contrast(1.3) brightness(0.95)',
	sonho: 'saturate(0.8) brightness(1.12) contrast(0.88) blur(0.6px)',
};

/** Filtro do 3D no instante: cor da cena e borrão das transições (chicote borra só na horizontal). */
const filtroDoQuadro = (linha: LinhaDoTempo, t: number): {css: string; borraoH: number} => {
	const cena = cenaNoTempo(linha, t);
	const partes: string[] = [];
	let borraoH = 0;
	const tr = transicaoAtiva(cena, t);
	if (tr) {
		const f = forcaNoCorte(tr);
		if (tr.tipo === 'chicote') borraoH = 70 * f;
		else if (tr.tipo === 'zoom') partes.push(`blur(${(16 * f).toFixed(1)}px)`);
		else if (tr.tipo === 'desfoque') partes.push(`blur(${(26 * (tr.fase === 'saida' ? tr.p : 1 - tr.p)).toFixed(1)}px)`, `brightness(${(1 + 0.25 * f).toFixed(3)})`);
	}
	if (borraoH > 0.5) partes.unshift('url(#borrao-h)');
	if (cena.filtro && FILTRO_CSS[cena.filtro]) partes.push(FILTRO_CSS[cena.filtro]);
	return {css: partes.join(' '), borraoH};
};

export const Episodio: React.FC<PropsEpisodio> = ({linha, semVoz = true, semAudio = false, dpr = DPR_PADRAO}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	if (!linha) return null;
	const t = frame / fps;
	const {css, borraoH} = filtroDoQuadro(linha, t);
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			{borraoH > 0.5 ? (
				<svg width={0} height={0} style={{position: 'absolute'}}>
					<filter id="borrao-h" x="-5%" y="0" width="110%" height="100%">
						<feGaussianBlur stdDeviation={`${borraoH.toFixed(1)} 0`} edgeMode="duplicate" />
					</filter>
				</svg>
			) : null}
			<AbsoluteFill style={css ? {filter: css} : undefined}>
				<ThreeCanvas width={width} height={height} flat shadows="percentage" dpr={dpr} gl={{antialias: true}}>
					<Mundo linha={linha} t={t} />
				</ThreeCanvas>
			</AbsoluteFill>
			<Camada2D linha={linha} t={t} frame={frame} fps={fps} semVoz={semVoz} />
			{semAudio ? null : <Trilha linha={linha} />}
		</AbsoluteFill>
	);
};
