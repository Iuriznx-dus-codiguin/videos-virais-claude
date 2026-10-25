import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Ilha3D} from './Ilha3D';
import {Legendas} from './Legendas';

export const TesteThree: React.FC = () => {
	const {width, height} = useVideoConfig();
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<ThreeCanvas width={width} height={height} flat shadows="percentage" gl={{antialias: true}}>
				<Ilha3D />
			</ThreeCanvas>
			<Legendas />
		</AbsoluteFill>
	);
};
