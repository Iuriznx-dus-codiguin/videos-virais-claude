// Vocabulário do motor: tudo o que um roteiro pode pedir. O validador usa estes nomes para
// apontar erros antes do render, e os componentes 3D usam as mesmas posições de marca.

export type Ponto2 = [number, number];
export type Ponto3 = [number, number, number];

export interface DefCenario {
	descricao: string;
	luzPadrao: string;
	/** Lugares no chão [x, z] onde personagens e objetos podem ficar. */
	marcas: Record<string, Ponto2>;
	/** Pontos no espaço [x, y, z] para olhar ou enquadrar (além das marcas). */
	pontos?: Record<string, Ponto3>;
	/** Tamanho (m) do que um plano detalhe naquele ponto precisa mostrar inteiro (padrão 2,6). */
	tamanhos?: Record<string, number>;
}

export const CENARIOS: Record<string, DefCenario> = {
	praia: {
		descricao: 'Ilha tropical ao pôr do sol: areia, mar em volta (para +z), coqueiros e a mata ao fundo (para -z). Pegadas gigantes saem do mar e entram na mata.',
		luzPadrao: 'por_do_sol',
		marcas: {
			sos: [-4.5, 5.4],
			pegadas: [2.6, 4.75],
			mata: [2.6, -4.4],
			beira: [1.0, 10.8],
			coqueiro: [-6.5, -4.2],
			pedra: [6.2, 5.4],
			// zona dos destroços do Voo 818 (a fuselagem fica em 'destroços', a cauda atrás)
			destrocos: [-1.5, -1.5],
			entre_malas: [1.2, 3.2],
			radio: [3.4, 2.4],
			fuselagem_boca: [5.2, -0.4],
		},
		pontos: {
			mar: [0, 0.6, 40],
			horizonte: [0, 1.5, -200],
			chao_pegadas: [1.26, 0, 9.27],
			pegada: [1.51, 0, 5.78],
			dedos: [1.62, 0.02, 4.4],
			trilha: [2.0, 0, 3.0],
			mata_fundo: [2.9, 1.6, -8],
			ceu_queda: [-4, 22, -70],
			cauda: [-12.5, 3.2, -0.3],
			radio_painel: [3.4, 0.28, 2.4],
		},
		tamanhos: {chao_pegadas: 4.6, pegada: 3.8, dedos: 2.4, radio_painel: 1.5},
	},
	selva: {
		descricao: 'Mata fechada com clareira no centro, fogueira, tronco caído, um arbusto enorme com um buraco escuro (onde o gigante se esconde) e uma árvore gigante de raízes altas.',
		luzPadrao: 'entardecer',
		marcas: {
			entrada: [-1.0, 9.5],
			trilha: [-0.6, 5.0],
			clareira: [0, 1.6],
			perto_fogueira: [0.15, 0.5],
			fogueira: [0.8, -0.7],
			tronco: [2.7, 0.9],
			atras: [-2.5, 3.9],
			arbusto: [1.6, -6.2],
			toca: [2.49, -9.04],
			frente_arbusto: [2.1, -5.6],
			raizes: [-6.2, -3.0],
			frente_raizes: [-4.8, -1.8],
		},
		pontos: {
			olhos: [1.55, 1.34, -5.2],
			brasas: [0.8, 0.15, -0.7],
			copa: [0, 9, 0],
		},
		tamanhos: {brasas: 2.2, olhos: 3.5},
	},
	raizes: {
		descricao: 'Esconderijo debaixo das raízes de uma árvore gigante, com riscos na parede do fundo contando os dias e uma abertura para a mata (para +z).',
		luzPadrao: 'noite',
		marcas: {
			fundo_esq: [-0.8, -0.75],
			fundo_dir: [0.8, -0.65],
			meio: [0, 0],
			entrada: [0, 1.9],
			fora: [0.3, 6.0],
			fora_longe: [-8, 7.5],
			fora_dir: [8, 7.0],
		},
		pontos: {
			parede: [0, 1.3, -1.85],
			parede_esq: [-0.9, 1.4, -1.8],
			parede_dir: [0.9, 1.25, -1.8],
			abertura: [0, 1.2, 2.3],
		},
		tamanhos: {parede: 2.6, parede_esq: 2.2, parede_dir: 2.2},
	},
	montanha: {
		descricao: 'Vista noturna da montanha da ilha, com uma caverna escura no meio e copas de árvores na frente.',
		luzPadrao: 'noite',
		marcas: {
			mirante: [0, 8],
			caverna: [0, -60],
		},
		pontos: {
			caverna: [0, 16, -58],
			topo: [0, 40, -72],
		},
	},
};

export const LUZES = ['dia', 'por_do_sol', 'entardecer', 'noite'] as const;

/** modificador: soma por cima da pose atual (tremer) e não encerra nem é encerrado por estados. */
export type TipoAcao = 'movimento' | 'gesto' | 'estado' | 'modificador';

export interface DefAcao {
	tipo: TipoAcao;
	descricao: string;
	/** Duração padrão em segundos (gestos). Estados duram até o fim da cena. */
	duracao?: number;
	/** Velocidade em unidades por segundo (movimentos). */
	velocidade?: number;
}

export const ACOES: Record<string, DefAcao> = {
	andar: {tipo: 'movimento', velocidade: 1.7, descricao: 'anda até "para"'},
	correr: {tipo: 'movimento', velocidade: 4.2, descricao: 'corre até "para"'},
	recuar: {tipo: 'movimento', velocidade: 1.0, descricao: 'dá passos para trás, de frente para onde olha'},
	virar: {tipo: 'gesto', duracao: 0.5, descricao: 'vira o corpo para "para"'},
	agachar: {tipo: 'estado', descricao: 'agacha olhando o chão'},
	levantar: {tipo: 'gesto', duracao: 0.6, descricao: 'fica de pé (encerra agachar, esconder ou sentar)'},
	esconder: {tipo: 'estado', descricao: 'fica abaixado e encolhido'},
	sentar: {tipo: 'estado', descricao: 'senta no chão'},
	apontar: {tipo: 'gesto', duracao: 1.8, descricao: 'aponta para "para"'},
	acenar: {tipo: 'gesto', duracao: 1.6, descricao: 'acena'},
	susto: {tipo: 'gesto', duracao: 0.6, descricao: 'sobressalto rápido (ombros sobem, cabeça para trás), por cima da pose atual'},
	medo: {tipo: 'estado', descricao: 'encolhido, com as mãos perto do peito'},
	tremer: {tipo: 'modificador', descricao: 'treme de medo ou de frio, por cima da pose atual'},
	maos_na_cabeca: {tipo: 'estado', descricao: 'desespero, mãos na cabeça'},
	bracos_cruzados: {tipo: 'estado', descricao: 'braços cruzados'},
	olhar_em_volta: {tipo: 'gesto', duracao: 2.2, descricao: 'olha para os lados'},
	puxar: {tipo: 'gesto', duracao: 0.9, descricao: 'estica o braço até "para" e puxa'},
	estender_mao: {tipo: 'gesto', duracao: 1.2, descricao: 'estica a mão para tocar algo em "para"'},
	erguer: {tipo: 'estado', descricao: 'ergue o objeto que segura (lanterna, tocha, lança) na direção de "para" ou de onde olha'},
	acender: {tipo: 'gesto', duracao: 0.4, descricao: 'acende a lanterna ou tocha que segura'},
	apagar: {tipo: 'gesto', duracao: 0.4, descricao: 'apaga a lanterna ou tocha que segura'},
	abrir_olhos: {tipo: 'gesto', duracao: 0.3, descricao: 'abre os olhos (quem começou com olhos_fechados)'},
	fechar_olhos: {tipo: 'gesto', duracao: 0.3, descricao: 'fecha os olhos'},
	falar: {tipo: 'estado', descricao: 'gesticula enquanto fala (automático nas falas em cena)'},
	// gigante
	levantar_gigante: {tipo: 'gesto', duracao: 1.6, descricao: 'o gigante se ergue (os olhos sobem)'},
	rugir: {tipo: 'gesto', duracao: 1.4, descricao: 'o gigante ruge e o chão treme'},
};

/** Ações que encerram estados de corpo anteriores (agachar, esconder, sentar...). */
export const ENCERRA_ESTADO = new Set(['levantar', 'andar', 'correr', 'recuar']);

export const PLANOS = ['geral', 'aberto', 'medio', 'americano', 'close', 'detalhe', 'ombro', 'pov', 'baixo', 'drone', 'nuca'] as const;
export const MOVIMENTOS = ['fixo', 'aproximar', 'afastar', 'acompanhar', 'orbitar', 'subir', 'descer', 'panoramica', 'tremer'] as const;
export const LADOS = ['frente', 'costas', 'direita', 'esquerda', 'tres_quartos_direita', 'tres_quartos_esquerda'] as const;

export const EXPRESSOES = [
	'neutro',
	'feliz',
	'triste',
	'medo',
	'surpreso',
	'bravo',
	'desconfiado',
	'cansado',
	'determinado',
	'aliviado',
	'serio',
	'nervoso',
] as const;

/** Duração padrão dos efeitos (null = até o fim da cena). */
export const EFEITOS: Record<string, number | null> = {
	flash: 0.35,
	tremor: 0.7,
	zoom_soco: 0.45,
	vinheta: null,
	preto: 0.5,
};

export const SONS = [
	'impacto',
	'sopro',
	'galho',
	'passo_gigante',
	'respiracao_gigante',
	'rugido',
	'susto',
	'tensao_sobe',
	'fogo',
	'folhas',
	'clique',
	'queda',
	'chiado',
	'alarme',
	'bip',
	'buzina',
	'trovao',
] as const;

export const AMBIENTES = ['mar', 'selva', 'noite', 'chuva'] as const;
export const MUSICAS = ['tensao', 'misterio'] as const;

export const OBJETOS = [
	'sos',
	'pegadas_gigantes',
	'fogueira',
	'tronco',
	'lanterna',
	'riscos',
	'caixote',
	'destrocos',
	'malas',
	'aviao',
	'radio',
] as const;
