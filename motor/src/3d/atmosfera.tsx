// Vida própria de cada cenário, sem o roteiro pedir: poeira na luz, feixes de refletor e de sol,
// folhas caindo, vaga-lumes à noite. Dá profundidade e movimento ao quadro mesmo nos planos
// parados. A cena pode desligar com "atmosfera": false.
import React from 'react';
import type {CenaTempo} from '../roteiro/tipos';
import {FeixeLuz, Particulas} from './particulas';

export const Atmosfera: React.FC<{cena: CenaTempo; t: number}> = ({cena, t}) => {
	if (!cena.atmosfera) return null;
	const noite = cena.luz === 'noite';
	const p = (chave: string, particula: string, x: number, z: number, alt: number, raio: number, altura: number, quantas: number, cor?: string) => (
		<Particulas key={chave} chave={`atm-${cena.cenario}-${chave}`} particula={particula} x={x} z={z} alt={alt} raio={raio} altura={altura} quantas={quantas} cor={cor} t={t} ini={-1000} />
	);
	switch (cena.cenario) {
		case 'estudio':
			return (
				<>
					<FeixeLuz de={[-4.0, 2.75, -3.0]} para={[-0.3, 0.9, 0.2]} largura={1.1} cor="#BFE3FF" intensidade={0.32} varrer={0} t={t} />
					<FeixeLuz de={[4.0, 2.75, -3.0]} para={[0.3, 0.9, 0.2]} largura={1.1} cor="#BFE3FF" intensidade={0.32} varrer={0} t={t} />
					{p('poeira', 'poeira', 0, -0.5, 0.2, 4.2, 4.5, 80, '#A9DCFF')}
				</>
			);
		case 'oficina':
			return (
				<>
					<FeixeLuz de={[-2.6, 2.1, -3.0]} para={[-0.6, 0, 0.6]} largura={1.4} cor="#FFE2A8" intensidade={0.3} varrer={0} t={t} />
					{p('poeira', 'poeira', -1.2, -0.8, 0.2, 2.2, 2.6, 90, '#FFE9C2')}
				</>
			);
		case 'cabine':
			return p('poeira', 'poeira', 0, 0, 0.25, 1.3, 1.45, 90, '#FFEBD0');
		case 'raizes':
			return p('poeira', 'poeira', 0, 0, 0.2, 1.4, 1.9, 45, '#D8C7A8');
		case 'adega':
			return p('poeira', 'poeira', 0, 0.5, 0.3, 2.2, 2.2, 60, '#FFE2B0');
		case 'selva':
			return noite ? (
				p('vagalumes', 'vagalumes', 0, 0, 0, 7, 2.2, 32)
			) : (
				<>
					{p('folhas', 'folhas', 0, 0.5, 0, 6.5, 7.5, 26)}
					<FeixeLuz de={[-5.5, 13, -6]} para={[-1.2, 0, 0.8]} largura={1.6} cor="#FFD99A" intensidade={0.26} varrer={0} t={t} />
					<FeixeLuz de={[4.5, 13, -3]} para={[2.2, 0, 2.6]} largura={1.2} cor="#FFD99A" intensidade={0.2} varrer={0} t={t} />
				</>
			);
		case 'praia':
			return noite ? p('vagalumes', 'vagalumes', 1, -4.5, 0, 6, 2, 24) : null;
		default:
			return null;
	}
};
