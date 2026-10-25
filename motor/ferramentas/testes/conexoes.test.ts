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

/** Cópia da série do piloto numa raiz temporária, com vozes já escolhidas na bíblia. */
const montarRaiz = () => {
	const raiz = mkdtempSync(join(tmpdir(), 'shorts-teste-'));
	const origem = join(MOTOR, 'public', 'series', 'ilha-perdida');
	const destino = join(raiz, 'public', 'series', 'ilha-perdida');
	mkdirSync(destino, {recursive: true});
	for (const a of ['biblia.json', 'ep01.json']) cpSync(join(origem, a), join(destino, a));
	const b = JSON.parse(readFileSync(join(destino, 'biblia.json'), 'utf8')) as Biblia;
	b.personagens.leo.voz!.elevenlabs_id = 'voz-leo';
	b.personagens.bia.voz!.elevenlabs_id = 'voz-bia';
	writeFileSync(join(destino, 'biblia.json'), JSON.stringify(b, null, 2));
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

	it('as quatro contas respondem e o teste não imprime nenhuma chave', async () => {
		const r = await rodar(montarRaiz(), falso.base, 'conectar.ts', []);
		assert.equal(r.codigo, 0, r.saida);
		assert.match(r.saida, /✔ ElevenLabs: 2 modelos de voz, 98800 créditos sobrando/);
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

	it('com a chave em variável, ela vai no cabeçalho xi-api-key', async () => {
		const f = await subir({chave: 'minha-chave-eleven'});
		try {
			const sem = await rodar(montarRaiz(), f.base, 'conectar.ts', ['--so=elevenlabs']);
			assert.match(sem.saida, /✘ ElevenLabs.*401.*Passo 1/s);
			const com = await rodar(montarRaiz(), f.base, 'conectar.ts', ['--so=elevenlabs'], {ELEVENLABS_API_KEY: 'minha-chave-eleven'});
			assert.match(com.saida, /✔ ElevenLabs/);
			assert.ok(!com.saida.includes('minha-chave-eleven'));
		} finally {
			await f.fechar();
		}
	});

	it('explica cada falha em português e aponta o passo do guia', async () => {
		const casos: [Opcoes['falhas'], string, RegExp][] = [
			[{eleven: 401}, 'elevenlabs', /✘ ElevenLabs.*Passo 1/s],
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

	it('rede bloqueada vira uma mensagem sobre Allowed domains', async () => {
		const r = await rodar(montarRaiz(), 'http://127.0.0.1:1', 'conectar.ts', ['--so=elevenlabs']);
		assert.equal(r.codigo, 1);
		assert.match(r.saida, /não consegui conectar em 127\.0\.0\.1:1.*Allowed domains/s);
	});
});

describe('vozes', () => {
	let falso: Awaited<ReturnType<typeof subir>>;
	before(async () => {
		falso = await subir();
	});
	after(() => falso.fechar());

	it('gera fala por fala, grava o alinhamento e o resolver passa a usar os tempos reais', async () => {
		const raiz = montarRaiz();
		const r = await rodar(raiz, falso.base, 'vozes.ts', ['ilha-perdida', '1']);
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

		// voz certa por personagem, com ênfase em minúsculas e contexto das falas vizinhas
		const porVoz = falso.registro.voz;
		assert.equal(porVoz.length, ids.length);
		const f2 = porVoz.find((v) => String(v.corpo.text).includes('Três dias sem comida'))!;
		assert.equal(f2.vozId, 'voz-leo');
		assert.ok(String(f2.corpo.next_text).startsWith('Até que'), 'next_text da fala vizinha do mesmo personagem');
		const quieto = porVoz.find((v) => String(v.corpo.text).includes('Quieto'))!;
		assert.match(String(quieto.corpo.text), /Quieto demais\./, 'MAIÚSCULAS vão minúsculas para a voz');
		const bia = porVoz.find((v) => v.vozId === 'voz-bia')!;
		const settings = bia.corpo.voice_settings as {speed: number; stability: number};
		assert.ok(settings.speed < 0.9, 'sussurro e velocidade 0.9 deixam a fala mais lenta');
		assert.equal(bia.corpo.language_code, undefined, 'o modelo multilingual_v2 não aceita language_code');
	});

	it('na segunda rodada usa o cache e não chama a API de novo', async () => {
		const raiz = montarRaiz();
		await rodar(raiz, falso.base, 'vozes.ts', ['ilha-perdida', '1']);
		const antes = falso.registro.voz.length;
		const r = await rodar(raiz, falso.base, 'vozes.ts', ['ilha-perdida', '1']);
		assert.match(r.saida, /0 para gerar/);
		assert.equal(falso.registro.voz.length, antes);
	});

	it('recusa um episódio grande demais antes de gastar créditos', async () => {
		const r = await rodar(montarRaiz(), falso.base, 'vozes.ts', ['ilha-perdida', '1'], {ELEVENLABS_MAX_CARACTERES: '100'});
		assert.equal(r.codigo, 1);
		assert.match(r.saida, /passam do limite de segurança/);
	});

	it('personagem sem voz escolhida diz qual comando rodar', async () => {
		const raiz = montarRaiz();
		const arq = join(raiz, 'public', 'series', 'ilha-perdida', 'biblia.json');
		const b = JSON.parse(readFileSync(arq, 'utf8')) as Biblia;
		delete b.personagens.bia.voz!.elevenlabs_id;
		writeFileSync(arq, JSON.stringify(b));
		const r = await rodar(raiz, falso.base, 'vozes.ts', ['ilha-perdida', '1']);
		assert.equal(r.codigo, 1);
		assert.match(r.saida, /"bia" ainda não tem voz.*escolher-voz\.ts ilha-perdida bia/s);
	});

	it('escolher-voz busca candidatas pelo perfil da bíblia, baixa amostras e grava a escolhida', async () => {
		const raiz = montarRaiz();
		const arq = join(raiz, 'public', 'series', 'ilha-perdida', 'biblia.json');
		const b = JSON.parse(readFileSync(arq, 'utf8')) as Biblia;
		delete b.personagens.bia.voz!.elevenlabs_id;
		writeFileSync(arq, JSON.stringify(b));
		const r = await rodar(raiz, falso.base, 'escolher-voz.ts', ['ilha-perdida', 'bia']);
		assert.equal(r.codigo, 0, r.saida);
		assert.match(r.saida, /1\. \*\*Voz 2\*\*.*female, young/, 'a profissional vem primeiro e o perfil é de moça jovem');
		assert.ok(existsSync(join(raiz, 'out', 'vozes-candidatas', 'ilha-perdida-bia', 'candidatas.md')));
		const u = await rodar(raiz, falso.base, 'escolher-voz.ts', ['ilha-perdida', 'bia', '--usar=dono2:voz2']);
		assert.equal(u.codigo, 0, u.saida);
		const depois = JSON.parse(readFileSync(arq, 'utf8')) as Biblia;
		assert.equal(depois.personagens.bia.voz!.elevenlabs_id, 'minha-voz2');
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

describe('fila de publicação', () => {
	const git = (cwd: string, ...args: string[]) => execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();

	it('enfileira num ramo à parte, só publica na hora marcada e não repete', async () => {
		const falso = await subir({processamentosAntes: 1});
		try {
			const remoto = mkdtempSync(join(tmpdir(), 'shorts-remoto-'));
			git(remoto, 'init', '--quiet', '--bare', '-b', 'main');
			const extra = {SHORTS_REMOTO: remoto};

			// sessão de produção (3h): enfileira para as 18h de Brasília
			const producao = montarRaiz();
			const a = await rodar(producao, falso.base, 'dados.ts', ['enfileirar', 'ilha-perdida', '1', '--dia=2026-10-26', '--hora=18:00'], extra);
			assert.equal(a.codigo, 0, a.saida);
			assert.match(a.saida, /publica a partir de 2026-10-26T21:00:00.000Z/);

			// rotina de publicação numa raiz limpa, que só tem o código
			const rotina = mkdtempSync(join(tmpdir(), 'shorts-rotina-'));
			const cedo = await rodar(rotina, falso.base, 'dados.ts', ['publicar-pendentes', '--agora=2026-10-26T20:59:00Z'], extra);
			assert.equal(cedo.codigo, 0, cedo.saida);
			assert.match(cedo.saida, /nada para publicar agora/);
			assert.equal(falso.registro.youtubeMetadados.length, 0);

			const hora = await rodar(rotina, falso.base, 'dados.ts', ['publicar-pendentes', '--agora=2026-10-26T21:00:30Z'], extra);
			assert.equal(hora.codigo, 0, hora.saida);
			assert.match(hora.saida, /YouTube: enviado \(public\)/);
			assert.match(hora.saida, /Instagram: Reel publicado/);
			assert.equal((falso.registro.youtubeMetadados[0] as {status: Record<string, unknown>}).status.privacyStatus, 'public');
			assert.deepEqual(falso.registro.youtubeBytes, [4096]);

			const de_novo = await rodar(rotina, falso.base, 'dados.ts', ['publicar-pendentes', '--agora=2026-10-26T22:00:00Z'], extra);
			assert.match(de_novo.saida, /nada para publicar agora/);
			assert.equal(falso.registro.instagramPublicados.length, 1);

			// o vídeo sai do ramo depois de publicado, e o estado registra as duas redes
			const conferir = mkdtempSync(join(tmpdir(), 'shorts-conferir-'));
			git(conferir, 'clone', '--quiet', '--branch', 'dados', remoto, conferir);
			assert.ok(!existsSync(join(conferir, 'fila', 'ilha-perdida-ep01.mp4')));
			const estado = JSON.parse(readFileSync(join(conferir, 'series', 'ilha-perdida', 'estado.json'), 'utf8')) as {publicados: Record<string, {youtube?: unknown; instagram?: unknown}>};
			assert.ok(estado.publicados['1'].youtube && estado.publicados['1'].instagram);
			assert.equal((JSON.parse(readFileSync(join(conferir, 'fila', 'ilha-perdida-ep01.json'), 'utf8')) as {status: string}).status, 'publicado');
		} finally {
			await falso.fechar();
		}
	});

	it('baixar e salvar levam as séries de uma sessão para a outra', async () => {
		const falso = await subir();
		try {
			const remoto = mkdtempSync(join(tmpdir(), 'shorts-remoto-'));
			git(remoto, 'init', '--quiet', '--bare', '-b', 'main');
			const extra = {SHORTS_REMOTO: remoto};
			const a = montarRaiz();
			assert.equal((await rodar(a, falso.base, 'dados.ts', ['salvar', 'ilha-perdida'], extra)).codigo, 0);
			const b = mkdtempSync(join(tmpdir(), 'shorts-b-'));
			const r = await rodar(b, falso.base, 'dados.ts', ['baixar'], extra);
			assert.equal(r.codigo, 0, r.saida);
			assert.ok(existsSync(join(b, 'public', 'series', 'ilha-perdida', 'ep01.json')));
		} finally {
			await falso.fechar();
		}
	});
});
