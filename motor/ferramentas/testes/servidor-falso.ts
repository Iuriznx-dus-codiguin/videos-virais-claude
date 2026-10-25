// Servidor local que imita, com o formato descrito na documentação de cada API, o que os
// módulos de publicação chamam. Confere cabeçalhos e campos obrigatórios e guarda o que
// recebeu para os testes olharem. Não prova que o serviço real aceita; prova que o nosso código
// monta os pedidos e entende as respostas.
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';

export interface Registro {
	youtubeMetadados: Record<string, unknown>[];
	youtubeBytes: number[];
	instagramMedia: Record<string, string>[];
	instagramPublicados: string[];
	blobs: Map<string, Buffer>;
	apagados: string[];
}

export interface Opcoes {
	/** respostas de erro por rota (para testar mensagens) */
	falhas?: Partial<Record<'googleToken' | 'canal' | 'instagramMe' | 'instagramStatus', number>>;
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
	const registro: Registro = {youtubeMetadados: [], youtubeBytes: [], instagramMedia: [], instagramPublicados: [], blobs: new Map(), apagados: []};
	let consultas = 0;
	let base = '';
	const servidor: Server = createServer(async (req, res) => {
		const url = new URL(req.url ?? '/', 'http://x');
		const p = url.pathname;
		const corpo = await ler(req);
		const falha = (n: keyof NonNullable<Opcoes['falhas']>) => op.falhas?.[n];

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
