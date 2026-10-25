// Instagram (API com login do Instagram): cria o contêiner do Reel a partir de um link público,
// espera o processamento e publica. O Instagram não agenda por API: publica na hora em que roda.
import {URLS, env, exigir} from '../lib/ambiente.ts';
import {ErroApi, esperar, pedirJson} from '../lib/rede.ts';

const ESPERA_MS = Number(env('SHORTS_ESPERA_MS') ?? 10_000);

const DICA = 'refaça o Passo 3 do guia (token do Instagram; ele vale 60 dias)';
const ACESSO = /access token|OAuthException|"code":\s*190/i;

const token = () => exigir('INSTAGRAM_ACCESS_TOKEN', 'o Passo 3, item 12');
const idConta = () => exigir('INSTAGRAM_USER_ID', 'o Passo 3, item 12');

const post = <T>(caminho: string, campos: Record<string, string>) =>
	pedirJson<T>(`${URLS.instagram}/${caminho}`, {
		servico: 'Instagram',
		method: 'POST',
		headers: {'content-type': 'application/x-www-form-urlencoded'},
		body: new URLSearchParams({...campos, access_token: token()}),
		dicaAcesso: DICA,
		acessoRegex: ACESSO,
	});

const get = <T>(caminho: string, campos: Record<string, string>) =>
	pedirJson<T>(`${URLS.instagram}/${caminho}?${new URLSearchParams({...campos, access_token: token()})}`, {servico: 'Instagram', dicaAcesso: DICA, acessoRegex: ACESSO});

export const contaInstagram = async () => {
	const r = await get<{username: string; account_type?: string}>('me', {fields: 'user_id,username,account_type'});
	return {usuario: r.username, tipo: r.account_type};
};

/** Publicações que ainda cabem nas próximas 24 horas (o limite da API é 100). */
export const restantesInstagram = async (): Promise<number | undefined> => {
	const r = await get<{data?: {quota_usage: number; config?: {quota_total: number}}[]}>(`${idConta()}/content_publishing_limit`, {fields: 'quota_usage,config'});
	const d = r.data?.[0];
	return d ? (d.config?.quota_total ?? 100) - d.quota_usage : undefined;
};

export const publicarReel = async (urlVideo: string, legenda: string): Promise<{id: string; url?: string}> => {
	const c = await post<{id: string}>(`${idConta()}/media`, {media_type: 'REELS', video_url: urlVideo, caption: legenda, share_to_feed: 'true'});
	// consulta a cada 10 s, até 8 minutos
	for (let i = 0; i < 48; i++) {
		const s = await get<{status_code: string; status?: string}>(c.id, {fields: 'status_code,status'});
		if (s.status_code === 'FINISHED') break;
		if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
			throw new ErroApi('Instagram', 200, `o Instagram recusou o vídeo (${s.status ?? s.status_code})`, 'confira se o vídeo é MP4 vertical com áudio AAC e se o link do Blob abre sem login');
		}
		if (i === 47) throw new ErroApi('Instagram', 200, 'o processamento do vídeo passou de 8 minutos');
		await esperar(ESPERA_MS);
	}
	const p = await post<{id: string}>(`${idConta()}/media_publish`, {creation_id: c.id});
	const m = await get<{permalink?: string}>(p.id, {fields: 'permalink'}).catch(() => ({permalink: undefined}));
	return {id: p.id, url: m.permalink};
};
