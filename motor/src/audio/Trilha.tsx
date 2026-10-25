// Áudio do episódio: vozes (quando já foram geradas), efeitos sonoros do roteiro, passos do
// gigante, som ambiente de cada cena e música de fundo que abaixa quando alguém fala.
import {Audio} from '@remotion/media';
import React from 'react';
import {Sequence, staticFile, useVideoConfig} from 'remotion';
import {simulacao} from '../animacao/simulacao';
import type {LinhaDoTempo} from '../roteiro/tipos';
import {clamp, smoothstep} from '../util/mat';

export const arquivoSom = (nome: string) => `sons/${nome}.wav`;
export const arquivoAmbiente = (nome: string) => `ambiente/${nome}.wav`;
export const arquivoMusica = (nome: string) => `musica/${nome}.wav`;

/** Todos os arquivos de som que o episódio usa (para gerar os que faltam antes do render). */
export const sonsDoEpisodio = (linha: LinhaDoTempo) => {
	const lista = new Set<string>();
	for (const c of linha.cenas) {
		for (const s of c.sons) lista.add(arquivoSom(s.som));
		if (c.ambiente) lista.add(arquivoAmbiente(c.ambiente));
		if (simulacao(linha, c).passosGigante.length) lista.add(arquivoSom('passo_gigante'));
	}
	if (linha.musica) lista.add(arquivoMusica(linha.musica));
	return [...lista];
};

export const Trilha: React.FC<{linha: LinhaDoTempo}> = ({linha}) => {
	const {fps} = useVideoConfig();
	const fr = (s: number) => Math.max(0, Math.round(s * fps));
	const falando = (t: number) => linha.falas.some((f) => t >= f.ini - 0.1 && t <= f.fim + 0.2);
	const total = fr(linha.duracao);
	return (
		<>
			{linha.falas
				.filter((f) => f.audio)
				.map((f) => (
					<Sequence key={f.id} from={fr(f.ini)} layout="none">
						<Audio src={staticFile(f.audio!)} />
					</Sequence>
				))}
			{linha.cenas.flatMap((c) =>
				c.sons.map((s, i) => (
					<Sequence key={`${c.id}-som-${i}`} from={fr(s.ini)} layout="none">
						<Audio src={staticFile(arquivoSom(s.som))} volume={s.volume ?? 1} />
					</Sequence>
				)),
			)}
			{linha.cenas.flatMap((c) =>
				simulacao(linha, c).passosGigante.map((p, i) => (
					<Sequence key={`${c.id}-passo-${i}`} from={fr(p.t)} layout="none">
						<Audio src={staticFile(arquivoSom('passo_gigante'))} volume={0.85} />
					</Sequence>
				)),
			)}
			{linha.cenas.map((c) =>
				c.ambiente ? (
					<Sequence key={`${c.id}-amb`} from={fr(c.ini)} durationInFrames={Math.max(1, fr(c.fim) - fr(c.ini))} layout="none">
						<Audio
							src={staticFile(arquivoAmbiente(c.ambiente))}
							loop
							volume={(f) => {
								const t = f / fps;
								const d = c.fim - c.ini;
								return 0.4 * smoothstep(0, 0.25, t) * (1 - smoothstep(d - 0.25, d, t));
							}}
						/>
					</Sequence>
				) : null,
			)}
			{linha.musica ? (
				<Sequence from={0} durationInFrames={total} layout="none">
					<Audio
						src={staticFile(arquivoMusica(linha.musica))}
						loop
						volume={(f) => {
							const t = f / fps;
							const base = t >= linha.chamada.ini ? 0.42 : falando(t) ? 0.16 : 0.28;
							return base * clamp(t / 0.4) * (1 - smoothstep(linha.duracao - 0.5, linha.duracao, t));
						}}
					/>
				</Sequence>
			) : null}
		</>
	);
};
