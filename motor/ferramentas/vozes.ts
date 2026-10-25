// Gera as vozes de um episódio no ElevenLabs (fala por fala, com o tempo de cada caractere) e
// grava o áudio e o alinhamento em public/series/<serie>/vozes/. O render usa esses arquivos
// no lugar dos tempos estimados.
// Uso: npx tsx ferramentas/vozes.ts <serie> <parte> [--forcar]
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {URLS, env} from './lib/ambiente.ts';
import {PASTA_SERIES} from './lib/caminhos.ts';
import {pedirJson} from './lib/rede.ts';
import {nomeEpisodio} from './validar.ts';
import {textoParaVoz} from '../src/roteiro/resolver.ts';
import {ehSilencio} from '../src/roteiro/tipos.ts';
import type {Alinhamentos, Biblia, Episodio, Fala} from '../src/roteiro/tipos.ts';

const MODELO = env('ELEVENLABS_MODELO') ?? 'eleven_multilingual_v2';
const FORMATO = 'mp3_44100_128';
/** Trava de segurança: um episódio de 1 minuto tem uns 1.000 caracteres. */
const MAX_CARACTERES = Number(env('ELEVENLABS_MAX_CARACTERES') ?? 4000);

interface AjusteTom {
	stability?: number;
	style?: number;
	speed?: number;
	/** marca de emoção do modelo v3 (só entra no texto quando o modelo é o v3) */
	tag?: string;
}

/** Como cada tom do roteiro muda a voz. Valores são somados ao padrão da voz do personagem. */
export const TONS: Record<string, AjusteTom> = {
	sussurro: {stability: 0.1, style: -0.1, speed: 0.92, tag: '[whispers]'},
	nervoso: {stability: -0.12, style: 0.15, speed: 1.05, tag: '[nervous]'},
	medo: {stability: -0.15, style: 0.2, speed: 1.04, tag: '[scared]'},
	tenso: {stability: -0.05, style: 0.1, speed: 0.97, tag: '[tense]'},
	triste: {stability: 0.05, style: 0.1, speed: 0.92, tag: '[sad]'},
	animado: {stability: -0.1, style: 0.2, speed: 1.06, tag: '[excited]'},
	bravo: {stability: -0.1, style: 0.25, speed: 1.02, tag: '[angry]'},
	aliviado: {stability: 0.05, style: 0.05, speed: 0.96, tag: '[relieved]'},
	serio: {stability: 0.1, style: 0, speed: 0.97},
	calmo: {stability: 0.15, style: -0.05, speed: 0.95},
	determinado: {stability: 0, style: 0.15, speed: 1},
};

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface RespostaVoz {
	audio_base64: string;
	alignment: {characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[]} | null;
}

interface Pedido {
	fala: Fala;
	vozId: string;
	texto: string;
	corpo: Record<string, unknown>;
	chave: string;
}

const voiceSettings = (biblia: Biblia, fala: Fala) => {
	const v = biblia.personagens[fala.quem]?.voz;
	const t = (fala.tom && TONS[fala.tom]) || {};
	return {
		stability: limitar((v?.estabilidade ?? 0.45) + (t.stability ?? 0), 0, 1),
		similarity_boost: limitar(v?.similaridade ?? 0.8, 0, 1),
		style: limitar((v?.estilo ?? 0.3) + (t.style ?? 0), 0, 1),
		use_speaker_boost: true,
		speed: limitar((fala.velocidade ?? 1) * (t.speed ?? 1), 0.8, 1.2),
	};
};

export const montarPedidos = (biblia: Biblia, ep: Episodio): Pedido[] => {
	const falas = ep.falas.filter((f): f is Fala => !ehSilencio(f));
	const v3 = MODELO.includes('v3');
	return falas.map((fala, i) => {
		const vozId = biblia.personagens[fala.quem]?.voz?.elevenlabs_id;
		if (!vozId) {
			throw new Error(`"${fala.quem}" ainda não tem voz escolhida (elevenlabs_id na bíblia). Rode: npx tsx ferramentas/escolher-voz.ts ${biblia.serie} ${fala.quem}`);
		}
		const tag = v3 && fala.tom ? TONS[fala.tom]?.tag : undefined;
		const texto = textoParaVoz(fala.texto);
		const vizinha = (j: number) => {
			const o = falas[j];
			return o && o.quem === fala.quem ? textoParaVoz(o.texto) : undefined;
		};
		const corpo: Record<string, unknown> = {
			text: tag ? `${tag} ${texto}` : texto,
			model_id: MODELO,
			voice_settings: voiceSettings(biblia, fala),
		};
		// só estes modelos aceitam forçar o idioma; nos outros a API devolve erro
		if (/turbo_v2_5|flash_v2_5/.test(MODELO)) corpo.language_code = 'pt';
		const antes = vizinha(i - 1);
		const depois = vizinha(i + 1);
		if (antes) corpo.previous_text = antes;
		if (depois) corpo.next_text = depois;
		const chave = createHash('sha256').update(JSON.stringify({vozId, corpo})).digest('hex').slice(0, 12);
		return {fala, vozId, texto, corpo, chave};
	});
};

const cabecalhos = (): Record<string, string> => {
	// Com segredo de rede a chave é colocada pela rede do ambiente e não existe aqui.
	const h: Record<string, string> = {'content-type': 'application/json'};
	const k = env('ELEVENLABS_API_KEY');
	if (k) h['xi-api-key'] = k;
	return h;
};

export const DICA_ELEVEN = 'refaça o Passo 1 do guia (chave do ElevenLabs como segredo de rede para api.elevenlabs.io)';

const main = async () => {
	const args = process.argv.slice(2);
	const forcar = args.includes('--forcar');
	const [serie, parteTxt] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !parteTxt) {
		console.error('uso: npx tsx ferramentas/vozes.ts <serie> <parte> [--forcar]');
		process.exit(2);
	}
	const parte = Number(parteTxt);
	const pasta = join(PASTA_SERIES, serie);
	const biblia = JSON.parse(readFileSync(join(pasta, 'biblia.json'), 'utf8')) as Biblia;
	const ep = JSON.parse(readFileSync(join(pasta, `${nomeEpisodio(parte)}.json`), 'utf8')) as Episodio;
	const pedidos = montarPedidos(biblia, ep);

	const dirCache = join(pasta, 'vozes', 'cache');
	mkdirSync(dirCache, {recursive: true});
	const faltam = pedidos.filter((p) => forcar || !existsSync(join(dirCache, `${p.chave}.json`)));
	const caracteres = faltam.reduce((s, p) => s + String(p.corpo.text).length, 0);
	console.log(`${pedidos.length} falas, ${faltam.length} para gerar (${caracteres} caracteres)`);
	if (caracteres > MAX_CARACTERES) {
		throw new Error(`${caracteres} caracteres passam do limite de segurança (${MAX_CARACTERES}). Se estiver certo, rode com ELEVENLABS_MAX_CARACTERES maior.`);
	}

	const alinhamentos: Alinhamentos = {};
	for (const p of pedidos) {
		const arq = join(dirCache, `${p.chave}.json`);
		if (faltam.includes(p)) {
			const r = await pedirJson<RespostaVoz>(`${URLS.eleven}/v1/text-to-speech/${p.vozId}/with-timestamps?output_format=${FORMATO}`, {
				servico: 'ElevenLabs',
				method: 'POST',
				headers: cabecalhos(),
				body: JSON.stringify(p.corpo),
				timeoutMs: 120_000,
				dicaAcesso: DICA_ELEVEN,
			});
			if (!r.alignment) throw new Error(`ElevenLabs não devolveu o tempo dos caracteres da fala ${p.fala.id}`);
			writeFileSync(join(dirCache, `${p.chave}.mp3`), Buffer.from(r.audio_base64, 'base64'));
			const fim = r.alignment.character_end_times_seconds;
			writeFileSync(
				arq,
				JSON.stringify({duracao: fim[fim.length - 1] + 0.05, caracteres: r.alignment.characters, inicio: r.alignment.character_start_times_seconds, fim}),
			);
			console.log(`  ${p.fala.id} (${p.fala.quem}): ok`);
		}
		const al = JSON.parse(readFileSync(arq, 'utf8')) as Omit<Alinhamentos[string], 'audio'>;
		alinhamentos[p.fala.id] = {...al, audio: `series/${serie}/vozes/cache/${p.chave}.mp3`};
	}
	writeFileSync(join(pasta, 'vozes', `${nomeEpisodio(parte)}.json`), JSON.stringify(alinhamentos));
	console.log(`pronto: public/series/${serie}/vozes/${nomeEpisodio(parte)}.json`);
};

if (process.argv[1] && import.meta.filename === process.argv[1]) {
	main().catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	});
}
