// Escolhe a voz de um personagem na biblioteca do ElevenLabs.
//  1) npx tsx ferramentas/escolher-voz.ts <serie> <personagem>
//     busca vozes em português que combinam com a descrição da bíblia e baixa as amostras
//     (as amostras prontas da biblioteca não gastam créditos) em out/vozes-candidatas/.
//  2) npx tsx ferramentas/escolher-voz.ts <serie> <personagem> --usar=<dono>:<voz>
//     adiciona a voz escolhida à sua conta e grava o elevenlabs_id na bíblia.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PASTA_SERIES, RAIZ} from './lib/caminhos.ts';
import {URLS, env} from './lib/ambiente.ts';
import {pedirBruto, pedirJson} from './lib/rede.ts';
import {DICA_ELEVEN} from './vozes.ts';
import type {Biblia} from '../src/roteiro/tipos.ts';

interface VozPublica {
	public_owner_id: string;
	voice_id: string;
	name: string;
	gender?: string;
	age?: string;
	accent?: string;
	descriptive?: string;
	use_case?: string;
	category?: string;
	language?: string;
	description?: string;
	preview_url?: string;
	cloned_by_count?: number;
}

const cab = (): Record<string, string> => {
	const h: Record<string, string> = {'content-type': 'application/json'};
	const k = env('ELEVENLABS_API_KEY');
	if (k) h['xi-api-key'] = k;
	return h;
};

/** Gênero e faixa etária que a descrição da bíblia pede, para filtrar a busca. */
export const filtrosDaDescricao = (desc: string) => {
	const d = desc.toLowerCase();
	const gender = /\b(rapaz|homem|garoto|menino|senhor)\b/.test(d) ? 'male' : /\b(moça|mulher|garota|menina|senhora)\b/.test(d) ? 'female' : undefined;
	const anos = Number(/(\d+)\s*anos/.exec(d)?.[1]);
	const age = Number.isFinite(anos) ? (anos < 32 ? 'young' : anos < 58 ? 'middle_aged' : 'old') : /\bjovem\b/.test(d) ? 'young' : undefined;
	return {gender, age};
};

const pontuar = (v: VozPublica) =>
	(v.category === 'professional' ? 3 : 0) +
	(/narrat|story|character|conversat|social/.test(v.use_case ?? '') ? 2 : 0) +
	Math.log10(1 + (v.cloned_by_count ?? 0));

const main = async () => {
	const args = process.argv.slice(2);
	const usar = args.find((a) => a.startsWith('--usar='))?.slice(7);
	const [serie, quem] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !quem) {
		console.error('uso: npx tsx ferramentas/escolher-voz.ts <serie> <personagem> [--usar=<dono>:<voz>]');
		process.exit(2);
	}
	const arq = join(PASTA_SERIES, serie, 'biblia.json');
	const biblia = JSON.parse(readFileSync(arq, 'utf8')) as Biblia;
	const p = biblia.personagens[quem];
	if (!p?.voz) throw new Error(`"${quem}" não tem o campo voz (com a descrição) na bíblia`);

	if (usar) {
		const [dono, voz] = usar.split(':');
		if (!dono || !voz) throw new Error('--usar precisa ser <dono>:<voz>, como aparece no resumo das candidatas');
		const r = await pedirJson<{voice_id: string}>(`${URLS.eleven}/v1/voices/add/${dono}/${voz}`, {
			servico: 'ElevenLabs',
			method: 'POST',
			headers: cab(),
			body: JSON.stringify({new_name: `${biblia.titulo} · ${p.nome}`}),
			dicaAcesso: DICA_ELEVEN,
		});
		p.voz.elevenlabs_id = r.voice_id;
		writeFileSync(arq, `${JSON.stringify(biblia, null, 2)}\n`);
		console.log(`voz de ${p.nome} gravada na bíblia (elevenlabs_id ${r.voice_id})`);
		return;
	}

	const {gender, age} = filtrosDaDescricao(p.voz.descricao);
	const q = new URLSearchParams({language: 'pt', page_size: '40'});
	if (gender) q.set('gender', gender);
	if (age) q.set('age', age);
	const r = await pedirJson<{voices: VozPublica[]}>(`${URLS.eleven}/v1/shared-voices?${q}`, {servico: 'ElevenLabs', headers: cab(), dicaAcesso: DICA_ELEVEN});
	const top = [...r.voices].sort((a, b) => pontuar(b) - pontuar(a)).slice(0, 5);
	if (!top.length) throw new Error('A biblioteca não devolveu vozes com esse perfil; afrouxe a descrição na bíblia.');

	const pasta = join(RAIZ, 'out', 'vozes-candidatas', `${serie}-${quem}`);
	mkdirSync(pasta, {recursive: true});
	const linhas = [`# Candidatas para ${p.nome} (${serie})`, '', `Descrição na bíblia: ${p.voz.descricao}`, ''];
	for (const [i, v] of top.entries()) {
		let amostra = '(sem amostra)';
		if (v.preview_url) {
			const a = await pedirBruto(v.preview_url, {servico: 'ElevenLabs'});
			if (a.ok) {
				const nome = `${i + 1}-${v.name.replace(/[^\p{L}\p{N}]+/gu, '_')}.mp3`;
				writeFileSync(join(pasta, nome), Buffer.from(await a.arrayBuffer()));
				amostra = nome;
			}
		}
		linhas.push(
			`${i + 1}. **${v.name}** · ${[v.gender, v.age, v.accent, v.descriptive, v.use_case].filter(Boolean).join(', ')} · amostra: ${amostra}`,
			`   escolher: \`npx tsx ferramentas/escolher-voz.ts ${serie} ${quem} --usar=${v.public_owner_id}:${v.voice_id}\``,
		);
	}
	writeFileSync(join(pasta, 'candidatas.md'), `${linhas.join('\n')}\n`);
	console.log(linhas.join('\n'));
	console.log(`\namostras em ${pasta}`);
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	main().catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	});
}
