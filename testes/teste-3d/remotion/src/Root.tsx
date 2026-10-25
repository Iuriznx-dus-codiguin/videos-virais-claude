import React from 'react';
import {Composition} from 'remotion';
import {D} from './cena';
import {TesteBlender} from './TesteBlender';
import {TesteThree} from './TesteThree';

const comum = {
	durationInFrames: Math.round(D.duracao * D.fps),
	fps: D.fps,
	width: D.largura,
	height: D.altura,
};

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="TesteThree" component={TesteThree} {...comum} />
		<Composition id="TesteBlender" component={TesteBlender} {...comum} />
	</>
);
