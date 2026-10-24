import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {Legendas} from './Legendas';

// Quadros renderizados pelo Blender (blender/cena.py), juntados em vídeo pelo render.sh.
export const TesteBlender: React.FC = () => (
	<AbsoluteFill style={{backgroundColor: '#000'}}>
		<OffthreadVideo src={staticFile('blender.mp4')} />
		<Legendas />
	</AbsoluteFill>
);
