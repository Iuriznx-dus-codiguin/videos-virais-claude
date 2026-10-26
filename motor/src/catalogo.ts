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
	/** Altura (m) em que um objeto colocado na marca fica apoiado (tampo da bancada, pedestal). */
	alturas?: Record<string, number>;
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
	cabine: {
		descricao: 'Dentro da fuselagem do Voo 818: corredor comprido (eixo z, de -13 a 13) com bancos azuis nos dois lados (x = ±0,62 e ±1,16), bagageiros, luzes de teto e celulares acesos nos bancos vazios. Parede a ±1,7 m: use câmera fixa (campo "camera") dentro do corredor, com x entre -0,4 e 0,4. Os bonecos são grandes para a cabine: use "escala": 0.55 e, nos bancos, "pose": "sentado_banco" (bancos em z = 0,15 + 0,95·n, virados para +z).',
		luzPadrao: 'entardecer',
		marcas: {
			frente: [0, 7],
			corredor: [0, 3],
			meio: [0, 0],
			corredor_31c: [0, 0.15],
			assento_31c: [-0.62, 0.15],
			assento_manifesto: [0.62, -2.43],
			corredor_manifesto: [0, -2.5],
			fundo: [0, -8],
			saida: [0, -11],
		},
		pontos: {
			corredor_fundo: [0, 1.2, -12],
			corredor_frente: [0, 1.2, 12],
			manifesto: [0.62, 0.5, -2.6],
			banco_31c: [-0.62, 0.55, 0.15],
			teto: [0, 1.6, 0],
		},
		tamanhos: {manifesto: 0.9, banco_31c: 1.4},
	},
	estudio: {
		descricao: 'Estúdio de explicação (Como Funciona): chão escuro com grade azul de planta técnica, pedestal redondo no centro (tampo a 1 m) onde fica a maquete do dia, telão de planta técnica ao fundo e refletores. Frente para +z. Maquete grande (prédio, ponte) vai no chão: marcas chao_esq e chao_dir.',
		luzPadrao: 'estudio',
		marcas: {
			pedestal: [0, 0],
			apresentador: [-1.45, 0.75],
			direita: [1.45, 0.75],
			frente: [0, 3.2],
			fundo: [0, -3],
			chao_esq: [-3.4, -0.8],
			chao_dir: [3.4, -0.8],
			chao_centro: [0, -1.2],
		},
		pontos: {
			maquete: [0, 1.55, 0],
			telao: [0, 3.4, -6.2],
			teto: [0, 7, 0],
		},
		tamanhos: {maquete: 1.6},
		alturas: {pedestal: 1.0},
	},
	oficina: {
		descricao: 'Oficina antiga de inventor (para contar como a coisa foi inventada): piso de tábuas, bancada de madeira no fundo (tampo a 0,92 m) com ferramentas, lâmpada pendurada, janela com luz entrando, prateleiras com engrenagens e caixotes. Frente para +z.',
		luzPadrao: 'oficina',
		marcas: {
			bancada: [0, -1.3],
			inventor: [-0.95, -0.35],
			ajudante: [1.05, -0.3],
			frente: [0, 2.6],
			porta: [3.3, 1.8],
			janela: [-2.4, -1.9],
			chao: [2.3, -1.2],
		},
		pontos: {
			lampada: [0, 2.55, -0.5],
			janela: [-2.6, 1.8, -2.95],
			bancada_topo: [0, 1.05, -1.3],
			prateleira: [2.2, 1.8, -2.9],
		},
		tamanhos: {bancada_topo: 1.4},
		alturas: {bancada: 0.92},
	},
	mirante: {
		descricao: 'Laje de pedra no alto da ilha, na beira de um penhasco (borda em +z), olhando o mar 35 m abaixo: enseada com areia e cais de madeira, ilhotas ao longe. Ponha farol e barco com alt: -35 (ex.: farol em [-16, 85] escala 1.3, barco em [9, 56] giro 90). Câmera boa: [1.0, 2.3, 0.8] com alvo [-3, -28, 66] (mostra farol, barco e enseada). Olhando para +z, x negativo fica à DIREITA da tela.',
		luzPadrao: 'noite',
		marcas: {
			borda: [0, 3.2],
			borda_esq: [-1.4, 2.9],
			borda_dir: [1.4, 2.9],
			meio: [0, 0],
			atras: [0, -4],
		},
		pontos: {
			farol: [-16, -18, 85],
			cais: [9, -34, 56],
			enseada: [10, -35, 38],
			mar: [0, -33, 100],
		},
	},
	ilhota_farol: {
		descricao: 'Ilhota de pedra do farol vista de perto, à noite: ponha o objeto farol (ilhota: false) na marca farol; trilha até a porta da torre (+z) e cais de madeira com o barco (barco em [3, 17], giro 90). Mar em volta.',
		luzPadrao: 'noite',
		marcas: {
			farol: [0, -4],
			porta: [0, -2.2],
			trilha: [0, 3],
			cais: [3, 12],
			beira_cais: [3, 20],
			pedras: [-6, 2],
			casa: [4, -2],
		},
		pontos: {
			topo_farol: [0, 15, -4],
			porta_farol: [0, 1.2, -2.6],
			mar: [0, 0, 60],
		},
	},
	sala_farol: {
		descricao: 'Sala da lâmpada no alto do farol: redonda (raio 3,2 m), envidraçada, a lente no meio (objeto luz_farol na marca lente), painel com rádio e a alavanca vermelha do SOS, porta da escada à esquerda (-x). Para tempestade use os efeitos chuva e relampago e o ambiente chuva. Câmera boa: [0.9, 2.0, 2.6] com alvo [1.1, 1.1, -1.6] (painel; a lente fica de lado). A lente tem 1 m de largura: não ponha a câmera com ela no meio do caminho.',
		luzPadrao: 'noite',
		marcas: {
			lente: [0, 0],
			painel: [1.4, -1.4],
			porta: [-2.6, 0.6],
			janela: [0, 2.6],
			janela_esq: [-2.0, -1.7],
			meio: [-1.0, 1.2],
		},
		pontos: {
			alavanca: [1.95, 1.0, -1.75],
			radio: [1.6, 1.15, -2.1],
			lente: [0, 1.6, 0],
			fora: [0, 1.5, 30],
		},
		tamanhos: {alavanca: 0.9, radio: 1.0},
	},
	adega: {
		descricao: 'Adega de pedra embaixo do farol: corredor (eixo z) entre duas paredes com os passageiros dormindo sentados (x de ±2,2 a ±3), barris e porta com escada no fundo (-z), uma lâmpada pendurada balançando. Câmera boa para mostrar os passageiros: [1.3, 2.5, 4.8] com alvo [-1.2, 0.5, -1.5].',
		luzPadrao: 'noite',
		marcas: {
			porta: [0, -5.2],
			corredor: [0, -2],
			meio: [0, 0.5],
			frente: [0, 4],
			fileira_esq: [-1.6, 0],
			fileira_dir: [1.6, 0],
		},
		pontos: {
			lampada: [0, 2.0, 0.5],
			passageiros_esq: [-2.6, 0.7, 0],
			passageiros_dir: [2.6, 0.7, 0],
		},
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

export const LUZES = ['dia', 'por_do_sol', 'entardecer', 'noite', 'estudio', 'oficina'] as const;

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
	mancar: {tipo: 'movimento', velocidade: 0.9, descricao: 'anda mancando até "para", poupando a perna da tala (ou a direita)'},
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
	acender: {tipo: 'gesto', duracao: 0.4, descricao: 'acende o que segura (lanterna, tocha, isqueiro, rádio)'},
	apagar: {tipo: 'gesto', duracao: 0.4, descricao: 'apaga o que segura (lanterna, tocha, isqueiro, rádio)'},
	pegar: {
		tipo: 'gesto',
		duracao: 1.0,
		descricao:
			'abaixa se preciso e pega "item" em "para"; o item aparece na mão direita 0,5 s depois do início (dê ao objeto pego "some" na mesma âncora +0.5). "acesa": true já pega ligado (rádio, lanterna)',
	},
	largar: {
		tipo: 'gesto',
		duracao: 0.9,
		descricao: 'põe o que segura em "para" (chão, monte, outro personagem); a mão fica vazia 0,5 s depois do início (dê ao objeto largado "aparece" na mesma âncora +0.5)',
	},
	arrumar: {tipo: 'estado', descricao: 'ajoelhado, as duas mãos arrumam coisas no chão à frente (mantimentos, fogueira, curativo na perna de alguém)'},
	abrir_olhos: {tipo: 'gesto', duracao: 0.3, descricao: 'abre os olhos (quem começou com olhos_fechados)'},
	fechar_olhos: {tipo: 'gesto', duracao: 0.3, descricao: 'fecha os olhos'},
	falar: {tipo: 'estado', descricao: 'gesticula enquanto fala (automático nas falas em cena)'},
	// gigante
	levantar_gigante: {tipo: 'gesto', duracao: 1.6, descricao: 'o gigante se ergue (os olhos sobem)'},
	rugir: {tipo: 'gesto', duracao: 1.4, descricao: 'o gigante ruge e o chão treme'},
};

/** Ações que encerram estados de corpo anteriores (agachar, esconder, sentar...). */
export const ENCERRA_ESTADO = new Set(['levantar', 'andar', 'correr', 'recuar', 'mancar']);

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
	/** chuva na tela até o fim da cena (ou até "ate"); combine com ambiente chuva */
	chuva: null,
	/** clarão duplo de raio; combine com o som trovao */
	relampago: 0.6,
	/** luz falhando: apagões curtos e irregulares até "ate" (turbulência, pane) */
	piscar: 1.5,
};

/** O que um personagem pode ter na mão direita ("segura" na cena ou "item" de pegar). */
export const ITENS_MAO = ['lanca', 'lanterna', 'tocha', 'garrafa', 'galhos', 'isqueiro', 'radio', 'pacote'] as const;

export const ACESSORIOS = [
	'cabelo_curto',
	'rabo_de_cavalo',
	'bandana',
	'bone',
	'capacete',
	'cartola',
	'oculos',
	'bigode',
	'curativo',
	'mochila',
	'lenco',
	'colete',
	'tala',
] as const;

/** Opções de objeto que são âncoras de tempo (o resolvedor converte "aparece" em "_aparece" etc.). */
export const ANCORAS_OBJETO = ['aparece', 'some', 'acende', 'cai', 'enche', 'cheio'] as const;

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
	'pop',
	'whoosh',
	'zap',
	'agua',
	'engrenagem',
	'ding',
	'turbulencia',
	'isqueiro',
] as const;

export const AMBIENTES = ['mar', 'selva', 'noite', 'chuva', 'oficina', 'estudio'] as const;
export const MUSICAS = ['tensao', 'misterio', 'curiosidade'] as const;

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
	'prancheta',
	'lanternas_mata',
	'farol',
	'barco',
	'luz_farol',
	'caixa_preta',
	'barras_ouro',
	'maquete',
	'garrafa',
	'mantimentos',
	'mascaras',
] as const;

/** Para que serve cada objeto e as opções que ele aceita além de em, giro e escala. */
export const USO_OBJETOS: Record<(typeof OBJETOS)[number], string> = {
	sos: 'SOS escrito na areia',
	pegadas_gigantes: 'trilha de pegadas; ate: [x, z], passo',
	fogueira: 'fogo: chamas | brasas | apagada; acende (âncora: a lenha pega fogo e as chamas crescem em ~1,5 s)',
	tronco: 'tronco caído para sentar',
	lanterna: 'lanterna no chão',
	riscos: 'riscos de contagem na parede; quantos',
	caixote: 'caixote de madeira',
	destrocos: 'fuselagem aberta, cauda, asa, malas e fumaça (praia)',
	malas: 'malas espalhadas; quantas, raio, semente',
	aviao: 'avião caindo em chamas; de_ponto, ate_ponto [x,y,z], quando_de, quando_ate, fogo',
	radio: 'rádio de emergência com luz; ligado (padrão true)',
	prancheta: 'manifesto de passageiros (nomes riscados de laranja, um circulado); alt (altura, padrão 0.46), deitada',
	lanternas_mata: 'Homens de Laranja de longe: lanternas andando com feixe varrendo para +z local; quantas (3), largura (8), vultos (corpo escuro sem rosto, padrão true). Use à noite, entre as árvores',
	farol: 'farol de 14 m numa ilhota, para pôr longe no mar; modo: gira | sos | apagado; escala; ilhota (false no cenário ilhota_farol, onde fica na marca farol); alt (altura do mar: -35 no mirante)',
	luz_farol: 'a lente do farol na sala_farol (marca lente); modo: acesa | sos | apagada (padrão)',
	caixa_preta: 'caixa preta do avião (laranja); alt',
	barras_ouro: 'caixote aberto cheio de barras de ouro (a carga)',
	barco: 'barco de carga de 11 m (proa em +x local); luzes (padrão true, com farol de proa), caixas (padrão true); alt (-35 no mirante)',
	maquete: 'maquete do episódio (Como Funciona); modelo (id em "modelos"), id, alt; peças e animações no roteiro',
	garrafa: 'garrafa de água de pé; quantas (padrão 1, as outras do lado)',
	mantimentos: 'lona com garrafas e pacotes enfileirados; garrafas (6), pacotes (5), inicial (quantos estão lá; padrão todos, ou 0 se tiver "enche"); entre "enche" e "cheio" os itens vão aparecendo um a um',
	mascaras: 'máscaras de oxigênio que caem do teto da cabine em "cai" e ficam balançando; em: [x do meio do par de bancos, z da fileira]; quantas (2)',
};

// --- maquetes ---------------------------------------------------------------------------

export const FORMAS = ['caixa', 'cilindro', 'esfera', 'cone', 'capsula', 'toro', 'mola', 'engrenagem', 'seta', 'tubo', 'placa'] as const;

/** Animações de peça: o que cada uma faz e se dura até o fim da cena (estado) ou só o intervalo. */
export const ANIMACOES_PECA: Record<string, string> = {
	girar: 'gira sem parar em volta do "eixo" (x, y, z), "voltas" por segundo, de "de" até "ate"',
	girar_para: 'gira "angulo" graus em volta do "eixo" e fica assim (abrir registro, virar chave)',
	mover: 'desliza "desloc" [x, y, z] e fica lá (pistão, porta, êmbolo)',
	aparecer: 'surge crescendo com um pulinho (peça com "oculta": true)',
	sumir: 'encolhe e some',
	crescer: 'cresce de baixo para cima (andares de prédio, coluna d\'água); a peça começa oculta',
	aquecer: 'esquenta: vai do cinza ao vermelho-alaranjado brilhando e fica quente ("intensidade" 0 a 1.5)',
	esfriar: 'volta da cor quente para a cor normal (depois de um aquecer)',
	pulsar: 'brilho que pulsa (corrente passando, LED)',
	transparente: 'carcaça fica de vidro até "opacidade" (padrão 0.25) para mostrar o miolo',
	tremer: 'vibra (motor ligado, panela de pressão)',
	explodir: 'vista explodida: cada peça vai para o seu "explode"; peca = id da maquete',
	montar: 'volta da vista explodida para o lugar; peca = id da maquete',
	fluxo: 'bolinhas correndo por um caminho: "tipo" agua, eletricidade, calor, ar, gas ou luz',
};

export const FLUXOS: Record<string, {cor: string; brilha: boolean; raio: number}> = {
	agua: {cor: '#3FA9F5', brilha: false, raio: 0.028},
	eletricidade: {cor: '#FFE14A', brilha: true, raio: 0.022},
	calor: {cor: '#FF7A2A', brilha: true, raio: 0.03},
	ar: {cor: '#E8F4FF', brilha: false, raio: 0.03},
	gas: {cor: '#7CE07A', brilha: false, raio: 0.03},
	luz: {cor: '#FFF6C8', brilha: true, raio: 0.024},
};
