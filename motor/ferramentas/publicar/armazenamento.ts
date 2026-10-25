// Link público e temporário do vídeo: a API do Instagram (login do Instagram) só aceita vídeo
// por URL. O arquivo sobe para o Vercel Blob e é apagado depois da publicação.
import {del, put} from '@vercel/blob';
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {URLS, emTeste, exigir} from '../lib/ambiente.ts';
import {pedirJson} from '../lib/rede.ts';

export const subirPublico = async (arquivo: string): Promise<string> => {
	const corpo = readFileSync(arquivo);
	if (emTeste()) {
		const r = await pedirJson<{url: string}>(`${URLS.blobFalso}/${basename(arquivo)}`, {servico: 'Vercel Blob', method: 'PUT', body: corpo});
		return r.url;
	}
	const token = exigir('BLOB_READ_WRITE_TOKEN', 'o Passo 3, item 11');
	try {
		const r = await put(`shorts/${basename(arquivo)}`, corpo, {access: 'public', token, addRandomSuffix: true, contentType: 'video/mp4'});
		return r.url;
	} catch (e) {
		throw new Error(`Vercel Blob: ${e instanceof Error ? e.message : e} (confira o Passo 3, itens 10 e 11, e se *.vercel-storage.com está em Allowed domains)`);
	}
};

export const apagarPublico = async (url: string) => {
	if (emTeste()) {
		await pedirJson(url, {servico: 'Vercel Blob', method: 'DELETE'});
		return;
	}
	await del(url, {token: exigir('BLOB_READ_WRITE_TOKEN', 'o Passo 3, item 11')});
};
