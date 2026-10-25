// YouTube Data API: troca o refresh token por um acesso, envia o vídeo em upload resumable e,
// se pedido, agenda a publicação (o vídeo sobe privado e vira público em publishAt).
import {readFileSync, statSync} from 'node:fs';
import {URLS, exigir} from '../lib/ambiente.ts';
import {ErroApi, pedirBruto, pedirJson} from '../lib/rede.ts';

const DICA = 'refaça o Passo 2 do guia (credencial e refresh token do YouTube)';

export const acessoYoutube = async (): Promise<string> => {
	const corpo = new URLSearchParams({
		client_id: exigir('YOUTUBE_CLIENT_ID', 'o Passo 2, item 15'),
		client_secret: exigir('YOUTUBE_CLIENT_SECRET', 'o Passo 2, item 15'),
		refresh_token: exigir('YOUTUBE_REFRESH_TOKEN', 'o Passo 2, item 15'),
		grant_type: 'refresh_token',
	});
	try {
		const r = await pedirJson<{access_token: string}>(URLS.googleToken, {
			servico: 'Google (login)',
			method: 'POST',
			headers: {'content-type': 'application/x-www-form-urlencoded'},
			body: corpo,
			dicaAcesso: DICA,
		});
		return r.access_token;
	} catch (e) {
		if (e instanceof ErroApi && e.status === 400) {
			throw new ErroApi('Google (login)', 400, 'o refresh token foi recusado', `${DICA}; se o app estava em modo Teste, publique o app (item 6) e gere o token de novo`);
		}
		throw e;
	}
};

export const nomeDoCanal = async (acesso: string): Promise<string> => {
	const r = await pedirJson<{items?: {snippet: {title: string}}[]}>(`${URLS.googleApis}/youtube/v3/channels?part=snippet&mine=true`, {
		servico: 'YouTube',
		headers: {authorization: `Bearer ${acesso}`},
		dicaAcesso: DICA,
	});
	const c = r.items?.[0];
	if (!c) throw new ErroApi('YouTube', 200, 'a conta autorizada não tem canal', 'no item 13 do guia, escolha o canal certo (de marca) na tela de permissão');
	return c.snippet.title;
};

export interface DadosYoutube {
	titulo: string;
	descricao: string;
	tags: string[];
	privacidade: 'private' | 'unlisted' | 'public';
	/** ISO 8601 em UTC; só vale com privacidade private (o vídeo vira público nesse horário) */
	agendarEm?: string;
}

export const enviarYoutube = async (arquivo: string, d: DadosYoutube): Promise<{id: string; url: string}> => {
	const acesso = await acessoYoutube();
	const tamanho = statSync(arquivo).size;
	const metadados = {
		snippet: {title: d.titulo.slice(0, 100), description: d.descricao, tags: d.tags, categoryId: '24', defaultLanguage: 'pt', defaultAudioLanguage: 'pt'},
		status: {
			privacyStatus: d.privacidade,
			...(d.agendarEm ? {publishAt: d.agendarEm} : {}),
			selfDeclaredMadeForKids: false,
			embeddable: true,
			// animação estilizada com personagens de desenho: não é conteúdo realista alterado
			containsSyntheticMedia: false,
		},
	};
	const abrir = await pedirBruto(`${URLS.googleApis}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`, {
		servico: 'YouTube',
		method: 'POST',
		headers: {
			authorization: `Bearer ${acesso}`,
			'content-type': 'application/json; charset=UTF-8',
			'x-upload-content-length': String(tamanho),
			'x-upload-content-type': 'video/mp4',
		},
		body: JSON.stringify(metadados),
	});
	if (!abrir.ok) {
		throw new ErroApi('YouTube', abrir.status, `não abriu o envio: ${(await abrir.text()).slice(0, 300)}`, abrir.status === 403 ? 'confira se a YouTube Data API v3 está ativada (Passo 2, item 4) e se o limite diário de envios não acabou' : undefined);
	}
	const destino = abrir.headers.get('location');
	if (!destino) throw new ErroApi('YouTube', abrir.status, 'a resposta não trouxe o endereço de envio');
	const video = await pedirJson<{id: string}>(destino, {
		servico: 'YouTube',
		method: 'PUT',
		headers: {'content-type': 'video/mp4'},
		body: readFileSync(arquivo),
		timeoutMs: 600_000,
	});
	return {id: video.id, url: `https://youtube.com/shorts/${video.id}`};
};

/** Lê o estado do vídeo (privacidade e se o YouTube travou em privado). */
export const statusYoutube = async (id: string) => {
	const acesso = await acessoYoutube();
	const r = await pedirJson<{items?: {status: {privacyStatus: string; publishAt?: string; uploadStatus: string}}[]}>(
		`${URLS.googleApis}/youtube/v3/videos?part=status&id=${id}`,
		{servico: 'YouTube', headers: {authorization: `Bearer ${acesso}`}},
	);
	return r.items?.[0]?.status;
};
