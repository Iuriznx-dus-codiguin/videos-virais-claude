// Cinemática direta do boneco: onde ficam tronco, ombros e cabeça no mundo para uma pose.
// O componente 3D monta a mesma hierarquia; aqui ela é calculada sem React para mirar braços
// e cabeça e para a câmera enquadrar o rosto.
import * as THREE from 'three';
import type {V3} from '../util/mat';
import {MEDIDAS, Pose} from './pose';

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s1 = new THREE.Vector3(1, 1, 1);

/** Matriz do tronco no mundo: chão (x, z) → yaw → escala → quadril → rotação do tronco. */
export const matrizTronco = (x: number, z: number, yaw: number, escala: number, p: Pose, saida = new THREE.Matrix4()) => {
	saida.makeRotationY(yaw);
	saida.setPosition(x, 0, z);
	m4.makeScale(escala, escala, escala);
	saida.multiply(m4);
	m4.makeTranslation(p.lateral, p.altQuadril, p.avanco);
	saida.multiply(m4);
	e.set(p.incl, p.torcer, p.rolar, 'XZY');
	q.setFromEuler(e);
	m4.compose(v.set(0, 0, 0), q, s1);
	saida.multiply(m4);
	return saida;
};

/** Centro da cabeça no mundo (sem a rotação da própria cabeça). */
export const centroCabeca = (tronco: THREE.Matrix4): V3 => {
	v.set(0, MEDIDAS.coluna + MEDIDAS.pescocoCabeca, 0).applyMatrix4(tronco);
	return [v.x, v.y, v.z];
};

/** Centro da cabeça e direção do rosto no mundo, já com a rotação da cabeça (como o boneco desenha). */
export const cabecaMundo = (tronco: THREE.Matrix4, p: Pose): {centro: V3; frente: V3} => {
	const m = new THREE.Matrix4().copy(tronco);
	m.multiply(new THREE.Matrix4().makeTranslation(0, MEDIDAS.coluna, 0));
	m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.cabPitch, p.cabYaw, p.cabRoll, 'YXZ')));
	const centro = new THREE.Vector3(0, MEDIDAS.pescocoCabeca, 0).applyMatrix4(m);
	const frente = new THREE.Vector3(0, 0, 1).transformDirection(m);
	return {centro: [centro.x, centro.y, centro.z], frente: [frente.x, frente.y, frente.z]};
};

/** Posição do ombro (lado 1 = esquerdo, em +x) no mundo. */
export const ombroMundo = (tronco: THREE.Matrix4, lado: 1 | -1): V3 => {
	v.set(MEDIDAS.ombroX * lado, MEDIDAS.ombroY, 0).applyMatrix4(tronco);
	return [v.x, v.y, v.z];
};

const inv = new THREE.Matrix4();
/** Converte um ponto do mundo para o espaço do tronco. */
export const paraTronco = (tronco: THREE.Matrix4, ponto: V3): V3 => {
	inv.copy(tronco).invert();
	v.set(ponto[0], ponto[1], ponto[2]).applyMatrix4(inv);
	return [v.x, v.y, v.z];
};

/** Mão direita (fim do antebraço) no mundo, para objetos seguros e luz da lanterna. */
export const maoMundo = (tronco: THREE.Matrix4, p: Pose, lado: 1 | -1): {pos: V3; dir: V3} => {
	const ombro = lado === 1 ? p.ombroE : p.ombroD;
	const abre = lado === 1 ? p.abreE : p.abreD;
	const giro = lado === 1 ? p.giroE : p.giroD;
	const cotov = lado === 1 ? p.cotovE : p.cotovD;
	const m = new THREE.Matrix4().copy(tronco);
	m.multiply(new THREE.Matrix4().makeTranslation(MEDIDAS.ombroX * lado, MEDIDAS.ombroY, 0));
	m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-ombro, giro, lado * abre, 'XZY')));
	m.multiply(new THREE.Matrix4().makeTranslation(0, -MEDIDAS.braco, 0));
	m.multiply(new THREE.Matrix4().makeRotationX(-cotov));
	const pos = new THREE.Vector3(0, -MEDIDAS.antebraco, 0).applyMatrix4(m);
	const ponta = new THREE.Vector3(0, -MEDIDAS.antebraco - 1, 0).applyMatrix4(m);
	const dir = ponta.sub(pos).normalize();
	return {pos: [pos.x, pos.y, pos.z], dir: [dir.x, dir.y, dir.z]};
};
