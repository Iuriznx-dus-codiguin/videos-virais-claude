// Ponte entre o TypeScript e o OmniVoice (voz/gerar.py), mais os ajustes de áudio com ffmpeg.
import {execFile, spawn} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {MOTOR} from './caminhos.ts';

const exec = promisify(execFile);

/** SHORTS_VOZ_PY e SHORTS_VOZ_SCRIPT trocam o motor de voz (os testes usam um falso). */
const python = () => process.env.SHORTS_VOZ_PY ?? join(MOTOR, 'voz', '.venv', 'bin', 'python');
/** Caminho com barra precisa existir; nome solto (python3) é procurado no PATH. */
const instalado = () => !python().includes('/') || existsSync(python());
const script = () => process.env.SHORTS_VOZ_SCRIPT ?? join(MOTOR, 'voz', 'gerar.py');
const scriptConferir = () => process.env.SHORTS_ASR_SCRIPT ?? join(MOTOR, 'voz', 'conferir.py');

export const DICA_VOZ = 'rode "bash voz/instalar.sh" (dentro de motor/); ele precisa dos domínios huggingface.co, *.hf.co e download.pytorch.org e download-r2.pytorch.org liberados no ambiente de nuvem (Passo 0 do guia)';

export interface TarefaGerar {
	id: string;
	saida: string;
	texto: string;
	/** arquivo .pt da voz do personagem */
	voz?: string;
	/** descrição da voz (só para criar candidatas) */
	instruct?: string;
	velocidade?: number;
	semente?: number;
}

export interface TarefaPrompt {
	id: string;
	audio: string;
	texto: string;
	saida: string;
}

export interface Resultado {
	id: string;
	saida: string;
	duracao?: number;
	segundos_de_calculo?: number;
}

export const rodarVoz = async (modo: 'gerar' | 'prompt', tarefas: (TarefaGerar | TarefaPrompt)[], passos?: number): Promise<Resultado[]> => {
	if (!instalado()) throw new Error(`O motor de voz não está instalado: ${DICA_VOZ}.`);
	const pasta = mkdtempSync(join(tmpdir(), 'voz-'));
	const arq = join(pasta, 'tarefas.json');
	writeFileSync(arq, JSON.stringify({tarefas, passos}));
	try {
		return await new Promise<Resultado[]>((resolve, reject) => {
			const p = spawn(python(), [script(), modo, arq], {stdio: ['ignore', 'pipe', 'pipe']});
			const resultados: Resultado[] = [];
			let resto = '';
			let erro = '';
			p.stdout.on('data', (d: Buffer) => {
				resto += d.toString();
				const linhas = resto.split('\n');
				resto = linhas.pop() ?? '';
				for (const l of linhas) {
					if (!l.startsWith('{')) continue;
					const r = JSON.parse(l) as Resultado;
					resultados.push(r);
					console.log(`  ${r.id}: ok${r.duracao ? ` (${r.duracao.toFixed(1)} s de áudio${r.segundos_de_calculo ? `, ${r.segundos_de_calculo} s de cálculo` : ''})` : ''}`);
				}
			});
			p.stderr.on('data', (d: Buffer) => {
				erro = (erro + d.toString()).slice(-4000);
			});
			p.on('error', reject);
			p.on('close', (codigo) => {
				if (codigo === 0) return resolve(resultados);
				const dica = /huggingface|hf\.co|ConnectionError|Max retries|403|proxy/i.test(erro) ? ` Parece bloqueio de rede: ${DICA_VOZ}.` : '';
				reject(new Error(`O motor de voz terminou com erro ${codigo}.${dica}\n${erro.trim().split('\n').slice(-8).join('\n')}`));
			});
		});
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

/**
 * Transcreve os áudios com o Whisper (voz/conferir.py, na CPU) para conferir a pronúncia.
 * Devolve o que foi ouvido em cada id.
 */
export const ouvirFalas = async (tarefas: {id: string; audio: string}[]): Promise<Record<string, string>> => {
	if (!instalado()) throw new Error(`O motor de voz não está instalado: ${DICA_VOZ}.`);
	const pasta = mkdtempSync(join(tmpdir(), 'asr-'));
	const arq = join(pasta, 'tarefas.json');
	writeFileSync(arq, JSON.stringify({tarefas}));
	try {
		return await new Promise<Record<string, string>>((resolve, reject) => {
			const p = spawn(python(), [scriptConferir(), arq], {stdio: ['ignore', 'pipe', 'pipe']});
			const ouvido: Record<string, string> = {};
			let resto = '';
			let erro = '';
			p.stdout.on('data', (d: Buffer) => {
				resto += d.toString();
				const linhas = resto.split('\n');
				resto = linhas.pop() ?? '';
				for (const l of linhas) {
					if (!l.startsWith('{')) continue;
					const r = JSON.parse(l) as {id: string; ouvido: string};
					ouvido[r.id] = r.ouvido;
				}
			});
			p.stderr.on('data', (d: Buffer) => {
				erro = (erro + d.toString()).slice(-4000);
			});
			p.on('error', reject);
			p.on('close', (codigo) => {
				if (codigo === 0) return resolve(ouvido);
				reject(new Error(`A conferência de pronúncia terminou com erro ${codigo}.\n${erro.trim().split('\n').slice(-6).join('\n')}`));
			});
		});
	} finally {
		rmSync(pasta, {recursive: true, force: true});
	}
};

const UNIDADES = ['zero', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/** Número por extenso (0 a 9999), sem acentos, do jeito que se fala. */
export const porExtenso = (n: number): string => {
	if (n < 10) return UNIDADES[n];
	if (n < 20) return DEZ_A_DEZENOVE[n - 10];
	if (n < 100) return DEZENAS[Math.floor(n / 10)] + (n % 10 ? ` e ${UNIDADES[n % 10]}` : '');
	if (n === 100) return 'cem';
	if (n < 1000) return CENTENAS[Math.floor(n / 100)] + (n % 100 ? ` e ${porExtenso(n % 100)}` : '');
	const mil = Math.floor(n / 1000);
	const resto = n % 1000;
	return (mil === 1 ? 'mil' : `${porExtenso(mil)} mil`) + (resto ? `${resto < 100 || resto % 100 === 0 ? ' e' : ''} ${porExtenso(resto)}` : '');
};

/** Palavras para comparar fala e transcrição: minúsculas, sem acento nem pontuação, números por extenso. */
export const palavrasDe = (texto: string) =>
	texto
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/([a-z])-([a-z])/g, '$1$2')
		.replace(/\d+/g, (m) => (m.length <= 4 ? ` ${porExtenso(Number(m))} ` : ` ${[...m].map((c) => UNIDADES[Number(c)]).join(' ')} `))
		.replace(/[^a-z\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);

const distancia = (a: string, b: string) => {
	const d = Array.from({length: b.length + 1}, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		let ant = d[0];
		d[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const tmp = d[j];
			d[j] = Math.min(d[j] + 1, d[j - 1] + 1, ant + (a[i - 1] === b[j - 1] ? 0 : 1));
			ant = tmp;
		}
	}
	return d[b.length];
};

/**
 * Nota de 0 a 1 de quanto o que o Whisper ouviu bate com o texto (palavras em comum, na ordem)
 * e quais nomes próprios sumiram. Um nome que some ("Era a Lia" ouvido como "Era ali") reprova
 * a fala mesmo com nota alta.
 */
export const avaliarPronuncia = (texto: string, ouvido: string, nomes: string[]) => {
	const a = palavrasDe(texto);
	const b = palavrasDe(ouvido);
	const lcs = Array.from({length: a.length + 1}, () => new Array<number>(b.length + 1).fill(0));
	for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) lcs[i][j] = a[i - 1] === b[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
	const nota = a.length + b.length ? (2 * lcs[a.length][b.length]) / (a.length + b.length) : 1;
	const faltam = [...new Set(nomes.flatMap((n) => palavrasDe(n)))]
		.filter((n) => n.length >= 3 && a.includes(n))
		.filter((n) => !b.some((p) => p === n || (n.length >= 4 && distancia(p, n) <= 1)));
	return {nota, faltam, ok: nota >= NOTA_MINIMA && faltam.length === 0};
};

/** Abaixo disso a fala é refeita com outra semente (ou reescrita, se continuar ruim). */
export const NOTA_MINIMA = 0.75;

/** Duração de um áudio em segundos. */
export const duracaoDoAudio = async (arq: string): Promise<number> => {
	const {stdout} = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]);
	return Number(stdout.trim());
};

/** Como cada tom do roteiro muda a fala: velocidade do modelo e filtro de áudio. */
export interface AjusteTom {
	velocidade: number;
	filtro?: string;
}

export const TONS: Record<string, AjusteTom> = {
	sussurro: {velocidade: 0.92, filtro: 'highpass=f=150,lowpass=f=6000,volume=0.55'},
	grito: {velocidade: 1.06, filtro: 'acompressor=threshold=-20dB:ratio=4,volume=1.35'},
	nervoso: {velocidade: 1.05},
	medo: {velocidade: 1.04},
	tenso: {velocidade: 0.97},
	triste: {velocidade: 0.92},
	animado: {velocidade: 1.06},
	bravo: {velocidade: 1.02},
	aliviado: {velocidade: 0.96},
	serio: {velocidade: 0.97},
	calmo: {velocidade: 0.95},
	determinado: {velocidade: 1},
};

/** Mesmo volume para todas as falas, depois o ajuste do tom. Grava um .wav mono 24 kHz. */
export const tratarAudio = async (entrada: string, saida: string, tom?: string) => {
	mkdirSync(join(saida, '..'), {recursive: true});
	const filtros = ['loudnorm=I=-17:TP=-1.5:LRA=7'];
	const f = tom ? TONS[tom]?.filtro : undefined;
	if (f) filtros.push(f);
	await exec('ffmpeg', ['-y', '-v', 'error', '-i', entrada, '-af', filtros.join(','), '-ar', '24000', '-ac', '1', saida]);
};

/**
 * Tempo de cada caractere repartido pela duração real da fala, com pausas maiores nas
 * pontuações. O modelo de voz não devolve tempos por palavra; como cada fala é curta (uma ou
 * duas frases), a diferença para o tempo real fica em poucos centésimos de segundo.
 */
export const alinharProporcional = (texto: string, duracao: number) => {
	const peso = (c: string) => (/[.!?…]/.test(c) ? 4 : /[,;:]/.test(c) ? 2.5 : /\s/.test(c) ? 0.5 : 1);
	const caracteres = [...texto];
	const total = caracteres.reduce((s, c) => s + peso(c), 0) || 1;
	// o modelo deixa ~0,1 s de silêncio no começo e no fim
	const margem = Math.min(0.1, duracao * 0.05);
	const util = Math.max(0.1, duracao - 2 * margem);
	let t = margem;
	const inicio: number[] = [];
	const fim: number[] = [];
	for (const c of caracteres) {
		inicio.push(+t.toFixed(3));
		t += (peso(c) / total) * util;
		fim.push(+t.toFixed(3));
	}
	return {caracteres, inicio, fim};
};

export interface Instalacao {
	omnivoice: string;
	modelo: string;
	modelo_baixado: boolean;
}

export const verificarVoz = async (): Promise<Instalacao> => {
	if (!instalado()) throw new Error(`O motor de voz não está instalado: ${DICA_VOZ}.`);
	try {
		const {stdout} = await exec(python(), [script(), 'verificar', '-'], {timeout: 120_000});
		return JSON.parse(stdout.trim().split('\n').pop()!) as Instalacao;
	} catch (e) {
		throw new Error(`O motor de voz está instalado mas não abre (${(e as Error).message.split('\n')[0]}): ${DICA_VOZ}.`);
	}
};
