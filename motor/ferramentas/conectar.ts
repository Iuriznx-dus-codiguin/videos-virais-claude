// Teste de conexão das quatro contas. Imprime uma linha por serviço, em português, sem nunca
// mostrar uma chave. Sai com erro se algum falhar.
// Uso: npx tsx ferramentas/conectar.ts [--so=elevenlabs,youtube,instagram,blob]
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {URLS, env, ocultar} from './lib/ambiente.ts';
import {ErroApi, pedirBruto, pedirJson} from './lib/rede.ts';
import {apagarPublico, subirPublico} from './publicar/armazenamento.ts';
import {contaInstagram, restantesInstagram} from './publicar/instagram.ts';
import {acessoYoutube, nomeDoCanal} from './publicar/youtube.ts';
import {DICA_ELEVEN} from './vozes.ts';

const AVISO_TOKEN_DIAS = 10;

const elevenlabs = async () => {
	const h: Record<string, string> = {};
	if (env('ELEVENLABS_API_KEY')) h['xi-api-key'] = env('ELEVENLABS_API_KEY')!;
	const m = await pedirJson<unknown[]>(`${URLS.eleven}/v1/models`, {servico: 'ElevenLabs', headers: h, dicaAcesso: DICA_ELEVEN});
	// o saldo pede a permissão "User" na chave; sem ela só deixamos de mostrar o saldo
	const s = await pedirJson<{character_count: number; character_limit: number}>(`${URLS.eleven}/v1/user/subscription`, {servico: 'ElevenLabs', headers: h, tentativas: 1}).catch(() => undefined);
	return `${m.length} modelos de voz${s ? `, ${s.character_limit - s.character_count} créditos sobrando de ${s.character_limit}` : ''}`;
};

const youtube = async () => `canal "${await nomeDoCanal(await acessoYoutube())}"`;

const instagram = async () => {
	const c = await contaInstagram();
	const sobra = await restantesInstagram().catch(() => undefined);
	let extra = '';
	const emitido = env('INSTAGRAM_TOKEN_EMITIDO_EM');
	if (emitido) {
		const dias = 60 - Math.floor((Date.now() - Date.parse(emitido)) / 86_400_000);
		extra = dias <= AVISO_TOKEN_DIAS ? ` — ATENÇÃO: o token vence em ${Math.max(0, dias)} dias, gere outro (Passo 3, itens 8 e 9)` : `, token com ${dias} dias de validade`;
	} else extra = ' — falta INSTAGRAM_TOKEN_EMITIDO_EM para eu avisar quando o token vencer';
	return `conta @${c.usuario}${c.tipo ? ` (${c.tipo})` : ''}${sobra !== undefined ? `, ${sobra} publicações liberadas nas próximas 24 h` : ''}${extra}`;
};

const blob = async () => {
	const pasta = mkdtempSync(join(tmpdir(), 'conectar-'));
	const arq = join(pasta, 'teste-conexao.mp4');
	writeFileSync(arq, Buffer.alloc(1024, 1));
	let link: string | undefined;
	try {
		link = await subirPublico(arq);
		const r = await pedirBruto(link, {servico: 'Vercel Blob', tentativas: 2});
		if (!r.ok) throw new Error(`o link público respondeu HTTP ${r.status}`);
		return 'subiu, abriu pelo link público e foi apagado';
	} finally {
		if (link) await apagarPublico(link).catch(() => undefined);
		rmSync(pasta, {recursive: true, force: true});
	}
};

const TESTES: Record<string, [string, () => Promise<string>]> = {
	elevenlabs: ['ElevenLabs', elevenlabs],
	youtube: ['YouTube', youtube],
	instagram: ['Instagram', instagram],
	blob: ['Vercel Blob', blob],
};

const main = async () => {
	const so = process.argv.find((a) => a.startsWith('--so='))?.slice(5).split(',');
	const nomes = so ?? Object.keys(TESTES);
	let falhou = 0;
	for (const n of nomes) {
		const t = TESTES[n];
		if (!t) {
			console.log(`? serviço desconhecido: ${n}`);
			falhou++;
			continue;
		}
		try {
			console.log(`✔ ${t[0]}: ${await t[1]()}`);
		} catch (e) {
			falhou++;
			console.log(`✘ ${t[0]}: ${e instanceof ErroApi ? e.resumo : ocultar(e instanceof Error ? e.message : String(e))}`);
		}
	}
	process.exit(falhou ? 1 : 0);
};

main();
