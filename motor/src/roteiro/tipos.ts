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
	/** Semente da voz só desta fala (a ferramenta de vozes grava aqui a tomada que soou melhor). */
	semente?: number;
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
	/** Objeto na mão direita no começo da cena (ver ITENS_MAO no catálogo). */
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
	/** pegar: o que vai para a mão (garrafa, galhos, isqueiro, radio...). */
	item?: string;
	/** pegar: o item já vem ligado (rádio, lanterna). */
	acesa?: boolean;
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
	/** Largura (m) do que precisa caber no quadro vertical nos planos geral, detalhe e drone (troca o padrão). */
	tamanho?: number;
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
	/** Animações das peças das maquetes da cena (girar, aquecer, explodir, fluxo...). */
	animacoes?: AnimacaoPeca[];
	/** Etiquetas 2D presas a uma peça ou ponto 3D ("RESISTÊNCIA" com uma linha até a peça). */
	rotulos?: Rotulo[];
	/** Cartões 2D no alto da tela (ano e inventor, número curioso...). */
	cartoes?: Cartao[];
}

// --- maquetes (objetos explicados peça por peça) -------------------------------------

/**
 * Peça de uma maquete, em metros, no sistema da maquete (y para cima, frente para +z).
 * tam por forma: caixa [x, y, z] · cilindro [raio, altura, raioTopo?] · esfera [raio] ·
 * cone [raio, altura] · capsula [raio, comprimento] · toro [raio, raioTubo] ·
 * mola [raio, altura, voltas, raioFio] · engrenagem [raio, espessura, dentes] ·
 * seta [comprimento, grossura] · tubo [raioTubo] (com "caminho") · placa [largura, altura]
 */
export interface Peca {
	id: string;
	forma: string;
	tam?: number[];
	/** Pontos do tubo (e caminho padrão do fluxo que passa nele). */
	caminho?: [number, number, number][];
	pos?: [number, number, number];
	/** Graus em x, y, z. */
	giro?: [number, number, number];
	cor?: string;
	/** Brilha sozinha (lâmpada, LED, fio aceso): intensidade 0 a 2. */
	brilho?: number;
	/** 0 a 1 (vidro, carcaça transparente). */
	opacidade?: number;
	/** Peça-mãe: esta peça anda, gira e explode junto com ela. */
	pai?: string;
	/** Deslocamento da peça na vista explodida (animação "explodir"). */
	explode?: [number, number, number];
	/** Começa escondida (aparece com a animação "aparecer" ou "crescer"). */
	oculta?: boolean;
	/** Sem contorno preto (peças finas ou de vidro). */
	sem_contorno?: boolean;
}

export interface AnimacaoPeca {
	/** "peca", "maquete.peca" ou, para explodir/montar, o id da maquete. */
	peca: string;
	/** girar, girar_para, mover, aparecer, sumir, crescer, aquecer, pulsar, transparente, tremer, explodir, montar, fluxo */
	faz: string;
	de?: Ancora;
	ate?: Ancora;
	/** girar e girar_para: x, y ou z (padrão y). */
	eixo?: string;
	/** girar: voltas por segundo (padrão 1). */
	voltas?: number;
	/** girar_para: graus. */
	angulo?: number;
	/** mover: deslocamento [x, y, z]. */
	desloc?: [number, number, number];
	/** transparente: opacidade final (padrão 0.25). */
	opacidade?: number;
	/** fluxo: agua, eletricidade, calor, ar, gas, luz. */
	tipo?: string;
	/** fluxo: pontos (no sistema da peça); padrão: o caminho do tubo. */
	caminho?: [number, number, number][];
	/** fluxo: bolinhas e velocidade (voltas no caminho por segundo). */
	quantidade?: number;
	velocidade?: number;
	/** aquecer, pulsar, tremer: força (padrão 1). */
	intensidade?: number;
}

export interface Rotulo {
	/** Peça ("resistencia", "maquete.peca"), personagem, marca ou ponto [x, y, z]. */
	alvo: Alvo;
	texto: string;
	de?: Ancora;
	ate?: Ancora;
	/** Lado da tela onde a etiqueta fica (padrão: o lado mais perto da peça). */
	lado?: 'esquerda' | 'direita';
	/** Altura da etiqueta na tela, 0 (topo) a 1 (pé); padrão: um pouco acima da peça. */
	altura?: number;
	cor?: string;
}

export interface Cartao {
	de?: Ancora;
	ate?: Ancora;
	/** Texto grande ("1927", "220 V"). */
	grande: string;
	/** Linha menor embaixo ("Francisco Canhos, Jaú-SP"). */
	pequeno?: string;
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
	/** Maquetes usadas pelos objetos "maquete" (campo modelo): lista de peças. */
	modelos?: Record<string, Peca[]>;
	/** Personagens só deste episódio (o inventor do dia), somados aos da bíblia. */
	personagens?: Record<string, PersonagemBiblia>;
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
	/** Descrição da voz em português, para quem lê a bíblia. */
	descricao: string;
	/** Atributos para criar a voz no OmniVoice, em inglês: "male, young adult, low pitch". */
	instruct?: string;
	/** Frase usada para criar a voz (uns 8 s de fala); tem um padrão. */
	amostra?: string;
	/** Semente da voz escolhida (guardada pela ferramenta escolher-voz). */
	semente?: number;
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
	/** serie (padrão: partes em sequência com cliffhanger) ou avulso (cada vídeo fecha uma história; selo "#N"). */
	formato?: 'serie' | 'avulso';
	/** Hashtags fixas das publicações (formato avulso), sem o #. */
	hashtags?: string[];
}

// --- alinhamento das vozes (saída do OmniVoice) ------------------------------

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
	animacoes: AnimacaoTempo[];
	rotulos: RotuloTempo[];
	cartoes: CartaoTempo[];
}

export interface AnimacaoTempo extends AnimacaoPeca {
	ini: number;
	fim: number;
}

export interface RotuloTempo extends Rotulo {
	ini: number;
	fim: number;
}

export interface CartaoTempo extends Cartao {
	ini: number;
	fim: number;
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
	modelos: Record<string, Peca[]>;
	formato: 'serie' | 'avulso';
}
