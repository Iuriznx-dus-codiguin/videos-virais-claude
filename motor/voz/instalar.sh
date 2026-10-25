#!/usr/bin/env bash
# Instala o OmniVoice (voz grátis e aberta) num ambiente virtual em motor/voz/.venv e baixa o modelo.
# Precisa dos domínios huggingface.co, *.hf.co e download.pytorch.org e download-r2.pytorch.org liberados no ambiente de nuvem.
# Uso: bash voz/instalar.sh        (a partir de motor/; é seguro rodar de novo)
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
if ! .venv/bin/python -c "import omnivoice" 2>/dev/null; then
  .venv/bin/pip install --quiet --upgrade pip
  # PyTorch só para CPU (o padrão do PyPI traz bibliotecas de GPU de vários GB)
  .venv/bin/pip install --quiet torch torchaudio --index-url https://download.pytorch.org/whl/cpu
  .venv/bin/pip install --quiet omnivoice
fi
# baixa o modelo agora, para a primeira fala do dia não esperar
.venv/bin/python - <<'PY'
import os
from huggingface_hub import snapshot_download
print("modelo em", snapshot_download(os.environ.get("VOZ_MODELO", "k2-fsa/OmniVoice")))
PY
echo "voz pronta"
