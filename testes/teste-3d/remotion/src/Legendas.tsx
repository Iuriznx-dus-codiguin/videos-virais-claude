// Camada 2D por cima do vídeo: selo da série, legendas palavra por palavra e chamada final.
import React from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {D, clamp} from './cena';

const FONTE = 'Montserrat';
const carregarFontes = () => {
	const espera = delayRender('Carregando fontes');
	const fontes = [
		new FontFace(FONTE, `url(${staticFile('fontes/montserrat-900.woff2')}) format('woff2')`, {weight: '900'}),
		new FontFace(FONTE, `url(${staticFile('fontes/montserrat-800.woff2')}) format('woff2')`, {weight: '800'}),
	];
	Promise.all(fontes.map((f) => f.load()))
		.then((carregadas) => {
			carregadas.forEach((f) => document.fonts.add(f));
			continueRender(espera);
		})
		.catch((err) => cancelRender(err));
};
carregarFontes();

const AMARELO = '#FFD60A';
const contornoTexto = (px: number) => ({
	WebkitTextStroke: `${px}px #000`,
	paintOrder: 'stroke fill' as const,
	textShadow: '0 8px 0 rgba(0,0,0,0.85), 0 14px 28px rgba(0,0,0,0.45)',
});

const Selo: React.FC = () => (
	<div
		style={{
			position: 'absolute',
			top: 150,
			width: '100%',
			display: 'flex',
			justifyContent: 'center',
		}}
	>
		<div
			style={{
				fontFamily: FONTE,
				fontWeight: 800,
				fontSize: 40,
				letterSpacing: 3,
				color: '#fff',
				background: 'rgba(12, 10, 24, 0.55)',
				border: '3px solid rgba(255,255,255,0.85)',
				borderRadius: 999,
				padding: '12px 34px',
			}}
		>
			{D.serie} <span style={{color: AMARELO}}>• PARTE {D.parte}</span>
		</div>
	</div>
);

const Legenda: React.FC<{t: number; frame: number; fps: number}> = ({t, frame, fps}) => {
	const grupo = D.legendas.find(
		(g) => t >= (g.palavras[0][1] as number) && t < (g.palavras[g.palavras.length - 1][2] as number),
	);
	if (!grupo) return null;
	return (
		<div
			style={{
				position: 'absolute',
				// no close do rosto a legenda desce para não cobrir a expressão
				top: t >= 7.2 && t < 8.4 ? '76%' : '60%',
				left: 70,
				right: 70,
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				alignItems: 'baseline',
				columnGap: 26,
				rowGap: 0,
				transform: 'translateY(-50%)',
			}}
		>
			{grupo.palavras.map(([texto, ini, fim]) => {
				const inicio = ini as number;
				if (t < inicio) return null;
				const pop = spring({frame: frame - Math.round(inicio * fps), fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
				const falando = t < (fim as number);
				const enfase = texto === (texto as string).toUpperCase() && (texto as string).length > 1;
				return (
					<span
						key={texto as string}
						style={{
							fontFamily: FONTE,
							fontWeight: 900,
							fontSize: enfase ? 150 : 118,
							lineHeight: 1.05,
							textTransform: 'uppercase',
							color: falando ? (enfase ? '#FF3B30' : AMARELO) : '#FFFFFF',
							display: 'inline-block',
							transform: `scale(${0.55 + 0.45 * pop}) rotate(${enfase ? -3 : 0}deg)`,
							...contornoTexto(enfase ? 18 : 15),
						}}
					>
						{texto}
					</span>
				);
			})}
		</div>
	);
};

const Chamada: React.FC<{t: number; frame: number; fps: number}> = ({t, frame, fps}) => {
	const tc = t - D.cta.inicio;
	if (tc < 0) return null;
	const entra = spring({frame: frame - Math.round(D.cta.inicio * fps), fps, config: {damping: 10, stiffness: 170}});
	const entra2 = spring({frame: frame - Math.round(D.cta.inicio * fps) - 5, fps, config: {damping: 9, stiffness: 190}});
	return (
		<>
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.6) 100%)',
					opacity: clamp(tc / 0.3),
				}}
			/>
			<div style={{position: 'absolute', top: '71%', width: '100%', textAlign: 'center', transform: 'translateY(-50%)'}}>
				<div
					style={{
						fontFamily: FONTE,
						fontWeight: 900,
						fontSize: 86,
						color: '#fff',
						transform: `scale(${entra})`,
						...contornoTexto(14),
					}}
				>
					💬 COMENTA
				</div>
				<div
					style={{
						display: 'inline-block',
						marginTop: 26,
						fontFamily: FONTE,
						fontWeight: 900,
						fontSize: 132,
						color: '#111',
						background: AMARELO,
						border: '8px solid #000',
						borderRadius: 34,
						padding: '4px 44px 10px',
						boxShadow: '0 16px 0 #000',
						transform: `rotate(-3deg) scale(${entra2 * (1 + 0.045 * Math.sin(tc * 10))})`,
					}}
				>
					“{D.cta.linha2}”
				</div>
			</div>
		</>
	);
};

export const Legendas: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	return (
		<AbsoluteFill>
			<Selo />
			<Legenda t={t} frame={frame} fps={fps} />
			<Chamada t={t} frame={frame} fps={fps} />
		</AbsoluteFill>
	);
};
