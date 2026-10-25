// Leitura das chaves e endereços das APIs. As chaves vêm do ambiente de nuvem do projeto
// (variáveis ou segredos de rede) e nunca são impressas.
export const env = (nome: string): string | undefined => process.env[nome]?.trim() || undefined;

/** Se SHORTS_BASE_FALSA estiver definida, todas as APIs apontam para o servidor de testes local. */
const falsa = env('SHORTS_BASE_FALSA');

export const URLS = {
	eleven: falsa ? `${falsa}/eleven` : 'https://api.elevenlabs.io',
	googleToken: falsa ? `${falsa}/google/token` : 'https://oauth2.googleapis.com/token',
	googleApis: falsa ? `${falsa}/google` : 'https://www.googleapis.com',
	instagram: falsa ? `${falsa}/instagram` : 'https://graph.instagram.com',
	/** só existe em teste: o Vercel Blob de verdade é acessado pelo SDK */
	blobFalso: `${falsa ?? ''}/blob`,
};

export const emTeste = () => falsa !== undefined;

/** Nomes das variáveis que guardam segredos (para esconder em mensagens de erro). */
const SEGREDOS = [
	'ELEVENLABS_API_KEY',
	'YOUTUBE_CLIENT_SECRET',
	'YOUTUBE_REFRESH_TOKEN',
	'INSTAGRAM_ACCESS_TOKEN',
	'BLOB_READ_WRITE_TOKEN',
];

export const ocultar = (texto: string): string => {
	let t = texto;
	for (const n of SEGREDOS) {
		const v = env(n);
		if (v && v.length > 6) t = t.split(v).join(`***${n}***`);
	}
	return t;
};

export const exigir = (nome: string, passo: string): string => {
	const v = env(nome);
	if (!v) throw new Error(`Falta a variável ${nome}. Veja ${passo} no "Guia: conectar as chaves de API ao projeto".`);
	return v;
};
