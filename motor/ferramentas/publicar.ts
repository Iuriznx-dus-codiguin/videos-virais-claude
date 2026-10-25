// Publica um episódio já renderizado no YouTube (agendado) e no Instagram (na hora).
// Uso: npx tsx ferramentas/publicar.ts <serie> <parte> [--video=caminho.mp4]
//        [--youtube] [--instagram]              (sem nenhuma, vai para as duas)
//        [--agendar=2026-10-26T21:00:00Z]       horário do YouTube em UTC (18h de Brasília = 21h UTC)
//        [--teste]                              YouTube privado e sem agendar; não mexe no estado
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {PASTA_SERIES, RAIZ} from './lib/caminhos.ts';
import {lerEstado, gravarEstado} from './lib/estado.ts';
import {apagarPublico, subirPublico} from './publicar/armazenamento.ts';
import {publicarReel} from './publicar/instagram.ts';
import {textosDoEpisodio} from './publicar/texto.ts';
import {enviarYoutube} from './publicar/youtube.ts';
import {nomeEpisodio} from './validar.ts';
import type {Biblia, Episodio} from '../src/roteiro/tipos.ts';

const main = async () => {
	const args = process.argv.slice(2);
	const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
	const [serie, parteTxt] = args.filter((a) => !a.startsWith('--'));
	if (!serie || !parteTxt) {
		console.error('uso: npx tsx ferramentas/publicar.ts <serie> <parte> [--video=...] [--youtube] [--instagram] [--agendar=ISO] [--teste]');
		process.exit(2);
	}
	const parte = Number(parteTxt);
	const teste = 'teste' in opc;
	const quer = {youtube: 'youtube' in opc || !('instagram' in opc), instagram: 'instagram' in opc || !('youtube' in opc)};
	const video = opc.video ?? join(RAIZ, 'out', `${serie}-${nomeEpisodio(parte)}.mp4`);
	if (!existsSync(video)) throw new Error(`Não achei o vídeo ${video}. Rode o render antes.`);

	const pasta = join(PASTA_SERIES, serie);
	const biblia = JSON.parse(readFileSync(join(pasta, 'biblia.json'), 'utf8')) as Biblia;
	const ep = JSON.parse(readFileSync(join(pasta, `${nomeEpisodio(parte)}.json`), 'utf8')) as Episodio;
	const t = textosDoEpisodio(biblia, ep);
	const estado = lerEstado(serie);
	const feito = estado.publicados[String(parte)] ?? {em: new Date().toISOString()};

	if (quer.youtube) {
		if (feito.youtube && !teste) console.log(`YouTube: parte ${parte} já enviada (${feito.youtube.url}), pulando`);
		else {
			const agendar = teste ? undefined : opc.agendar;
			const privacidade = teste || agendar ? 'private' : 'public';
			const r = await enviarYoutube(video, {titulo: t.tituloYoutube, descricao: t.descricaoYoutube, tags: t.tags, privacidade, agendarEm: agendar});
			console.log(`YouTube: enviado (${privacidade}${agendar ? `, vira público em ${agendar}` : ''}): ${r.url}`);
			if (!teste) {
				feito.youtube = {id: r.id, url: r.url, agendado_para: agendar, privacidade};
				estado.publicados[String(parte)] = feito;
				gravarEstado(serie, estado);
			}
		}
	}
	if (quer.instagram) {
		if (feito.instagram && !teste) console.log(`Instagram: parte ${parte} já publicada, pulando`);
		else {
			const link = await subirPublico(video);
			try {
				const r = await publicarReel(link, t.legendaInstagram);
				console.log(`Instagram: Reel publicado${r.url ? `: ${r.url}` : ''}`);
				if (!teste) {
					feito.instagram = {id: r.id, url: r.url};
					estado.publicados[String(parte)] = feito;
					gravarEstado(serie, estado);
				}
			} finally {
				await apagarPublico(link).catch(() => undefined);
			}
		}
	}
};

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
