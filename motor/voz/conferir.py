"""Confere a pronúncia das falas geradas: transcreve cada áudio com o Whisper (modelo aberto,
roda na CPU) para comparar com o texto do roteiro.

  python conferir.py tarefas.json

tarefas.json: {"tarefas": [{"id", "audio"}]}
Cada tarefa imprime uma linha JSON: {"id", "ouvido"}.
O modelo padrão é o openai/whisper-small (troque com VOZ_ASR); ele é baixado do huggingface.co
na primeira vez.
"""
import json
import os
import sys

MODELO = os.environ.get("VOZ_ASR", "openai/whisper-small")


def main():
    import soundfile as sf
    import torch
    from transformers import pipeline

    torch.set_num_threads(int(os.environ.get("VOZ_THREADS", os.cpu_count() or 2)))
    with open(sys.argv[1], encoding="utf8") as f:
        tarefas = json.load(f)["tarefas"]
    asr = pipeline("automatic-speech-recognition", model=MODELO, device="cpu")
    for t in tarefas:
        audio, taxa = sf.read(t["audio"], dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        r = asr({"raw": audio, "sampling_rate": taxa}, generate_kwargs={"language": "portuguese", "task": "transcribe"})
        print(json.dumps({"id": t["id"], "ouvido": r["text"].strip()}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
