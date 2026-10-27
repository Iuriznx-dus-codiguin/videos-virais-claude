---
name: como-funciona-corrigir
description: Aplica as correções do Iuri a um vídeo do Como Funciona já entregue e transforma cada correção em regra permanente do Como Funciona. Use quando o Iuri responder à revisão de um vídeo do Como Funciona.
---

# Corrigir o Como Funciona e aprender com isso

Só mexa em `motor/public/series/como-funciona/`. Nunca grave regra em `_historias/regras.md` nem em outra série: este fluxo é separado do de aventura.

## 1. Entender o pedido
Separe cada correção em:
- **só este vídeo** (troca de fala, peça errada, câmera cortando o Tito);
- **regra do Como Funciona** (vale para os próximos: ritmo, jeito de explicar, cores da maquete, tamanho dos rótulos, tom do Tito, tipo de tema na pauta);
- **framework** (`estilos.md`, o esqueleto "você constrói": "Se você..." → degraus "MAS/SÓ QUE..." + "Então, você..." → "Parabéns! Você construiu..."): um vídeo validado que ele mandou, um degrau que ficou difícil de entender, um jeito novo de abrir ou fechar. Acrescente o exemplo dele em `estilos.md` sem apagar os validados; mude o esqueleto só se o pedido mudar o esqueleto, e diga ao Iuri o que mudou;
- **pauta** (trocar, tirar ou adiantar temas): edite `pauta.json` mantendo `n` em ordem para os pendentes.
- **roteiro do próximo vídeo** (o que foi mandado junto com a entrega): edite o `epNN.json` dele, rode `validar` e `npm run dados -- salvar como-funciona`, sem voz nem render; a rotina de amanhã parte dessa versão.
Se for ambígua, escolha a leitura mais provável, aplique e diga qual usou.

## 2. Aplicar no vídeo
1. `cd motor && npm run dados -- baixar` (sessão nova) e edite `public/series/como-funciona/epNN.json`.
2. `npm run validar -- como-funciona <n>`; se mudou fala, `bash voz/instalar.sh` (sessão nova) e `npm run vozes -- como-funciona <n>`.
3. `npm run render -- como-funciona <n>` e confira com `npm run quadro`.
4. `npm run dados -- entregar como-funciona <n> --dia=... --hora=...` com o mesmo dia e hora de antes. Se já passou do horário, avise que ele talvez já tenha postado o original.

## 3. Virar regra
- Uma linha curta, no imperativo e com data em `public/series/como-funciona/regras.md`: `- (2026-10-27) Mostre o inventor por no máximo 10 s.`
- Leia antes e não duplique: regra parecida é reescrita mais forte; se contradiz uma antiga, a nova vale e a antiga sai. Mantenha abaixo de ~40 linhas, fundindo regras parecidas.
- Defeito do motor (câmera, forma de peça, efeito): anote em `public/series/como-funciona/pendencias-motor.md` com série, número e segundo.

## 4. Salvar e responder
`npm run dados -- salvar como-funciona` e responda ao Iuri em poucas linhas: o que mudou no vídeo, quais regras ficaram gravadas e o que ficou pendente do motor.
