"""Voz em português com o OmniVoice (Apache 2.0, modelo aberto que o VoiceStudio usa por padrão).

Roda na CPU. O modelo é carregado uma vez por chamada e atende uma lista de tarefas.

  python gerar.py gerar  tarefas.json     gera falas (um .wav por tarefa)
  python gerar.py prompt tarefas.json     guarda uma voz de referência (.pt) a partir de um áudio
  python gerar.py verificar -             confere a instalação e se o modelo já foi baixado

tarefas.json: {"tarefas": [...]} e, opcionalmente, "passos" (passos de difusão).
  gerar : {"id", "saida", "texto", "voz": "voz.pt" | "instruct": "female, young adult",
           "velocidade": 1.0, "semente": 1}
  prompt: {"id", "audio", "texto", "saida"}
Cada tarefa concluída imprime uma linha JSON: {"id", "saida", "duracao", "segundos_de_calculo"}.
"""
import json
import os
import sys
import time

MODELO = os.environ.get("VOZ_MODELO", "k2-fsa/OmniVoice")
IDIOMA = os.environ.get("VOZ_IDIOMA", "pt")


def carregar():
    import torch
    from omnivoice import OmniVoice

    torch.set_num_threads(int(os.environ.get("VOZ_THREADS", os.cpu_count() or 2)))
    return torch, OmniVoice.from_pretrained(MODELO, device_map="cpu", dtype=torch.float32)


def gerar(torch, modelo, tarefas, passos):
    import soundfile as sf
    from omnivoice import VoiceClonePrompt

    prompts = {}
    for t in tarefas:
        inicio = time.time()
        torch.manual_seed(int(t.get("semente", 1)))
        args = {"text": t["texto"], "language": IDIOMA, "num_step": passos}
        if t.get("velocidade") and t["velocidade"] != 1:
            args["speed"] = float(t["velocidade"])
        if t.get("voz"):
            if t["voz"] not in prompts:
                prompts[t["voz"]] = VoiceClonePrompt.load(t["voz"])
            args["voice_clone_prompt"] = prompts[t["voz"]]
        elif t.get("instruct"):
            args["instruct"] = t["instruct"]
        audio = modelo.generate(**args)[0]
        os.makedirs(os.path.dirname(os.path.abspath(t["saida"])), exist_ok=True)
        sf.write(t["saida"], audio, modelo.sampling_rate)
        print(json.dumps({"id": t["id"], "saida": t["saida"], "duracao": len(audio) / modelo.sampling_rate, "segundos_de_calculo": round(time.time() - inicio, 1)}), flush=True)


def prompt(torch, modelo, tarefas):
    for t in tarefas:
        p = modelo.create_voice_clone_prompt(ref_audio=t["audio"], ref_text=t["texto"])
        os.makedirs(os.path.dirname(os.path.abspath(t["saida"])), exist_ok=True)
        p.save(t["saida"])
        print(json.dumps({"id": t["id"], "saida": t["saida"]}), flush=True)


def verificar():
    import importlib.metadata as md

    from huggingface_hub import snapshot_download

    try:
        pasta = snapshot_download(MODELO, local_files_only=True)
        baixado = True
    except Exception:
        pasta, baixado = None, False
    print(json.dumps({"omnivoice": md.version("omnivoice"), "modelo": MODELO, "modelo_baixado": baixado, "pasta": pasta}), flush=True)


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("gerar", "prompt", "verificar"):
        sys.exit(__doc__)
    if sys.argv[1] == "verificar":
        verificar()
        sys.exit(0)
    pedido = json.load(open(sys.argv[2], encoding="utf-8"))
    torch, modelo = carregar()
    if sys.argv[1] == "gerar":
        gerar(torch, modelo, pedido["tarefas"], int(pedido.get("passos", os.environ.get("VOZ_PASSOS", 32))))
    else:
        prompt(torch, modelo, pedido["tarefas"])
