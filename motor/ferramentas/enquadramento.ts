// Confere o enquadramento sem renderizar: a cada instante calcula a câmera e onde a cabeça de
// cada boneco cai na tela 9:16, e avisa o que costuma sair "bugado" no vídeo: cabeça cortada na
// borda, nuca virada para a câmera em quem fala ou domina o quadro, rosto tampado pela cabeça
// de outro boneco e câmera dentro de alguém. Objetos, bancos e braços não entram na conta (uma
// cabeça escondida atrás de um encosto ainda aparece como cortada): confira os quadros
// (npm run quadro) dos planos que o relatório apontar.
// Uso: npm run enquadramento -- <serie> <parte> [--passo=0.2]
import {cameraNoTempo, type Camera} from '../src/animacao/camera.ts';
import {MEDIDAS} from '../src/animacao/pose.ts';
import {cabecaMundo, matrizTronco} from '../src/animacao/rig.ts';
import {cenaNoTempo, simulacao} from '../src/animacao/simulacao.ts';
import type {LinhaDoTempo} from '../src/roteiro/tipos.ts';
import {norm3, sub3, type V3} from '../src/util/mat.ts';
import {carregarEpisodio} from './validar.ts';

const ASPECTO = 9 / 16;
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export interface CabecaNaTela {
	id: string;
	/** centro na tela: -1 (esquerda/baixo) a 1 (direita/cima) */
	x: number;
	y: number;
	/** raio na tela, em frações da meia largura e da meia altura */
	rx: number;
	ry: number;
	/** distância até a câmera, na direção do olhar */
	z: number;
	/** ângulo entre para onde o rosto aponta e a câmera: 0 = de frente, 180 = de nuca */
	angulo: number;
	/** quanto do diâmetro passa de cada borda (0 a 1) */
	fora: {esquerda: number; direita: number; cima: number; baixo: number};
	dentro: boolean;
	centro: V3;
	raio: number;
	/** rosto apontando para baixo com a câmera por cima: a tela mostra o topo da cabeça */
	deCima: boolean;
}

/** Projeta a cabeça de cada boneco da cena na tela da câmera. */
export const cabecasNaTela = (linha: LinhaDoTempo, t: number) => {
	const cena = cenaNoTempo(linha, t);
	const sim = simulacao(linha, cena);
	const cam: Camera = cameraNoTempo(cena, sim, t);
	const f = norm3(sub3(cam.alvo, cam.pos));
	const r = norm3(cross(f, [0, 1, 0]));
	const u = cross(r, f);
	const tg = Math.tan((cam.fov * Math.PI) / 360);
	const cabecas: CabecaNaTela[] = [];
	for (const id of Object.keys(cena.personagens)) {
		const e = sim.estado(id, t, cam.pos);
		if (!e || e.tipo !== 'palito') continue;
		// cabeça na pose completa (com gestos e a cabeça virada), como o vídeo desenha
		const {centro: c, frente} = cabecaMundo(matrizTronco(e.x, e.z, e.yaw, e.escala, e.pose), e.pose);
		const d = sub3(c, cam.pos);
		const z = dot(d, f);
		const raio = MEDIDAS.raioCabeca * e.escala;
		const ry = raio / (Math.max(z, 1e-3) * tg);
		const rx = ry / ASPECTO;
		const x = dot(d, r) / (Math.max(z, 1e-3) * tg * ASPECTO);
		const y = dot(d, u) / (Math.max(z, 1e-3) * tg);
		const paraCamera = norm3(sub3(cam.pos, c));
		const angulo = (Math.acos(Math.max(-1, Math.min(1, dot(frente, paraCamera)))) * 180) / Math.PI;
		const fora = {
			esquerda: Math.min(1, Math.max(0, -1 - (x - rx)) / (2 * rx)),
			direita: Math.min(1, Math.max(0, x + rx - 1) / (2 * rx)),
			cima: Math.min(1, Math.max(0, y + ry - 1) / (2 * ry)),
			baixo: Math.min(1, Math.max(0, -1 - (y - ry)) / (2 * ry)),
		};
		const dentro = z > raio && Math.max(fora.esquerda, fora.direita, fora.cima, fora.baixo) < 1;
		const deCima = frente[1] < -0.3 && paraCamera[1] > 0.15 && angulo > 55;
		cabecas.push({id, x, y, rx, ry, z, angulo, fora, dentro, centro: c, raio, deCima});
	}
	return {cena, cam, cabecas, sim};
};

/** Problemas de enquadramento num instante, em frases curtas. */
export const problemasNoInstante = (linha: LinhaDoTempo, t: number): string[] => {
	const {cena, cam, cabecas} = cabecasNaTela(linha, t);
	const plano = cena.planos.find((p) => t >= p.ini && t < p.fim) ?? cena.planos[0];
	const fala = linha.falas.find((fl) => t >= fl.ini && t < fl.fim && !fl.off);
	const visiveis = cabecas.filter((c) => c.dentro);
	const maior = visiveis.reduce<CabecaNaTela | null>((m, c) => (!m || c.ry > m.ry ? c : m), null);
	const problemas: string[] = [];
	for (const c of cabecas) {
		if (Math.hypot(...sub3(c.centro, cam.pos)) < c.raio * 1.15) {
			problemas.push(`câmera dentro da cabeça de ${c.id}`);
			continue;
		}
		if (!c.dentro || c.ry < 0.06) continue;
		const lados = (['esquerda', 'direita'] as const).filter((l) => c.fora[l] > 0.12);
		const topo = c.fora.cima > 0.3 ? ['de cima'] : [];
		const baixo = c.fora.baixo > 0.3 ? ['de baixo'] : [];
		const cortes = [...lados.map((l) => `na borda ${l}`), ...topo, ...baixo];
		if (cortes.length) problemas.push(`cabeça de ${c.id} cortada ${cortes.join(' e ')}`);
		const destaque = c === maior && c.ry > 0.15;
		const falando = fala?.quem === c.id && c.ry > 0.08;
		const assunto = plano?.alvo === c.id && (plano.tipo === 'close' || plano.tipo === 'medio');
		if (c.angulo > 110 && (destaque || falando || assunto)) problemas.push(`${c.id} de nuca para a câmera${falando ? ' enquanto fala' : ''}`);
		else if (c.deCima && (destaque || falando || assunto)) problemas.push(`câmera vê o topo da cabeça de ${c.id} (rosto para baixo)${falando ? ' enquanto fala' : ''}`);
		// cabeça de outro boneco na frente do rosto
		for (const o of visiveis) {
			if (o === c || o.z >= c.z || !(destaque || falando || assunto)) continue;
			const d = Math.hypot((o.x - c.x) * ASPECTO, o.y - c.y);
			if (d < o.ry + c.ry * 0.5) problemas.push(`rosto de ${c.id} tampado pela cabeça de ${o.id}`);
		}
	}
	return problemas;
};

/** Varre o episódio e junta os instantes seguidos com o mesmo problema em trechos. */
export const conferirEnquadramento = (linha: LinhaDoTempo, passo = 0.2) => {
	const abertos = new Map<string, {de: number; ate: number; cena: string}>();
	const trechos: {de: number; ate: number; cena: string; problema: string}[] = [];
	const fechar = (chave: string) => {
		const a = abertos.get(chave)!;
		trechos.push({...a, problema: chave.split('|')[1]});
		abertos.delete(chave);
	};
	for (let t = 0; t < linha.duracao; t += passo) {
		const cena = cenaNoTempo(linha, t);
		const atuais = new Set(problemasNoInstante(linha, t).map((p) => `${cena.id}|${p}`));
		for (const chave of [...abertos.keys()]) if (!atuais.has(chave)) fechar(chave);
		for (const chave of atuais) {
			const a = abertos.get(chave);
			if (a) a.ate = t + passo;
			else abertos.set(chave, {de: t, ate: t + passo, cena: cena.id});
		}
	}
	for (const chave of [...abertos.keys()]) fechar(chave);
	// trecho de um instante só costuma ser o corte entre planos: some no vídeo
	return trechos.filter((tr) => tr.ate - tr.de > passo * 1.5).sort((a, b) => a.de - b.de);
};

const main = () => {
	const args = process.argv.slice(2);
	const opcoes = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
	const [serie, parte] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !parte) {
		console.error('uso: npm run enquadramento -- <serie> <parte> [--passo=0.2]');
		process.exit(2);
	}
	const {linha} = carregarEpisodio(serie, Number(parte));
	const trechos = conferirEnquadramento(linha, Number(opcoes.passo ?? 0.2));
	if (!trechos.length) {
		console.log('enquadramento sem problemas');
		return;
	}
	for (const tr of trechos) console.log(`${tr.de.toFixed(1).padStart(5)}s a ${tr.ate.toFixed(1).padStart(5)}s  cena ${tr.cena}: ${tr.problema}`);
	console.log(`\n${trechos.length} trecho(s) para conferir com npm run quadro e corrigir antes do render`);
	process.exit(1);
};

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
