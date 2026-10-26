// Camada 2D por cima do vídeo: selo da série, legendas palavra por palavra (com a cor de quem
// fala), efeitos de tela (flash, preto, vinheta) e a chamada final para comentar.
import React from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, spring, staticFile} from 'remotion';
import * as THREE from 'three';
import {cameraNoTempo, tipoDoPlano, transicaoNoTempo} from '../animacao/camera';
import {cenaNoTempo, simulacao} from '../animacao/simulacao';
import {GrupoLegenda, gruposDeLegenda, textoNaTela} from '../roteiro/legendas';
import type {LinhaDoTempo} from '../roteiro/tipos';
import {clamp, smoothstep} from '../util/mat';

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
const VERMELHO = '#FF3B30';

const contornoTexto = (px: number) => ({
	WebkitTextStroke: `${px}px #000`,
	paintOrder: 'stroke fill' as const,
	textShadow: '0 8px 0 rgba(0,0,0,0.85), 0 14px 28px rgba(0,0,0,0.45)',
});

const Selo: React.FC<{linha: LinhaDoTempo}> = ({linha}) => (
	<div style={{position: 'absolute', top: 150, width: '100%', display: 'flex', justifyContent: 'center'}}>
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
			{linha.tituloSerie} <span style={{color: AMARELO}}>• {linha.formato === 'avulso' ? `#${linha.parte}` : `PARTE ${linha.parte}`}</span>
		</div>
	</div>
);

const AvisoPrevia: React.FC = () => (
	<div style={{position: 'absolute', top: 236, width: '100%', display: 'flex', justifyContent: 'center'}}>
		<div
			style={{
				fontFamily: FONTE,
				fontWeight: 800,
				fontSize: 26,
				letterSpacing: 2,
				color: '#111',
				background: 'rgba(255, 214, 10, 0.9)',
				borderRadius: 10,
				padding: '6px 16px',
			}}
		>
			PRÉVIA SEM VOZ · TEMPOS ESTIMADOS
		</div>
	</div>
);

const cache = new WeakMap<LinhaDoTempo, GrupoLegenda[]>();
const grupos = (linha: LinhaDoTempo) => {
	let g = cache.get(linha);
	if (!g) {
		g = gruposDeLegenda(linha.falas);
		cache.set(linha, g);
	}
	return g;
};

const Legenda: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number}> = ({linha, t, frame, fps}) => {
	if (t >= linha.chamada.ini) return null;
	const g = grupos(linha).find((x) => t >= x.ini && t < x.fim);
	if (!g) return null;
	const cena = cenaNoTempo(linha, t);
	const tipo = tipoDoPlano(cena, t);
	const baixa = tipo === 'close' || tipo === 'detalhe' || tipo === 'nuca' || tipo === 'ombro';
	const corFala = linha.personagens[g.quem]?.cor_legenda ?? AMARELO;
	return (
		<div
			style={{
				position: 'absolute',
				top: baixa ? '75%' : '62%',
				left: 60,
				right: 60,
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				alignItems: 'baseline',
				columnGap: 24,
				rowGap: 0,
				transform: 'translateY(-50%)',
			}}
		>
			{g.palavras.map((p, i) => {
				if (t < p.ini) return null;
				const pop = spring({frame: frame - Math.round(p.ini * fps), fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
				const falando = t < p.fim + 0.04;
				return (
					<span
						key={i}
						style={{
							fontFamily: FONTE,
							fontWeight: 900,
							fontSize: p.enfase ? 148 : 112,
							lineHeight: 1.05,
							color: falando ? (p.enfase ? VERMELHO : corFala) : '#FFFFFF',
							display: 'inline-block',
							transform: `scale(${0.55 + 0.45 * pop}) rotate(${p.enfase ? -3 : 0}deg)`,
							...contornoTexto(p.enfase ? 18 : 15),
						}}
					>
						{textoNaTela(p.texto)}
					</span>
				);
			})}
		</div>
	);
};

/** Ícone de balão de comentário (desenhado, para não depender de fonte de emoji). */
const Balao: React.FC<{tam: number}> = ({tam}) => (
	<svg width={tam} height={tam} viewBox="0 0 100 100" style={{marginRight: 18, verticalAlign: 'middle', filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.85))'}}>
		<path d="M14 18 H86 Q94 18 94 26 V62 Q94 70 86 70 H46 L26 88 L30 70 H14 Q6 70 6 62 V26 Q6 18 14 18 Z" fill="#FFFFFF" stroke="#000" strokeWidth={7} strokeLinejoin="round" />
		<circle cx={32} cy={44} r={6} fill="#111" />
		<circle cx={50} cy={44} r={6} fill="#111" />
		<circle cx={68} cy={44} r={6} fill="#111" />
	</svg>
);

const Chamada: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number}> = ({linha, t, frame, fps}) => {
	const c = linha.chamada;
	const tc = t - c.ini;
	if (tc < 0) return null;
	const f0 = Math.round(c.ini * fps);
	const entra0 = spring({frame: frame - f0, fps, config: {damping: 14, stiffness: 160}});
	const entra = spring({frame: frame - f0 - 4, fps, config: {damping: 10, stiffness: 170}});
	const entra2 = spring({frame: frame - f0 - 9, fps, config: {damping: 9, stiffness: 190}});
	return (
		<>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.7) 100%)', opacity: clamp(tc / 0.3)}} />
			<div style={{position: 'absolute', top: '66%', width: '100%', textAlign: 'center', transform: 'translateY(-50%)'}}>
				{c.pergunta ? (
					<div
						style={{
							fontFamily: FONTE,
							fontWeight: 900,
							fontSize: 64,
							color: '#fff',
							padding: '0 70px',
							marginBottom: 34,
							opacity: entra0,
							transform: `translateY(${(1 - entra0) * 30}px)`,
							...contornoTexto(11),
						}}
					>
						{c.pergunta.toUpperCase()}
					</div>
				) : null}
				<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 92, color: '#fff', transform: `scale(${entra})`, ...contornoTexto(14)}}>
					<Balao tam={96} />
					{(c.texto ?? 'COMENTA').toUpperCase()}
				</div>
				<div
					style={{
						display: 'inline-block',
						marginTop: 26,
						fontFamily: FONTE,
						fontWeight: 900,
						fontSize: 138,
						color: '#111',
						background: AMARELO,
						border: '8px solid #000',
						borderRadius: 34,
						padding: '4px 46px 10px',
						boxShadow: '0 16px 0 #000',
						transform: `rotate(-3deg) scale(${entra2 * (1 + 0.045 * Math.sin(tc * 10))})`,
					}}
				>
					“{c.destaque}”
				</div>
			</div>
		</>
	);
};

// --- etiquetas presas às peças e cartões --------------------------------------------------

const LARGURA = 1080;
const ALTURA = 1920;

/** Ponto 3D na tela (px), pela mesma câmera do quadro; null se estiver atrás da lente. */
const naTela = (linha: LinhaDoTempo, t: number, alvo: string | [number, number, number]): [number, number] | null => {
	const cena = cenaNoTempo(linha, t);
	const sim = simulacao(linha, cena);
	const ponto = sim.ponto(alvo, t);
	if (!ponto) return null;
	const c = cameraNoTempo(cena, sim, t);
	const cam = new THREE.PerspectiveCamera(c.fov, LARGURA / ALTURA, 0.05, 900);
	cam.position.set(...c.pos);
	cam.up.set(0, 1, 0);
	cam.lookAt(...c.alvo);
	cam.rotateZ(c.rolar);
	cam.updateMatrixWorld();
	const v = new THREE.Vector3(...ponto).project(cam);
	if (v.z > 1) return null;
	return [((v.x + 1) / 2) * LARGURA, ((1 - v.y) / 2) * ALTURA];
};

const Rotulos: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number}> = ({linha, t, frame, fps}) => {
	if (t >= linha.chamada.ini) return null;
	const cena = cenaNoTempo(linha, t);
	const ativos = cena.rotulos.filter((r) => t >= r.ini && t < r.fim);
	return (
		<>
			{ativos.map((r, i) => {
				const p = naTela(linha, t, r.alvo);
				if (!p) return null;
				const [px, py] = p;
				const lado = r.lado ?? (px < LARGURA / 2 ? 'esquerda' : 'direita');
				const entra = spring({frame: frame - Math.round(r.ini * fps), fps, config: {damping: 13, stiffness: 200}});
				const sai = 1 - smoothstep(r.fim - 0.2, r.fim, t);
				const vis = entra * sai;
				const ly = r.altura !== undefined ? r.altura * ALTURA : clamp(py - 170 - i * 20, 330, 1050);
				const lx = lado === 'esquerda' ? 70 : LARGURA - 70;
				const cor = r.cor ?? AMARELO;
				// a linha sai da borda da etiqueta e vai até a peça
				const bx = lado === 'esquerda' ? lx + 40 : lx - 40;
				return (
					<React.Fragment key={i}>
						<svg width={LARGURA} height={ALTURA} style={{position: 'absolute', left: 0, top: 0, opacity: vis}}>
							<line x1={bx} y1={ly + 40} x2={bx + (px - bx) * entra} y2={ly + 40 + (py - ly - 40) * entra} stroke="#000" strokeWidth={14} strokeLinecap="round" />
							<line x1={bx} y1={ly + 40} x2={bx + (px - bx) * entra} y2={ly + 40 + (py - ly - 40) * entra} stroke={cor} strokeWidth={7} strokeLinecap="round" />
							<circle cx={px} cy={py} r={16 * entra} fill={cor} stroke="#000" strokeWidth={6} />
						</svg>
						<div
							style={{
								position: 'absolute',
								top: ly,
								[lado === 'esquerda' ? 'left' : 'right']: 50,
								maxWidth: 560,
								fontFamily: FONTE,
								fontWeight: 900,
								fontSize: 54,
								lineHeight: 1.05,
								color: '#111',
								background: cor,
								border: '6px solid #000',
								borderRadius: 22,
								padding: '10px 26px 14px',
								boxShadow: '0 10px 0 #000',
								opacity: vis,
								transform: `scale(${0.6 + 0.4 * entra})`,
								transformOrigin: lado === 'esquerda' ? 'left center' : 'right center',
							}}
						>
							{r.texto.toUpperCase()}
						</div>
					</React.Fragment>
				);
			})}
		</>
	);
};

const Cartoes: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number}> = ({linha, t, frame, fps}) => {
	if (t >= linha.chamada.ini) return null;
	const cena = cenaNoTempo(linha, t);
	const c = cena.cartoes.find((x) => t >= x.ini && t < x.fim);
	if (!c) return null;
	const entra = spring({frame: frame - Math.round(c.ini * fps), fps, config: {damping: 11, stiffness: 180}});
	const sai = 1 - smoothstep(c.fim - 0.25, c.fim, t);
	return (
		<div style={{position: 'absolute', top: 330, width: '100%', display: 'flex', justifyContent: 'center', opacity: sai}}>
			<div
				style={{
					textAlign: 'center',
					background: 'rgba(255,255,255,0.96)',
					border: '7px solid #000',
					borderRadius: 30,
					boxShadow: '0 14px 0 #000',
					padding: '14px 46px 20px',
					transform: `rotate(-2deg) scale(${entra})`,
					maxWidth: 900,
				}}
			>
				<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 120, lineHeight: 1, color: '#111'}}>{c.grande.toUpperCase()}</div>
				{c.pequeno ? <div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 44, lineHeight: 1.15, color: '#333', marginTop: 8}}>{c.pequeno}</div> : null}
			</div>
		</div>
	);
};
/** Riscos de chuva caindo na diagonal; a posição depende só de t (cada quadro é independente). */
const GOTAS = Array.from({length: 170}, (_, i) => ({x: (i * 0.618034) % 1, y: (i * 0.754877) % 1, v: 0.8 + ((i * 0.3819) % 1) * 0.5, c: 50 + ((i * 7) % 5) * 14}));
const Chuva: React.FC<{t: number; intensidade: number}> = ({t, intensidade}) => (
	<AbsoluteFill style={{opacity: intensidade}}>
		<AbsoluteFill style={{backgroundColor: 'rgba(40,52,80,0.28)'}} />
		<svg width="1080" height="1920" viewBox="0 0 1080 1920">
			{GOTAS.map((g, i) => {
				const y = ((g.y + t * 1.35 * g.v) % 1) * 2100 - 120;
				const x = ((g.x + t * 0.18 * g.v) % 1) * 1300 - 110;
				return <line key={i} x1={x} y1={y} x2={x - g.c * 0.22} y2={y + g.c} stroke="rgba(205,222,255,0.55)" strokeWidth={3} strokeLinecap="round" />;
			})}
		</svg>
	</AbsoluteFill>
);

const Efeitos: React.FC<{linha: LinhaDoTempo; t: number}> = ({linha, t}) => {
	const cena = cenaNoTempo(linha, t);
	let branco = 0;
	let preto = 0;
	let vinheta = 0;
	let chuva = 0;
	let raio = 0;
	for (const e of cena.efeitos) {
		const intens = e.intensidade ?? 1;
		if (e.efeito === 'flash' && t >= e.ini && t <= e.fim) branco = Math.max(branco, intens * (1 - (t - e.ini) / Math.max(e.fim - e.ini, 0.05)));
		if (e.efeito === 'preto' && t >= e.ini && t <= e.fim) preto = Math.max(preto, intens * Math.sin((Math.PI * (t - e.ini)) / Math.max(e.fim - e.ini, 0.05)));
		if (e.efeito === 'vinheta' && t >= e.ini && t <= e.fim) vinheta = Math.max(vinheta, intens * smoothstep(e.ini, e.ini + 0.3, t));
		if (e.efeito === 'chuva' && t >= e.ini && t <= e.fim) chuva = Math.max(chuva, intens * smoothstep(e.ini, e.ini + 0.4, t));
		if (e.efeito === 'piscar' && t >= e.ini && t <= e.fim) {
			// luz falhando: apagões curtos e irregulares (mesmo padrão em todo render)
			const passo = Math.floor((t - e.ini) / 0.07);
			const apagada = Math.sin(passo * 12.9898 + 78.233) * 43758.5453;
			if (apagada - Math.floor(apagada) < 0.34) preto = Math.max(preto, intens * 0.62);
		}
		if (e.efeito === 'relampago' && t >= e.ini && t <= e.fim) {
			// dois clarões seguidos, o segundo mais forte
			const d = t - e.ini;
			raio = Math.max(raio, intens * Math.max(0.55 * Math.max(0, 1 - Math.abs(d - 0.04) / 0.05), Math.max(0, 1 - Math.abs(d - 0.16) / 0.08) * (d < 0.16 ? 1 : Math.exp(-(d - 0.16) * 9))));
		}
	}
	const tr = transicaoNoTempo(cena, t);
	if (tr?.tipo === 'flash') branco = Math.max(branco, 1 - tr.desde / 0.25);
	if (tr?.tipo === 'preto') preto = Math.max(preto, 1 - tr.desde / 0.4);
	// sempre um pouco de vinheta: puxa o olho para o centro
	vinheta = Math.max(vinheta, 0.25);
	return (
		<>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)', opacity: clamp(vinheta)}} />
			{chuva > 0 ? <Chuva t={t} intensidade={clamp(chuva)} /> : null}
			{raio > 0 ? <AbsoluteFill style={{backgroundColor: '#DCE6FF', opacity: clamp(raio * 0.85), mixBlendMode: 'screen'}} /> : null}
			{branco > 0 ? <AbsoluteFill style={{backgroundColor: '#fff', opacity: clamp(branco)}} /> : null}
			{preto > 0 ? <AbsoluteFill style={{backgroundColor: '#000', opacity: clamp(preto)}} /> : null}
		</>
	);
};

export const Camada2D: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; semVoz: boolean}> = ({linha, t, frame, fps, semVoz}) => (
	<AbsoluteFill>
		<Efeitos linha={linha} t={t} />
		<Rotulos linha={linha} t={t} frame={frame} fps={fps} />
		<Selo linha={linha} />
		{semVoz ? <AvisoPrevia /> : null}
		<Cartoes linha={linha} t={t} frame={frame} fps={fps} />
		<Legenda linha={linha} t={t} frame={frame} fps={fps} />
		<Chamada linha={linha} t={t} frame={frame} fps={fps} />
	</AbsoluteFill>
);
