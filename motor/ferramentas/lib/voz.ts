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
