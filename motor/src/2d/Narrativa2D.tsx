// Recursos de narrativa em 2D das histórias (pedido do Iuri em 11/11, a partir do vídeo 2D de
// referência do "turno da noite"): manchete fixa no alto da tela, relógio da história no canto,
// objetos importantes em tela cheia (celular com alerta ou conversa, bilhete, rádio), moldura de
// câmera de segurança e a etiqueta de quem fala sem aparecer ("RÁDIO", "VOZ LÁ FORA").
// Tudo é desenhado aqui, em HTML/SVG, por cima do 3D: sai nítido e custa quase nada no render.
import React from 'react';
import {AbsoluteFill, spring} from 'remotion';
import {tipoDoPlano} from '../animacao/camera';
import {cenaNoTempo} from '../animacao/simulacao';
import {gruposDeLegenda} from '../roteiro/legendas';
import type {InsercaoTempo, LinhaDoTempo} from '../roteiro/tipos';
import {clamp, easeOut, lerp, smoothstep} from '../util/mat';

const FONTE = 'Montserrat';
const AMARELO = '#FFD60A';
const VERMELHO = '#FF3B30';

export interface Tela2D {
	w: number;
	h: number;
	filme: boolean;
}

const contorno = (px: number) => ({
	WebkitTextStroke: `${px}px #000`,
	paintOrder: 'stroke fill' as const,
	textShadow: '0 6px 0 rgba(0,0,0,0.85), 0 12px 24px rgba(0,0,0,0.5)',
});

/** "REGRA 1 — *APAGUE AS LUZES*" → pedaços com e sem destaque. */
const pedacos = (texto: string) =>
	texto
		.toUpperCase()
		.split(/(\*[^*]+\*)/)
		.filter(Boolean)
		.map((p) => ({txt: p.replace(/\*/g, ''), destaque: p.startsWith('*')}));

// --- manchete ---------------------------------------------------------------------------------

export const Manchete: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; tela: Tela2D}> = ({linha, t, frame, fps, tela}) => {
	if (t >= linha.chamada.ini && !linha.filme) return null;
	const cena = cenaNoTempo(linha, t);
	const m = cena.manchetes.find((x) => t >= x.ini && t < x.fim);
	if (!m) return null;
	const entra = spring({frame: frame - Math.round(m.ini * fps), fps, config: {damping: 13, stiffness: 210, mass: 0.7}});
	const sai = 1 - smoothstep(m.fim - 0.18, m.fim, t);
	const relogio = cena.relogio && t >= cena.relogio.ini && t < cena.relogio.fim;
	const texto = m.texto.replace(/\*/g, '');
	const tam = tela.filme ? 58 : clamp(Math.floor(1500 / Math.max(14, texto.length)) + 40, 62, 92);
	const top = tela.filme ? 70 : relogio ? 372 : 268;
	return (
		<div
			style={{
				position: 'absolute',
				top,
				left: tela.filme ? 200 : 70,
				right: tela.filme ? 200 : 70,
				textAlign: 'center',
				opacity: sai,
				transform: `translateY(${(1 - entra) * -26}px) scale(${0.9 + 0.1 * entra})`,
			}}
		>
			<span style={{fontFamily: FONTE, fontWeight: 900, fontSize: tam, lineHeight: 1.08, letterSpacing: 0.5, color: '#fff', ...contorno(tela.filme ? 8 : 11)}}>
				{pedacos(m.texto).map((p, i) => (
					<span key={i} style={{color: p.destaque ? (m.cor ?? VERMELHO) : '#fff'}}>
						{p.txt}
					</span>
				))}
			</span>
		</div>
	);
};

// --- relógio ----------------------------------------------------------------------------------

const minutos = (h: string) => {
	const [hh, mm] = h.split(':').map(Number);
	return hh * 60 + mm;
};
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m) % 60).padStart(2, '0')}`;

export const Relogio: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; tela: Tela2D}> = ({linha, t, frame, fps, tela}) => {
	if (t >= linha.chamada.ini && !linha.filme) return null;
	const cena = cenaNoTempo(linha, t);
	const r = cena.relogio;
	if (!r || t < r.ini || t >= r.fim) return null;
	const de = minutos(r.hora);
	const ate = r.ate_hora ? minutos(r.ate_hora) : de;
	// os minutos correm nos primeiros 70% do trecho e param na hora final
	const m = Math.round(lerp(de, ate, easeOut(clamp((t - r.ini) / Math.max(0.5, (r.fim - r.ini) * 0.7)))));
	const entra = spring({frame: frame - Math.round(r.ini * fps), fps, config: {damping: 14, stiffness: 200}});
	// os dois pontos piscam a cada meio segundo, como relógio digital
	const pisca = Math.floor(t * 2) % 2 === 0;
	const [hh, mm] = hhmm(m).split(':');
	return (
		<div
			style={{
				position: 'absolute',
				top: tela.filme ? 40 : 238,
				left: tela.filme ? 50 : 64,
				transform: `scale(${entra})`,
				transformOrigin: 'left top',
				background: 'rgba(10, 8, 18, 0.82)',
				border: '4px solid rgba(255, 176, 32, 0.9)',
				borderRadius: 18,
				padding: tela.filme ? '4px 18px' : '6px 22px',
				fontFamily: FONTE,
				fontWeight: 900,
				fontSize: tela.filme ? 54 : 74,
				lineHeight: 1.1,
				color: '#FFB020',
				fontVariantNumeric: 'tabular-nums',
				textShadow: '0 0 18px rgba(255,160,20,0.75)',
				letterSpacing: 4,
			}}
		>
			{hh}
			<span style={{opacity: pisca ? 1 : 0.25}}>:</span>
			{mm}
		</div>
	);
};

// --- etiqueta de quem fala sem aparecer ----------------------------------------------------------

const cacheGrupos = new WeakMap<LinhaDoTempo, ReturnType<typeof gruposDeLegenda>>();

export const EtiquetaVoz: React.FC<{linha: LinhaDoTempo; t: number; tela: Tela2D}> = ({linha, t, tela}) => {
	if (t >= linha.chamada.ini && !linha.filme) return null;
	let g = cacheGrupos.get(linha);
	if (!g) {
		g = gruposDeLegenda(linha.falas);
		cacheGrupos.set(linha, g);
	}
	const grupo = g.find((x) => t >= x.ini && t < x.fim);
	if (!grupo) return null;
	const etiqueta = linha.personagens[grupo.quem]?.etiqueta;
	if (!etiqueta) return null;
	// só quando a voz vem de fora da tela (interfone, rádio, telefone); em quadro o rosto já diz quem fala
	const fala = linha.falas.find((f) => f.quem === grupo.quem && t >= f.ini - 0.05 && t <= f.fim + 0.3);
	if (fala && !fala.off) return null;
	const tipo = tipoDoPlano(cenaNoTempo(linha, t), t);
	const baixa = tipo === 'close' || tipo === 'detalhe' || tipo === 'nuca' || tipo === 'ombro';
	// a legenda fica centrada em 62% (72% nos closes); a etiqueta vai logo acima dela
	const top = tela.filme ? tela.h * 0.86 - 110 : tela.h * (baixa ? 0.72 : 0.62) - 190;
	return (
		<div style={{position: 'absolute', top, left: 0, right: tela.filme ? 0 : 70, display: 'flex', justifyContent: 'center'}}>
			<div
				style={{
					fontFamily: FONTE,
					fontWeight: 900,
					fontSize: tela.filme ? 26 : 36,
					letterSpacing: 3,
					color: '#7CFFB2',
					background: 'rgba(8, 20, 14, 0.85)',
					border: '3px solid #2FD27A',
					borderRadius: 999,
					padding: '6px 22px',
				}}
			>
				● {etiqueta.toUpperCase()}
			</div>
		</div>
	);
};

// --- inserções em tela cheia -------------------------------------------------------------------

/** Braços (do protagonista, palito) segurando o objeto pelas laterais. */
const Bracos: React.FC<{x1: number; x2: number; y: number; cor: string}> = ({x1, x2, y, cor}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
		{[
			[x1, y, 150, 2000],
			[x2, y, 930, 2000],
		].map(([hx, hy, bx, by], i) => (
			<g key={i}>
				<line x1={bx} y1={by} x2={hx} y2={hy} stroke="#000" strokeWidth={70} strokeLinecap="round" />
				<line x1={bx} y1={by} x2={hx} y2={hy} stroke={cor} strokeWidth={56} strokeLinecap="round" />
				<circle cx={hx} cy={hy} r={40} fill="#F2EEE6" stroke="#000" strokeWidth={8} />
			</g>
		))}
	</svg>
);

/** Quanto do conteúdo já apareceu: linhas e mensagens entram uma a uma nos primeiros ~65% da inserção. */
const revelados = (x: InsercaoTempo, t: number, n: number) => {
	if (n <= 1) return n;
	const janela = Math.max(0.6, (x.fim - x.ini) * 0.65);
	return Math.min(n, 1 + Math.floor(((t - x.ini) / janela) * n));
};

const Celular: React.FC<{x: InsercaoTempo; t: number}> = ({x, t}) => {
	const conversa = !!x.mensagens?.length;
	const W = 660;
	const H = 1100;
	const left = (1080 - W) / 2;
	const top = 480;
	const cor = x.cor ?? '#B3261E';
	const n = conversa ? x.mensagens!.length : (x.linhas?.length ?? 0);
	const vistos = revelados(x, t, n);
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left,
					top,
					width: W,
					height: H,
					borderRadius: 70,
					background: '#15151B',
					border: '10px solid #000',
					boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
					padding: 26,
					boxSizing: 'border-box',
				}}
			>
				<div style={{width: '100%', height: '100%', borderRadius: 48, background: conversa ? '#ECE5DD' : '#1E1E26', overflow: 'hidden', position: 'relative'}}>
					{/* barra de cima: hora e notch */}
					<div style={{height: 64, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
						<div style={{width: 170, height: 34, borderRadius: 20, background: '#000'}} />
					</div>
					{conversa ? (
						<>
							<div style={{background: '#1F6E5C', color: '#fff', fontFamily: FONTE, fontWeight: 900, fontSize: 40, padding: '18px 28px', marginTop: -64, paddingTop: 76}}>
								{(x.titulo ?? 'GRUPO').toUpperCase()}
								<div style={{fontWeight: 800, fontSize: 24, opacity: 0.8, marginTop: 4}}>online</div>
							</div>
							<div style={{padding: '22px 22px', display: 'flex', flexDirection: 'column', gap: 18}}>
								{x.mensagens!.slice(0, vistos).map((m, i) => {
									const nova = i === vistos - 1;
									const pop = nova ? easeOut(clamp(((t - x.ini) % 10) * 6)) : 1;
									return (
										<div
											key={i}
											style={{
												alignSelf: m.eu ? 'flex-end' : 'flex-start',
												maxWidth: '86%',
												background: m.eu ? '#D9FDD3' : '#FFFFFF',
												borderRadius: 22,
												padding: '12px 20px 14px',
												boxShadow: '0 3px 0 rgba(0,0,0,0.15)',
												transform: `scale(${0.9 + 0.1 * pop})`,
											}}
										>
											{m.eu ? null : <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 26, color: ['#C2185B', '#1565C0', '#EF6C00', '#2E7D32'][i % 4]}}>{m.de}</div>}
											<div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 38, lineHeight: 1.18, color: '#111'}}>{m.texto}</div>
										</div>
									);
								})}
							</div>
						</>
					) : (
						<div style={{padding: '30px 30px'}}>
							<div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22}}>
								<svg width={64} height={58} viewBox="0 0 64 58">
									<path d="M32 3 L61 55 H3 Z" fill={AMARELO} stroke="#000" strokeWidth={4} strokeLinejoin="round" />
									<rect x={29} y={20} width={6} height={20} fill="#000" />
									<rect x={29} y={44} width={6} height={6} fill="#000" />
								</svg>
								<div>
									<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 34, color: '#fff'}}>{(x.titulo ?? 'ALERTA DE EMERGÊNCIA').toUpperCase()}</div>
									<div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 24, color: '#BBB'}}>agora</div>
								</div>
							</div>
							<div style={{background: cor, borderRadius: 26, padding: '30px 30px', display: 'flex', flexDirection: 'column', gap: 26}}>
								{(x.linhas ?? []).slice(0, vistos).map((l, i) => (
									<div key={i} style={{fontFamily: FONTE, fontWeight: 900, fontSize: 50, lineHeight: 1.08, color: i === n - 1 && n > 2 ? AMARELO : '#fff'}}>
										{l.toUpperCase()}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
			<Bracos x1={left + 10} x2={left + W - 10} y={top + H * 0.62} cor="#2B3A67" />
		</>
	);
};

const Bilhete: React.FC<{x: InsercaoTempo; t: number}> = ({x, t}) => {
	const linhas = x.linhas ?? [];
	const vistos = revelados(x, t, linhas.length);
	const W = 860;
	const top = 590;
	const left = (1080 - W) / 2;
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left,
					top,
					width: W,
					minHeight: 520,
					background: x.cor ?? '#F3EAD3',
					border: '6px solid #000',
					borderRadius: 10,
					transform: 'rotate(-3deg)',
					boxShadow: '0 30px 50px rgba(0,0,0,0.55)',
					padding: '50px 54px 60px',
					boxSizing: 'border-box',
					backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 86px, rgba(40,70,140,0.25) 86px 89px)',
				}}
			>
				{x.titulo ? <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 36, color: '#7A2E1F', marginBottom: 18, letterSpacing: 2}}>{x.titulo.toUpperCase()}</div> : null}
				{linhas.slice(0, vistos).map((l, i) => (
					<div
						key={i}
						style={{
							fontFamily: FONTE,
							fontWeight: 800,
							fontSize: 58,
							lineHeight: 1.35,
							color: '#1C2B6B',
							transform: `rotate(${i % 2 ? 0.8 : -0.6}deg) skewX(-6deg)`,
						}}
					>
						{l.toUpperCase()}
					</div>
				))}
			</div>
			<Bracos x1={left + 20} x2={left + W - 20} y={top + 330} cor="#2B3A67" />
		</>
	);
};

const Radio: React.FC<{x: InsercaoTempo; t: number; linha: LinhaDoTempo}> = ({x, t, linha}) => {
	const fala = linha.falas.find((f) => t >= f.ini && t <= f.fim && (!x.quem || f.quem === x.quem));
	const nivel = fala ? 0.55 + 0.45 * Math.abs(Math.sin(t * 23) * Math.cos(t * 7.3)) : 0.08;
	const pontos = Array.from({length: 48}, (_, i) => {
		const a = Math.sin(i * 0.9 + t * 30) * Math.sin(i * 0.31 + t * 11) * nivel;
		return `${20 + i * 8.3},${70 + a * 55}`;
	}).join(' ');
	const W = 470;
	const left = (1080 - W) / 2;
	const top = 500;
	return (
		<div style={{position: 'absolute', left, top, width: W}}>
			{/* antena */}
			<div style={{position: 'absolute', left: W - 120, top: -230, width: 40, height: 260, background: '#26262E', border: '6px solid #000', borderRadius: 20}} />
			<div style={{position: 'relative', width: W, height: 860, background: '#34343E', border: '8px solid #000', borderRadius: 60, boxShadow: '0 30px 60px rgba(0,0,0,0.6)'}}>
				<div
					style={{
						position: 'absolute',
						left: 40,
						top: 24,
						width: 30,
						height: 30,
						borderRadius: 99,
						background: fala ? '#FF2D2D' : '#5A1414',
						boxShadow: fala ? '0 0 30px 8px rgba(255,40,40,0.8)' : 'none',
					}}
				/>
				<div style={{position: 'absolute', right: 40, top: 18, fontFamily: FONTE, fontWeight: 900, fontSize: 30, color: '#0D2A18', background: '#2FD27A', borderRadius: 99, padding: '4px 18px'}}>
					{(x.titulo ?? 'RÁDIO').toUpperCase()}
				</div>
				<div style={{position: 'absolute', left: 50, right: 50, top: 90, height: 150, background: '#9BD8A0', border: '6px solid #000', borderRadius: 18, overflow: 'hidden'}}>
					<svg width={W - 112} height={140} viewBox="0 0 420 140" preserveAspectRatio="none">
						<polyline points={pontos} fill="none" stroke="#123A1C" strokeWidth={6} strokeLinejoin="round" />
					</svg>
				</div>
				{Array.from({length: 7}, (_, i) => (
					<div key={i} style={{position: 'absolute', left: 70, right: 70, top: 300 + i * 62, height: 22, background: '#1E1E26', borderRadius: 12}} />
				))}
			</div>
		</div>
	);
};

/** Interfone de parede: visor com quem chama ("APTO 0") piscando e a onda de quem fala. */
const Interfone: React.FC<{x: InsercaoTempo; t: number; linha: LinhaDoTempo}> = ({x, t, linha}) => {
	const fala = linha.falas.find((f) => t >= f.ini && t <= f.fim && (!x.quem || f.quem === x.quem));
	// tocando: o visor fica aceso e o "CHAMANDO" pisca até alguém falar; sem "quem" é o interfone parado
	const tocando = !!x.quem && !linha.falas.some((f) => f.ini >= x.ini - 0.05 && f.ini <= t && f.quem === x.quem);
	const pisca = Math.floor(t * 3) % 2 === 0;
	const aceso = true;
	// "linhas" viram as teclas (a última fica em destaque, piscando em vermelho: o botão a mais)
	const teclas = x.linhas?.length ? x.linhas.slice(0, 6) : Array.from({length: 6}, () => '');
	const destaque = x.linhas?.length ? teclas.length - 1 : -1;
	const nivel = fala ? 0.55 + 0.45 * Math.abs(Math.sin(t * 23) * Math.cos(t * 7.3)) : 0.06;
	const pontos = Array.from({length: 40}, (_, i) => `${10 + i * 10},${40 + Math.sin(i * 0.9 + t * 30) * Math.sin(i * 0.31 + t * 11) * nivel * 32}`).join(' ');
	const W = 560;
	const left = (1080 - W) / 2;
	return (
		<div style={{position: 'absolute', left, top: 500, width: W, height: 860, background: '#E6DFCF', border: '8px solid #000', borderRadius: 36, boxShadow: '0 30px 60px rgba(0,0,0,0.6)'}}>
			<div style={{position: 'absolute', left: 50, right: 50, top: 50, height: 230, background: aceso ? (tocando && !pisca ? '#5FE69A' : '#7CFFB2') : '#1F3A2A', border: '6px solid #000', borderRadius: 16, boxShadow: tocando && pisca ? '0 0 70px rgba(124,255,178,0.85)' : '0 0 40px rgba(124,255,178,0.5)', textAlign: 'center'}}>
				<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 30, color: '#0D2A18', marginTop: 16, letterSpacing: 3, opacity: tocando && !pisca ? 0.15 : 1}}>{!x.quem ? 'PORTARIA' : tocando ? 'CHAMANDO' : 'EM LINHA'}</div>
				<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: (x.titulo ?? 'APTO 0').length > 6 ? 72 : 96, color: '#0D2A18', lineHeight: 1.1, whiteSpace: 'nowrap'}}>{(x.titulo ?? 'APTO 0').toUpperCase()}</div>
				<svg width={W - 112} height={70} viewBox="0 0 410 80" preserveAspectRatio="none" style={{opacity: fala ? 1 : 0.35}}>
					<polyline points={pontos} fill="none" stroke="#0D2A18" strokeWidth={6} strokeLinejoin="round" />
				</svg>
			</div>
			{/* grade do alto-falante */}
			{Array.from({length: 5}, (_, i) => (
				<div key={i} style={{position: 'absolute', left: 110, right: 110, top: (destaque >= 0 ? 500 : 330) + i * 40, height: 16, background: '#3A372F', borderRadius: 10}} />
			))}
			{/* fone no gancho */}
			<div style={{position: 'absolute', left: 60, right: 60, top: destaque >= 0 ? 710 : 560, height: 110, background: '#D6CDB9', border: '6px solid #000', borderRadius: 60}} />
			{/* teclado */}
			{teclas.map((rot, i) => {
				const d = i === destaque;
				const brilha = d && Math.floor(t * 4) % 2 === 0;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: 90 + (i % 3) * 135,
							top: (destaque >= 0 ? 316 : 700) + Math.floor(i / 3) * 76,
							width: 110,
							height: 60,
							background: d ? (brilha ? '#FF3B30' : '#B3261E') : '#F6F1E6',
							border: '4px solid #000',
							borderRadius: 12,
							boxShadow: brilha ? '0 0 34px 10px rgba(255,59,48,0.75)' : 'none',
							transform: d ? `scale(${1.12 + (brilha ? 0.06 : 0)})` : undefined,
							fontFamily: FONTE,
							fontWeight: 900,
							fontSize: d ? 40 : 30,
							lineHeight: '52px',
							textAlign: 'center',
							color: d ? '#fff' : '#2A2620',
						}}
					>
						{rot}
					</div>
				);
			})}
			<div style={{position: 'absolute', left: 40, top: 300, width: 26, height: 26, borderRadius: 99, background: fala || tocando ? '#FF2D2D' : '#5A1414', boxShadow: fala || tocando ? '0 0 26px 8px rgba(255,40,40,0.8)' : 'none'}} />
		</div>
	);
};

/** Moldura de câmera de segurança por cima do plano (não cobre o 3D). */
const Cctv: React.FC<{x: InsercaoTempo; t: number; tela: Tela2D}> = ({x, t, tela}) => {
	const rec = Math.floor(t * 1.6) % 2 === 0;
	const seg = Math.floor(t - x.ini) % 60;
	const hora = `${x.hora ?? '03:00'}:${String(seg).padStart(2, '0')}`;
	const linhaRuido = (t * 0.37) % 1;
	const m = tela.filme ? 50 : 70;
	const fonte = tela.filme ? 34 : 42;
	// o canto de cima começa abaixo do selo e da manchete
	const topo = tela.filme ? 60 : 560;
	return (
		<AbsoluteFill>
			{/* tira a cor do 3D embaixo e dá o verde-acinzentado de câmera barata */}
			<AbsoluteFill style={{background: '#808080', mixBlendMode: 'saturation'}} />
			<AbsoluteFill style={{background: 'rgba(60, 90, 70, 0.22)', mixBlendMode: 'multiply'}} />
			<AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 6px)'}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: `${linhaRuido * 100}%`, height: 60, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.10), transparent)'}} />
			<svg width={tela.w} height={tela.h} style={{position: 'absolute', left: 0, top: 0}}>
				{[
					[m, m + topo, 1, 1],
					[tela.w - m, m + topo, -1, 1],
					[m, tela.h - m - 380, 1, -1],
					[tela.w - m, tela.h - m - 380, -1, -1],
				].map(([cx, cy, sx, sy], i) => (
					<path key={i} d={`M${cx} ${cy + sy * 90} L${cx} ${cy} L${cx + sx * 90} ${cy}`} stroke="#fff" strokeWidth={7} fill="none" opacity={0.85} />
				))}
			</svg>
			<div style={{position: 'absolute', left: m + 30, top: m + topo + 30, fontFamily: FONTE, fontWeight: 900, fontSize: fonte, color: '#fff', ...contorno(6)}}>
				<span style={{color: '#FF3030', opacity: rec ? 1 : 0.2}}>●</span> REC
			</div>
			<div style={{position: 'absolute', right: m + 30, top: m + topo + 30, fontFamily: FONTE, fontWeight: 900, fontSize: fonte, color: '#fff', ...contorno(6)}}>
				{(x.titulo ?? 'CAM 01').toUpperCase()}
			</div>
			<div style={{position: 'absolute', left: m + 30, bottom: m + 410, fontFamily: FONTE, fontWeight: 900, fontSize: fonte, color: '#fff', fontVariantNumeric: 'tabular-nums', ...contorno(6)}}>
				{hora}
			</div>
		</AbsoluteFill>
	);
};

const FUNDOS: Record<string, string> = {
	celular: 'radial-gradient(ellipse at 50% 42%, #5A1414 0%, #1A0707 70%, #0A0303 100%)',
	bilhete: 'radial-gradient(ellipse at 50% 45%, #2A2F45 0%, #0E1020 75%)',
	radio: 'radial-gradient(ellipse at 50% 40%, #252A3A 0%, #0B0D16 75%)',
	interfone: 'radial-gradient(ellipse at 50% 40%, #1F3A2E 0%, #08120D 75%)',
};

/** Inserções da cena no instante t: as de tela cheia cobrem o 3D; a cctv só põe a moldura. */
export const Insercoes: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; tela: Tela2D}> = ({linha, t, frame, fps, tela}) => {
	if (t >= linha.chamada.ini && !linha.filme) return null;
	const cena = cenaNoTempo(linha, t);
	const x = cena.insercoes.find((i) => t >= i.ini && t < i.fim);
	if (!x) return null;
	if (x.tipo === 'cctv') return <Cctv x={x} t={t} tela={tela} />;
	const entra = spring({frame: frame - Math.round(x.ini * fps), fps, config: {damping: 15, stiffness: 190, mass: 0.8}});
	// aproxima devagar (como câmera na mão) e balança de leve, para a tela nunca ficar parada
	const k = (t - x.ini) / Math.max(0.5, x.fim - x.ini);
	const escala = (0.86 + 0.14 * entra) * (1 + 0.06 * k);
	const balanco = Math.sin(t * 1.7) * 0.6;
	const fundo = FUNDOS[x.tipo] ?? FUNDOS.radio;
	// no filme (16:9) o objeto, desenhado para 1080x1920, é reduzido e centrado
	const enc = tela.filme ? tela.h / 1920 : 1;
	return (
		<AbsoluteFill style={{background: fundo}}>
			<div
				style={{
					position: 'absolute',
					left: (tela.w - 1080 * enc) / 2,
					top: 0,
					width: 1080,
					height: 1920,
					transform: `scale(${enc}) scale(${escala}) rotate(${balanco}deg)`,
					transformOrigin: tela.filme ? 'left top' : '50% 48%',
				}}
			>
				{x.tipo === 'celular' ? <Celular x={x} t={t} /> : null}
				{x.tipo === 'bilhete' ? <Bilhete x={x} t={t} /> : null}
				{x.tipo === 'radio' ? <Radio x={x} t={t} linha={linha} /> : null}
				{x.tipo === 'interfone' ? <Interfone x={x} t={t} linha={linha} /> : null}
			</div>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.75) 100%)'}} />
		</AbsoluteFill>
	);
};

/** Texto da etiqueta do selo: "PARTE 3/7" quando a série sabe quantas partes tem. */
export const textoParte = (linha: LinhaDoTempo) => {
	if (linha.formato === 'avulso') return `#${linha.parte}`;
	const nome = (linha.rotuloParte ?? 'PARTE').toUpperCase();
	return linha.totalPartes ? `${nome} ${linha.parte}/${linha.totalPartes}` : `${nome} ${linha.parte}`;
};

