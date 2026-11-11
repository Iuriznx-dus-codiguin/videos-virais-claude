// Materiais do visual limpo (Como Funciona): do que cada peça é feita. Só dados, para o
// validador e o catálogo lerem sem carregar o 3D.

export interface DefMaterial {
	rugosidade: number;
	metal: number;
	/** cor padrão quando a peça não tem "cor" */
	cor: string;
	/** força do reflexo da sala (0 = nada) */
	reflexo: number;
	/** opacidade padrão (vidro e água) */
	opacidade?: number;
	textura?: string;
	descricao: string;
}

export const MATERIAIS: Record<string, DefMaterial> = {
	plastico: {rugosidade: 0.42, metal: 0, cor: '#E8E8EC', reflexo: 0.35, descricao: 'plástico liso com brilho suave (padrão)'},
	fosco: {rugosidade: 0.9, metal: 0, cor: '#D8D8DC', reflexo: 0.1, descricao: 'plástico ou tinta sem brilho'},
	metal: {rugosidade: 0.32, metal: 0.85, cor: '#B8BEC6', reflexo: 1, descricao: 'aço, alumínio (reflete)'},
	cromado: {rugosidade: 0.1, metal: 1, cor: '#E6EAF0', reflexo: 1.2, descricao: 'metal espelhado (torneira, eixo polido)'},
	cobre: {rugosidade: 0.28, metal: 0.9, cor: '#C8783A', reflexo: 1, descricao: 'fio, bobina, cano de cobre'},
	ouro: {rugosidade: 0.25, metal: 1, cor: '#E5B54A', reflexo: 1, descricao: 'contato dourado, latão'},
	borracha: {rugosidade: 0.92, metal: 0, cor: '#2A2A2E', reflexo: 0.05, descricao: 'pneu, vedação, cabo'},
	vidro: {rugosidade: 0.05, metal: 0, cor: '#D6EEFF', reflexo: 1.4, opacidade: 0.28, descricao: 'vidro transparente (copo, lente, janela)'},
	agua: {rugosidade: 0.08, metal: 0, cor: '#3FA9F5', reflexo: 1, opacidade: 0.62, descricao: 'água (use crescer para o nível subir)'},
	ceramica: {rugosidade: 0.22, metal: 0, cor: '#FAFAFA', reflexo: 0.6, descricao: 'louça, porcelana, isolador'},
	madeira: {rugosidade: 0.75, metal: 0, cor: '#B07A4A', reflexo: 0.1, textura: 'madeira', descricao: 'madeira com veios'},
	concreto: {rugosidade: 0.95, metal: 0, cor: '#C9C6C0', reflexo: 0.05, textura: 'concreto', descricao: 'concreto com marcas de forma'},
	tijolo: {rugosidade: 0.9, metal: 0, cor: '#B5523B', reflexo: 0.05, textura: 'tijolo', descricao: 'parede de tijolo à vista'},
	terra: {rugosidade: 1, metal: 0, cor: '#8A5A36', reflexo: 0, textura: 'terra', descricao: 'terra com pedrinhas (corte do solo)'},
	pedra: {rugosidade: 0.95, metal: 0, cor: '#8E8E8E', reflexo: 0.05, textura: 'pedra', descricao: 'rocha, cascalho'},
	grama: {rugosidade: 1, metal: 0, cor: '#6DBE45', reflexo: 0, textura: 'grama', descricao: 'gramado'},
	asfalto: {rugosidade: 0.95, metal: 0, cor: '#4A4D52', reflexo: 0.05, textura: 'asfalto', descricao: 'rua'},
	tecido: {rugosidade: 1, metal: 0, cor: '#5A6FA8', reflexo: 0, descricao: 'pano, airbag, estofado'},
	luz: {rugosidade: 1, metal: 0, cor: '#FFF6C8', reflexo: 0, descricao: 'brilha sozinho sem esquentar (tela, LED aceso, lâmpada acesa)'},
};

/** Nome e uso de cada material, para o catálogo. */
export const MATERIAIS_DESCRICAO: Record<string, string> = Object.fromEntries(Object.entries(MATERIAIS).map(([n, d]) => [n, d.descricao]));
