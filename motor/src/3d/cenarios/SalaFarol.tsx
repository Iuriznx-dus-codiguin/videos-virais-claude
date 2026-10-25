// Sala da lâmpada no alto do farol: sala redonda envidraçada, a lente enorme no meio, um painel
// com o rádio e a chave do SOS, e a porta da escada. Lá fora, o céu (e a tempestade, com o efeito chuva).
// A lente acende conforme o objeto luz_farol (modo acesa, sos ou apagada); sem ele, fica apagada.
import React from 'react';
import {Malha, caixa, cilindro, cone, disco, toon, translucido} from '../base';

const R = 3.2;

export const SalaFarol: React.FC<{t: number; nomeClima: string}> = React.memo(() => (
	<>
		{/* lá embaixo, o mar e as pedras (vistos pelas janelas) */}
		<mesh geometry={disco(300, 32)} material={toon('#1E3C5C')} position={[0, -24, 0]} />
		{/* piso e parede baixa */}
		<Malha g={disco(R + 0.3, 32)} m={toon('#5A4636')} position={[0, 0.001, 0]} sombra={false} />
		<Malha g={cilindro(R + 0.2, R + 0.2, 1.0, 32, )} m={toon('#C8372D')} position={[0, -0.5, 0]} sombra={false} />
		<Malha g={cilindro(R, R, 0.9, 32)} m={toon('#E9E4D8')} position={[0, 0.45, 0]} sombra={false} />
		{/* janelas: vidro escuro com caixilhos */}
		<mesh geometry={cilindro(R, R, 2.2, 32)} material={translucido('#9FB7D8', 0.12)} position={[0, 2.0, 0]} />
		{Array.from({length: 10}, (_, i) => {
			const a = (i / 10) * Math.PI * 2;
			return <Malha key={i} g={caixa(0.08, 2.2, 0.08)} m={toon('#2B2F3A')} position={[Math.cos(a) * R, 2.0, Math.sin(a) * R]} sombra={false} />;
		})}
		<Malha g={cilindro(R + 0.05, R + 0.05, 0.1, 32)} m={toon('#2B2F3A')} position={[0, 0.95, 0]} sombra={false} />
		<Malha g={cilindro(R + 0.05, R + 0.05, 0.1, 32)} m={toon('#2B2F3A')} position={[0, 3.1, 0]} sombra={false} />
		{/* teto em cone */}
		<Malha g={cone(R + 0.3, 1.6, 32)} m={toon('#2B2F3A')} position={[0, 3.95, 0]} sombra={false} />
		{/* pedestal da lente */}
		<Malha g={cilindro(0.35, 0.5, 0.9, 16)} m={toon('#3A3F4C')} position={[0, 0.45, 0]} contorno={0.02} />
		{/* painel com rádio e a chave do SOS (perto da marca painel) */}
		<group position={[1.9, 0, -1.9]} rotation={[0, -Math.PI / 4, 0]}>
			<Malha g={caixa(1.3, 0.9, 0.5)} m={toon('#4B5563')} position={[0, 0.45, 0]} contorno={0.02} />
			<Malha g={caixa(1.2, 0.08, 0.6)} m={toon('#6B4A2E')} position={[0, 0.94, 0.04]} sombra={false} />
			<Malha g={caixa(0.42, 0.3, 0.26)} m={toon('#3A4252')} position={[-0.3, 1.13, 0]} contorno={0.015} />
			<Malha g={caixa(0.3, 0.06, 0.2)} m={toon('#C8372D')} position={[0.3, 1.0, 0.05]} sombra={false} />
		</group>
		{/* porta da escada */}
		<Malha g={caixa(0.9, 1.9, 0.12)} m={toon('#4A3424')} position={[-R + 0.12, 0.95, 0.6]} rotation={[0, Math.PI / 2, 0]} contorno={0.02} />
	</>
));
