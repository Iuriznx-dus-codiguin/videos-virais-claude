// Testes da fila de publicação: horários do lote (atrasados, já programados, trocas) e o caminho completo
// num repositório local (lote com capa, marcar, entrega nova depois de programado).
// Uso: npx tsx --test ferramentas/testes/fila.test.ts
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, describe, it} from 'node:test';
import {conferirLimites, lerTextos, planejar, textoDoHorario, utcDeBrasilia, type ItemFila, type Publicacao} from '../fila.ts';

const MOTOR = join(import.meta.dirname, '..', '..');
const B = (dia: string, hora: string) => utcDeBrasilia(dia, hora);
const iso = (dia: string, hora: string) => new Date(B(dia, hora)).toISOString();

const MD = `# APARTAMENTO 0 · Parte 3: O livro

**Postar em 14/11/2026 às 18:00 (Brasília)** · vídeo: apartamento-0-ep03.mp4

## YouTube Shorts
Título: 48 vagas na garagem e 49 carros às 3h da manhã | APARTAMENTO 0 noite 3

Terceira noite do porteiro novo.

Comenta "NOITE 4" que eu continuo a história!

#apartamento0 #porteiro #historiadeterror #misterio #animacao #shorts

## Instagram Reels
Terceira noite do porteiro novo.

O Jorge fugiu? Segue o perfil pra não perder a noite 4.

#apartamento0 #porteiro #historiadeterror #misterio #animacao

## Na hora de postar
- Capa (nas duas): quadro de 1,5 s do vídeo, quando a legenda mostra "PÁGINAS".
- YouTube, "Vídeo relacionado": APARTAMENTO 0 · Parte 2.
- YouTube, playlist: APARTAMENTO 0 (em ordem).
- Comentário para postar e fixar nas duas, logo depois de publicar: Eu acho que o Jorge nunca saiu daquele prédio.
`;

const item = (nome: string, planejado: string, extra: Partial<ItemFila> = {}): ItemFila => {
	const [serie, ep] = nome.split(/-ep/);
	return {
		nome,
		serie,
		parte: Number(ep),
		fluxo: serie === 'como-funciona' ? 'avulso:como-funciona' : 'historias',
		planejado,
		video: `blob-${nome}`,
		publicacao: {nome},
		textos: lerTextos(MD),
		...extra,
	};
};

describe('texto de postagem', () => {
	it('lê título, descrição, legenda, capa, playlist e comentário do .md do entregar', () => {
		const t = lerTextos(MD);
		assert.equal(t.rotulo, 'APARTAMENTO 0 · Parte 3: O livro');
		assert.equal(t.tituloYoutube, '48 vagas na garagem e 49 carros às 3h da manhã | APARTAMENTO 0 noite 3');
		assert.match(t.descricaoYoutube, /^Terceira noite[\s\S]*#shorts$/);
		assert.match(t.legendaInstagram, /^Terceira noite[\s\S]*#animacao$/);
		assert.equal(t.segundoDaCapa, 1.5);
		assert.equal(t.relacionado, 'APARTAMENTO 0 · Parte 2');
		assert.equal(t.playlist, 'APARTAMENTO 0 (em ordem)');
		assert.equal(t.comentario, 'Eu acho que o Jorge nunca saiu daquele prédio.');
	});

	it('só mexe no que passa do limite da plataforma', () => {
		const t = lerTextos(MD);
		const ok = conferirLimites(t);
		assert.deepEqual(ok.avisos, []);
		assert.equal(ok.legendaInstagram, t.legendaInstagram);
		assert.deepEqual(ok.tagsYoutube, ['apartamento0', 'porteiro', 'historiadeterror', 'misterio', 'animacao']);
		const muito = conferirLimites({...t, tituloYoutube: 'x'.repeat(120), legendaInstagram: `${t.legendaInstagram} #seis #sete`});
		assert.equal(muito.tituloYoutube.length, 100);
		assert.equal((muito.legendaInstagram.match(/#/g) ?? []).length, 5);
		assert.equal(muito.avisos.length, 2);
	});
});

describe('horários do lote', () => {
	const agora = B('2026-11-14', '10:30'); // sábado

	it('no prazo: sai no horário combinado na entrega', () => {
		const p = planejar([item('apartamento-0-ep03', iso('2026-11-14', '18:00'))], agora);
		assert.equal(p.length, 1);
		assert.equal(textoDoHorario(p[0].horario), 'sáb 14/11 18:00');
		assert.equal(p[0].atrasado, false);
		assert.deepEqual(p[0].acoes, {youtube: 'subir', instagram: 'subir'});
	});

	it('atrasado: próximo horário livre do fluxo, antes da próxima parte, que não muda', () => {
		const p = planejar([item('apartamento-0-ep02', iso('2026-11-14', '11:00')), item('apartamento-0-ep03', iso('2026-11-14', '18:00'))], agora);
		assert.deepEqual(p.map((x) => textoDoHorario(x.horario)), ['sáb 14/11 15:00', 'sáb 14/11 18:00']);
		assert.deepEqual(p.map((x) => x.atrasado), [true, false]);
	});

	it('em dia de semana o primeiro horário extra é 12h e o fluxo avulso não divide horário com as histórias', () => {
		const seg = B('2026-11-16', '09:00');
		const p = planejar([item('voo-818-ep17', iso('2026-11-13', '18:00')), item('voo-818-ep18', iso('2026-11-14', '18:00')), item('como-funciona-ep20', iso('2026-11-15', '18:00'))], seg);
		const h = Object.fromEntries(p.map((x) => [x.item.nome, textoDoHorario(x.horario)]));
		assert.deepEqual(h, {'voo-818-ep17': 'seg 16/11 12:00', 'voo-818-ep18': 'seg 16/11 15:00', 'como-funciona-ep20': 'seg 16/11 12:00'});
	});

	it('muitos atrasados empurram as partes seguintes, em ordem e com 3 h entre elas', () => {
		const itens = [11, 12, 13, 14, 15].map((n, i) => item(`voo-818-ep${n}`, iso('2026-11-10', `${dois(12 + i)}:00`)));
		itens.push(item('voo-818-ep16', iso('2026-11-14', '18:00')));
		const p = planejar(itens, agora);
		const horas = p.map((x) => x.horario);
		assert.deepEqual(p.map((x) => x.item.parte), [11, 12, 13, 14, 15, 16]);
		for (let i = 1; i < horas.length; i++) assert.ok(horas[i] - horas[i - 1] >= 3 * 3_600_000);
		assert.deepEqual(p.map((x) => textoDoHorario(x.horario)), ['sáb 14/11 15:00', 'sáb 14/11 18:00', 'sáb 14/11 21:00', 'dom 15/11 11:00', 'dom 15/11 15:00', 'dom 15/11 18:00']);
	});

	it('já programado fica onde está; a outra plataforma usa o mesmo horário', () => {
		const pub: Publicacao = {nome: 'apartamento-0-ep03', youtube: {status: 'programado', horario: iso('2026-11-14', '18:00'), video: 'blob-apartamento-0-ep03', em: ''}};
		const p = planejar([item('apartamento-0-ep03', iso('2026-11-14', '18:00'), {publicacao: pub})], agora);
		assert.deepEqual(p[0].acoes, {instagram: 'subir'});
		assert.equal(textoDoHorario(p[0].horario), 'sáb 14/11 18:00');
	});

	it('entrega nova depois de programado: trocar; horário que passou: conferir e comentar', () => {
		const prog = (h: string, video: string): Publicacao['youtube'] => ({status: 'programado', horario: h, video, em: ''});
		const trocado = item('apartamento-0-ep03', iso('2026-11-14', '18:00'), {publicacao: {nome: 'apartamento-0-ep03', youtube: prog(iso('2026-11-14', '18:00'), 'blob-velho'), instagram: prog(iso('2026-11-14', '18:00'), 'blob-apartamento-0-ep03')}});
		const saiu = item('apartamento-0-ep01', iso('2026-11-12', '18:00'), {publicacao: {nome: 'apartamento-0-ep01', youtube: prog(iso('2026-11-12', '18:00'), 'blob-apartamento-0-ep01'), instagram: {status: 'publicado', horario: iso('2026-11-12', '18:00'), em: ''}}});
		const manual = item('apartamento-0-ep02', iso('2026-11-13', '18:00'), {publicacao: {nome: 'apartamento-0-ep02', youtube: {status: 'publicado', nota: 'manual', em: ''}, instagram: {status: 'publicado', nota: 'manual', em: ''}}});
		const p = planejar([trocado, saiu, manual], agora);
		assert.deepEqual(Object.fromEntries(p.map((x) => [x.item.nome, x.acoes])), {
			'apartamento-0-ep01': {youtube: 'conferir', instagram: 'comentar'},
			'apartamento-0-ep03': {youtube: 'trocar'},
		});
	});
});

const dois = (n: number) => String(n).padStart(2, '0');

describe('fila num repositório local', () => {
	let base: string;
	let remoto: string;
	let raiz: string;
	const fila = (...args: string[]) =>
		execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', join(MOTOR, 'ferramentas', 'fila.ts'), ...args], {
			encoding: 'utf8',
			env: {...process.env, SHORTS_REMOTO: `file://${remoto}`, SHORTS_RAIZ: raiz, SHORTS_LINK_BASE: 'https://raw.exemplo/dono/repo'},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	const g = (cwd: string, ...a: string[]) => execFileSync('git', a, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
	const noRamo = (caminho: string) => {
		const t = mkdtempSync(join(tmpdir(), 'fila-ver-'));
		try {
			g(t, 'clone', '--quiet', '--branch', 'dados', `file://${remoto}`, '.');
			return readFileSync(join(t, caminho), 'utf8');
		} finally {
			rmSync(t, {recursive: true, force: true});
		}
	};
	const entregar = (trabalho: string, nome: string, dia: string, hora: string, cor: string) => {
		const [serie, ep] = nome.split('-ep');
		execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${cor}:s=108x192:d=3`, '-pix_fmt', 'yuv420p', join(trabalho, 'videos', `${nome}.mp4`)]);
		writeFileSync(join(trabalho, 'videos', `${nome}.json`), JSON.stringify({serie, parte: Number(ep), dia, hora, publicar_apos: iso(dia, hora), status: 'pendente'}));
		writeFileSync(join(trabalho, 'videos', `${nome}.md`), MD);
	};

	before(() => {
		base = mkdtempSync(join(tmpdir(), 'fila-teste-'));
		remoto = join(base, 'remoto.git');
		raiz = join(base, 'raiz');
		mkdirSync(raiz);
		g(base, 'init', '--quiet', '--bare', '-b', 'dados', remoto);
		g(remoto, 'config', 'uploadpack.allowFilter', 'true');
		g(remoto, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
		const trabalho = join(base, 'trabalho');
		mkdirSync(join(trabalho, 'videos'), {recursive: true});
		mkdirSync(join(trabalho, 'series', 'apartamento-0'), {recursive: true});
		writeFileSync(join(trabalho, 'series', 'apartamento-0', 'biblia.json'), '{"titulo":"APARTAMENTO 0"}');
		entregar(trabalho, 'apartamento-0-ep02', '2026-11-14', '11:00', 'red');
		entregar(trabalho, 'apartamento-0-ep03', '2026-11-14', '18:00', 'blue');
		g(trabalho, 'init', '--quiet', '-b', 'dados');
		g(trabalho, 'add', '-A');
		g(trabalho, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--quiet', '-m', 'entregas');
		g(trabalho, 'push', '--quiet', remoto, 'dados');
	});
	after(() => rmSync(base, {recursive: true, force: true}));

	it('lote: horários, capa no ramo e links diretos', () => {
		const saida = fila('lote', '--agora=2026-11-14T13:30:00Z');
		assert.match(saida, /lote: 2 para subir/);
		const lote = JSON.parse(readFileSync(join(raiz, 'out', 'lote', 'lote.json'), 'utf8'));
		assert.deepEqual(lote.itens.map((i: {horario: {texto: string}}) => i.horario.texto), ['sáb 14/11 15:00', 'sáb 14/11 18:00']);
		assert.equal(lote.itens[0].video, `https://raw.exemplo/dono/repo/${lote.commit}/videos/apartamento-0-ep02.mp4`);
		assert.equal(lote.itens[0].capa, `https://raw.exemplo/dono/repo/${lote.commit}/publicacao/capas/apartamento-0-ep02.jpg`);
		assert.match(noRamo('publicacao/capas/apartamento-0-ep02.txt'), /1\.5/);
		assert.match(readFileSync(join(raiz, 'out', 'lote', 'lote.md'), 'utf8'), /\| sáb 14\/11 15:00 \(era sáb 14\/11 11:00\) \|/);
	});

	it('marcar programado guarda o horário do lote e o vídeo subido', () => {
		fila('marcar', 'apartamento-0-ep02', '--youtube=programado', '--instagram=programado', '--url=https://youtube.com/shorts/abc', '--agora=2026-11-14T13:40:00Z');
		const pub = JSON.parse(noRamo('publicacao/apartamento-0-ep02.json'));
		assert.equal(pub.youtube.status, 'programado');
		assert.equal(pub.youtube.horario, iso('2026-11-14', '15:00'));
		assert.match(pub.youtube.video, /^[0-9a-f]{40}$/);
		assert.equal(pub.youtube.url, 'https://youtube.com/shorts/abc');
		const depois = fila('--agora=2026-11-14T13:45:00Z');
		assert.match(depois, /apartamento-0-ep02 .*YT programado sáb 14\/11 15:00/);
		assert.match(depois, /apartamento-0-ep02 .*→ nada a fazer/);
	});

	it('depois que sai: conferir, marcar publicado com comentário', () => {
		assert.match(fila('--agora=2026-11-14T19:00:00Z'), /apartamento-0-ep02 .*YT: conferir, IG: conferir/);
		fila('marcar', 'apartamento-0-ep02', '--youtube=publicado', '--instagram=publicado', '--comentario=youtube,instagram', '--agora=2026-11-14T19:00:00Z');
		assert.match(fila('--agora=2026-11-14T19:05:00Z'), /apartamento-0-ep02 .*→ nada a fazer/);
	});

	it('marcar --ate: o que o Iuri já postou à mão', () => {
		fila('marcar', '--ate=2026-11-14', '--youtube=publicado', '--instagram=publicado', '--nota=manual', '--agora=2026-11-14T13:00:00Z');
		const pub = JSON.parse(noRamo('publicacao/apartamento-0-ep03.json'));
		assert.equal(pub.youtube.nota, 'manual');
		assert.equal(pub.instagram.horario, iso('2026-11-14', '18:00'));
	});

	it('recusa programado no passado', () => {
		assert.throws(() => fila('marcar', 'apartamento-0-ep03', '--youtube=programado', '--horario=2026-11-14T09:00', '--agora=2026-11-14T13:00:00Z'), /já passou/);
	});
});
