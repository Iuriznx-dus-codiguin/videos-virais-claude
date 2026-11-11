# Exemplo do visual limpo do Como Funciona: o script que gerou o vídeo de prova de 11/11
# ("Construa uma caixa d'água do zero", você constrói). Mostra num episódio só: cenário campo,
# casa oca cortada de frente, chão em corte com "solo", tanque de torno oco com água, boia e
# tampa, peças aparecendo na palavra do nome, falhas (pinga, transborda, sujeira), setas de força,
# rótulos, câmeras explícitas, uma segunda maquete (a torre) que aparece no fim, e o Tito só na voz.
# Leia para copiar a estrutura. Para gerar e olhar: python3 exemplo-caixa-dagua.py <pasta>
# (grava <pasta>/ep21.json; use uma pasta de teste, nunca a da série no ramo dados).
import json, sys
pasta = sys.argv[1]
B = [2.2, 3.1, -1.2]  # base da caixa no telhado (x, y, z)
T0 = [4.6, 0.0, -1.2]  # tanque no quintal

def tanque_pecas():
    # caixa d'água azul de polietileno: tronco de cone oco, base no ponto 0
    return [
        {"id": "tanque", "forma": "torno", "perfil": [[0, 0], [0.62, 0], [0.74, 1.1], [0.70, 1.1], [0.58, 0.05], [0, 0.05]], "pos": [T0[0], 0.55, T0[2]], "cor": "#2E7FD3", "material": "plastico", "oculta": True},
        {"id": "agua_tq", "forma": "cilindro", "tam": [0.665, 0.78, 0.578], "pos": [0, -0.09, 0], "material": "agua", "pai": "tanque"},
        {"id": "sujeira", "forma": "cilindro", "tam": [0.58, 0.05], "pos": [0, -0.465, 0], "cor": "#7A5A3A", "material": "terra", "pai": "tanque", "oculta": True},
        {"id": "saida_int", "forma": "cilindro", "tam": [0.05, 0.16], "pos": [0, -0.4, 0], "cor": "#F2F2F2", "material": "plastico", "pai": "tanque"},
        {"id": "piv_boia", "forma": "esfera", "tam": [0.003], "pos": [0.55, 0.38, 0], "pai": "tanque", "giro": [0, 0, 38]},
        {"id": "haste", "forma": "cilindro", "tam": [0.012, 0.45], "pos": [-0.22, 0, 0], "giro": [0, 0, 90], "cor": "#C9CED6", "material": "metal", "pai": "piv_boia", "oculta": True},
        {"id": "boia", "forma": "esfera", "tam": [0.1], "pos": [-0.46, 0, 0], "cor": "#FF8A1F", "material": "plastico", "pai": "piv_boia", "oculta": True},
        {"id": "tampa", "forma": "cilindro", "tam": [0.76, 0.06], "pos": [0, 0.58, 0], "cor": "#2565B0", "material": "plastico", "pai": "tanque", "oculta": True},
    ]

pecas = [
    {"id": "casa", "forma": "casa", "tam": [6, 3, 5], "pos": [0, 1.55, 0], "sem_telhado": True},
    {"id": "chao", "forma": "terreno", "tam": [26, 3.2, 10], "pos": [0, -1.59, -0.5]},
    # cano da rua, rente ao corte do chão
    {"id": "cano_rua", "forma": "tubo", "tam": [0.11], "material": "metal", "cor": "#8D949C", "pos": [0, -0.7, 4.45], "caminho": [[-12, 0, 0], [12, 0, 0]]},
    # ramal da rua até o chuveiro (começo), pela parede da direita
    {"id": "ramal", "forma": "tubo", "tam": [0.04], "material": "plastico", "cor": "#F4F4F0", "pos": [3.1, 1.0, -1.2], "caminho": [[0.05, -1.7, 0], [0.05, 1.6, 0], [-0.9, 1.6, 0]]},
    {"id": "cano_ch", "forma": "tubo", "tam": [0.035], "material": "plastico", "cor": "#F4F4F0", "pos": [B[0], 2.45, B[2]], "caminho": [[0, 0.15, 0], [0, -0.15, 0]]},
    {"id": "chuveiro", "forma": "torno", "perfil": [[0, 0], [0.16, 0], [0.16, 0.03], [0.05, 0.12], [0.03, 0.2]], "pos": [B[0], 2.18, B[2]], "cor": "#E6EAF0", "material": "cromado"},
    # coluna de água parada no cano quando o tanque está no chão
    {"id": "coluna", "forma": "cilindro", "tam": [0.055, 0.85], "pos": [3.15, 0.5, -1.2], "material": "agua", "cor": "#3FA9F5", "oculta": True},
    {"id": "cano_tq", "forma": "tubo", "tam": [0.04], "material": "plastico", "cor": "#F4F4F0", "pos": [3.9, 0.1, -1.2], "caminho": [[0.7, 0, 0], [-0.75, 0, 0]], "oculta": True},
    # ramal novo, da rua até a entrada no alto da caixa
    {"id": "entrada", "forma": "tubo", "tam": [0.04], "material": "plastico", "cor": "#F4F4F0", "pos": [3.1, 2.0, -1.2], "caminho": [[0.05, -2.7, 0], [0.05, 2.0, 0], [-0.32, 2.0, 0]], "oculta": True},
    {"id": "descida", "forma": "tubo", "tam": [0.045], "material": "plastico", "cor": "#F4F4F0", "pos": [B[0], 2.75, B[2]], "caminho": [[0, 0.45, 0], [0, -0.3, 0]], "oculta": True},
    {"id": "ladrao", "forma": "tubo", "tam": [0.04], "material": "plastico", "cor": "#F4F4F0", "pos": [3.4, 4.0, -1.2], "caminho": [[-0.55, 0, 0], [0.4, 0, 0], [0.55, -0.15, 0]], "oculta": True},
    {"id": "seta1", "forma": "seta", "tam": [0.5, 0.045], "pos": [B[0] - 0.45, 2.75, B[2] + 0.3], "giro": [180, 0, 0], "cor": "#FF7A1A", "oculta": True},
    {"id": "seta2", "forma": "seta", "tam": [0.5, 0.045], "pos": [B[0] + 0.45, 2.75, B[2] + 0.3], "giro": [180, 0, 0], "cor": "#FF7A1A", "oculta": True},
    {"id": "rach", "forma": "rachadura", "tam": [0.9, 0.018, 3], "semente": 3, "pos": [-1.0, 2.9, -2.24], "oculta": True},
] + tanque_pecas()

torre = [
    {"id": "base_t", "forma": "esfera", "tam": [0.003], "pos": [0, 0, 0]},
] + [
    {"id": f"perna{i}", "forma": "cilindro", "tam": [0.35, 14], "pos": [x, 7, z], "material": "concreto", "cor": "#D2CEC6", "pai": "base_t"}
    for i, (x, z) in enumerate([(-2.2, -2.2), (2.2, -2.2), (-2.2, 2.2), (2.2, 2.2)])
] + [
    {"id": "anel_t", "forma": "cilindro", "tam": [3.3, 0.5], "pos": [0, 7, 0], "material": "concreto", "cor": "#D2CEC6", "pai": "base_t"},
    {"id": "tanque_t", "forma": "torno", "perfil": [[0, 0], [3.6, 0], [4.6, 2.5], [4.6, 5.5], [0.6, 7], [0, 7]], "pos": [0, 17.5, 0], "material": "concreto", "cor": "#E9E5DD", "pai": "base_t"},
    {"id": "faixa_t", "forma": "cilindro", "tam": [4.65, 0.5], "pos": [0, 18.5, 0], "cor": "#2E7FD3", "material": "plastico", "pai": "base_t"},
    {"id": "cano_t", "forma": "cilindro", "tam": [0.5, 14], "pos": [0, 7, 0], "material": "metal", "cor": "#9AA0A8", "pai": "base_t"},
] + [
    {"id": f"casinha{i}", "forma": "casa", "tam": [5, 2.6, 5], "pos": [x, 2.15, z], "giro": [0, g, 0], "material": "fosco", "cor": c}
    for i, (x, z, g, c) in enumerate([(12, 6, 10, "#F2E3C6"), (-11, 8, -15, "#DDE8F0"), (16, -6, 40, "#F4D6C6"), (-14, -7, 25, "#E8F0DD"), (5, 14, 0, "#F0E6F4")])
]

ep = {
    "serie": "como-funciona", "parte": 21,
    "titulo": "Construa uma caixa d'água do zero",
    "musica": "curiosidade",
    "falas": [
        {"id": "f1", "quem": "tito", "off": True, "texto": "Sem bomba nenhuma, como a água sai FORTE do seu chuveiro?", "tom": "animado"},
        {"id": "f2", "quem": "tito", "off": True, "texto": "Se você ligar a casa direto no cano da RUA, a água chega, sim."},
        {"id": "f3", "quem": "tito", "off": True, "texto": "MAS a rua não manda água o tempo todo. Falta, a pressão cai… e na hora do banho? O chuveiro só PINGA!", "tom": "tenso"},
        {"id": "f4", "quem": "tito", "off": True, "texto": "Então, você coloca um TANQUE no quintal, pra guardar água enquanto a rua manda."},
        {"id": "f5", "quem": "tito", "off": True, "texto": "SÓ QUE, com o tanque no chão, a água não sobe sozinha! Ela fica PARADA no cano.", "tom": "tenso"},
        {"id": "f6", "quem": "tito", "off": True, "texto": "Água só desce. Então, você sobe o tanque pro ALTO, em cima da casa. Agora ele é uma caixa d'água!"},
        {"id": "f7", "quem": "tito", "off": True, "texto": "E aí vem o segredo: o PESO da água lá em cima empurra ela cano abaixo!", "tom": "animado"},
        {"id": "f8", "quem": "tito", "off": True, "texto": "Quanto mais alta a caixa, mais FORTE sai o chuveiro. Por isso ela fica no ponto mais alto da casa."},
        {"id": "f9", "quem": "tito", "off": True, "texto": "MAS a rua continua mandando água… e a caixa TRANSBORDA pelo telhado!", "tom": "tenso"},
        {"id": "f10", "quem": "tito", "off": True, "texto": "Então, você coloca uma BOIA. Ela sobe junto com a água e, quando a caixa enche, fecha a entrada sozinha."},
        {"id": "f11", "quem": "tito", "off": True, "texto": "E se a boia travar? Você faz um LADRÃO: um cano que joga o excesso pra fora, onde dá pra ver."},
        {"id": "f12", "quem": "tito", "off": True, "texto": "SÓ QUE caixa aberta junta folha, poeira… e MOSQUITO da dengue!", "tom": "tenso"},
        {"id": "f13", "quem": "tito", "off": True, "texto": "Então, você fecha com uma TAMPA bem justa."},
        {"id": "f14", "quem": "tito", "off": True, "texto": "E a saída fica um pouco acima do fundo, pra sujeira que assenta não ir parar na sua TORNEIRA."},
        {"id": "f15", "quem": "tito", "off": True, "texto": "E no bairro inteiro? É igual! A caixa vira uma TORRE gigante, no ponto mais alto da cidade."},
        {"id": "f16", "quem": "tito", "off": True, "texto": "Parabéns! Você construiu uma CAIXA D'ÁGUA!", "tom": "animado"},
    ],
    "modelos": {"casa_agua": pecas, "torre": torre},
    "cenas": [{
        "id": "obra", "cenario": "campo", "ambiente": "selva",
        "objetos": [
            {"tipo": "maquete", "modelo": "casa_agua", "em": "centro"},
            {"tipo": "maquete", "modelo": "torre", "em": [-26, -34], "aparece": "f15"},
            {"tipo": "particulas", "particula": "folhas", "em": [2.2, -1.2], "alt": 4.4, "raio": 0.9, "altura": 1.6, "quantas": 18, "aparece": "f12", "some": "f13:tampa"},
            {"tipo": "particulas", "particula": "poeira", "em": [2.2, -1.2], "alt": 4.2, "raio": 0.7, "altura": 1.0, "quantas": 40, "cor": "#B89B72", "aparece": "f12:poeira", "some": "f13:tampa"},
            {"tipo": "particulas", "particula": "confete", "em": [0, 0], "alt": 5.5, "raio": 4, "altura": 4, "quantas": 90, "aparece": "f16:parabens"},
        ],
        "animacoes": [
            # casa e chão em corte desde o primeiro quadro
            {"peca": "casa", "faz": "cortar", "de": "inicio-2", "ate": "inicio-1", "posicao": -0.45},
            {"peca": "chao", "faz": "cortar", "de": "inicio-2", "ate": "inicio-1", "posicao": 5.0, "solo": True},  # 5 m na frente do meio do bloco (z -0.5) = z 4.5
            # 1-3: direto da rua; chuveiro forte, depois só pinga
            {"peca": "cano_rua", "faz": "fluxo", "tipo": "agua", "de": "inicio-3", "ate": "f3:pressao", "quantidade": 40, "velocidade": 0.35},
            {"peca": "ramal", "faz": "fluxo", "tipo": "agua", "de": "inicio-3", "ate": "f3:pressao", "quantidade": 22, "velocidade": 0.9},
            {"peca": "chuveiro", "faz": "fluxo", "tipo": "agua", "caminho": [[0, -0.02, 0], [0, -2.1, 0]], "de": "inicio-3", "ate": "f3:pressao", "quantidade": 34, "velocidade": 1.6},
            {"peca": "chuveiro", "faz": "fluxo", "tipo": "agua", "caminho": [[0.06, -0.02, 0], [0.32, -2.1, 0.1]], "de": "inicio-3", "ate": "f3:pressao", "quantidade": 28, "velocidade": 1.5},
            {"peca": "chuveiro", "faz": "fluxo", "tipo": "agua", "caminho": [[-0.06, -0.02, 0], [-0.3, -2.1, -0.1]], "de": "inicio-3", "ate": "f3:pressao", "quantidade": 28, "velocidade": 1.5},
            {"peca": "chuveiro", "faz": "fluxo", "tipo": "agua", "caminho": [[0, -0.02, 0], [0, -2.1, 0]], "de": "f3:pinga", "ate": "f4", "quantidade": 2, "velocidade": 0.7},
            {"peca": "chuveiro", "faz": "tremer", "de": "f3:pinga", "ate": "f3:pinga+0.5", "intensidade": 0.6},
            # 4-5: tanque no quintal, água parada no cano
            {"peca": "tanque", "faz": "aparecer", "de": "f4:tanque"},
            {"peca": "cano_tq", "faz": "aparecer", "de": "f4:tanque+0.3"},
            {"peca": "coluna", "faz": "crescer", "de": "f5:sobe", "ate": "f5:parada"},
            {"peca": "coluna", "faz": "pulsar", "de": "f5:parada", "ate": "f6", "intensidade": 0.5},
            # 6: o tanque sobe para o telhado
            {"peca": "coluna", "faz": "sumir", "de": "f6:alto"},
            {"peca": "cano_tq", "faz": "sumir", "de": "f6:alto"},
            {"peca": "ramal", "faz": "sumir", "de": "f6:alto"},
            {"peca": "cano_ch", "faz": "sumir", "de": "f6:alto"},
            {"peca": "tanque", "faz": "mover", "de": "f6:alto", "ate": "f6:casa", "desloc": [B[0] - T0[0], B[1], 0]},
            {"peca": "entrada", "faz": "aparecer", "de": "f6:casa"},
            {"peca": "descida", "faz": "aparecer", "de": "f6:casa"},
            # 7-8: o peso empurra; chuveiro forte de novo
            {"peca": "seta1", "faz": "aparecer", "de": "f7:peso"},
            {"peca": "seta2", "faz": "aparecer", "de": "f7:peso"},
            {"peca": "seta1", "faz": "empurrar", "de": "f7:peso", "ate": "f8:fim", "intensidade": 0.18},
            {"peca": "seta2", "faz": "empurrar", "de": "f7:peso", "ate": "f8:fim", "intensidade": 0.18},
            {"peca": "seta1", "faz": "sumir", "de": "f9"},
            {"peca": "seta2", "faz": "sumir", "de": "f9"},
            {"peca": "descida", "faz": "fluxo", "tipo": "agua", "de": "f7:empurra", "quantidade": 14, "velocidade": 1.1},
            {"peca": "chuveiro", "faz": "fluxo", "tipo": "agua", "caminho": [[0, -0.02, 0], [0, -2.1, 0]], "de": "f7:abaixo", "quantidade": 34, "velocidade": 1.6},
            {"peca": "chuveiro", "faz": "fluxo", "tipo": "agua", "caminho": [[0.06, -0.02, 0], [0.32, -2.1, 0.1]], "de": "f7:abaixo", "quantidade": 28, "velocidade": 1.5},
            {"peca": "chuveiro", "faz": "fluxo", "tipo": "agua", "caminho": [[-0.06, -0.02, 0], [-0.3, -2.1, -0.1]], "de": "f7:abaixo", "quantidade": 28, "velocidade": 1.5},
            # 9: transborda (a caixa abre em corte para ver por dentro)
            {"peca": "tanque", "faz": "cortar", "de": "f9", "ate": "f9+0.6", "intensidade": 1.0, "posicao": 0.13},  # corta a frente e deixa a boia inteira
            {"peca": "entrada", "faz": "fluxo", "tipo": "agua", "de": "f9", "ate": "f10:fecha", "quantidade": 24, "velocidade": 0.8},
            {"peca": "tanque", "faz": "fluxo", "tipo": "agua", "caminho": [[0.72, 0.56, 0], [0.95, 0.4, 0], [1.25, -0.6, 0.1], [1.4, -3.4, 0.2]], "de": "f9:transborda", "ate": "f10:boia", "quantidade": 40, "velocidade": 0.9},
            {"peca": "tanque", "faz": "tremer", "de": "f9:transborda", "ate": "f9:transborda+0.6", "intensidade": 0.5},
            {"peca": "rach", "faz": "crescer", "de": "f9:telhado", "ate": "f9:fim+0.6"},
            {"peca": "rach", "faz": "sumir", "de": "f10"},
            # 10: boia sobe e fecha
            {"peca": "haste", "faz": "aparecer", "de": "f10:boia"},
            {"peca": "boia", "faz": "aparecer", "de": "f10:boia"},
            {"peca": "piv_boia", "faz": "girar_para", "de": "f10:sobe", "ate": "f10:enche", "eixo": "z", "angulo": -38},
            {"peca": "boia", "faz": "pulsar", "de": "f10:fecha", "ate": "f10:fim", "intensidade": 0.6},
            # 11: ladrão
            {"peca": "ladrao", "faz": "aparecer", "de": "f11:ladrao"},
            {"peca": "ladrao", "faz": "fluxo", "tipo": "agua", "de": "f11:joga", "ate": "f12", "quantidade": 12, "velocidade": 1.0},
            {"peca": "ladrao", "faz": "fluxo", "tipo": "agua", "caminho": [[0.55, -0.15, 0], [0.75, -1.0, 0], [0.85, -4.0, 0]], "de": "f11:fora", "ate": "f12", "quantidade": 26, "velocidade": 0.9},
            # 13: tampa
            {"peca": "tampa", "faz": "aparecer", "de": "f13:tampa"},
            # 14: sujeira no fundo, saída acima
            {"peca": "sujeira", "faz": "crescer", "de": "f14:fundo", "ate": "f14:assenta"},
            {"peca": "saida_int", "faz": "pulsar", "de": "f14:saida", "ate": "f14:torneira", "intensidade": 0.7},
        ],
        "rotulos": [
            {"alvo": "chuveiro", "texto": "Chuveiro", "de": "f1:chuveiro", "ate": "f1:fim"},
            {"alvo": "cano_rua", "texto": "Cano da rua", "de": "f2:rua", "ate": "f2:fim+0.2"},
            {"alvo": "tanque", "texto": "Tanque", "de": "f4:tanque", "ate": "f4:fim"},
            {"alvo": "coluna", "texto": "Parada", "de": "f5:parada", "ate": "f5:fim+0.2"},
            {"alvo": "tanque", "texto": "Caixa d'água", "de": "f6:caixa", "ate": "f6:fim+0.3"},
            {"alvo": "seta1", "texto": "Peso da água", "de": "f7:peso", "ate": "f7:fim"},
            {"alvo": "boia", "texto": "Boia", "de": "f10:boia", "ate": "f10:fim"},
            {"alvo": "ladrao", "texto": "Ladrão", "de": "f11:ladrao", "ate": "f11:fim"},
            {"alvo": "tampa", "texto": "Tampa", "de": "f13:tampa", "ate": "f13:fim+0.3"},
            {"alvo": "sujeira", "texto": "Sujeira", "de": "f14:assenta", "ate": "f14:torneira"},
            {"alvo": "saida_int", "texto": "Saída", "de": "f14:torneira", "ate": "f14:fim+0.2"},
        ],
        "cartoes": [
            {"de": "f8:alta", "ate": "f8:fim+0.2", "grande": "+ ALTURA", "pequeno": "= mais força na água"},
        ],
        "efeitos": [
            {"de": "f3:pinga", "efeito": "zoom_soco"},
            {"de": "f5:parada", "efeito": "circular", "alvo": "coluna"},
            {"de": "f7:peso", "efeito": "linhas", "ate": "f7:peso+0.7", "cor": "#FFE14A", "intensidade": 0.6},
            {"de": "f9:transborda", "efeito": "tremor"},
            {"de": "f10:boia", "efeito": "circular", "alvo": "boia"},
            {"de": "f12:mosquito", "efeito": "letreiro", "texto": "DENGUE!", "cor": "#FF3B30", "altura": 0.32},
            {"de": "f16:parabens", "efeito": "linhas", "ate": "f16:fim", "intensidade": 0.6},
        ],
        "sons": [
            {"de": "inicio", "som": "agua", "volume": 0.5},
            {"de": "f3:pinga", "som": "impacto", "volume": 0.5},
            {"de": "f4:tanque", "som": "pop", "volume": 0.6},
            {"de": "f5:parada", "som": "tensao_sobe", "volume": 0.5},
            {"de": "f6:alto", "som": "whoosh", "volume": 0.6},
            {"de": "f7:abaixo", "som": "agua", "volume": 0.5},
            {"de": "f9:transborda", "som": "agua", "volume": 0.6},
            {"de": "f10:boia", "som": "pop", "volume": 0.6},
            {"de": "f10:fecha", "som": "clique", "volume": 0.6},
            {"de": "f11:ladrao", "som": "pop", "volume": 0.6},
            {"de": "f12:mosquito", "som": "susto", "volume": 0.5},
            {"de": "f13:tampa", "som": "ding", "volume": 0.6},
            {"de": "f15:torre", "som": "whoosh", "volume": 0.6},
            {"de": "f16:parabens", "som": "ding", "volume": 0.7},
        ],
        "planos": [
            # hook: chuveiro forte dentro da casa em corte
            {"de": "inicio", "tipo": "detalhe", "camera": [0.9, 2.0, 1.9], "alvo": [2.2, 1.55, -1.2], "movimento": "aproximar"},
            # a casa e a rua: corte do chão com o cano
            {"de": "f2", "tipo": "geral", "camera": [-3.5, 2.6, 13.5], "alvo": [0.6, 0.6, 1.0], "movimento": "arco", "intensidade": 0.5},
            {"de": "f2:rua", "tipo": "detalhe", "camera": [1.2, -0.35, 7.6], "alvo": [1.8, -0.6, 4.4], "movimento": "travelling", "intensidade": 0.4},
            # falha: só pinga
            {"de": "f3", "tipo": "detalhe", "camera": [0.9, 2.0, 1.9], "alvo": [2.2, 1.55, -1.2], "movimento": "fixo"},
            {"de": "f3:pinga", "tipo": "detalhe", "camera": [1.6, 1.9, 0.6], "alvo": [2.2, 1.9, -1.2], "movimento": "zoom_rapido"},
            # tanque no quintal
            {"de": "f4", "tipo": "geral", "camera": [8.5, 2.6, 6.5], "alvo": [3.6, 0.9, -1.2], "movimento": "arco", "intensidade": -0.4, "transicao": "varrer"},
            {"de": "f5:sobe", "tipo": "detalhe", "camera": [5.6, 1.1, 2.4], "alvo": [3.6, 0.8, -1.2], "movimento": "aproximar"},
            # sobe para o alto
            {"de": "f6", "tipo": "geral", "camera": [9.5, 4.2, 9.0], "alvo": [2.4, 2.6, -1.0], "movimento": "subir", "transicao": "varrer"},
            {"de": "f6:caixa", "tipo": "geral", "camera": [6.0, 5.8, 5.2], "alvo": [2.2, 3.4, -1.2], "movimento": "arco", "intensidade": 0.4},
            # o segredo: peso empurra cano abaixo
            {"de": "f7", "tipo": "detalhe", "camera": [1.0, 3.3, 3.2], "alvo": [2.2, 2.9, -1.2], "movimento": "descer", "transicao": "zoom"},
            {"de": "f7:abaixo", "tipo": "detalhe", "camera": [0.9, 2.0, 1.9], "alvo": [2.2, 1.55, -1.2], "movimento": "aproximar"},
            {"de": "f8:caixa", "tipo": "geral", "camera": [-5.5, 3.2, 10.5], "alvo": [1.0, 2.2, -0.6], "movimento": "travelling", "intensidade": 0.5},
            # transborda
            {"de": "f9", "tipo": "detalhe", "camera": [4.4, 5.2, 2.6], "alvo": [2.4, 3.8, -1.2], "movimento": "aproximar", "transicao": "chicote"},
            {"de": "f9:transborda", "tipo": "geral", "camera": [7.5, 4.0, 6.0], "alvo": [2.6, 2.6, -1.2], "movimento": "tremer"},
            # boia por dentro da caixa cortada
            {"de": "f10", "tipo": "detalhe", "camera": [2.6, 4.25, 1.2], "alvo": [2.25, 3.75, -1.2], "movimento": "arco", "intensidade": 0.3, "transicao": "varrer"},
            {"de": "f10:enche", "tipo": "detalhe", "camera": [3.4, 4.4, 1.0], "alvo": [2.6, 4.0, -1.2], "movimento": "aproximar"},
            # ladrão
            {"de": "f11", "tipo": "geral", "camera": [7.2, 4.6, 3.2], "alvo": [3.4, 3.4, -1.2], "movimento": "travelling", "intensidade": -0.4},
            {"de": "f11:joga", "tipo": "detalhe", "camera": [5.6, 3.6, 1.6], "alvo": [3.8, 3.3, -1.2], "movimento": "descer"},
            # sujeira e mosquito
            {"de": "f12", "tipo": "detalhe", "camera": [3.6, 6.1, 1.2], "alvo": [2.2, 4.1, -1.2], "movimento": "aproximar", "transicao": "chicote"},
            # tampa
            {"de": "f13", "tipo": "detalhe", "camera": [4.6, 5.0, 2.2], "alvo": [2.2, 4.0, -1.2], "movimento": "arco", "intensidade": 0.4, "transicao": "varrer"},
            # saída acima do fundo
            {"de": "f14", "tipo": "detalhe", "camera": [3.0, 4.35, 1.5], "alvo": [2.2, 3.35, -1.2], "movimento": "aproximar", "transicao": "zoom"},
            # torre na cidade
            {"de": "f15", "tipo": "geral", "camera": [14, 9, 26], "alvo": [-16, 10, -30], "movimento": "subir", "transicao": "chicote"},
            {"de": "f15:torre", "tipo": "geral", "camera": [2, 6, 10], "alvo": [-24, 14, -34], "movimento": "arco", "intensidade": 0.4},
            # parabéns
            {"de": "f16", "tipo": "geral", "camera": [-6, 6.5, 14], "alvo": [1.0, 2.0, -0.6], "movimento": "arco", "intensidade": 0.6},
        ],
    }],
    "chamada": {"pergunta": "E agora, topa construir um fogão do zero?", "texto": "Comenta", "destaque": "FOGÃO"},
    "postagem": {
        "titulo": "Como funciona a caixa d'água? Por que ela fica lá em cima",
        "descricao": "Como funciona a caixa d'água: por que ela fica no alto, como a altura dá pressão no chuveiro, para que servem a boia, o ladrão e a tampa.",
        "hashtags": ["comofunciona", "caixadagua", "engenharia", "curiosidades"],
        "comentario": "Na sua casa a água do chuveiro sai forte ou fraca? Agora você sabe de onde vem a força.",
        "capa": "f10:boia+0.6",
    },
}
json.dump(ep, open(f"{pasta}/ep21.json", "w"), ensure_ascii=False, indent=1)
print("ok")
