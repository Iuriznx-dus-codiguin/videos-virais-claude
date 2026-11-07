// Camada 2D por cima do vídeo: selo da série, legendas palavra por palavra (com a cor de quem
// fala), efeitos de tela (flash, preto, vinheta) e a chamada final para comentar.
// No filme 16:9 do fim da minissérie (src/filme.ts) não há selo nem chamada: entram o letreiro de
// capítulo, o escurecimento entre as partes, o cartão "FIM" e uma legenda menor, embaixo.
import React from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, spring, staticFile, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {cameraNoTempo, tipoDoPlano, transicaoNoTempo} from '../animacao/camera';
import {transicaoAtiva} from '../animacao/transicoes';
import {MEDIDAS} from '../animacao/pose';
import {raioDaPeca} from '../animacao/maquete';
import {cenaNoTempo, simulacao} from '../animacao/simulacao';
import {CAPITULO_FILME, CLAREIA_FILME, ESCURECE_FILME} from '../filme';
import {GrupoLegenda, gruposDeLegenda, textoNaTela} from '../roteiro/legendas';
import type {LinhaDoTempo} from '../roteiro/tipos';
import {aleatorio, clamp, easeInOut, easeOut, lerp, smoothstep} from '../util/mat';

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
/**
 * Zona segura do Shorts e do Reels: os botões (curtir, comentar, enviar) ocupam a faixa da
 * direita e o título/legenda da plataforma, a de baixo. Texto do vídeo fica fora delas.
 */
const MARGEM_ESQ = 80;
const MARGEM_DIR = 150;
const VERMELHO = '#FF3B30';

/** Tamanho do quadro (1080x1920 nos shorts, 1920x1080 no filme). */
interface Tela {
	w: number;
	h: number;
	filme: boolean;
	/** escala dos textos: 1 nos shorts, menor no filme (a tela deitada pede letra menor) */
	k: number;
}

const contornoTexto = (px: number, sombra = 1) => ({
	WebkitTextStroke: `${px}px #000`,
	paintOrder: 'stroke fill' as const,
	textShadow: `0 ${8 * sombra}px 0 rgba(0,0,0,0.85), 0 ${14 * sombra}px ${28 * sombra}px rgba(0,0,0,0.45)`,
});

/**
 * Fonte que faz a palavra mais comprida caber em `largura` px (Montserrat 900 em maiúsculas tem
 * ~0,74 em por letra). Palavras longas ("MICRO-ONDAS", "INCANDESCÊNCIA") diminuem em vez de vazar.
 */
const fonteQueCabe = (texto: string, base: number, largura: number) => {
	const maior = Math.max(1, ...texto.replace(/\u00AD/g, '').split(/[\s-]+/).map((p) => p.length));
	return Math.min(base, Math.floor(largura / (maior * 0.74)));
};

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

const AvisoPrevia: React.FC<{tela: Tela}> = ({tela}) => (
	<div style={{position: 'absolute', top: tela.filme ? 40 : 236, width: '100%', display: 'flex', justifyContent: 'center'}}>
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

const Legenda: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; tela: Tela}> = ({linha, t, frame, fps, tela}) => {
	if (t >= linha.chamada.ini) return null;
	const g = grupos(linha).find((x) => t >= x.ini && t < x.fim);
	if (!g) return null;
	const cena = cenaNoTempo(linha, t);
	const tipo = tipoDoPlano(cena, t);
	const baixa = tipo === 'close' || tipo === 'detalhe' || tipo === 'nuca' || tipo === 'ombro';
	const corFala = linha.personagens[g.quem]?.cor_legenda ?? AMARELO;
	// filme: legenda menor, sempre no pé da tela, como em filme legendado
	const margem = tela.filme ? 260 : 0;
	const largura = tela.filme ? tela.w - 2 * margem : 1080 - MARGEM_ESQ - MARGEM_DIR - 20;
	return (
		<div
			style={{
				position: 'absolute',
				top: tela.filme ? '86%' : baixa ? '72%' : '62%',
				left: tela.filme ? margem : MARGEM_ESQ,
				right: tela.filme ? margem : MARGEM_DIR,
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				alignItems: 'baseline',
				columnGap: tela.filme ? 18 : 24,
				rowGap: 0,
				transform: 'translateY(-50%)',
			}}
		>
			{g.palavras.map((p, i) => {
				if (t < p.ini) return null;
				const pop = spring({frame: frame - Math.round(p.ini * fps), fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
				const falando = t < p.fim + 0.04;
				const base = tela.filme ? (p.enfase ? 84 : 68) : p.enfase ? 148 : 112;
				const contorno = tela.filme ? (p.enfase ? 11 : 9) : p.enfase ? 18 : 15;
				return (
					<span
						key={i}
						style={{
							fontFamily: FONTE,
							fontWeight: 900,
							fontSize: fonteQueCabe(textoNaTela(p.texto), base, largura),
							lineHeight: 1.05,
							color: falando ? (p.enfase ? VERMELHO : corFala) : '#FFFFFF',
							display: 'inline-block',
							transform: `scale(${(tela.filme ? 0.75 : 0.55) + (tela.filme ? 0.25 : 0.45) * pop}) rotate(${p.enfase ? -3 : 0}deg)`,
							...contornoTexto(contorno, tela.filme ? 0.55 : 1),
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
							padding: `0 ${MARGEM_DIR}px 0 ${MARGEM_ESQ}px`,
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
						fontSize: fonteQueCabe(`“${c.destaque}”`, 138, 900),
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

/**
 * Ponto 3D na tela (px), pela mesma câmera do quadro, e o raio da cabeça na tela quando o alvo é
 * um personagem (0 para pontos e objetos); null se estiver atrás da lente.
 */
const naTela = (linha: LinhaDoTempo, t: number, alvo: string | [number, number, number], tela: Tela): {x: number; y: number; raio: number; raioPeca?: number} | null => {
	const LARGURA = tela.w;
	const ALTURA = tela.h;
	const cena = cenaNoTempo(linha, t);
	const sim = simulacao(linha, cena);
	const ponto = sim.ponto(alvo, t);
	if (!ponto) return null;
	const c = cameraNoTempo(cena, sim, t, LARGURA / ALTURA);
	const cam = new THREE.PerspectiveCamera(c.fov, LARGURA / ALTURA, 0.05, 900);
	cam.position.set(...c.pos);
	cam.up.set(0, 1, 0);
	cam.lookAt(...c.alvo);
	cam.rotateZ(c.rolar);
	cam.updateMatrixWorld();
	const v = new THREE.Vector3(...ponto).project(cam);
	if (v.z > 1) return null;
	let raio = 0;
	const est = typeof alvo === 'string' ? sim.estado(alvo, t) : null;
	if (est?.tipo === 'palito') {
		const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
		const topo = new THREE.Vector3(...ponto).addScaledVector(cima, MEDIDAS.raioCabeca * est.escala).project(cam);
		raio = (Math.abs(topo.y - v.y) / 2) * ALTURA;
	}
	// peça de maquete: tamanho dela na tela (para o círculo abraçar a peça inteira)
	let raioPeca: number | undefined;
	const rPeca = typeof alvo === 'string' && !est ? raioDaPeca(cena, linha, alvo) : null;
	if (rPeca) {
		const lado = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
		const borda = new THREE.Vector3(...ponto).addScaledVector(lado, rPeca).project(cam);
		raioPeca = Math.hypot((borda.x - v.x) * LARGURA, (borda.y - v.y) * ALTURA) / 2;
	}
	return {x: ((v.x + 1) / 2) * LARGURA, y: ((1 - v.y) / 2) * ALTURA, raio, raioPeca};
};

/** Altura da etiqueta com duas linhas de texto e o primeiro y livre abaixo do selo da série. */
const ALTURA_ETIQUETA = 150;
const TOPO_LIVRE = 300;

const Rotulos: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; tela: Tela}> = ({linha, t, frame, fps, tela}) => {
	if (t >= linha.chamada.ini) return null;
	const cena = cenaNoTempo(linha, t);
	const ativos = cena.rotulos.filter((r) => t >= r.ini && t < r.fim);
	const {w: LARGURA, h: ALTURA, k} = tela;
	// no filme não há selo em cima: a etiqueta pode subir até perto da borda
	const topoLivre = tela.filme ? 50 : TOPO_LIVRE;
	const pe = tela.filme ? ALTURA * 0.52 : 1050;
	const alturaEtiqueta = ALTURA_ETIQUETA * k;
	return (
		<>
			{ativos.map((r, i) => {
				const p = naTela(linha, t, r.alvo, tela);
				if (!p) return null;
				const lado = r.lado ?? (p.x < LARGURA / 2 ? 'esquerda' : 'direita');
				const entra = spring({frame: frame - Math.round(r.ini * fps), fps, config: {damping: 13, stiffness: 200}});
				const sai = 1 - smoothstep(r.fim - 0.2, r.fim, t);
				const vis = entra * sai;
				// em personagem, a etiqueta fica acima da cabeça (nunca em cima do rosto) e a linha
				// encosta no alto da cabeça; em ponto ou objeto, a linha vai até o próprio ponto
				const px = p.x;
				const py = p.raio ? p.y - p.raio * 0.9 : p.y;
				const ly =
					r.altura !== undefined
						? r.altura * ALTURA
						: p.raio
							? clamp(p.y - p.raio - 50 * k - alturaEtiqueta - i * 20, topoLivre, pe)
							: clamp(py - 170 * k - i * 20, topoLivre + 30, pe);
				const lx = lado === 'esquerda' ? 70 : LARGURA - 70;
				const cor = r.cor ?? AMARELO;
				// a linha sai da borda da etiqueta e vai até a peça
				const bx = lado === 'esquerda' ? lx + 40 : lx - 40;
				return (
					<React.Fragment key={i}>
						<svg width={LARGURA} height={ALTURA} style={{position: 'absolute', left: 0, top: 0, opacity: vis}}>
							<line x1={bx} y1={ly + 40 * k} x2={bx + (px - bx) * entra} y2={ly + 40 * k + (py - ly - 40 * k) * entra} stroke="#000" strokeWidth={14 * k} strokeLinecap="round" />
							<line x1={bx} y1={ly + 40 * k} x2={bx + (px - bx) * entra} y2={ly + 40 * k + (py - ly - 40 * k) * entra} stroke={cor} strokeWidth={7 * k} strokeLinecap="round" />
							<circle cx={px} cy={py} r={16 * k * entra} fill={cor} stroke="#000" strokeWidth={6 * k} />
						</svg>
						<div
							style={{
								position: 'absolute',
								top: ly,
								[lado === 'esquerda' ? 'left' : 'right']: 50,
								maxWidth: 560 * k,
								fontFamily: FONTE,
								fontWeight: 900,
								fontSize: 54 * k,
								lineHeight: 1.05,
								color: '#111',
								background: cor,
								border: `${6 * k}px solid #000`,
								borderRadius: 22 * k,
								padding: `${10 * k}px ${26 * k}px ${14 * k}px`,
								boxShadow: `0 ${10 * k}px 0 #000`,
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

/** Texto grande do cartão; com "contar", o "#" vira o número contando de "de" até "até". */
const textoDoCartao = (c: {grande: string; contar?: [number, number]; ini: number; fim: number}, t: number) => {
	if (!c.contar) return c.grande;
	const [de, ate] = c.contar;
	const dur = Math.min(1.4, Math.max(0.4, (c.fim - c.ini) * 0.6));
	const v = lerp(de, ate, easeOut(clamp((t - c.ini) / dur)));
	const inteiro = Number.isInteger(de) && Number.isInteger(ate);
	const num = inteiro ? Math.round(v).toLocaleString('pt-BR') : v.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1});
	return c.grande.includes('#') ? c.grande.replace('#', num) : num;
};

const Cartoes: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; tela: Tela}> = ({linha, t, frame, fps, tela}) => {
	if (t >= linha.chamada.ini) return null;
	const cena = cenaNoTempo(linha, t);
	const c = cena.cartoes.find((x) => t >= x.ini && t < x.fim);
	if (!c) return null;
	const entra = spring({frame: frame - Math.round(c.ini * fps), fps, config: {damping: 11, stiffness: 180}});
	const sai = 1 - smoothstep(c.fim - 0.25, c.fim, t);
	const grande = textoDoCartao(c, t).toUpperCase();
	return (
		<div style={{position: 'absolute', top: tela.filme ? 60 : 330, width: '100%', display: 'flex', justifyContent: 'center', opacity: sai}}>
			<div
				style={{
					textAlign: 'center',
					background: 'rgba(255,255,255,0.96)',
					border: `${7 * tela.k}px solid #000`,
					borderRadius: 30 * tela.k,
					boxShadow: `0 ${14 * tela.k}px 0 #000`,
					padding: `${14 * tela.k}px ${46 * tela.k}px ${20 * tela.k}px`,
					transform: `rotate(-2deg) scale(${entra})`,
					maxWidth: 900,
				}}
			>
				<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: fonteQueCabe(c.contar ? c.grande.replace('#', String(c.contar[1])) : c.grande, 120 * tela.k, 800), lineHeight: 1, color: '#111', fontVariantNumeric: 'tabular-nums'}}>{grande}</div>
				{c.pequeno ? <div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 44 * tela.k, lineHeight: 1.15, color: '#333', marginTop: 8}}>{c.pequeno}</div> : null}
			</div>
		</div>
	);
};
/** Riscos de chuva caindo na diagonal; a posição depende só de t (cada quadro é independente). */
const GOTAS = Array.from({length: 170}, (_, i) => ({x: (i * 0.618034) % 1, y: (i * 0.754877) % 1, v: 0.8 + ((i * 0.3819) % 1) * 0.5, c: 50 + ((i * 7) % 5) * 14}));
const Chuva: React.FC<{t: number; intensidade: number; tela: Tela}> = ({t, intensidade, tela}) => (
	<AbsoluteFill style={{opacity: intensidade}}>
		<AbsoluteFill style={{backgroundColor: 'rgba(40,52,80,0.28)'}} />
		<svg width={tela.w} height={tela.h} viewBox={`0 0 ${tela.w} ${tela.h}`}>
			{(tela.filme ? [...GOTAS, ...GOTAS.map((g) => ({...g, x: (g.x + 0.5) % 1, y: (g.y + 0.37) % 1}))] : GOTAS).map((g, i) => {
				const y = ((g.y + t * 1.35 * g.v) % 1) * (tela.h + 180) - 120;
				const x = ((g.x + t * 0.18 * g.v) % 1) * (tela.w + 220) - 110;
				return <line key={i} x1={x} y1={y} x2={x - g.c * 0.22} y2={y + g.c} stroke="rgba(205,222,255,0.55)" strokeWidth={3} strokeLinecap="round" />;
			})}
		</svg>
	</AbsoluteFill>
);

// --- efeitos de produção: linhas de ação, letreiro, círculo, destaque, barras de cinema ---

/** Linhas de ação de desenho animado: cunhas finas vindo das bordas, trocando a cada 2 quadros. */
const Linhas: React.FC<{t: number; ini: number; fim: number; intensidade: number; cor: string; tela: Tela}> = ({t, ini, fim, intensidade, cor, tela}) => {
	const vis = smoothstep(ini, ini + 0.08, t) * (1 - smoothstep(fim - 0.2, fim, t)) * intensidade;
	const r = aleatorio(Math.floor(t * 15) + 7);
	const LARGURA = tela.w;
	const ALTURA = tela.h;
	const cx = LARGURA / 2;
	const cy = ALTURA * 0.458;
	// elipse alongada no lado comprido da tela (em pé nos shorts, deitada no filme)
	const escala = Math.max(LARGURA, ALTURA) / 1920;
	const [ex, ey] = tela.filme ? [1, 0.62] : [0.62, 1];
	const cunhas = Array.from({length: 56}, (_, i) => {
		const a = (i / 56) * Math.PI * 2 + r() * 0.08;
		const larg = 0.012 + r() * 0.02;
		const dentro = (560 + r() * 260) * escala;
		const fora = 1500 * escala;
		const p = (ang: number, d: number) => `${(cx + Math.cos(ang) * d * ex).toFixed(0)},${(cy + Math.sin(ang) * d * ey).toFixed(0)}`;
		return `M${p(a - larg, fora)} L${p(a, dentro)} L${p(a + larg, fora)} Z`;
	});
	return (
		<svg width={LARGURA} height={ALTURA} style={{position: 'absolute', left: 0, top: 0, opacity: clamp(vis)}}>
			<path d={cunhas.join(' ')} fill={cor} />
		</svg>
	);
};

/** Texto grande no meio da tela, numa faixa inclinada: entra batendo e sai sumindo. */
const Letreiro: React.FC<{texto: string; ini: number; fim: number; t: number; frame: number; fps: number; cor: string; altura: number; tela: Tela}> = ({texto, ini, fim, t, frame, fps, cor, altura, tela}) => {
	const k = tela.filme ? 0.8 : 1;
	const entra = spring({frame: frame - Math.round(ini * fps), fps, config: {damping: 10, stiffness: 210, mass: 0.7}});
	const sai = 1 - smoothstep(fim - 0.22, fim, t);
	const faixa = easeOut(clamp((t - ini) / 0.18));
	const txt = texto.toUpperCase();
	return (
		<div style={{position: 'absolute', top: `${(clamp(altura, 0.15, 0.85) * 100).toFixed(1)}%`, width: '100%', transform: 'translateY(-50%)', opacity: sai}}>
			<div
				style={{
					position: 'absolute',
					left: -100,
					right: -100,
					top: '50%',
					height: 210 * k,
					transform: `translateY(-50%) rotate(-4deg) scaleX(${faixa})`,
					background: 'rgba(12, 10, 24, 0.82)',
					borderTop: `${10 * k}px solid ${cor}`,
					borderBottom: `${10 * k}px solid ${cor}`,
				}}
			/>
			<div
				style={{
					position: 'relative',
					textAlign: 'center',
					padding: '0 50px',
					fontFamily: FONTE,
					fontWeight: 900,
					fontSize: fonteQueCabe(txt, 132 * k, tela.filme ? 1500 : 960),
					lineHeight: 1.02,
					color: '#fff',
					transform: `rotate(-4deg) scale(${lerp(1.7, 1, entra)})`,
					...contornoTexto(14 * k, k),
				}}
			>
				{txt}
			</div>
		</div>
	);
};

/** Círculo vermelho "à mão" desenhado em volta do alvo (duas voltas tortas). */
const Circulo: React.FC<{x: number; y: number; raio: number; ini: number; fim: number; t: number; cor: string; tela: Tela}> = ({x, y, raio, ini, fim, t, cor, tela}) => {
	const desenho = easeInOut(clamp((t - ini) / 0.45));
	const sai = 1 - smoothstep(fim - 0.2, fim, t);
	const rx = raio * 1.25;
	const ry = raio;
	const pts: string[] = [];
	const voltas = 1.18;
	const n = 64;
	for (let i = 0; i <= n; i++) {
		const a = -Math.PI * 0.6 + (i / n) * Math.PI * 2 * voltas;
		const k = 1 + 0.07 * Math.sin(i * 0.37) + 0.06 * (i / n);
		pts.push(`${(x + Math.cos(a) * rx * k).toFixed(1)},${(y + Math.sin(a) * ry * k).toFixed(1)}`);
	}
	const d = `M${pts.join(' L')}`;
	const comp = 2 * Math.PI * Math.max(rx, ry) * voltas * 1.1;
	const traco = {strokeDasharray: comp, strokeDashoffset: comp * (1 - desenho), fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
	return (
		<svg width={tela.w} height={tela.h} style={{position: 'absolute', left: 0, top: 0, opacity: sai}}>
			<path d={d} stroke="#000" strokeWidth={22} {...traco} />
			<path d={d} stroke={cor} strokeWidth={12} {...traco} />
		</svg>
	);
};

/** Escurece a tela menos um círculo de luz em volta do alvo. */
const Destaque: React.FC<{x: number; y: number; raio: number; ini: number; fim: number; t: number; intensidade: number}> = ({x, y, raio, ini, fim, t, intensidade}) => {
	const vis = smoothstep(ini, ini + 0.35, t) * (1 - smoothstep(fim - 0.3, fim, t));
	// no close o rosto é enorme: o círculo para em ~420 px e vira um holofote no rosto
	const r = clamp(raio * 1.9, 150, 420);
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(circle at ${x.toFixed(0)}px ${y.toFixed(0)}px, rgba(0,0,0,0) ${r.toFixed(0)}px, rgba(0,0,0,${(0.72 * intensidade).toFixed(2)}) ${(r * 1.45).toFixed(0)}px)`,
				opacity: clamp(vis),
			}}
		/>
	);
};

/** Faixas pretas de cinema em cima e embaixo (no filme, o quadro fica ~2,39:1 como no cinema). */
const Barras: React.FC<{vis: number; tela: Tela}> = ({vis, tela}) => {
	const h = (tela.filme ? 0.125 * tela.h : 165) * easeInOut(vis);
	return (
		<>
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: h, background: '#000'}} />
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: '#000'}} />
		</>
	);
};

const EfeitosDeProducao: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; tela: Tela}> = ({linha, t, frame, fps, tela}) => {
	const cena = cenaNoTempo(linha, t);
	const itens: React.ReactNode[] = [];
	let barras = 0;
	cena.efeitos.forEach((e, i) => {
		if (e.efeito === 'barras') {
			if (t >= e.ini && t <= e.fim + 0.35) barras = Math.max(barras, Math.min(clamp((t - e.ini) / 0.35), 1 - clamp((t - e.fim) / 0.35)));
			return;
		}
		if (t < e.ini || t >= e.fim) return;
		const intens = e.intensidade ?? 1;
		if (e.efeito === 'linhas') itens.push(<Linhas key={i} t={t} ini={e.ini} fim={e.fim} intensidade={Math.min(1, 0.85 * intens)} cor={e.cor ?? '#FFFFFF'} tela={tela} />);
		else if (e.efeito === 'letreiro' && e.texto) itens.push(<Letreiro key={i} texto={e.texto} ini={e.ini} fim={e.fim} t={t} frame={frame} fps={fps} cor={e.cor ?? AMARELO} altura={e.altura ?? 0.3} tela={tela} />);
		else if ((e.efeito === 'circular' || e.efeito === 'destacar') && e.alvo !== undefined) {
			// o alvo fica onde estava no começo do efeito (não persegue o tremor da câmera)
			const p = naTela(linha, t, e.alvo, tela);
			if (!p) return;
			const raio = p.raio ? p.raio * 1.5 : p.raioPeca ? clamp(p.raioPeca * 1.15, 55, 480) : 110 * intens;
			if (e.efeito === 'circular') itens.push(<Circulo key={i} x={p.x} y={p.y} raio={raio} ini={e.ini} fim={e.fim} t={t} cor={e.cor ?? VERMELHO} tela={tela} />);
			else itens.push(<Destaque key={i} x={p.x} y={p.y} raio={raio} ini={e.ini} fim={e.fim} t={t} intensidade={Math.min(1.2, intens)} />);
		}
	});
	return (
		<>
			{itens}
			{barras > 0 ? <Barras vis={barras} tela={tela} /> : null}
		</>
	);
};

/** Varrer (faixa amarela e preta na diagonal) e íris (círculo preto) cobrindo o corte. */
const Transicao2D: React.FC<{linha: LinhaDoTempo; t: number}> = ({linha, t}) => {
	const tr = transicaoAtiva(cenaNoTempo(linha, t), t);
	if (!tr) return null;
	if (tr.tipo === 'varrer') {
		const g = tr.fase === 'saida' ? 0.5 * tr.p : 0.5 + 0.5 * tr.p;
		const x = lerp(-3300, 3300, g);
		return (
			<div style={{position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transform: 'rotate(-16deg)'}}>
				<div style={{position: 'absolute', left: x - 1300 - 260, top: -2200, width: 220, height: 4400, background: '#000'}} />
				<div style={{position: 'absolute', left: x - 1300, top: -2200, width: 2600, height: 4400, background: AMARELO, borderLeft: '34px solid #000', borderRight: '34px solid #000'}} />
				<div style={{position: 'absolute', left: x + 1300 + 50, top: -2200, width: 90, height: 4400, background: AMARELO}} />
			</div>
		);
	}
	if (tr.tipo === 'iris') {
		const fecha = tr.fase === 'saida' ? 1 - tr.p ** 1.6 : tr.p ** 1.4;
		const r = Math.max(0, 1250 * fecha - 8);
		return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 44%, rgba(0,0,0,0) ${r.toFixed(0)}px, #000 ${(r + 4).toFixed(0)}px)`}} />;
	}
	return null;
};

const Efeitos: React.FC<{linha: LinhaDoTempo; t: number; tela: Tela}> = ({linha, t, tela}) => {
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
			{chuva > 0 ? <Chuva t={t} intensidade={clamp(chuva)} tela={tela} /> : null}
			{raio > 0 ? <AbsoluteFill style={{backgroundColor: '#DCE6FF', opacity: clamp(raio * 0.85), mixBlendMode: 'screen'}} /> : null}
			{branco > 0 ? <AbsoluteFill style={{backgroundColor: '#fff', opacity: clamp(branco)}} /> : null}
			{preto > 0 ? <AbsoluteFill style={{backgroundColor: '#000', opacity: clamp(preto)}} /> : null}
		</>
	);
};

// --- filme 16:9 (fim da minissérie): capítulo, escurecimento entre as partes e "FIM" ---------

/** Letreiro de capítulo nos primeiros segundos; na primeira parte, o título da série no meio da tela. */
const Capitulo: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number}> = ({linha, t, frame, fps}) => {
	const primeira = linha.filme?.primeira;
	const de = CAPITULO_FILME.de;
	const ate = primeira ? CAPITULO_FILME.ateNaPrimeira : CAPITULO_FILME.ate;
	if (t < de || t > ate) return null;
	const entra = spring({frame: frame - Math.round(de * fps), fps, config: {damping: 16, stiffness: 140}});
	const vis = entra * (1 - smoothstep(ate - 0.45, ate, t));
	const capitulo = (
		<div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: AMARELO, ...contornoTexto(6, 0.4)}}>
			CAPÍTULO {linha.parte}
			<span style={{color: '#fff'}}> · {linha.titulo.toUpperCase()}</span>
		</div>
	);
	if (primeira) {
		return (
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: vis}}>
				<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 60%)'}} />
				<div style={{textAlign: 'center', transform: `translateY(${(1 - entra) * 24 - 60}px)`}}>
					<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 168, lineHeight: 1, letterSpacing: 8, color: '#fff', marginBottom: 26, ...contornoTexto(14, 0.8)}}>{linha.tituloSerie}</div>
					{capitulo}
				</div>
			</AbsoluteFill>
		);
	}
	return (
		<div style={{position: 'absolute', top: 64, left: 80, opacity: vis, transform: `translateX(${(1 - entra) * -40}px)`}}>
			<div style={{width: 90, height: 8, background: AMARELO, border: '3px solid #000', marginBottom: 14}} />
			{capitulo}
		</div>
	);
};

/** Clareia no começo da parte, escurece no corte e, na última parte, mostra "FIM" sobre o preto. */
const MolduraFilme: React.FC<{linha: LinhaDoTempo; t: number}> = ({linha, t}) => {
	const f = linha.filme!;
	const preto = Math.max(1 - clamp(t / CLAREIA_FILME), smoothstep(f.corte - ESCURECE_FILME, f.corte, t));
	const fim = f.ultima ? smoothstep(f.corte + 0.2, f.corte + 0.9, t) : 0;
	return (
		<>
			{preto > 0.001 ? <AbsoluteFill style={{backgroundColor: '#000', opacity: clamp(preto)}} /> : null}
			{fim > 0 ? (
				<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: fim}}>
					<div style={{textAlign: 'center', transform: `scale(${lerp(1.08, 1, fim)})`}}>
						<div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 210, lineHeight: 1, letterSpacing: 14, color: '#fff'}}>FIM</div>
						<div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 38, letterSpacing: 8, color: AMARELO, marginTop: 24}}>{linha.tituloSerie}</div>
					</div>
				</AbsoluteFill>
			) : null}
		</>
	);
};

export const Camada2D: React.FC<{linha: LinhaDoTempo; t: number; frame: number; fps: number; semVoz: boolean}> = ({linha, t, frame, fps, semVoz}) => {
	const {width, height} = useVideoConfig();
	const filme = !!linha.filme;
	const tela: Tela = {w: width, h: height, filme, k: filme ? 0.75 : 1};
	return (
		<AbsoluteFill>
			<Efeitos linha={linha} t={t} tela={tela} />
			<EfeitosDeProducao linha={linha} t={t} frame={frame} fps={fps} tela={tela} />
			<Rotulos linha={linha} t={t} frame={frame} fps={fps} tela={tela} />
			{filme ? <Capitulo linha={linha} t={t} frame={frame} fps={fps} /> : <Selo linha={linha} />}
			{semVoz ? <AvisoPrevia tela={tela} /> : null}
			<Cartoes linha={linha} t={t} frame={frame} fps={fps} tela={tela} />
			{filme && linha.filme?.semLegenda ? null : <Legenda linha={linha} t={t} frame={frame} fps={fps} tela={tela} />}
			{filme ? null : <Chamada linha={linha} t={t} frame={frame} fps={fps} />}
			<Transicao2D linha={linha} t={t} />
			{filme ? <MolduraFilme linha={linha} t={t} /> : null}
		</AbsoluteFill>
	);
};
