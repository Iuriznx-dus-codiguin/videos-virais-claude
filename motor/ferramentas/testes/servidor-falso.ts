// Servidor local que imita, com o formato descrito na documentação de cada API, o que os
// módulos de voz e publicação chamam. Confere cabeçalhos e campos obrigatórios e guarda o que
// recebeu para os testes olharem. Não prova que o serviço real aceita; prova que o nosso código
// monta os pedidos e entende as respostas.
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';

export interface Registro {
	voz: {vozId: string; corpo: Record<string, unknown>; chave?: string}[];
	youtubeMetadados: Record<string, unknown>[];
	youtubeBytes: number[];
	instagramMedia: Record<string, string>[];
	instagramPublicados: string[];
	blobs: Map<string, Buffer>;
	apagados: string[];
	voicesAdicionadas: string[];
}

export interface Opcoes {
	/** respostas de erro por rota (para testar mensagens) */
	falhas?: Partial<Record<'eleven' | 'googleToken' | 'canal' | 'instagramMe' | 'instagramStatus', number>>;
	chave?: string;
	processamentosAntes?: number;
}

const ler = (req: IncomingMessage) =>
	new Promise<Buffer>((ok) => {
		const partes: Buffer[] = [];
		req.on('data', (c: Buffer) => partes.push(c));
		req.on('end', () => ok(Buffer.concat(partes)));
	});

const json = (res: ServerResponse, status: number, corpo: unknown, cab: Record<string, string> = {}) => {
	res.writeHead(status, {'content-type': 'application/json', ...cab});
	res.end(JSON.stringify(corpo));
};

export const subir = async (op: Opcoes = {}): Promise<{base: string; registro: Registro; fechar: () => Promise<void>}> => {
	const registro: Registro = {voz: [], youtubeMetadados: [], youtubeBytes: [], instagramMedia: [], instagramPublicados: [], blobs: new Map(), apagados: [], voicesAdicionadas: []};
	let consultas = 0;
	let base = '';
	const servidor: Server = createServer(async (req, res) => {
		const url = new URL(req.url ?? '/', 'http://x');
		const p = url.pathname;
		const corpo = await ler(req);
		const falha = (n: keyof NonNullable<Opcoes['falhas']>) => op.falhas?.[n];

		// --- ElevenLabs ---
		if (p.startsWith('/eleven/')) {
			if (falha('eleven')) return json(res, falha('eleven')!, {detail: {status: 'invalid_api_key', message: 'Invalid API key'}});
			if (op.chave && req.headers['xi-api-key'] !== op.chave) return json(res, 401, {detail: {status: 'needs_authorization'}});
			if (p === '/eleven/v1/models') return json(res, 200, [{model_id: 'eleven_multilingual_v2'}, {model_id: 'eleven_v3'}]);
			if (p === '/eleven/v1/user/subscription') return json(res, 200, {character_count: 1200, character_limit: 100000});
			const tts = /^\/eleven\/v1\/text-to-speech\/([^/]+)\/with-timestamps$/.exec(p);
			if (tts && req.method === 'POST') {
				const c = JSON.parse(corpo.toString()) as {text: string; model_id: string};
				if (!c.text || !c.model_id) return json(res, 422, {detail: 'text e model_id são obrigatórios'});
				if (url.searchParams.get('output_format') !== 'mp3_44100_128') return json(res, 422, {detail: 'output_format inesperado'});
				registro.voz.push({vozId: tts[1], corpo: c});
				const caracteres = [...c.text];
				const ini = caracteres.map((_, i) => +(i * 0.06).toFixed(3));
				const fim = caracteres.map((_, i) => +((i + 1) * 0.06).toFixed(3));
				return json(res, 200, {audio_base64: Buffer.from('ID3-falso').toString('base64'), alignment: {characters: caracteres, character_start_times_seconds: ini, character_end_times_seconds: fim}});
			}
			if (p === '/eleven/v1/shared-voices') {
				const q = url.searchParams;
				if (q.get('language') !== 'pt') return json(res, 422, {detail: 'language esperado pt'});
				return json(res, 200, {
					voices: [1, 2, 3].map((i) => ({
						public_owner_id: `dono${i}`,
						voice_id: `voz${i}`,
						name: `Voz ${i}`,
						gender: q.get('gender'),
						age: q.get('age'),
						category: i === 2 ? 'professional' : 'generated',
						use_case: 'narrative_story',
						cloned_by_count: 100 * i,
						preview_url: `${base}/eleven/preview/${i}.mp3`,
					})),
					has_more: false,
				});
			}
			if (/^\/eleven\/preview\/\d\.mp3$/.test(p)) {
				res.writeHead(200, {'content-type': 'audio/mpeg'});
				return res.end('ID3-amostra');
			}
			const add = /^\/eleven\/v1\/voices\/add\/([^/]+)\/([^/]+)$/.exec(p);
			if (add && req.method === 'POST') {
				registro.voicesAdicionadas.push(`${add[1]}:${add[2]}`);
				return json(res, 200, {voice_id: `minha-${add[2]}`});
			}
		}

		// --- Google ---
		if (p === '/google/token' && req.method === 'POST') {
			if (falha('googleToken')) return json(res, falha('googleToken')!, {error: 'invalid_grant', error_description: 'Token has been expired or revoked.'});
			const f = new URLSearchParams(corpo.toString());
			for (const campo of ['client_id', 'client_secret', 'refresh_token']) if (!f.get(campo)) return json(res, 400, {error: `falta ${campo}`});
			if (f.get('grant_type') !== 'refresh_token') return json(res, 400, {error: 'grant_type'});
			return json(res, 200, {access_token: 'acesso-falso', expires_in: 3599, token_type: 'Bearer'});
		}
		if (p === '/google/youtube/v3/channels') {
			if (falha('canal')) return json(res, falha('canal')!, {error: {message: 'forbidden'}});
			if (req.headers.authorization !== 'Bearer acesso-falso') return json(res, 401, {error: {message: 'sem acesso'}});
			return json(res, 200, {items: [{snippet: {title: 'Canal de Teste'}}]});
		}
		if (p === '/google/upload/youtube/v3/videos' && req.method === 'POST') {
			if (url.searchParams.get('uploadType') !== 'resumable' || url.searchParams.get('part') !== 'snippet,status') return json(res, 400, {error: 'parâmetros'});
			if (req.headers.authorization !== 'Bearer acesso-falso') return json(res, 401, {error: {message: 'sem acesso'}});
			if (!req.headers['x-upload-content-length'] || req.headers['x-upload-content-type'] !== 'video/mp4') return json(res, 400, {error: 'cabeçalhos de upload'});
			registro.youtubeMetadados.push(JSON.parse(corpo.toString()) as Record<string, unknown>);
			res.writeHead(200, {location: `${base}/google/upload/sessao/1`});
			return res.end();
		}
		if (p === '/google/upload/sessao/1' && req.method === 'PUT') {
			registro.youtubeBytes.push(corpo.length);
			return json(res, 200, {id: 'abc123XYZ'});
		}

		// --- Instagram ---
		if (p.startsWith('/instagram/')) {
			const token = url.searchParams.get('access_token') ?? new URLSearchParams(corpo.toString()).get('access_token');
			if (token !== 'token-ig-falso') return json(res, 401, {error: {message: 'token inválido'}});
			const resto = p.slice('/instagram/'.length);
			if (resto === 'me') return falha('instagramMe') ? json(res, falha('instagramMe')!, {error: {message: 'Error validating access token'}}) : json(res, 200, {username: 'canal_teste', account_type: 'MEDIA_CREATOR', user_id: '999'});
			if (resto === '999/content_publishing_limit') return json(res, 200, {data: [{quota_usage: 3, config: {quota_total: 100}}]});
			if (resto === '999/media' && req.method === 'POST') {
				const f = Object.fromEntries(new URLSearchParams(corpo.toString()));
				if (f.media_type !== 'REELS' || !f.video_url || !f.caption) return json(res, 400, {error: {message: 'media_type, video_url e caption'}});
				registro.instagramMedia.push(f);
				return json(res, 200, {id: 'container1'});
			}
			if (resto === 'container1') {
				consultas++;
				if (falha('instagramStatus')) return json(res, 200, {status_code: 'ERROR', status: 'Error: formato não suportado'});
				return json(res, 200, {status_code: consultas > (op.processamentosAntes ?? 0) ? 'FINISHED' : 'IN_PROGRESS'});
			}
			if (resto === '999/media_publish' && req.method === 'POST') {
				const f = new URLSearchParams(corpo.toString());
				if (f.get('creation_id') !== 'container1') return json(res, 400, {error: {message: 'creation_id'}});
				registro.instagramPublicados.push('media1');
				return json(res, 200, {id: 'media1'});
			}
			if (resto === 'media1') return json(res, 200, {permalink: 'https://www.instagram.com/reel/XYZ/'});
		}

		// --- armazenamento falso ---
		if (p.startsWith('/blob/files/') && req.method === 'GET') {
			const b = registro.blobs.get(p.slice('/blob/files/'.length));
			if (!b) return json(res, 404, {error: 'não achei'});
			res.writeHead(200, {'content-type': 'video/mp4'});
			return res.end(b);
		}
		if (p.startsWith('/blob/files/') && req.method === 'DELETE') {
			const nome = p.slice('/blob/files/'.length);
			registro.blobs.delete(nome);
			registro.apagados.push(nome);
			return json(res, 200, {});
		}
		if (p.startsWith('/blob/') && req.method === 'PUT') {
			const nome = p.slice('/blob/'.length);
			registro.blobs.set(nome, corpo);
			return json(res, 200, {url: `${base}/blob/files/${nome}`});
		}
		return json(res, 404, {error: `rota não prevista no servidor falso: ${req.method} ${p}`});
	});
	await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
	base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
	return {base, registro, fechar: () => new Promise((ok) => servidor.close(() => ok()))};
};
