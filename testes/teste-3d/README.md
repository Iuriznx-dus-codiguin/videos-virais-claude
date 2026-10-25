# Teste 3D de 10 segundos: Blender x Three.js

Primeiro passo do plano: a mesma cena feita nos dois motores 3D, só com código e só com CPU,
para escolher o caminho pelo resultado visual e pelo tempo de render.

A cena é a abertura de um episódio da série fictícia "ILHA PERDIDA": o Léo (personagem palito com
bandana e mochila) anda pela praia, para diante de pegadas gigantes, percebe que não são dele e
dois olhos acendem no meio da mata. Termina na chamada "COMENTA PARTE 2".

## Como está organizado

| Arquivo | O que faz |
| --- | --- |
| `cena.json` | Dados da cena compartilhados pelos dois motores: cores, cenário, personagem, piscadas, legendas e chamada |
| `blender/cena.py` | Monta e renderiza a cena no Blender (EEVEE em software, sem GPU) |
| `remotion/src/cena.ts` | Linha do tempo da cena (pose do personagem e câmera); espelho exato da de `cena.py` |
| `remotion/src/Ilha3D.tsx` | A mesma cena em Three.js (React Three Fiber) |
| `remotion/src/Legendas.tsx` | Selo da série, legendas palavra por palavra e chamada final, usados nas duas versões |
| `audio.sh` | Trilha provisória sintetizada com FFmpeg (na produção, vozes e efeitos virão do ElevenLabs) |
| `render.sh` | Renderiza tudo e monta `out/teste-blender.mp4`, `out/teste-three.mp4` e `out/comparacao.mp4` |

Os dois motores leem os mesmos números e usam as mesmas funções de pose e câmera, então qualquer
diferença entre os vídeos vem do motor, não da cena.

## Como rodar

Uma vez por máquina:

```bash
apt-get install -y libegl1 libegl-mesa0 libgl1-mesa-dri   # OpenGL em software para o Blender
pip install bpy==5.2.3                                     # Blender como módulo Python
(cd remotion && npm ci)
```

Depois, `./render.sh`. Para ver só alguns quadros do Blender:

```bash
python3 blender/cena.py -- --saida /tmp/previa --quadros 1,150,280 --amostras 6
```

O Remotion precisa do Chromium com `--gl=swangle` (já configurado em `render.sh` e no `package.json`).

## Resultado (24/10/2026)

Medido na máquina das rotinas do Claude Code: 4 núcleos de CPU, 15 GB de memória, sem placa de vídeo.
Vídeo de 10 s em 1080x1920 a 30 quadros por segundo (300 quadros).

| | Blender (EEVEE em software, 6 amostras) | Three.js (Remotion + SwiftShader) |
| --- | --- | --- |
| Tempo dos 10 s | 43 min | 1 min 43 s, já contando a montagem do projeto |
| Tempo por quadro | 8,2 s (mediana) | cerca de 0,3 s |
| Estimativa para 1 minuto | cerca de 4 h | cerca de 10 min |
| Sexta-feira (3 episódios) | cerca de 12 h, não cabe entre 3h e a revisão | cerca de 30 min |

O visual ficou praticamente igual, porque as duas versões usam o mesmo material de 3 tons e o
mesmo contorno por casca invertida. Diferenças que sobram: o Blender facetou mais os arbustos e
deixa o brilho dos olhos mais forte (mistura a transparência em luz linear); o Three.js deixa a
cabeça do personagem um pouco mais branca.

Dois ajustes feitos durante o teste:
- Blender: o brilho dos olhos era uma esfera na frente do olho e cobria pupila e pálpebra; virou um
  disco atrás do globo, igual ao sprite do Three.js.
- Three.js: o `<Outlines>` do drei 10.7 trata a espessura em pixels quando `screenspace` está
  desligado, ao contrário do que o nome sugere, então os contornos de 0,02 sumiam. Agora todos
  passam pelo componente `Contorno`, com `screenspace` ligado.
