import React from 'react';
import {CalculateMetadataFunction, Composition, staticFile} from 'remotion';
import {Episodio, PropsEpisodio} from './Episodio';
import {resolverEpisodio} from './roteiro/resolver';
import type {Alinhamentos, Biblia, Episodio as Roteiro} from './roteiro/tipos';

export const FPS = 30;

const nomeEpisodio = (parte: number) => `ep${String(parte).padStart(2, '0')}`;

const carregar: CalculateMetadataFunction<PropsEpisodio> = async ({props, abortSignal}) => {
	const pasta = `series/${props.serie}`;
	const ler = async <T,>(caminho: string): Promise<T> => {
		const r = await fetch(staticFile(caminho), {signal: abortSignal});
		if (!r.ok) throw new Error(`Não achei ${caminho} (${r.status})`);
		return (await r.json()) as T;
	};
	const biblia = await ler<Biblia>(`${pasta}/biblia.json`);
	const ep = await ler<Roteiro>(`${pasta}/${nomeEpisodio(props.parte)}.json`);
	let alinhamentos: Alinhamentos = {};
	const r = await fetch(staticFile(`${pasta}/vozes/${nomeEpisodio(props.parte)}.json`), {signal: abortSignal});
	if (r.ok) alinhamentos = (await r.json()) as Alinhamentos;
	const linha = resolverEpisodio(ep, biblia, alinhamentos);
	return {
		durationInFrames: Math.ceil(linha.duracao * FPS),
		props: {...props, linha, semVoz: Object.keys(alinhamentos).length === 0},
	};
};

export const RemotionRoot: React.FC = () => (
	<Composition
		id="Episodio"
		component={Episodio}
		fps={FPS}
		width={1080}
		height={1920}
		durationInFrames={FPS * 60}
		defaultProps={{serie: 'ilha-perdida', parte: 1}}
		calculateMetadata={carregar}
	/>
);
