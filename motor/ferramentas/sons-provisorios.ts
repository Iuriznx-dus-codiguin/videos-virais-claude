// Sons provisórios feitos com ffmpeg (ruído e tons sintéticos) para o render funcionar sem
// depender de biblioteca de áudio. São deliberadamente simples: trocar por sons de verdade
// é só colocar o .wav de mesmo nome em public/.
// Uso: npx tsx ferramentas/sons-provisorios.ts [--forcar]
import {execFile} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {promisify} from 'node:util';
import {AMBIENTES, MUSICAS, SONS} from '../src/catalogo.ts';
import {RAIZ} from './lib/caminhos.ts';
import {arquivoAmbiente, arquivoMusica, arquivoSom} from '../src/audio/Trilha.tsx';

const exec = promisify(execFile);

/** Cada receita é um grafo do ffmpeg que termina na saída [o]. */
const SOM: Record<(typeof SONS)[number], string> = {
	impacto: '[0:a]lowpass=f=260,afade=t=out:st=0.05:d=0.75[a];[1:a]afade=t=out:d=0.8[b];[a][b]amix=inputs=2:normalize=0,volume=2.2[o]',
	sopro: 'anoisesrc=d=1.6:c=pink:a=0.5,bandpass=f=1800:width_type=h:w=2400,afade=t=in:d=0.4,afade=t=out:st=0.9:d=0.7[o]',
	galho: 'anoisesrc=d=0.3:c=white:a=0.9,highpass=f=1800,lowpass=f=6000,afade=t=out:st=0.02:d=0.2,volume=1.4[o]',
	passo_gigante: '[0:a]lowpass=f=140,afade=t=out:st=0.04:d=0.55[a];[1:a]afade=t=out:d=0.6[b];[a][b]amix=inputs=2:normalize=0,volume=2.6[o]',
	respiracao_gigante: 'anoisesrc=d=3.2:c=pink:a=0.8,lowpass=f=520,highpass=f=90,tremolo=f=0.45:d=0.95,afade=t=in:d=0.3,afade=t=out:st=2.6:d=0.6,volume=1.6[o]',
	rugido: '[0:a]vibrato=f=7:d=0.5,lowpass=f=700[a];[1:a]lowpass=f=420,tremolo=f=11:d=0.6[b];[a][b]amix=inputs=2:normalize=0,afade=t=in:d=0.25,afade=t=out:st=1.9:d=0.9,volume=2[o]',
	// sem tons que sobem ou descem (soavam como assovio): só pancada grave e ruído
	susto: '[0:a]lowpass=f=180,afade=t=out:st=0.03:d=0.5[a];[1:a]afade=t=out:st=0.05:d=0.6[b];[a][b]amix=inputs=2:normalize=0,volume=2.4[o]',
	tensao_sobe: '[0:a]lowpass=f=320,highpass=f=40[a];[1:a]volume=0.5[b];[a][b]amix=inputs=2:normalize=0,afade=t=in:d=2.6:curve=exp,afade=t=out:st=2.95:d=0.25,volume=1.8[o]',
	fogo: 'anoisesrc=d=4:c=brown:a=0.6,highpass=f=500,tremolo=f=13:d=0.8,volume=1.5[o]',
	folhas: 'anoisesrc=d=1.6:c=pink:a=0.5,highpass=f=2500,tremolo=f=8:d=0.9,afade=t=in:d=0.2,afade=t=out:st=1.1:d=0.5[o]',
	// ronco de vento e motor: ruído grave que cresce e treme (sem o assovio de desenho animado)
	queda: '[0:a]lowpass=f=420,highpass=f=50,tremolo=f=6:d=0.35[a];[1:a]bandpass=f=750:width_type=h:w=900,tremolo=f=9:d=0.25,volume=0.6[b];[2:a]volume=0.7[c];[a][b][c]amix=inputs=3:normalize=0,afade=t=in:d=1.4:curve=exp,afade=t=out:st=3.4:d=0.6,volume=2[o]',
	chiado: 'anoisesrc=d=1.8:c=white:a=0.6,bandpass=f=1400:width_type=h:w=1800,tremolo=f=9:d=0.9,afade=t=in:d=0.1,afade=t=out:st=1.4:d=0.4,volume=1.2[o]',
	alarme: 'aevalsrc=0.4*sin(2*PI*880*t)*lt(mod(t\\,0.5)\\,0.25)+0.4*sin(2*PI*660*t)*gte(mod(t\\,0.5)\\,0.25):d=2:s=44100[o]',
	bip: 'sine=f=1000:d=0.18,afade=t=out:st=0.1:d=0.08,volume=0.8[o]',
	buzina: 'aevalsrc=0.5*sin(2*PI*110*t)+0.3*sin(2*PI*220*t)+0.2*sin(2*PI*330*t):d=2.4:s=44100,afade=t=in:d=0.2,afade=t=out:st=1.8:d=0.6[o]',
	trovao: 'anoisesrc=d=3.2:c=brown:a=1,lowpass=f=240,tremolo=f=6:d=0.5,afade=t=in:d=0.08,afade=t=out:st=0.8:d=2.4,volume=3[o]',
	clique: 'anoisesrc=d=0.09:c=white:a=0.9,highpass=f=2500,afade=t=out:st=0.005:d=0.07,volume=1.8[o]',
	pop: 'aevalsrc=0.7*sin(2*PI*(300+2600*t)*t)*exp(-22*t):d=0.18:s=44100[o]',
	whoosh: 'anoisesrc=d=0.7:c=pink:a=0.8,bandpass=f=900:width_type=h:w=1400,afade=t=in:d=0.3,afade=t=out:st=0.35:d=0.35,volume=1.6[o]',
	zap: 'aevalsrc=0.35*sgn(sin(2*PI*120*t))*(0.6+0.4*sin(2*PI*31*t))+0.25*(random(0)*2-1):d=0.55:s=44100,highpass=f=200,lowpass=f=5000,afade=t=in:d=0.02,afade=t=out:st=0.35:d=0.2[o]',
	agua: 'anoisesrc=d=1.8:c=pink:a=0.7,highpass=f=400,lowpass=f=4500,tremolo=f=17:d=0.3,afade=t=in:d=0.2,afade=t=out:st=1.3:d=0.5,volume=1.3[o]',
	engrenagem: 'aevalsrc=0.9*(random(0)*2-1)*lt(mod(t\\,0.09)\\,0.012):d=1.2:s=44100,highpass=f=1500,volume=1.4[o]',
	ding: 'aevalsrc=0.45*sin(2*PI*1320*t)*exp(-3*t)+0.2*sin(2*PI*2640*t)*exp(-5*t):d=1.4:s=44100[o]',
	// cabine sacudindo: ronco grave que balança e o chocalhar de coisas soltas
	turbulencia: '[0:a]lowpass=f=220,tremolo=f=7:d=0.75,volume=1.6[a];[1:a]highpass=f=2200,lowpass=f=7000,volume=0.5[b];[a][b]amix=inputs=2:normalize=0,afade=t=in:d=0.3,afade=t=out:st=4.2:d=0.8,volume=1.2[o]',
	isqueiro: '[0:a]highpass=f=2500,afade=t=out:st=0.01:d=0.05,volume=0.9[a];[1:a]bandpass=f=1100:width_type=h:w=1600,afade=t=in:st=0.05:d=0.12,afade=t=out:st=0.3:d=0.5,volume=0.9[b];[a][b]amix=inputs=2:normalize=0[o]',
};

/** Entradas extras (além do grafo) de alguns sons: [descrição lavfi, ...]. */
const ENTRADAS: Partial<Record<(typeof SONS)[number], string[]>> = {
	impacto: ['anoisesrc=d=0.9:c=brown:a=0.9', 'sine=f=52:d=0.9'],
	passo_gigante: ['anoisesrc=d=0.7:c=brown:a=0.9', 'sine=f=38:d=0.7'],
	rugido: ['aevalsrc=0.5*sin(2*PI*62*t)+0.3*sin(2*PI*124*t)+0.2*sin(2*PI*186*t)+0.12*sin(2*PI*248*t):d=2.8:s=44100', 'anoisesrc=d=2.8:c=brown:a=0.9'],
	susto: ['anoisesrc=d=0.7:c=brown:a=1', 'sine=f=46:d=0.7'],
	tensao_sobe: ['anoisesrc=d=3.2:c=brown:a=0.9', 'sine=f=49:d=3.2'],
	queda: ['anoisesrc=d=4:c=brown:a=1', 'anoisesrc=d=4:c=pink:a=0.8', 'sine=f=41:d=4'],
	turbulencia: ['anoisesrc=d=5:c=brown:a=1', 'aevalsrc=(random(0)*2-1)*lt(mod(t*13.7\\,1)\\,0.12)*(0.5+0.5*sin(2*PI*0.9*t)):d=5:s=44100'],
	isqueiro: ['anoisesrc=d=0.8:c=white:a=0.9', 'anoisesrc=d=0.8:c=pink:a=0.8'],
};

/** Ambientes de 16 s que fecham o ciclo sem emenda (as ondulações têm período que divide 16). */
const AMBIENTE: Record<(typeof AMBIENTES)[number], string> = {
	mar: 'anoisesrc=d=16:c=pink:a=0.7,lowpass=f=900,tremolo=f=0.125:d=0.6,volume=1.3[o]',
	selva: 'anoisesrc=d=16:c=pink:a=0.35,bandpass=f=2600:width_type=h:w=3200,tremolo=f=0.25:d=0.4,volume=1.2[o]',
	chuva: 'anoisesrc=d=16:c=white:a=0.5,highpass=f=1800,lowpass=f=9000,tremolo=f=0.25:d=0.2,volume=1.1[o]',
	noite: 'anoisesrc=d=16:c=brown:a=0.3,lowpass=f=300[a];sine=f=4300:d=16,tremolo=f=15:d=1,volume=0.04[b];[a][b]amix=inputs=2:normalize=0,volume=1.6[o]',
	oficina: 'anoisesrc=d=16:c=brown:a=0.25,lowpass=f=400,tremolo=f=0.25:d=0.2,volume=1.2[o]',
	estudio: 'anoisesrc=d=16:c=pink:a=0.12,lowpass=f=250,volume=1.0[o]',
};

/** Músicas de 32 s (drones graves que respiram devagar). */
const MUSICA: Record<(typeof MUSICAS)[number], string> = {
	tensao:
		'sine=f=55:d=32[a];sine=f=58.3:d=32[b];sine=f=110:d=32,volume=0.4[c];[a][b][c]amix=inputs=3:normalize=0,tremolo=f=0.125:d=0.5,lowpass=f=900,volume=1.4[o]',
	// arpejo leve (dó maior com sétima, depois sol) com baixo: clima de descoberta
	curiosidade:
		'aevalsrc=0.2*sin(2*PI*523.25*pow(2\\,-5*gte(mod(t\\,8)\\,4)/12)*pow(2\\,(4*floor(mod(t*4\\,4))-gte(floor(mod(t*4\\,4))\\,2))/12)*t)*exp(-7*mod(t\\,0.25))+0.16*sin(2*PI*130.81*pow(2\\,-5*gte(mod(t\\,8)\\,4)/12)*t)*(0.6+0.4*exp(-3*mod(t\\,0.5))):d=32:s=44100,lowpass=f=3200,aecho=0.8:0.6:180:0.25,volume=1.2[o]',
	misterio:
		'sine=f=65.4:d=32[a];sine=f=98:d=32,volume=0.7[b];sine=f=130.8:d=32,volume=0.5[c];sine=f=196:d=32,volume=0.25[d];[a][b][c][d]amix=inputs=4:normalize=0,tremolo=f=0.125:d=0.4,lowpass=f=1100,volume=1.3[o]',
};

const gerar = async (saida: string, grafo: string, entradas: string[] = []) => {
	mkdirSync(dirname(saida), {recursive: true});
	const args = ['-y', '-v', 'error'];
	for (const e of entradas) args.push('-f', 'lavfi', '-i', e);
	// sem entradas, o próprio grafo cria o som; com entradas, o grafo as combina
	args.push(entradas.length ? '-filter_complex' : '-lavfi', grafo, '-map', '[o]', '-ar', '44100', '-ac', '2', saida);
	await exec('ffmpeg', args);
};

const main = async () => {
	const forcar = process.argv.includes('--forcar');
	let feitos = 0;
	const fazer = async (arquivo: string, grafo: string, entradas?: string[]) => {
		const saida = join(RAIZ, 'public', arquivo);
		if (!forcar && existsSync(saida)) return;
		await gerar(saida, grafo, entradas);
		feitos++;
	};
	for (const n of SONS) await fazer(arquivoSom(n), SOM[n], ENTRADAS[n]);
	for (const n of AMBIENTES) await fazer(arquivoAmbiente(n), AMBIENTE[n]);
	for (const n of MUSICAS) await fazer(arquivoMusica(n), MUSICA[n]);
	console.log(feitos ? `${feitos} sons provisórios gerados em public/` : 'sons provisórios já existem');
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	main().catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	});
}
