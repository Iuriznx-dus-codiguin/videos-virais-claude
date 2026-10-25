// Formato do roteiro que o Claude escreve (episódio e bíblia da série) e da linha do tempo
// resolvida que o motor usa para desenhar cada quadro.

/**
 * Âncora de tempo, sempre relativa às falas para não depender da duração real do áudio:
 * - "f3"              início da fala (ou silêncio) f3
 * - "f3:fim"          fim da fala f3
 * - "f3:pegadas"      início da primeira palavra "pegadas" da fala f3 (sem diferenciar acento)
 * - "f3:pegadas:fim"  fim dessa palavra
 * - "inicio" / "fim"  início ou fim da cena
 * - qualquer uma com deslocamento em segundos: "f3:fim+0.4", "f5-0.2"
 * - número: segundos absolutos (evite)
 */
export type Ancora = string | number;

/** Marca do cenário, id de personagem, "camera" ou ponto [x, y, z]. */
export type Alvo = string | [number, number, number];

/** Posição no chão: marca do cenário ou [x, z]. */
export type Lugar = string | [number, number];

export interface Fala {
	id: string;
	/** id do personagem na bíblia */
	quem: string;
	/** Palavras em MAIÚSCULAS viram ênfase na legenda (a voz recebe o texto normal). */
	texto: string;
	/** Voz em off (narração): a boca do personagem não mexe. */
	off?: boolean;
	/** Emoção da fala: ajusta a voz e a expressão padrão de quem fala. */
	tom?: string;
	/** Silêncio depois da fala, em segundos (padrão 0.22). */
	pausa_depois?: number;
	/** Velocidade da fala (0.8 a 1.2, padrão 1). */
	velocidade?: number;
}

export interface Silencio {
	id: string;
	/** Duração em segundos. */
	silencio: number;
}

export type ItemFala = Fala | Silencio;

export const ehSilencio = (f: ItemFala): f is Silencio => (f as Silencio).silencio !== undefined;

export interface PersonagemNaCena {
	em: Lugar;
	olhando?: Alvo;
	expressao?: string;
	/** em_pe (padrão), agachado, sentado, escondido */
	pose?: string;
	/** Objeto na mão direita: lanca, lanterna, tocha */
	segura?: string;
	/** Tamanho em relação ao normal (o gigante na montanha usa 4). */
	escala?: number;
	/** Começa a cena de olhos fechados (abre com a ação abrir_olhos). */
	olhos_fechados?: boolean;
}

export interface Acao {
	quem: string;
	/** andar, correr, agachar, apontar, susto, puxar... (ver catalogo.ts) */
	faz?: string;
	/** Destino (andar, correr) ou alvo (apontar, puxar). */
	para?: Alvo;
	/** Muda para onde o personagem olha. */
	olhar?: Alvo;
	/** Muda a expressão do rosto. */
	expressao?: string;
	de?: Ancora;
	ate?: Ancora;
	/** Multiplica a velocidade padrão de andar/correr (0.5 = devagar). */
	velocidade?: number;
}

export interface Plano {
	de: Ancora;
	/** geral, aberto, medio, americano, close, detalhe, ombro, pov, baixo, drone, nuca */
	tipo: string;
	alvo?: Alvo;
	/** Segundo alvo: para quem o ombro/pov olha, ou onde a panorâmica termina. */
	alvo2?: Alvo;
	/** frente, costas, direita, esquerda, tres_quartos_direita, tres_quartos_esquerda */
	lado?: string;
	/** fixo, aproximar, afastar, acompanhar, orbitar, subir, descer, panoramica, tremer */
	movimento?: string;
	intensidade?: number;
	/** corte (padrão), flash, preto */
	transicao?: string;
	/** Posição fixa da câmera (marca, ponto ou [x, y, z]) em vez da calculada pelo tipo de plano. */
	camera?: Alvo;
}

export interface Som {
	de: Ancora;
	som: string;
	volume?: number;
}

export interface Efeito {
	de: Ancora;
	ate?: Ancora;
	/** flash, tremor, zoom_soco, vinheta, preto */
	efeito: string;
	intensidade?: number;
}

export interface Objeto {
	tipo: string;
	em: Lugar;
	/** Ângulo em graus no plano do chão. */
	giro?: number;
	escala?: number;
	[opcao: string]: unknown;
}

export interface Cena {
	id: string;
	cenario: string;
	/** Clima de luz: dia, por_do_sol, entardecer, noite */
	luz?: string;
	de?: Ancora;
	ate?: Ancora;
	personagens?: Record<string, PersonagemNaCena>;
	objetos?: Objeto[];
	acoes?: Acao[];
	planos?: Plano[];
	sons?: Som[];
	efeitos?: Efeito[];
	/** Som de fundo contínuo: mar, selva, noite */
	ambiente?: string;
}

export interface Chamada {
	/** Pergunta curta que puxa o comentário. */
	pergunta?: string;
	texto?: string;
	destaque: string;
}

export interface Episodio {
	serie: string;
	parte: number;
	titulo: string;
	musica?: string;
	falas: ItemFala[];
	cenas: Cena[];
	chamada: Chamada;
}

// --- bíblia da série ---------------------------------------------------------

export interface Acessorio {
	tipo: string;
	cor?: string;
	[opcao: string]: unknown;
}

export interface VisualPersonagem {
	/** Escala do corpo (1 = altura padrão). */
	altura?: number;
	corpo: string;
	cabeca: string;
	olhos?: 'redondos' | 'ovais' | 'sonolentos';
	sobrancelhas?: 'finas' | 'grossas' | 'nenhuma';
	cilios?: boolean;
	/** Cor das bochechas (rubor), opcional. */
	bochechas?: string;
	acessorios?: Acessorio[];
}

export interface Voz {
	/** Descrição usada para escolher a voz na biblioteca do ElevenLabs. */
	descricao: string;
	elevenlabs_id?: string;
	nome?: string;
	estabilidade?: number;
	similaridade?: number;
	estilo?: number;
}

export interface PersonagemBiblia {
	nome: string;
	/** palito (padrão) ou gigante */
	tipo?: string;
	papel?: string;
	personalidade?: string;
	voz?: Voz;
	visual?: VisualPersonagem;
	/** Cor da palavra falada na legenda. */
	cor_legenda?: string;
}

export interface Biblia {
	serie: string;
	/** Nome exibido no selo, ex.: "ILHA PERDIDA" */
	titulo: string;
	sinopse: string;
	narrador?: string;
	personagens: Record<string, PersonagemBiblia>;
	/** O que já foi contado (para manter a continuidade entre partes). */
	fatos?: string[];
	ganchos_abertos?: string[];
}

// --- alinhamento das vozes (saída do ElevenLabs) ------------------------------

export interface AlinhamentoFala {
	duracao: number;
	caracteres: string[];
	inicio: number[];
	fim: number[];
	/** Caminho do áudio dentro de public/ */
	audio: string;
}

export type Alinhamentos = Record<string, AlinhamentoFala>;

// --- linha do tempo resolvida -------------------------------------------------

export interface PalavraTempo {
	texto: string;
	ini: number;
	fim: number;
	enfase: boolean;
}

export interface LetraTempo {
	c: string;
	ini: number;
	fim: number;
}

export interface FalaTempo {
	id: string;
	quem: string;
	off: boolean;
	tom?: string;
	texto: string;
	ini: number;
	fim: number;
	palavras: PalavraTempo[];
	letras: LetraTempo[];
	audio?: string;
	/** true quando a duração foi estimada pelo texto (sem áudio ainda). */
	estimada: boolean;
}

export interface AcaoTempo extends Acao {
	ini: number;
	fim: number;
}

export interface PlanoTempo extends Plano {
	ini: number;
	fim: number;
}

export interface SomTempo extends Som {
	ini: number;
}

export interface EfeitoTempo extends Efeito {
	ini: number;
	fim: number;
}

export interface CenaTempo {
	id: string;
	cenario: string;
	luz: string;
	ini: number;
	fim: number;
	personagens: Record<string, PersonagemNaCena>;
	objetos: Objeto[];
	acoes: AcaoTempo[];
	planos: PlanoTempo[];
	sons: SomTempo[];
	efeitos: EfeitoTempo[];
	ambiente?: string;
}

export interface LinhaDoTempo {
	serie: string;
	tituloSerie: string;
	parte: number;
	titulo: string;
	duracao: number;
	falas: FalaTempo[];
	cenas: CenaTempo[];
	chamada: Chamada & {ini: number};
	personagens: Record<string, PersonagemBiblia>;
	musica?: string;
	avisos: string[];
}
