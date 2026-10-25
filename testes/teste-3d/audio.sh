#!/usr/bin/env bash
# Trilha provisória do teste (ondas, tensão e impactos sintetizados com ffmpeg).
# Na produção real a narração e os efeitos virão do ElevenLabs.
set -euo pipefail
SAIDA="${1:-audio.wav}"
D=10

ffmpeg -loglevel error -y \
  -f lavfi -i "anoisesrc=color=brown:duration=$D:amplitude=0.6:seed=7" \
  -f lavfi -i "aevalsrc='0.16*(sin(2*PI*55*t)+0.6*sin(2*PI*82.4*t))*(0.75+0.25*sin(2*PI*3*t))*min(1,max(0,(t-5.4)/2.6))':s=48000:d=$D" \
  -f lavfi -i "aevalsrc='0.8*sin(2*PI*(38+90*exp(-(t-6.7)*7))*(t-6.7))*exp(-(t-6.7)*5)*gte(t,6.7)':s=48000:d=$D" \
  -f lavfi -i "aevalsrc='1.0*sin(2*PI*(34+110*exp(-(t-9.1)*6))*(t-9.1))*exp(-(t-9.1)*3)*gte(t,9.1)':s=48000:d=$D" \
  -f lavfi -i "anoisesrc=color=pink:duration=$D:amplitude=0.7:seed=3" \
  -filter_complex "\
[0]lowpass=f=450,volume='0.55+0.25*sin(2*PI*0.17*t)':eval=frame,volume='1-0.6*min(1,max(0,(t-8.4)/0.7))':eval=frame[ondas];\
[4]highpass=f=1800,lowpass=f=7000,volume='0.9*exp(-abs(t-7.2)*16)+if(between(t,8.45,9.1),pow((t-8.45)/0.65,2),0)':eval=frame[sopro];\
[ondas][1][2][3][sopro]amix=inputs=5:normalize=0,alimiter=limit=0.9,afade=t=in:d=0.15,afade=t=out:st=9.75:d=0.25[a]" \
  -map "[a]" -ar 48000 -ac 2 "$SAIDA"
echo "trilha gerada: $SAIDA"
