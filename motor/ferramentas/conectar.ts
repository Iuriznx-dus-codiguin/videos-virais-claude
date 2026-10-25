// Confere se o motor de voz está pronto. Imprime uma linha por verificação, em português.
// As contas de publicação (YouTube, Instagram, Vercel Blob) estão desligadas do fluxo automático;
// o código continua no repositório e pode ser conferido com --so=youtube,instagram,blob.
// Uso: npx tsx ferramentas/conectar.ts [--so=voz,youtube,instagram,blob]
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {env, ocultar} from './lib/ambiente.ts';
import {ErroApi, pedirBruto} from './lib/rede.ts';
import {verificarVoz} from './lib/voz.ts';
import {apagarPublico, subirPublico} from './publicar/armazenamento.ts';
import {contaInstagram, restantesInstagram} from './publicar/instagram.ts';
import {acessoYoutube, nomeDoCanal} from './publicar/youtube.ts';

const AVISO_TOKEN_DIAS = 10;

const voz = async () => {
	const v = await verificarVoz();
	if (!v.modelo_baixado) throw new Error(`o OmniVoice ${v.omnivoice} está instalado, mas o modelo ${v.modelo} ainda não foi baixado: rode "bash voz/instalar.sh" (precisa de huggingface.co e *.hf.co liberados)`);
	return `OmniVoice ${v.omnivoice} com o modelo ${v.modelo} baixado`;
};

const youtube = async () => `canal "${await nomeDoCanal(await acessoYoutube())}"`;

const instagram = async () => {
	const c = await contaInstagram();
	const sobra = await restantesInstagram().catch(() => undefined);
	let extra = '';
	const emitido = env('INSTAGRAM_TOKEN_EMITIDO_EM');
	if (emitido) {
		const dias = 60 - Math.floor((Date.now() - Date.parse(emitido)) / 86_400_000);
		extra = dias <= AVISO_TOKEN_DIAS ? ` — ATENÇÃO: o token vence em ${Math.max(0, dias)} dias, gere outro` : `, token com ${dias} dias de validade`;
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
	voz: ['Voz (OmniVoice)', voz],
	youtube: ['YouTube', youtube],
	instagram: ['Instagram', instagram],
	blob: ['Vercel Blob', blob],
};

const main = async () => {
	const so = process.argv.find((a) => a.startsWith('--so='))?.slice(5).split(',');
	const nomes = so ?? ['voz'];
	let falhou = 0;
	for (const n of nomes) {
		const t = TESTES[n];
		if (!t) {
			console.log(`? verificação desconhecida: ${n}`);
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
