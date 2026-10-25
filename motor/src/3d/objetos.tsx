// Objetos de cena que o roteiro pode colocar: SOS de pedras, trilha de pegadas gigantes,
// fogueira (chamas, brasas ou apagada), tronco caído, riscos na parede e caixote.
import React from 'react';
import {CENARIOS} from '../catalogo';
import type {Objeto} from '../roteiro/tipos';
import {V2, V3, aleatorio} from '../util/mat';
import {AviaoCaindo, Destrocos, Malas} from './aviao';
import {Barco, Farol, LanternasMata} from './ilha';
import {Malha, brilho, caixa, cilindro, cone, decalque, disco, esfera, fumacaMat, haloMat, ico, toon, toro, translucido} from './base';

const posicaoObjeto = (o: Objeto, cenario: string): V2 =>
	Array.isArray(o.em) ? (o.em as V2) : (CENARIOS[cenario]?.marcas[o.em] ?? [0, 0]);

// --- SOS ---------------------------------------------------------------------------------

/** Pontos dos traços de cada letra num quadro 1 x 1.4 (u para a direita, v para cima). */
const tracos = (letra: string): [number, number][] => {
	const pts: [number, number][] = [];
	const arco = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number) => {
		for (let i = 0; i <= n; i++) {
			const a = a0 + ((a1 - a0) * i) / n;
			pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
		}
	};
	if (letra === 'O') arco(0.5, 0.7, 0.46, 0.66, 0, Math.PI * 2 * (11 / 12), 11);
	else {
		arco(0.5, 1.03, 0.4, 0.34, 0.35, Math.PI * 1.5, 6);
		arco(0.5, 0.37, 0.4, 0.34, Math.PI * 0.5, -Math.PI * 0.65, 6);
	}
	return pts;
};

const Sos: React.FC<{x: number; z: number; escala: number}> = React.memo(({x, z, escala}) => {
	const r = aleatorio(91);
	const pedras: {px: number; pz: number; s: number; g: number}[] = [];
	['S', 'O', 'S'].forEach((l, i) => {
		for (const [u, v] of tracos(l)) {
			// v para cima na leitura = -z no mundo (quem lê está do lado do mar, em +z)
			pedras.push({px: x + (i - 1) * 1.75 * escala + (u - 0.5) * 1.3 * escala, pz: z - (v - 0.7) * 1.3 * escala, s: 0.15 + r() * 0.07, g: r() * 6});
		}
	});
	return (
		<>
			{pedras.map((p, i) => (
				<Malha key={i} g={ico(1, 0)} m={toon(i % 3 ? '#9A97A6' : '#7E7B8C')} position={[p.px, p.s * 0.25, p.pz]} scale={[p.s, p.s * 0.6, p.s * 0.85]} rotation={[0, p.g, 0]} contorno={0.03} />
			))}
		</>
	);
});

// --- pegadas gigantes --------------------------------------------------------------------

/** Pegadas [x, z, yaw] ao longo da trilha de `de` até `ate`, alternando os pés. */
export const trilhaPegadas = (de: V2, ate: V2, passo = 1.75, lado = 0.5): [number, number, number][] => {
	const dx = ate[0] - de[0];
	const dz = ate[1] - de[1];
	const comp = Math.hypot(dx, dz);
	const ux = dx / comp;
	const uz = dz / comp;
	const yaw = Math.atan2(ux, uz);
	const res: [number, number, number][] = [];
	for (let i = 0; i < Math.floor(comp / passo) + 1; i++) {
		const l = lado * (i % 2 ? 1 : -1);
		res.push([de[0] + ux * passo * i - uz * l, de[1] + uz * passo * i + ux * l, yaw]);
	}
	return res;
};

// Pegada de três dedos: calcanhar pequeno, dedos longos abertos em leque e marca de garra na
// ponta. O miolo mais escuro dá a ideia de afundado na areia.
const COR_PEGADA = '#C69862';
const COR_FUNDO = '#AE8150';
const COR_GARRA = '#86613B';
const DEDOS: [number, number][] = [
	[-0.5, 0.6],
	[0, 0.78],
	[0.5, 0.6],
];

const Pegada: React.FC = React.memo(() => (
	<>
		<mesh geometry={disco(1)} material={decalque(COR_PEGADA)} scale={[0.36, 1, 0.4]} receiveShadow />
		<mesh geometry={disco(1)} material={decalque(COR_FUNDO)} position={[0, 0.001, 0.03]} scale={[0.25, 1, 0.28]} receiveShadow />
		{DEDOS.map(([ang, comp], j) => (
			<group key={j} rotation={[0, ang, 0]}>
				<mesh geometry={disco(1)} material={decalque(COR_PEGADA)} position={[0, 0, 0.22 + comp / 2]} scale={[0.16, 1, comp / 2 + 0.07]} receiveShadow />
				<mesh geometry={disco(1)} material={decalque(COR_FUNDO)} position={[0, 0.001, 0.22 + comp / 2]} scale={[0.095, 1, comp / 2 - 0.02]} receiveShadow />
				<mesh geometry={disco(1, 16)} material={decalque(COR_GARRA)} position={[0, 0.002, 0.3 + comp + 0.08]} scale={[0.05, 1, 0.15]} receiveShadow />
			</group>
		))}
	</>
));

const Pegadas: React.FC<{de: V2; ate: V2; passo: number; escala: number}> = React.memo(({de, ate, passo, escala}) => (
	<>
		{trilhaPegadas(de, ate, passo).map(([x, z, yaw], i) => (
			<group key={i} position={[x, 0.012, z]} rotation={[0, yaw, 0]} scale={[escala, 1, escala]}>
				<Pegada />
			</group>
		))}
	</>
));

// --- fogueira --------------------------------------------------------------------------

const PedrasFogueira: React.FC = React.memo(() => (
	<>
		{Array.from({length: 9}, (_, i) => {
			const a = (i / 9) * Math.PI * 2;
			return <Malha key={i} g={ico(0.16, 0)} m={toon(i % 2 ? '#7E7B8C' : '#6A6878')} position={[Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55]} scale={[1, 0.65, 0.9]} rotation={[0, a * 2, 0]} contorno={0.025} />;
		})}
		{[0.3, 1.9, 3.4].map((a, i) => (
			<Malha key={i} g={cilindro(0.06, 0.07, 0.95, 8)} m={toon(i === 1 ? '#3B2A20' : '#4A3426')} position={[0, 0.12, 0]} rotation={[Math.PI / 2 - 0.25, a, 0]} contorno={0.02} />
		))}
	</>
));

const Fogueira: React.FC<{x: number; z: number; fogo: string; t: number}> = ({x, z, fogo, t}) => {
	const chamas = fogo === 'chamas';
	const brasas = fogo !== 'apagada';
	const tremula = 0.82 + 0.12 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.1 + 1);
	return (
		<group position={[x, 0, z]}>
			<PedrasFogueira />
			{brasas
				? [
						[0.1, 0.08, 0.05, 0.11],
						[-0.12, 0.07, -0.08, 0.09],
						[0.02, 0.1, -0.15, 0.08],
						[-0.05, 0.08, 0.14, 0.07],
					].map(([bx, by, bz, r], i) => (
						<mesh key={i} geometry={esfera(1, 10, 7)} material={brilho(i % 2 ? '#FF5A1F' : '#FF8A2A', chamas ? 1.4 : 0.9 + 0.25 * Math.sin(t * 3 + i))} position={[bx, by, bz]} scale={[r, r * 0.6, r]} />
					))
				: null}
			{chamas
				? [0, 1, 2].map((i) => {
						const s = (0.75 + 0.25 * Math.sin(t * (9 + i * 2.3) + i)) * (i === 0 ? 1 : 0.7);
						return (
							<mesh key={i} geometry={cone(0.2, 0.7, 8)} material={brilho(i === 0 ? '#FFB23A' : '#FF6A1F', 1.3)} position={[(i - 1) * 0.12, 0.35 * s + 0.1, 0]} scale={[s, s, s]} />
						);
					})
				: null}
			{/* fumaça: tufos macios que sobem, crescem e somem */}
			{brasas
				? Array.from({length: 7}, (_, i) => {
						const ciclo = 3.6;
						const fase = ((t + i * (ciclo / 7)) % ciclo) / ciclo;
						const y = 0.35 + fase * 2.4;
						const tam = 0.35 + fase * 1.1;
						const desvio = Math.sin(fase * 4 + i) * 0.2 + fase * 0.35;
						const op = Math.sin(Math.PI * fase) ** 1.5 * (chamas ? 0.16 : 0.24);
						return <sprite key={i} material={fumacaMat('#A9A3B6', Math.round(op * 40) / 40)} position={[desvio, y, -fase * 0.2]} scale={[tam, tam, 1]} />;
					})
				: null}
			{brasas ? (
				<>
					<pointLight position={[0, 0.5, 0]} color={chamas ? '#FF9A4A' : '#FF6A2A'} intensity={(chamas ? 9 : 3.2) * tremula} distance={chamas ? 9 : 4.5} decay={2} />
					<sprite material={haloMat('#FF7A2A', chamas ? 0.55 : 0.35)} position={[0, 0.2, 0]} scale={chamas ? [2.2, 2.2, 1] : [1.1, 1.1, 1]} />
				</>
			) : null}
		</group>
	);
};

// --- outros ---------------------------------------------------------------------------------

const Tronco: React.FC<{x: number; z: number; giro: number}> = React.memo(({x, z, giro}) => (
	<group position={[x, 0.32, z]} rotation={[0, giro, Math.PI / 2]}>
		<Malha g={cilindro(0.32, 0.36, 3.2, 14)} m={toon('#6E4A33')} contorno={0.035} />
		<mesh geometry={cilindro(0.3, 0.3, 0.02, 14)} material={toon('#C9A27A')} position={[0, 1.61, 0]} />
		<mesh geometry={cilindro(0.34, 0.34, 0.02, 14)} material={toon('#C9A27A')} position={[0, -1.61, 0]} />
		<Malha g={cilindro(0.08, 0.1, 0.7, 8)} m={toon('#6E4A33')} position={[0.25, 0.5, 0.2]} rotation={[0.9, 0, 0.5]} contorno={0.02} />
	</group>
));

/** Riscos de contagem (grupos de 5) cobrindo a parede, até `quantos`. */
const Riscos: React.FC<{x: number; z: number; quantos: number}> = React.memo(({x, z, quantos}) => {
	const r = aleatorio(7);
	const grupos = Math.ceil(quantos / 5);
	const cols = 9;
	const marcas: React.ReactNode[] = [];
	for (let g = 0; g < grupos && g < 81; g++) {
		const col = g % cols;
		const lin = Math.floor(g / cols);
		const gx = x - 1.45 + col * 0.36 + (r() - 0.5) * 0.06;
		const gy = 2.35 - lin * 0.24 + (r() - 0.5) * 0.04;
		const n = Math.min(5, quantos - g * 5);
		for (let i = 0; i < Math.min(n, 4); i++) {
			marcas.push(<mesh key={`${g}-${i}`} geometry={caixa(0.018, 0.16, 0.01)} material={toon('#2A1C14')} position={[gx + i * 0.045, gy, z + 0.02]} rotation={[0, 0, (r() - 0.5) * 0.12]} />);
		}
		if (n === 5) marcas.push(<mesh key={`${g}-x`} geometry={caixa(0.016, 0.22, 0.01)} material={toon('#2A1C14')} position={[gx + 0.068, gy, z + 0.022]} rotation={[0, 0, 1.1]} />);
	}
	return <>{marcas}</>;
});

const Caixote: React.FC<{x: number; z: number; giro: number}> = React.memo(({x, z, giro}) => (
	<group position={[x, 0.4, z]} rotation={[0, giro, 0]}>
		<Malha g={caixa(0.8, 0.8, 0.8)} m={toon('#A0703F')} contorno={0.03} />
		{[-0.25, 0, 0.25].map((y, i) => (
			<mesh key={i} geometry={caixa(0.82, 0.04, 0.82)} material={toon('#7A5230')} position={[0, y, 0]} />
		))}
	</group>
));

/** Rádio de emergência salvo da cabine: caixa metálica com mostrador, botões e luz que pisca. */
const Radio: React.FC<{x: number; z: number; giro: number; t: number; ligado: boolean}> = ({x, z, giro, t, ligado}) => (
	<group position={[x, 0, z]} rotation={[0, giro, 0]}>
		<Malha g={caixa(0.62, 0.42, 0.34)} m={toon('#4B5563')} position={[0, 0.21, 0]} contorno={0.025} />
		<Malha g={caixa(0.5, 0.2, 0.02)} m={toon('#1B2530')} position={[-0.03, 0.27, 0.175]} />
		<mesh geometry={caixa(0.44, 0.12, 0.01)} material={ligado ? brilho('#7CFFB2', 1.1 + 0.2 * Math.sin(t * 40)) : toon('#26332C')} position={[-0.03, 0.27, 0.19]} />
		{[-0.2, -0.05, 0.1].map((px, i) => (
			<Malha key={i} g={cilindro(0.035, 0.035, 0.04, 12)} m={toon('#D9DEE5')} position={[px, 0.1, 0.175]} rotation={[Math.PI / 2, 0, 0]} contorno={0.01} />
		))}
		<mesh geometry={esfera(0.025, 10, 7)} material={ligado && Math.sin(t * 6) > 0 ? brilho('#FF3B30', 1.6) : toon('#5A1A16')} position={[0.23, 0.1, 0.18]} />
		<Malha g={cilindro(0.01, 0.01, 0.9, 6)} m={toon('#9AA3AE')} position={[0.22, 0.85, -0.05]} rotation={[0.05, 0, -0.08]} sombra={false} />
		{ligado ? <pointLight position={[0, 0.3, 0.5]} color="#7CFFB2" intensity={0.9} distance={2.2} decay={2} /> : null}
	</group>
);

/** Lista de passageiros (manifesto) numa prancheta: nomes riscados de laranja e um circulado de vermelho. */
const Prancheta: React.FC<{x: number; z: number; giro: number; alt: number; deitada: boolean; escala: number}> = React.memo(({x, z, giro, alt, deitada, escala}) => (
	<group position={[x, alt, z]} rotation={[deitada ? -Math.PI / 2 : 0, giro, 0, 'YXZ']} scale={0.8 * escala}>
		<Malha g={caixa(0.3, 0.42, 0.02)} m={toon('#6B4A2E')} position={[0, 0.21, 0]} contorno={0.012} />
		<Malha g={caixa(0.26, 0.37, 0.006)} m={toon('#F4F1E8')} position={[0, 0.205, 0.014]} sombra={false} />
		<Malha g={caixa(0.09, 0.03, 0.02)} m={toon('#9AA3AE')} position={[0, 0.425, 0.012]} sombra={false} />
		{Array.from({length: 10}, (_, i) => {
			const y = 0.355 - i * 0.032;
			const alvo = i === 6;
			return (
				<React.Fragment key={i}>
					<mesh geometry={caixa(0.19, 0.008, 0.002)} material={toon('#2B2F3A')} position={[0, y, 0.019]} />
					{!alvo ? <mesh geometry={caixa(0.22, 0.012, 0.002)} material={brilho('#FF8A1F', 0.9)} position={[0, y, 0.021]} rotation={[0, 0, i % 2 ? 0.03 : -0.03]} /> : null}
				</React.Fragment>
			);
		})}
		<mesh geometry={toro(0.075, 0.006, 24, 8)} material={brilho('#E5252A', 1)} position={[0, 0.355 - 6 * 0.032, 0.022]} scale={[1.55, 0.5, 1]} />
	</group>
));

export const Objetos: React.FC<{lista: Objeto[]; cenario: string; t: number}> = ({lista, cenario, t}) => (
	<>
		{lista.map((o, i) => {
			const [x, z] = posicaoObjeto(o, cenario);
			const giro = ((o.giro ?? 0) * Math.PI) / 180;
			const esc = o.escala ?? 1;
			switch (o.tipo) {
				case 'sos':
					return <Sos key={i} x={x} z={z} escala={esc} />;
				case 'pegadas_gigantes':
					return <Pegadas key={i} de={[x, z]} ate={(o.ate as V2) ?? [x, z - 10]} passo={(o.passo as number) ?? 1.75} escala={1.6 * esc} />;
				case 'fogueira':
					return <Fogueira key={i} x={x} z={z} fogo={(o.fogo as string) ?? 'chamas'} t={t} />;
				case 'tronco':
					return <Tronco key={i} x={x} z={z} giro={giro} />;
				case 'riscos':
					return <Riscos key={i} x={x} z={z} quantos={(o.quantos as number) ?? 100} />;
				case 'caixote':
					return <Caixote key={i} x={x} z={z} giro={giro} />;
				case 'destrocos':
					return <Destrocos key={i} x={x} z={z} giro={giro} escala={esc} t={t} />;
				case 'malas':
					return <Malas key={i} x={x} z={z} quantas={(o.quantas as number) ?? 8} raio={(o.raio as number) ?? 5} semente={(o.semente as number) ?? 3} />;
				case 'radio':
					return <Radio key={i} x={x} z={z} giro={giro} t={t} ligado={o.ligado !== false} />;
				case 'lanternas_mata':
					return <LanternasMata key={i} x={x} z={z} giro={giro} t={t} quantas={(o.quantas as number) ?? 3} largura={(o.largura as number) ?? 8} vultos={o.vultos !== false} />;
				case 'farol':
					return <Farol key={i} x={x} z={z} alt={(o.alt as number) ?? 0} giro={giro} escala={esc} t={t} modo={(o.modo as string) ?? 'gira'} />;
				case 'barco':
					return <Barco key={i} x={x} z={z} alt={(o.alt as number) ?? 0} giro={giro} escala={esc} t={t} luzes={o.luzes !== false} caixas={o.caixas !== false} />;
				case 'prancheta':
					return <Prancheta key={i} x={x} z={z} giro={giro} alt={(o.alt as number) ?? 0.46} deitada={o.deitada !== false} escala={esc} />;
				case 'aviao':
					return (
						<AviaoCaindo
							key={i}
							de={(o.de_ponto as V3) ?? [-60, 70, -120]}
							ate={(o.ate_ponto as V3) ?? [20, 2, 40]}
							ini={(o._ini as number) ?? 0}
							fim={(o._fim as number) ?? 4}
							t={t}
							fogo={o.fogo !== false}
						/>
					);
				default:
					return null;
			}
		})}
	</>
);

