#!/usr/bin/env bash
# Renderiza o teste de 10 segundos nos dois motores e junta com legendas e trilha.
# Pré-requisitos (uma vez por máquina):
#   apt-get install -y libegl1 libegl-mesa0 libgl1-mesa-dri   # OpenGL em software para o Blender
#   pip install bpy==5.2.3                                     # Blender como módulo Python
#   (cd remotion && npm ci)
set -euo pipefail
cd "$(dirname "$0")"
PY="${PYTHON:-python3}"
CHROME="${CHROME:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}"
mkdir -p out

echo "== Blender: quadros 1-300"
time "$PY" blender/cena.py -- --saida blender/quadros --quadros 1-300 --amostras 6
ffmpeg -loglevel error -y -framerate 30 -i blender/quadros/quadro_%04d.png -c:v libx264 -crf 10 -pix_fmt yuv420p remotion/public/blender.mp4

echo "== Three.js (Remotion)"
(cd remotion && time npx remotion render src/index.ts TesteThree ../out/three_sem_audio.mp4 --gl=swangle --crf=16 --browser-executable="$CHROME")
(cd remotion && npx remotion render src/index.ts TesteBlender ../out/blender_sem_audio.mp4 --gl=swangle --crf=16 --browser-executable="$CHROME")

echo "== Trilha e montagem final"
./audio.sh out/trilha.wav
for v in three blender; do
  ffmpeg -loglevel error -y -i out/${v}_sem_audio.mp4 -i out/trilha.wav -c:v copy -c:a aac -b:a 192k -shortest out/teste-${v}.mp4
done
FONTE=remotion/public/fontes/montserrat-900.woff2
ffmpeg -loglevel error -y -i out/teste-blender.mp4 -i out/teste-three.mp4 -filter_complex \
  "[0:v]scale=540:960[a];[1:v]scale=540:960[b];[a][b]hstack=2,pad=1080:1050:0:90:color=0x111111,\
drawtext=fontfile=$FONTE:text='BLENDER':fontsize=44:fontcolor=white:x=270-tw/2:y=24,\
drawtext=fontfile=$FONTE:text='THREE.JS':fontsize=44:fontcolor=white:x=810-tw/2:y=24[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -c:a copy out/comparacao.mp4
echo "pronto: out/teste-blender.mp4, out/teste-three.mp4, out/comparacao.mp4"
