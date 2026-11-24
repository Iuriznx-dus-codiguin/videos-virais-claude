// Boneco palito: corpo de cápsulas, cabeça redonda com rosto expressivo e acessórios que
// identificam cada personagem (bandana, mochila, rabo de cavalo, lenço...).
import {RoundedBox} from '@react-three/drei';
import React from 'react';
import * as THREE from 'three';
import {MEDIDAS, Pose} from '../animacao/pose';
import {EstadoPalito, pernasDaPose} from '../animacao/simulacao';
import type {Acessorio, VisualPersonagem} from '../roteiro/tipos';
import {clamp} from '../util/mat';
import {Contorno, Malha, basico, brilho, caixa, capsula, cilindro, cone, esfera, geo, haloMat, toonPersonagem as toon, toro} from './base';
import {clima} from './luzes';

const RC = MEDIDAS.raioCabeca;
const PRETO = '#0D0D12';

/** Posição e rotação de um ponto (x, y) da frente da cabeça, encostado na esfera. */
const naEsfera = (x: number, y: number, afundar = 0.008): {position: [number, number, number]; rotation: [number, number, number]} => {
	const z = Math.sqrt(Math.max(RC * RC - x * x - y * y, 0)) - afundar;
	return {position: [x, y, z], rotation: [-Math.asin(y / RC), Math.atan2(x, z), 0]};
};

const q = (v: number, passo: number) => Math.round(v / passo) * passo;

/** Linha da boca fechada: arco sobre a superfície da cabeça (sorriso > 0, tristeza < 0). */
const linhaBoca = (largura: number, curva: number) => {
	const w = q(largura, 0.004);
	const c = q(curva, 0.04);
	return geo(`boca${w},${c}`, () => {
		const pts: THREE.Vector3[] = [];
		const n = 14;
		for (let i = 0; i <= n; i++) {
			const u = (i / n - 0.5) * w;
			const v = -0.15 - 0.032 * c * (1 - ((2 * u) / w) ** 2) + 0.012 * c;
			const z = Math.sqrt(Math.max(RC * RC - u * u - v * v, 0)) + 0.002;
			pts.push(new THREE.Vector3(u, v, z));
		}
		return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0125, 6, false);
	});
};

const TAM_OLHO: Record<string, [number, number]> = {
	redondos: [0.072, 0.095],
	ovais: [0.058, 0.106],
	sonolentos: [0.075, 0.068],
};

const Rosto: React.FC<{p: Pose; v: VisualPersonagem}> = ({p, v}) => {
	const preto = basico(PRETO);
	const [ow, oh] = TAM_OLHO[v.olhos ?? 'redondos'] ?? TAM_OLHO.redondos;
	const grossura = v.sobrancelhas === 'finas' ? 0.012 : 0.018;
	const sobBase = v.acessorios?.some((a) => a.tipo === 'rabo_de_cavalo' || a.tipo === 'cabelo_curto') ? 0.155 : 0.17;
	const curva = p.bocaCurva;
	const largura = 0.15 * p.bocaLarg;
	const abre = clamp(p.bocaAbre);
	return (
		<group position={[0, MEDIDAS.pescocoCabeca, 0]}>
			{[1, -1].map((lado) => {
				// lado 1 = olho esquerdo do personagem (+x)
				const assim = lado === -1 ? 1 - 0.5 * p.olhoAssim : 1;
				const sx = ow * p.olho;
				const sy = Math.max(0.004, oh * p.olho * p.olhoY * assim * p.palpebra);
				const cx = 0.14 * lado + 0.028 * p.pupX;
				const cy = 0.04 + 0.022 * p.pupY;
				const olho = naEsfera(cx, cy);
				const syb = sobBase + p.sobY + (lado === 1 ? 0.03 * p.sobAssim : -0.01 * p.sobAssim) + (p.palpebra < 0.5 ? -0.015 : 0);
				const sxb = 0.14 * lado;
				const szb = Math.sqrt(RC * RC - sxb * sxb - syb * syb) - 0.004;
				return (
					<React.Fragment key={lado}>
						<group {...olho}>
							<mesh geometry={esfera(1, 18, 12)} material={preto} scale={[sx, sy, 0.035]} />
							{/* brilho do olho: um grande em cima e um pequeno embaixo (olho "vivo") */}
							<mesh
								geometry={esfera(0.028, 12, 8)}
								material={basico('#FFFFFF')}
								position={[0.024 * p.olho, 0.034 * p.olho * p.olhoY, 0.03]}
								visible={p.palpebra > 0.55 && p.olhoY > 0.6}
							/>
							<mesh
								geometry={esfera(0.011, 8, 6)}
								material={basico('#FFFFFF')}
								position={[-0.022 * p.olho, -0.036 * p.olho * p.olhoY, 0.03]}
								visible={p.palpebra > 0.7 && p.olhoY > 0.75}
							/>
							{v.cilios
								? [0, 1].map((k) => (
										<mesh
											key={k}
											geometry={capsula(0.008, 0.045, 6)}
											material={preto}
											position={[lado * (sx * 0.75 + 0.012 * k), sy * 0.8 + 0.012, 0.01]}
											rotation={[0, 0, -lado * (0.6 + 0.35 * k)]}
										/>
									))
								: null}
						</group>
						{v.sobrancelhas === 'nenhuma' ? null : (
							<group position={[sxb, syb, szb]} rotation={[-Math.asin(syb / RC), Math.atan2(sxb, szb), Math.PI / 2 - lado * p.sobAng]}>
								<mesh geometry={capsula(grossura, 0.11, 8)} material={preto} />
							</group>
						)}
						{v.bochechas ? <mesh geometry={esfera(1, 14, 9)} material={toon(v.bochechas)} {...naEsfera(0.215 * lado, -0.08, 0.012)} scale={[0.06, 0.035, 0.02]} /> : null}
					</React.Fragment>
				);
			})}
			{/* boca: linha (sorriso/tristeza) e abertura escura por cima quando fala */}
			<mesh geometry={linhaBoca(largura, curva)} material={preto} visible={abre < 0.5} />
			{abre > 0.03 ? (
				<group {...naEsfera(0, -0.15 - 0.018 * curva + 0.006, 0.014)}>
					<mesh geometry={esfera(1, 18, 12)} material={basico('#2A0E14')} scale={[largura * 0.48 * (0.75 + 0.25 * abre), 0.012 + 0.065 * abre, 0.03]} />
					<mesh geometry={esfera(1, 14, 9)} material={basico('#C2464F')} position={[0, -(0.006 + 0.03 * abre), 0.012]} scale={[largura * 0.25, 0.006 + 0.022 * abre, 0.02]} visible={abre > 0.35} />
				</group>
			) : null}
		</group>
	);
};

const Bandana: React.FC<{cor: string; p: Pose}> = ({cor, p}) => (
	<group position={[0, MEDIDAS.pescocoCabeca, 0]}>
		<Malha g={toro(0.395, 0.052, 48, 10)} m={toon(cor)} position={[0, 0.17, 0]} rotation={[-0.18, 0, 0]} contorno={0.015} />
		{[1, -1].map((lado) => (
			<group key={lado} position={[0.05 * lado, 0.12, -0.39]} rotation={[0.35 + 0.35 * p.balanco, 0, 0.35 * lado + 0.08 * Math.sin(p.balanco * 9 + lado)]}>
				<Malha g={esfera(1, 12, 9)} m={toon(cor)} position={[0, -0.13, 0]} scale={[0.055, 0.15, 0.025]} contorno={0.012} />
			</group>
		))}
	</group>
);

/**
 * Capa do cabelo com a borda da frente recortada em mechas pontudas (franja desenhada), em vez de
 * uma linha reta de capacete; atrás e dos lados a borda desce um pouco mais.
 */
const capaCabelo = () =>
	geo('capaCabelo2', () => {
		const g = new THREE.SphereGeometry(RC * 1.05, 64, 18, 0, Math.PI * 2, 0, Math.PI * 0.34);
		const p = g.getAttribute('position') as THREE.BufferAttribute;
		const v = new THREE.Vector3();
		const R = RC * 1.05;
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i);
			const teta = Math.acos(Math.min(1, Math.max(-1, v.y / R)));
			const fi = Math.atan2(v.x, v.z); // 0 = testa
			// quanto da borda este vértice é (0 no alto, 1 na borda)
			const borda = Math.min(1, Math.max(0, (teta - Math.PI * 0.22) / (Math.PI * 0.12)));
			if (borda <= 0) continue;
			const frente = Math.max(0, Math.cos(fi));
			const dente = Math.abs(((fi / (Math.PI * 2)) * 18 + 0.5) % 1 - 0.5) * 2; // 0 na ponta, 1 no vão
			// na frente: pontas descem e vãos sobem; atrás: a borda desce para cobrir a nuca
			const novo = teta + borda * (Math.PI * (0.05 * (1 - frente) + frente * (0.045 - 0.075 * dente)));
			const r = Math.sqrt(v.x * v.x + v.z * v.z) || 1;
			const rr = R * Math.sin(novo);
			p.setXYZ(i, (v.x / r) * rr, R * Math.cos(novo), (v.z / r) * rr);
		}
		g.computeVertexNormals();
		return g;
	});
const nucaCabelo = () => geo('nucaCabelo', () => new THREE.SphereGeometry(RC * 1.05, 24, 14, Math.PI * 0.95, Math.PI * 1.1, Math.PI * 0.25, Math.PI * 0.5));

const RaboDeCavalo: React.FC<{cor: string; p: Pose}> = ({cor, p}) => {
	const m = toon(cor);
	return (
		<group position={[0, MEDIDAS.pescocoCabeca, 0]}>
			<Malha g={capaCabelo()} m={m} contorno={0.015} />
			<Malha g={nucaCabelo()} m={m} contorno={0.015} />
			{/* franja de lado */}
			{[
				[-0.12, 0.27, 0.27, 0.5],
				[0.04, 0.3, 0.28, -0.2],
				[0.17, 0.25, 0.27, -0.6],
			].map(([x, y, z, r], k) => (
				<Malha key={k} g={esfera(1, 12, 8)} m={m} position={[x, y, z]} rotation={[0.4, 0, r]} scale={[0.12, 0.06, 0.06]} contorno={0.012} />
			))}
			<group position={[0, 0.24, -0.36]} rotation={[0.55 + 0.4 * p.balanco, 0, 0.1 * Math.sin(p.balanco * 7)]}>
				<Malha g={toro(0.05, 0.022, 16, 8)} m={toon('#E63946')} rotation={[Math.PI / 2, 0, 0]} contorno={0.008} />
				<Malha g={esfera(1, 14, 10)} m={m} position={[0, -0.17, -0.03]} scale={[0.09, 0.2, 0.08]} contorno={0.014} />
				<Malha g={esfera(1, 12, 8)} m={m} position={[0, -0.36, -0.05]} rotation={[0.2, 0, 0]} scale={[0.065, 0.13, 0.06]} contorno={0.012} />
			</group>
		</group>
	);
};

const CabeloCurto: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.pescocoCabeca, 0]}>
		<Malha g={capaCabelo()} m={toon(cor)} contorno={0.015} />
		<Malha g={nucaCabelo()} m={toon(cor)} contorno={0.015} />
		{/* topete de lado: duas mechas por cima da testa */}
		{[
			[-0.1, 0.33, 0.22, 0.6, 0.13],
			[0.09, 0.35, 0.2, -0.35, 0.11],
		].map(([x, y, z, r, larg], k) => (
			<Malha key={k} g={esfera(1, 12, 8)} m={toon(cor)} position={[x, y, z]} rotation={[0.55, 0, r]} scale={[larg, 0.06, 0.08]} contorno={0.01} sombra={false} />
		))}
	</group>
);

/** Quepe de capitão: copa alta, aba preta e distintivo dourado. */
const Bone: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.pescocoCabeca, 0]} rotation={[-0.12, 0, 0]}>
		<Malha g={cilindro(RC * 1.05, RC * 1.12, 0.2, 28)} m={toon(cor)} position={[0, RC * 0.78, 0]} contorno={0.015} />
		<Malha g={cilindro(RC * 1.14, RC * 1.14, 0.045, 28)} m={toon('#F4F1EA')} position={[0, RC * 0.68, 0]} contorno={0.01} />
		<Malha g={esfera(1, 14, 8)} m={toon('#111218')} position={[0, RC * 0.62, RC * 0.82]} scale={[0.26, 0.02, 0.2]} contorno={0.01} />
		<Malha g={esfera(1, 10, 7)} m={toon('#E8B923')} position={[0, RC * 0.8, RC * 1.1]} scale={[0.05, 0.05, 0.015]} />
	</group>
);

/** Capuz de moletom: cobre o alto, a nuca e os lados da cabeça e deixa o rosto aberto (vulto, suspeito). */
const geoCapuz = geo('capuz', () => new THREE.SphereGeometry(RC * 1.13, 28, 16, Math.PI * 0.8, Math.PI * 1.4, 0, Math.PI * 0.68));
const Capuz: React.FC<{cor: string}> = ({cor}) => {
	const m = memoCapuz(cor);
	return (
		<group position={[0, MEDIDAS.pescocoCabeca + RC * 0.04, -RC * 0.05]}>
			<mesh geometry={geoCapuz} material={m} />
			<Malha g={toro(RC * 0.98, RC * 0.09, 32, 8, Math.PI * 1.2)} m={toon(cor)} position={[0, RC * 0.12, RC * 0.2]} rotation={[-0.35, 0, -Math.PI * 0.1]} contorno={0.012} />
		</group>
	);
};
const capuzes = new Map<string, THREE.Material>();
const memoCapuz = (cor: string) => {
	if (!capuzes.has(cor)) {
		const orig = toon(cor);
		const m = orig.clone();
		m.onBeforeCompile = orig.onBeforeCompile;
		m.customProgramCacheKey = orig.customProgramCacheKey;
		m.side = THREE.DoubleSide;
		capuzes.set(cor, m);
	}
	return capuzes.get(cor)!;
};

/** Colete refletivo de resgate: colete colorido com duas faixas claras. */
const Colete: React.FC<{cor: string}> = ({cor}) => (
	<>
		<Malha g={capsula(0.105, MEDIDAS.coluna * 0.72)} m={toon(cor)} position={[0, MEDIDAS.coluna * 0.5, 0]} contorno={0.016} />
		{[0.38, 0.62].map((k, i) => (
			<Malha key={i} g={cilindro(0.112, 0.112, 0.035, 16)} m={toon('#F2F4F7')} position={[0, MEDIDAS.coluna * k, 0]} />
		))}
	</>
);

const Lenco: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.coluna - 0.05, 0]}>
		<Malha g={toro(0.1, 0.045, 24, 8)} m={toon(cor)} rotation={[0.15, 0, 0]} contorno={0.012} />
		<Malha g={cone(0.09, 0.16, 3)} m={toon(cor)} position={[0, -0.09, 0.09]} rotation={[Math.PI + 0.35, 0, 0]} contorno={0.01} />
	</group>
);

const Mochila: React.FC<{cor: string}> = ({cor}) => (
	<>
		<RoundedBox args={[0.42, 0.5, 0.2]} radius={0.06} smoothness={3} position={[0, 0.62, -0.17]} material={toon(cor)} castShadow receiveShadow>
			<Contorno espessura={0.022} />
		</RoundedBox>
		<RoundedBox args={[0.44, 0.16, 0.22]} radius={0.05} smoothness={3} position={[0, 0.8, -0.17]} material={toon(escurecer(cor))} castShadow receiveShadow>
			<Contorno espessura={0.018} />
		</RoundedBox>
	</>
);

const domoCapacete = () => geo('domoCapacete', () => new THREE.SphereGeometry(RC * 1.1, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.5));

/** Capacete de obra: casco arredondado, aba larga e um friso no meio. */
const Capacete: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.pescocoCabeca + RC * 0.12, 0]} rotation={[-0.1, 0, 0]}>
		<Malha g={domoCapacete()} m={toon(cor)} contorno={0.015} />
		<Malha g={cilindro(RC * 1.32, RC * 1.32, 0.035, 32)} m={toon(cor)} position={[0, 0.01, 0.05]} contorno={0.012} />
		<Malha g={capsula(0.035, RC * 1.3, 8)} m={toon(escurecer(cor, 0.85))} position={[0, RC * 0.98, 0]} rotation={[Math.PI / 2, 0, 0]} contorno={0.008} />
	</group>
);

/** Cartola de inventor do século XIX. */
const Cartola: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.pescocoCabeca + RC * 0.72, 0]} rotation={[-0.08, 0, 0.06]}>
		<Malha g={cilindro(RC * 0.78, RC * 0.82, 0.5, 28)} m={toon(cor)} position={[0, 0.25, 0]} contorno={0.015} />
		<Malha g={cilindro(RC * 1.28, RC * 1.28, 0.035, 28)} m={toon(cor)} contorno={0.012} />
		<Malha g={cilindro(RC * 0.83, RC * 0.83, 0.07, 28)} m={toon('#8C2F39')} position={[0, 0.07, 0]} />
	</group>
);

/** Óculos redondos na frente dos olhos. */
const Oculos: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.pescocoCabeca, 0]}>
		{[1, -1].map((lado) => (
			<group key={lado} {...naEsfera(0.14 * lado, 0.04, -0.045)}>
				<mesh geometry={toro(0.085, 0.012, 32, 6)} material={toon(cor)} rotation={[Math.PI / 2, 0, 0]} />
			</group>
		))}
		<group {...naEsfera(0, 0.06, -0.05)}>
			<mesh geometry={capsula(0.01, 0.06, 6)} material={toon(cor)} rotation={[0, 0, Math.PI / 2]} />
		</group>
	</group>
);

/** Bigode farto, embaixo do nariz. */
const Bigode: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.pescocoCabeca, 0]}>
		{[1, -1].map((lado) => (
			<group key={lado} {...naEsfera(0.065 * lado, -0.085, -0.01)}>
				<mesh geometry={esfera(1, 14, 9)} material={toon(cor)} rotation={[0, 0, lado * 0.35]} scale={[0.08, 0.032, 0.03]} />
			</group>
		))}
	</group>
);

/** Curativo em cruz na bochecha (ferido sem sangue): duas tiras cor de pele clara. */
const Curativo: React.FC<{cor: string}> = ({cor}) => (
	<group position={[0, MEDIDAS.pescocoCabeca, 0]}>
		<group {...naEsfera(-0.22, -0.02, -0.004)}>
			<Malha g={caixa(0.16, 0.055, 0.012)} m={toon(cor)} rotation={[0, 0, 0.6]} contorno={0.006} sombra={false} />
			<Malha g={caixa(0.16, 0.055, 0.012)} m={toon(cor)} rotation={[0, 0, -0.6]} contorno={0.006} sombra={false} />
			<mesh geometry={caixa(0.045, 0.045, 0.016)} material={toon(escurecer(cor, 0.85))} />
		</group>
	</group>
);

/** Tala na canela: duas ripas de madeira dos lados e faixas brancas amarrando. */
const Tala: React.FC = () => (
	<>
		{[1, -1].map((l) => (
			<Malha key={l} g={caixa(0.03, MEDIDAS.canela * 0.9, 0.05)} m={toon('#B98A57')} position={[0.085 * l, -MEDIDAS.canela * 0.5, 0]} contorno={0.01} />
		))}
		{[0.22, 0.5, 0.78].map((k) => (
			<Malha key={k} g={cilindro(0.1, 0.1, 0.07, 14)} m={toon('#F2EFE8')} position={[0, -MEDIDAS.canela * k, 0]} contorno={0.01} />
		))}
	</>
);

const escurecer = (cor: string, k = 0.82) => '#' + new THREE.Color(cor).multiplyScalar(k).getHexString();

const AcessoriosCabeca: React.FC<{lista: Acessorio[]; p: Pose}> = ({lista, p}) => (
	<>
		{lista.map((a, i) => {
			const cor = a.cor ?? '#E63946';
			if (a.tipo === 'bandana') return <Bandana key={i} cor={cor} p={p} />;
			if (a.tipo === 'rabo_de_cavalo') return <RaboDeCavalo key={i} cor={cor} p={p} />;
			if (a.tipo === 'cabelo_curto') return <CabeloCurto key={i} cor={cor} />;
			if (a.tipo === 'bone') return <Bone key={i} cor={cor} />;
			if (a.tipo === 'capuz') return <Capuz key={i} cor={cor} />;
			if (a.tipo === 'capacete') return <Capacete key={i} cor={cor} />;
			if (a.tipo === 'cartola') return <Cartola key={i} cor={cor} />;
			if (a.tipo === 'oculos') return <Oculos key={i} cor={cor} />;
			if (a.tipo === 'bigode') return <Bigode key={i} cor={cor} />;
			if (a.tipo === 'curativo') return <Curativo key={i} cor={a.cor ?? '#FAF7F0'} />;
			return null;
		})}
	</>
);

const AcessoriosTronco: React.FC<{lista: Acessorio[]}> = ({lista}) => (
	<>
		{lista.map((a, i) => {
			const cor = a.cor ?? '#FFC233';
			if (a.tipo === 'mochila') return <Mochila key={i} cor={cor} />;
			if (a.tipo === 'lenco') return <Lenco key={i} cor={cor} />;
			if (a.tipo === 'colete') return <Colete key={i} cor={cor} />;
			return null;
		})}
	</>
);

/**
 * Roupa por cima do corpo palito (opcional na bíblia, `visual.roupa`): o tronco ganha volume e a
 * roupa ganha peças que identificam o personagem de longe. vestido (corpete e saia rodada), terno
 * (paletó com lapela, camisa e gravata), camisa (gola e botões, manga curta), jaleco (avental longo
 * de médico/cientista), uniforme (camisa com bolsos e cinto). `cor` é a roupa, `cor2` o detalhe
 * (gravata, faixa, cinto), `sapato` a cor do sapato.
 */
const Roupa: React.FC<{r: NonNullable<VisualPersonagem['roupa']>}> = ({r}) => {
	const C = MEDIDAS.coluna;
	const cor = r.cor ?? '#2B3550';
	const cor2 = r.cor2 ?? (r.tipo === 'terno' ? '#B3243A' : '#F4F1EA');
	const m = toon(cor);
	const tronco = r.tipo === 'vestido' ? 0.1 : 0.118;
	return (
		<>
			{/* tronco com volume (do quadril ao peito) */}
			<Malha g={capsula(tronco, C * 0.66, 14)} m={m} position={[0, C * 0.5, 0]} contorno={0.018} />
			{r.tipo === 'vestido' ? (
				<>
					{/* saia rodada até o joelho, com barra de outra cor */}
					<Malha g={cilindro(0.38, 0.13, 0.78, 22)} m={m} position={[0, -0.25, 0]} contorno={0.018} />
					<Malha g={cilindro(0.39, 0.385, 0.06, 22)} m={toon(cor2)} position={[0, -0.62, 0]} sombra={false} />
					<Malha g={toro(0.11, 0.025, 18, 6)} m={toon(cor2)} position={[0, C * 0.2, 0]} sombra={false} />
				</>
			) : null}
			{r.tipo === 'jaleco' ? <Malha g={cilindro(0.2, 0.13, 0.6, 18)} m={m} position={[0, -0.16, 0]} contorno={0.016} /> : null}
			{r.tipo === 'terno' || r.tipo === 'jaleco' ? (
				<>
					{/* camisa em V no peito, lapelas e (no terno) gravata */}
					<Malha g={cone(0.075, 0.3, 3)} m={toon('#F4F1EA')} position={[0, C * 0.8, 0.098]} rotation={[0.12 + Math.PI, 0, 0]} scale={[1, 1, 0.35]} sombra={false} />
					{[1, -1].map((l) => (
						<Malha key={l} g={caixa(0.045, 0.3, 0.02)} m={toon(escurecer(cor, 0.78))} position={[0.055 * l, C * 0.78, 0.112]} rotation={[0.1, 0, -0.32 * l]} sombra={false} />
					))}
					{r.tipo === 'terno' ? (
						<>
							<Malha g={caixa(0.04, 0.22, 0.02)} m={toon(cor2)} position={[0, C * 0.72, 0.118]} rotation={[0.08, 0, 0]} sombra={false} />
							<Malha g={cone(0.03, 0.05, 4)} m={toon(cor2)} position={[0, C * 0.6, 0.12]} rotation={[Math.PI, 0, 0]} sombra={false} />
						</>
					) : null}
				</>
			) : null}
			{r.tipo === 'camisa' || r.tipo === 'uniforme' ? (
				<>
					<Malha g={toro(0.085, 0.022, 18, 6)} m={toon(cor2)} position={[0, C * 0.95, 0.01]} rotation={[0.25, 0, 0]} sombra={false} />
					{[0.82, 0.68, 0.54].map((k) => (
						<mesh key={k} geometry={esfera(0.012, 6, 5)} material={toon(cor2)} position={[0, C * k, 0.12]} />
					))}
				</>
			) : null}
			{r.tipo === 'uniforme' ? (
				<>
					{[1, -1].map((l) => (
						<Malha key={l} g={caixa(0.07, 0.06, 0.02)} m={toon(escurecer(cor, 0.8))} position={[0.06 * l, C * 0.78, 0.112]} sombra={false} />
					))}
					<Malha g={cilindro(0.122, 0.122, 0.04, 16)} m={toon(r.cor2 ?? '#2A2A2A')} position={[0, C * 0.2, 0]} sombra={false} />
				</>
			) : null}
		</>
	);
};

/** Objeto na mão direita, alinhado ao antebraço (a ponta do antebraço fica em y = -0.44). */
const ObjetoNaMao: React.FC<{tipo: string; luz: number}> = ({tipo, luz}) => {
	if (tipo === 'lanca')
		return (
			<group position={[0, -0.44, 0]}>
				<Malha g={cilindro(0.03, 0.03, 2.6, 10)} m={toon('#8A5A3B')} position={[0, 0.4, 0]} contorno={0.012} />
				<Malha g={cone(0.07, 0.3, 6)} m={toon('#9AA0A8')} position={[0, 1.85, 0]} contorno={0.012} />
				<Malha g={toro(0.04, 0.018, 12, 6)} m={toon('#C9A66B')} position={[0, 1.66, 0]} contorno={0.006} />
			</group>
		);
	if (tipo === 'lanterna')
		return (
			<group position={[0, -0.47, 0.02]} rotation={[0, 0, 0]}>
				<Malha g={cilindro(0.055, 0.055, 0.3, 14)} m={toon('#3A3F4B')} position={[0, -0.04, 0]} contorno={0.012} />
				<Malha g={cilindro(0.085, 0.06, 0.1, 14)} m={toon('#C9CED6')} position={[0, -0.22, 0]} contorno={0.012} />
				<mesh geometry={esfera(1, 14, 8)} material={luz > 0.5 ? basico('#FFF6C8') : toon('#7A808A')} position={[0, -0.27, 0]} scale={[0.07, 0.02, 0.07]} />
			</group>
		);
	if (tipo === 'tocha')
		return (
			<group position={[0, -0.44, 0]}>
				<Malha g={cilindro(0.035, 0.045, 0.9, 10)} m={toon('#6B4226')} position={[0, 0.1, 0]} contorno={0.012} />
			</group>
		);
	// garrafa de água segura pelo meio, ao longo do antebraço
	if (tipo === 'garrafa')
		return (
			<group position={[0, -0.47, 0.03]}>
				<Malha g={cilindro(0.075, 0.075, 0.3, 16)} m={toon('#8FD3FF')} contorno={0.012} />
				<Malha g={cilindro(0.03, 0.07, 0.07, 14)} m={toon('#8FD3FF')} position={[0, -0.18, 0]} rotation={[Math.PI, 0, 0]} contorno={0.01} />
				<Malha g={cilindro(0.034, 0.034, 0.04, 12)} m={toon('#F4F6F8')} position={[0, -0.235, 0]} contorno={0.008} />
				<mesh geometry={cilindro(0.078, 0.078, 0.1, 16)} material={toon('#2E86DE')} position={[0, 0.02, 0]} />
			</group>
		);
	// feixe de galhos atravessado na mão
	if (tipo === 'galhos')
		return (
			<group position={[0, -0.46, 0.04]} rotation={[0, 0, Math.PI / 2]}>
				{[
					[0, 0, 0.95, 0.035],
					[0.05, 0.04, 0.8, 0.03],
					[-0.05, -0.03, 0.88, 0.028],
					[0.02, -0.06, 0.7, 0.025],
				].map(([dx, dz, comp, r], i) => (
					<Malha key={i} g={cilindro(r, r * 1.15, comp, 7)} m={toon(i % 2 ? '#5C3D27' : '#6E4A33')} position={[dx, 0.06 * i - 0.08, dz]} rotation={[0.08 * i, 0, 0.06 * (i - 1.5)]} contorno={0.01} />
				))}
			</group>
		);
	// isqueiro: chama pequena e luz quente quando aceso
	if (tipo === 'isqueiro')
		return (
			<group position={[0, -0.5, 0.04]}>
				<Malha g={caixa(0.07, 0.12, 0.04)} m={toon('#D7263D')} contorno={0.008} />
				<mesh geometry={caixa(0.072, 0.03, 0.042)} material={toon('#B8BEC8')} position={[0, -0.07, 0]} />
				{luz > 0.5 ? (
					<>
						<mesh geometry={esfera(1, 10, 8)} material={brilho('#FFB23A', 1.6)} position={[0, -0.13, 0.02]} scale={[0.03, 0.06, 0.03]} />
						<sprite material={haloMat('#FF9A3A', 0.6)} position={[0, -0.13, 0.03]} scale={[0.35, 0.35, 1]} />
						<pointLight position={[0, -0.15, 0.05]} color="#FF9A4A" intensity={1.6} distance={2.5} decay={2} />
					</>
				) : null}
			</group>
		);
	// rádio de emergência na mão: mostrador verde aceso enquanto ligado
	if (tipo === 'radio')
		return (
			<group position={[0, -0.52, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
				<Malha g={caixa(0.3, 0.2, 0.17)} m={toon('#4B5563')} contorno={0.014} />
				<mesh geometry={caixa(0.22, 0.07, 0.01)} material={luz > 0.5 ? brilho('#7CFFB2', 1.2) : toon('#26332C')} position={[-0.02, 0.03, 0.09]} />
				<Malha g={cilindro(0.008, 0.008, 0.45, 6)} m={toon('#9AA3AE')} position={[0.11, 0.3, -0.03]} sombra={false} />
				{luz > 0.5 ? <pointLight position={[0, 0.05, 0.3]} color="#7CFFB2" intensity={0.6} distance={1.5} decay={2} /> : null}
			</group>
		);
	if (tipo === 'pacote')
		return (
			<group position={[0, -0.5, 0.04]}>
				<Malha g={caixa(0.22, 0.14, 0.12)} m={toon('#F2A541')} contorno={0.012} />
				<mesh geometry={caixa(0.224, 0.04, 0.124)} material={toon('#C0392B')} />
			</group>
		);
	return null;
};

export const Boneco: React.FC<{e: EstadoPalito; nomeClima: string}> = ({e, nomeClima}) => {
	const p = e.pose;
	const v: VisualPersonagem = e.bib.visual ?? {corpo: '#22232A', cabeca: '#FFFFFF'};
	const corpo = toon(v.corpo);
	// rosto escuro (vulto, sombra) não recebe o reforço de luz do rosto, senão fica cinza claro
	const escuro = new THREE.Color(v.cabeca).getHSL({h: 0, s: 0, l: 0}).l < 0.18;
	const cabeca = toon(v.cabeca, escuro ? undefined : clima(nomeClima).reforcoRosto);
	const pernas = pernasDaPose(p);
	const acess = v.acessorios ?? [];
	// sapato um pouco mais escuro que o corpo (ou da cor pedida na roupa): o pé deixa de sumir no chão
	const sapato = toon(v.roupa?.sapato ?? escurecer(v.corpo, 0.55));
	const roupa = v.roupa;
	const manga = roupa && roupa.tipo !== 'vestido' ? toon(roupa.cor ?? '#2B3550') : null;
	return (
		<group position={[e.x, 0, e.z]} rotation={[0, e.yaw, 0]} scale={e.escala}>
			<group position={[p.lateral, p.altQuadril, p.avanco]}>
				<group rotation={[p.incl, p.torcer, p.rolar, 'XZY']}>
					<Malha g={capsula(0.075, MEDIDAS.coluna)} m={corpo} position={[0, MEDIDAS.coluna / 2, 0]} contorno={0.022} />
					{roupa ? <Roupa r={roupa} /> : null}
					<AcessoriosTronco lista={acess} />
					<group position={[0, MEDIDAS.coluna, 0]} rotation={[p.cabPitch, p.cabYaw, p.cabRoll, 'YXZ']}>
						<Malha g={esfera(RC, 32, 21)} m={cabeca} position={[0, MEDIDAS.pescocoCabeca, 0]} contorno={0.024} />
						<Rosto p={p} v={v} />
						<AcessoriosCabeca lista={acess} p={p} />
					</group>
					{([1, -1] as const).map((lado) => {
						const ombro = lado === 1 ? p.ombroE : p.ombroD;
						const abre = lado === 1 ? p.abreE : p.abreD;
						const giro = lado === 1 ? p.giroE : p.giroD;
						const cotov = lado === 1 ? p.cotovE : p.cotovD;
						return (
							<group key={lado} position={[MEDIDAS.ombroX * lado, MEDIDAS.ombroY, 0]} rotation={[-ombro, giro, lado * abre, 'XZY']}>
								<Malha g={capsula(0.062, MEDIDAS.braco)} m={corpo} position={[0, -MEDIDAS.braco / 2, 0]} contorno={0.02} />
								{manga ? <Malha g={capsula(0.082, MEDIDAS.braco * (roupa?.tipo === 'camisa' ? 0.45 : 0.92))} m={manga} position={[0, -MEDIDAS.braco * (roupa?.tipo === 'camisa' ? 0.24 : 0.48), 0]} contorno={0.016} /> : null}
								<group position={[0, -MEDIDAS.braco, 0]} rotation={[-cotov, 0, 0]}>
									<Malha g={capsula(0.058, 0.42)} m={corpo} position={[0, -0.21, 0]} contorno={0.02} />
									{manga && roupa?.tipo !== 'camisa' ? <Malha g={capsula(0.077, 0.3)} m={manga} position={[0, -0.15, 0]} contorno={0.016} /> : null}
									<Malha g={esfera(0.085, 14, 9)} m={corpo} position={[0, -MEDIDAS.antebraco, 0]} contorno={0.02} />
									{lado === -1 && e.segura ? <ObjetoNaMao tipo={e.segura} luz={e.luz} /> : null}
								</group>
							</group>
						);
					})}
				</group>
				{([1, -1] as const).map((lado) => {
					const ang = lado === 1 ? pernas.E : pernas.D;
					return (
						<group key={lado} position={[MEDIDAS.quadrilX * lado, 0, 0]} rotation={[-ang.coxa, 0, lado * p.abrePernas]}>
							<Malha g={capsula(0.068, MEDIDAS.coxa)} m={corpo} position={[0, -MEDIDAS.coxa / 2, 0]} contorno={0.02} />
							<group position={[0, -MEDIDAS.coxa, 0]} rotation={[ang.joelho, 0, 0]}>
								<Malha g={capsula(0.064, MEDIDAS.canela)} m={corpo} position={[0, -MEDIDAS.canela / 2, 0]} contorno={0.02} />
								{acess.some((a) => a.tipo === 'tala' && (a.lado === 'E' ? 1 : -1) === lado) ? <Tala /> : null}
								<group position={[0, -MEDIDAS.canela, 0]} rotation={[ang.coxa - ang.joelho, 0, -lado * p.abrePernas]}>
									<Malha g={esfera(1, 14, 9)} m={sapato} position={[0, 0.005, 0.06]} scale={[0.085, 0.07, 0.16]} contorno={0.02} />
								</group>
							</group>
						</group>
					);
				})}
			</group>
		</group>
	);
};
