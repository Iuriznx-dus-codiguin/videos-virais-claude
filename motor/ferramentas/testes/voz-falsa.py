"""Motor de voz falso para os testes: gera um tom com duração proporcional ao texto.
Mesmo contrato do voz/gerar.py. Registra cada tarefa em $VOZ_FALSA_LOG (uma linha JSON)."""
import json
import math
import os
import struct
import sys
import wave


def log(obj):
    caminho = os.environ.get("VOZ_FALSA_LOG")
    if caminho:
        with open(caminho, "a", encoding="utf-8") as f:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def escrever(caminho, segundos, freq=220):
    os.makedirs(os.path.dirname(os.path.abspath(caminho)), exist_ok=True)
    with wave.open(caminho, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        n = int(segundos * 24000)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * freq * i / 24000))) for i in range(n)))


modo = sys.argv[1]
if modo == "verificar":
    print(json.dumps({"omnivoice": "0.0-falso", "modelo": "falso", "modelo_baixado": os.environ.get("VOZ_FALSA_SEM_MODELO") is None}))
    sys.exit(0)
pedido = json.load(open(sys.argv[2], encoding="utf-8"))
for t in pedido["tarefas"]:
    if modo == "gerar":
        log({"modo": "gerar", **t, "passos": pedido.get("passos")})
        duracao = len(t["texto"]) / 14 / (t.get("velocidade") or 1)
        escrever(t["saida"], duracao)
        print(json.dumps({"id": t["id"], "saida": t["saida"], "duracao": duracao}), flush=True)
    else:
        log({"modo": "prompt", **t})
        open(t["saida"], "wb").write(b"PROMPT-FALSO:" + t["texto"].encode())
        print(json.dumps({"id": t["id"], "saida": t["saida"]}), flush=True)
