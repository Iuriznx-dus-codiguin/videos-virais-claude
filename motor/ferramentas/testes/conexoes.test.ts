// Testes dos módulos de voz, publicação e conexão contra o servidor falso.
// Uso: npm run testar
import assert from 'node:assert/strict';
import {execFile, execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, describe, it} from 'node:test';
import {promisify} from 'node:util';
import {resolverEpisodio} from '../../src/roteiro/resolver.ts';
import type {Alinhamentos, Biblia, Episodio} from '../../src/roteiro/tipos.ts';
import {subir, type Opcoes} from './servidor-falso.ts';

const exec = promisify(execFile);
const MOTOR = join(import.meta.dirname, '..', '..');

interface Resultado {
	codigo: number;
	saida: string;
}

const rodar = async (raiz: string, base: string, script: string, args: string[], extra: Record<string, string> = {}): Promise<Resultado> => {
	const env = {
		...process.env,
		SHORTS_RAIZ: raiz,
		SHORTS_BASE_FALSA: base,
		SHORTS_ESPERA_MS: '5',
		YOUTUBE_CLIENT_ID: 'id-falso',
		YOUTUBE_CLIENT_SECRET: 'segredo-youtube-falso',
		YOUTUBE_REFRESH_TOKEN: '1//refresh-falso',
		INSTAGRAM_ACCESS_TOKEN: 'token-ig-falso',
		INSTAGRAM_USER_ID: '999',
		INSTAGRAM_TOKEN_EMITIDO_EM: new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10),
		BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_falso',
		SHORTS_VOZ_PY: 'python3',
		SHORTS_VOZ_SCRIPT: join(MOTOR, 'ferramentas', 'testes', 'voz-falsa.py'),
		...extra,
	};
	try {
		const r = await exec('npx', ['tsx', join(MOTOR, 'ferramentas', script), ...args], {env, cwd: MOTOR, timeout: 120_000});
		return {codigo: 0, saida: r.stdout + r.stderr};
	} catch (e) {
		const x = e as {code?: number; stdout?: string; stderr?: string};
		return {codigo: x.code ?? 1, saida: (x.stdout ?? '') + (x.stderr ?? '')};
	}
};

/** Cópia da série do piloto numa raiz temporária, com vozes (falsas) já escolhidas. */
const montarRaiz = () => {
	const raiz = mkdtempSync(join(tmpdir(), 'shorts-teste-'));
	const origem = join(MOTOR, 'public', 'series', 'ilha-perdida');
	const destino = join(raiz, 'public', 'series', 'ilha-perdida');
	mkdirSync(destino, {recursive: true});
	for (const a of ['biblia.json', 'ep01.json']) cpSync(join(origem, a), join(destino, a));
	mkdirSync(join(destino, 'vozes'), {recursive: true});
	for (const quem of ['leo', 'bia']) writeFileSync(join(destino, 'vozes', `${quem}.pt`), `voz-${quem}`);
	mkdirSync(join(raiz, 'out'), {recursive: true});
	writeFileSync(join(raiz, 'out', 'ilha-perdida-ep01.mp4'), Buffer.alloc(4096, 7));
	return raiz;
};

describe('conexões', () => {
	let falso: Awaited<ReturnType<typeof subir>>;
	before(async () => {
		falso = await subir();
	});
	after(() => falso.fechar());

	it('por padrão confere só o motor de voz', async () => {
		const r = await rodar(montarRaiz(), falso.base, 'conectar.ts', []);
		assert.equal(r.codigo, 0, r.saida);
		assert.match(r.saida, /✔ Voz \(OmniVoice\): OmniVoice 0\.0-falso com o modelo falso baixado/);
		assert.ok(!/YouTube|Instagram/.test(r.saida), 'a publicação está desligada do teste padrão');
	});

	it('avisa quando o modelo ainda não foi baixado', async () => {
		const r = await rodar(montarRaiz(), falso.base, 'conectar.ts', [], {VOZ_FALSA_SEM_MODELO: '1'});
		assert.equal(r.codigo, 1);
		assert.match(r.saida, /✘ Voz.*ainda não foi baixado.*instalar\.sh.*huggingface\.co/s);
	});

	it('sem o motor instalado diz qual script rodar', async () => {
		const r = await rodar(montarRaiz(), falso.base, 'conectar.ts', [], {SHORTS_VOZ_PY: '/nao/existe/python'});
		assert.equal(r.codigo, 1);
		assert.match(r.saida, /não está instalado.*instalar\.sh/s);
	});

	it('as contas de publicação, quando pedidas, respondem e não imprimem nenhuma chave', async () => {
		const r = await rodar(montarRaiz(), falso.base, 'conectar.ts', ['--so=youtube,instagram,blob']);
		assert.equal(r.codigo, 0, r.saida);
		assert.match(r.saida, /✔ YouTube: canal "Canal de Teste"/);
		assert.match(r.saida, /✔ Instagram: conta @canal_teste \(MEDIA_CREATOR\), 97 publicações liberadas.*token com 40 dias/);
		assert.match(r.saida, /✔ Vercel Blob: subiu, abriu pelo link público e foi apagado/);
		for (const segredo of ['segredo-youtube-falso', '1//refresh-falso', 'token-ig-falso', 'vercel_blob_rw_falso']) assert.ok(!r.saida.includes(segredo), `vazou ${segredo}`);
		assert.equal(falso.registro.blobs.size, 0, 'o arquivo de teste deve ser apagado');
	});

	it('avisa quando o token do Instagram está perto de vencer', async () => {
		const velho = new Date(Date.now() - 55 * 86_400_000).toISOString().slice(0, 10);
		const r = await rodar(montarRaiz(), falso.base, 'conectar.ts', ['--so=instagram'], {INSTAGRAM_TOKEN_EMITIDO_EM: velho});
		assert.match(r.saida, /ATENÇÃO: o token vence em 5 dias/);
	});

	it('explica cada falha de publicação em português', async () => {
		const casos: [Opcoes['falhas'], string, RegExp][] = [
			[{googleToken: 400}, 'youtube', /✘ YouTube: o refresh token foi recusado.*modo Teste/s],
			[{instagramMe: 400}, 'instagram', /✘ Instagram.*60 dias/s],
		];
		for (const [falhas, so, esperado] of casos) {
			const f = await subir({falhas});
			try {
				const r = await rodar(montarRaiz(), f.base, 'conectar.ts', [`--so=${so}`]);
				assert.equal(r.codigo, 1);
				assert.match(r.saida, esperado);
			} finally {
				await f.fechar();
			}
		}
	});
});

describe('vozes', () => {
	const lerLog = (arq: string) =>
		existsSync(arq)
			? readFileSync(arq, 'utf8')
					.trim()
					.split('\n')
					.filter(Boolean)
					.map((l) => JSON.parse(l) as Record<string, unknown>)
			: [];
	const novoLog = () => join(mkdtempSync(join(tmpdir(), 'voz-log-')), 'chamadas.jsonl');

	it('gera fala por fala, grava o alinhamento e o resolver passa a usar os tempos reais', async () => {
		const raiz = montarRaiz();
		const log = novoLog();
		const r = await rodar(raiz, 'http://x', 'vozes.ts', ['ilha-perdida', '1'], {VOZ_FALSA_LOG: log});
		assert.equal(r.codigo, 0, r.saida);
		const pasta = join(raiz, 'public', 'series', 'ilha-perdida');
		const al = JSON.parse(readFileSync(join(pasta, 'vozes', 'ep01.json'), 'utf8')) as Alinhamentos;
		const ep = JSON.parse(readFileSync(join(pasta, 'ep01.json'), 'utf8')) as Episodio;
		const biblia = JSON.parse(readFileSync(join(pasta, 'biblia.json'), 'utf8')) as Biblia;
		const ids = ep.falas.filter((f) => 'texto' in f).map((f) => f.id);
		assert.deepEqual(Object.keys(al).sort(), [...ids].sort());
		for (const a of Object.values(al)) assert.ok(existsSync(join(raiz, 'public', a.audio)), `falta ${a.audio}`);

		const linha = resolverEpisodio(ep, biblia, al);
		assert.ok(linha.falas.every((f) => !f.estimada && f.audio));

		// uma chamada só ao modelo (carregado uma vez), com a voz certa de cada personagem
		const chamadas = lerLog(log).filter((c) => c.modo === 'gerar');
		assert.equal(chamadas.length, ids.length);
		const f2 = chamadas.find((c) => String(c.texto).includes('Três dias sem comida'))!;
		assert.match(String(f2.voz), /leo\.pt$/);
		const quieto = chamadas.find((c) => String(c.texto).includes('Quieto'))!;
		assert.match(String(quieto.texto), /Quieto demais\./, 'MAIÚSCULAS vão minúsculas para a voz');
		const bia = chamadas.find((c) => /bia\.pt$/.test(String(c.voz)))!;
		assert.ok(Number(bia.velocidade) < 0.9, 'sussurro e velocidade 0.9 deixam a fala mais lenta');

		// o tempo dos caracteres cobre a duração real do áudio
		const primeira = Object.values(al)[0];
		assert.ok(primeira.fim[primeira.fim.length - 1] <= primeira.duracao);
		assert.ok(primeira.fim[primeira.fim.length - 1] > primeira.duracao * 0.85);
	});

	it('na segunda rodada usa o cache e não chama o modelo de novo', async () => {
		const raiz = montarRaiz();
		const log = novoLog();
		await rodar(raiz, 'http://x', 'vozes.ts', ['ilha-perdida', '1'], {VOZ_FALSA_LOG: log});
		const antes = lerLog(log).length;
		const r = await rodar(raiz, 'http://x', 'vozes.ts', ['ilha-perdida', '1'], {VOZ_FALSA_LOG: log});
		assert.match(r.saida, /0 para gerar/);
		assert.equal(lerLog(log).length, antes);
	});

	it('trocar uma fala regenera só ela', async () => {
		const raiz = montarRaiz();
		const log = novoLog();
		await rodar(raiz, 'http://x', 'vozes.ts', ['ilha-perdida', '1'], {VOZ_FALSA_LOG: log});
		const antes = lerLog(log).length;
		const arq = join(raiz, 'public', 'series', 'ilha-perdida', 'ep01.json');
		const ep = JSON.parse(readFileSync(arq, 'utf8')) as Episodio;
		const f = ep.falas.find((x) => 'texto' in x) as {texto: string};
		f.texto = `${f.texto} Mais uma frase.`;
		writeFileSync(arq, JSON.stringify(ep));
		const r = await rodar(raiz, 'http://x', 'vozes.ts', ['ilha-perdida', '1'], {VOZ_FALSA_LOG: log});
		assert.match(r.saida, /1 para gerar/);
		assert.equal(lerLog(log).length, antes + 1);
	});

	it('personagem sem voz escolhida diz qual comando rodar', async () => {
		const raiz = montarRaiz();
		rmSync(join(raiz, 'public', 'series', 'ilha-perdida', 'vozes', 'bia.pt'));
		const r = await rodar(raiz, 'http://x', 'vozes.ts', ['ilha-perdida', '1']);
		assert.equal(r.codigo, 1);
		assert.match(r.saida, /"bia" ainda não tem voz.*escolher-voz\.ts ilha-perdida bia --auto/s);
	});

	it('erro de rede do modelo vira uma dica sobre os domínios', async () => {
		const raiz = montarRaiz();
		const r = await rodar(raiz, 'http://x', 'vozes.ts', ['ilha-perdida', '1'], {SHORTS_VOZ_SCRIPT: join(MOTOR, 'ferramentas', 'testes', 'voz-falsa-quebrada.py')});
		assert.equal(r.codigo, 1);
		assert.match(r.saida, /Parece bloqueio de rede.*huggingface\.co/s);
	});

	it('escolher-voz cria candidatas, guarda a escolhida e a semente', async () => {
		const raiz = montarRaiz();
		const pasta = join(raiz, 'public', 'series', 'ilha-perdida');
		rmSync(join(pasta, 'vozes', 'bia.pt'));
		const log = novoLog();
		const c = await rodar(raiz, 'http://x', 'escolher-voz.ts', ['ilha-perdida', 'bia', '--candidatas=3'], {VOZ_FALSA_LOG: log});
		assert.equal(c.codigo, 0, c.saida);
		const gerar = lerLog(log).filter((x) => x.modo === 'gerar');
		assert.equal(gerar.length, 3);
		assert.ok(gerar.every((x) => x.instruct === 'female, young adult, low pitch'));
		assert.deepEqual(gerar.map((x) => x.semente), [1, 2, 3]);
		assert.ok(existsSync(join(raiz, 'out', 'vozes-candidatas', 'ilha-perdida-bia', 'candidatas.md')));
		const u = await rodar(raiz, 'http://x', 'escolher-voz.ts', ['ilha-perdida', 'bia', '--usar=2'], {VOZ_FALSA_LOG: log});
		assert.equal(u.codigo, 0, u.saida);
		assert.ok(existsSync(join(pasta, 'vozes', 'bia.pt')));
		assert.ok(existsSync(join(pasta, 'vozes', 'bia-ref.wav')));
		assert.equal((JSON.parse(readFileSync(join(pasta, 'biblia.json'), 'utf8')) as Biblia).personagens.bia.voz!.semente, 2);
	});

	it('escolher-voz --auto faz tudo de uma vez', async () => {
		const raiz = montarRaiz();
		const pasta = join(raiz, 'public', 'series', 'ilha-perdida');
		rmSync(join(pasta, 'vozes', 'leo.pt'));
		const r = await rodar(raiz, 'http://x', 'escolher-voz.ts', ['ilha-perdida', 'leo', '--auto']);
		assert.equal(r.codigo, 0, r.saida);
		assert.match(r.saida, /candidata escolhida automaticamente/);
		assert.ok(existsSync(join(pasta, 'vozes', 'leo.pt')));
	});
});

describe('publicação', () => {
	it('envia ao YouTube agendado e publica o Reel; a segunda rodada não duplica', async () => {
		const falso = await subir({processamentosAntes: 2});
		try {
			const raiz = montarRaiz();
			const r = await rodar(raiz, falso.base, 'publicar.ts', ['ilha-perdida', '1', '--agendar=2026-10-26T21:00:00Z']);
			assert.equal(r.codigo, 0, r.saida);
			assert.match(r.saida, /YouTube: enviado \(private, vira público em 2026-10-26T21:00:00Z\): https:\/\/youtube\.com\/shorts\/abc123XYZ/);
			assert.match(r.saida, /Instagram: Reel publicado: https:\/\/www\.instagram\.com\/reel\/XYZ\//);

			const meta = falso.registro.youtubeMetadados[0] as {snippet: {title: string; description: string}; status: Record<string, unknown>};
			assert.equal(meta.status.privacyStatus, 'private');
			assert.equal(meta.status.publishAt, '2026-10-26T21:00:00Z');
			assert.equal(meta.status.selfDeclaredMadeForKids, false);
			assert.match(meta.snippet.title, /^ILHA PERDIDA · Parte 1: As pegadas #shorts$/);
			assert.match(meta.snippet.description, /Comenta "PARTE 2"/);
			assert.deepEqual(falso.registro.youtubeBytes, [4096]);

			const ig = falso.registro.instagramMedia[0];
			assert.match(ig.video_url, /\/blob\/files\/ilha-perdida-ep01\.mp4$/);
			assert.match(ig.caption, /#reels/);
			assert.ok(!ig.caption.includes('#shorts'));
			assert.equal(falso.registro.apagados.length, 1, 'o link público é apagado depois de publicar');

			const estado = JSON.parse(readFileSync(join(raiz, 'public', 'series', 'ilha-perdida', 'estado.json'), 'utf8')) as {publicados: Record<string, {youtube?: {id: string}; instagram?: {id: string}}>};
			assert.equal(estado.publicados['1'].youtube?.id, 'abc123XYZ');
			assert.equal(estado.publicados['1'].instagram?.id, 'media1');

			const de_novo = await rodar(raiz, falso.base, 'publicar.ts', ['ilha-perdida', '1', '--agendar=2026-10-26T21:00:00Z']);
			assert.match(de_novo.saida, /YouTube: parte 1 já enviada.*pulando/s);
			assert.match(de_novo.saida, /Instagram: parte 1 já publicada, pulando/);
			assert.equal(falso.registro.youtubeMetadados.length, 1);
			assert.equal(falso.registro.instagramPublicados.length, 1);
		} finally {
			await falso.fechar();
		}
	});

	it('modo teste envia privado, sem agendar e sem gravar estado', async () => {
		const falso = await subir();
		try {
			const raiz = montarRaiz();
			const r = await rodar(raiz, falso.base, 'publicar.ts', ['ilha-perdida', '1', '--youtube', '--teste', '--agendar=2026-10-26T21:00:00Z']);
			assert.equal(r.codigo, 0, r.saida);
			const meta = falso.registro.youtubeMetadados[0] as {status: Record<string, unknown>};
			assert.equal(meta.status.privacyStatus, 'private');
			assert.equal(meta.status.publishAt, undefined);
			assert.equal(falso.registro.instagramMedia.length, 0);
			assert.ok(!existsSync(join(raiz, 'public', 'series', 'ilha-perdida', 'estado.json')));
		} finally {
			await falso.fechar();
		}
	});

	it('se o Instagram recusar o vídeo, o YouTube já enviado fica registrado e o link é apagado', async () => {
		const falso = await subir({falhas: {instagramStatus: 200}});
		try {
			const raiz = montarRaiz();
			const r = await rodar(raiz, falso.base, 'publicar.ts', ['ilha-perdida', '1']);
			assert.equal(r.codigo, 1);
			assert.match(r.saida, /o Instagram recusou o vídeo.*formato não suportado/s);
			const estado = JSON.parse(readFileSync(join(raiz, 'public', 'series', 'ilha-perdida', 'estado.json'), 'utf8')) as {publicados: Record<string, {youtube?: unknown; instagram?: unknown}>};
			assert.ok(estado.publicados['1'].youtube);
			assert.equal(estado.publicados['1'].instagram, undefined);
			assert.equal(falso.registro.apagados.length, 1);
		} finally {
			await falso.fechar();
		}
	});

	it('sem o vídeo renderizado pede o render antes', async () => {
		const falso = await subir();
		try {
			const raiz = montarRaiz();
			rmSync(join(raiz, 'out', 'ilha-perdida-ep01.mp4'));
			const r = await rodar(raiz, falso.base, 'publicar.ts', ['ilha-perdida', '1']);
			assert.equal(r.codigo, 1);
			assert.match(r.saida, /Rode o render antes/);
		} finally {
			await falso.fechar();
		}
	});
});

describe('entrega dos vídeos', () => {
	const git = (cwd: string, ...args: string[]) => execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();
	const novoRemoto = () => {
		const remoto = mkdtempSync(join(tmpdir(), 'shorts-remoto-'));
		git(remoto, 'init', '--quiet', '--bare', '-b', 'main');
		return {remoto, extra: {SHORTS_REMOTO: remoto}};
	};

	it('guarda vídeo, texto para postar e a série no ramo dados; recusa episódio sem voz', async () => {
		const {remoto, extra} = novoRemoto();
		const producao = montarRaiz();
		const a = await rodar(producao, 'http://x', 'dados.ts', ['entregar', 'ilha-perdida', '1', '--dia=2026-10-26', '--hora=18:00'], extra);
		assert.equal(a.codigo, 1);
		assert.match(a.saida, /ainda não tem voz/);

		mkdirSync(join(producao, 'public', 'series', 'ilha-perdida', 'vozes', 'cache'), {recursive: true});
		writeFileSync(join(producao, 'public', 'series', 'ilha-perdida', 'vozes', 'ep01.json'), '{}');
		writeFileSync(join(producao, 'public', 'series', 'ilha-perdida', 'vozes', 'cache', 'x.wav'), 'pesado');
		const b = await rodar(producao, 'http://x', 'dados.ts', ['entregar', 'ilha-perdida', '1', '--dia=2026-10-26', '--hora=18:00'], extra);
		assert.equal(b.codigo, 0, b.saida);

		const conferir = mkdtempSync(join(tmpdir(), 'shorts-conferir-'));
		git(conferir, 'clone', '--quiet', '--branch', 'dados', remoto, conferir);
		assert.equal(readFileSync(join(conferir, 'videos', 'ilha-perdida-ep01.mp4')).length, 4096);
		const texto = readFileSync(join(conferir, 'videos', 'ilha-perdida-ep01.md'), 'utf8');
		assert.match(texto, /Postar em 26\/10\/2026 às 18:00 \(Brasília\)/);
		assert.match(texto, /YouTube Shorts[\s\S]*Instagram Reels/);
		assert.ok(existsSync(join(conferir, 'series', 'ilha-perdida', 'vozes', 'leo.pt')), 'a voz do personagem acompanha a série');
		assert.ok(!existsSync(join(conferir, 'series', 'ilha-perdida', 'vozes', 'cache')), 'o cache de áudio não sobe');

		const lista = await rodar(montarRaiz(), 'http://x', 'dados.ts', ['entregas'], extra);
		assert.match(lista.saida, /2026-10-26 18:00 {2}ilha-perdida parte 1/);
	});

	it('baixar e salvar levam as séries de uma sessão para a outra', async () => {
		const {extra} = novoRemoto();
		const a = montarRaiz();
		assert.equal((await rodar(a, 'http://x', 'dados.ts', ['salvar', 'ilha-perdida'], extra)).codigo, 0);
		const b = mkdtempSync(join(tmpdir(), 'shorts-b-'));
		const r = await rodar(b, 'http://x', 'dados.ts', ['baixar'], extra);
		assert.equal(r.codigo, 0, r.saida);
		assert.ok(existsSync(join(b, 'public', 'series', 'ilha-perdida', 'ep01.json')));
	});

	it('apaga da pasta videos o que passou de 10 dias', async () => {
		const {remoto, extra} = novoRemoto();
		const raiz = montarRaiz();
		const serie = join(raiz, 'public', 'series', 'ilha-perdida');
		cpSync(join(serie, 'ep01.json'), join(serie, 'ep02.json'));
		writeFileSync(join(raiz, 'out', 'ilha-perdida-ep02.mp4'), Buffer.alloc(2048, 3));
		const velho = await rodar(raiz, 'http://x', 'dados.ts', ['entregar', 'ilha-perdida', '1', '--dia=2026-10-01', '--hora=18:00', '--sem-voz'], extra);
		assert.equal(velho.codigo, 0, velho.saida);
		const hoje = new Date().toISOString().slice(0, 10);
		const novo = await rodar(raiz, 'http://x', 'dados.ts', ['entregar', 'ilha-perdida', '2', `--dia=${hoje}`, '--hora=18:00', '--sem-voz'], extra);
		assert.equal(novo.codigo, 0, novo.saida);
		const conferir = mkdtempSync(join(tmpdir(), 'shorts-conferir-'));
		git(conferir, 'clone', '--quiet', '--branch', 'dados', remoto, conferir);
		assert.ok(!existsSync(join(conferir, 'videos', 'ilha-perdida-ep01.mp4')));
		assert.ok(existsSync(join(conferir, 'videos', 'ilha-perdida-ep02.mp4')));
	});
});
