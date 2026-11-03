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
- **framework** (`estilos.md`: "volta ao laboratório" para invenções, "você constrói" para o que foi desenvolvido ao longo de anos, e a regra de escolha entre os dois): um vídeo validado que ele mandou, um trecho ou degrau difícil de entender, um jeito novo de abrir ou fechar, ou um tema que deve ir para o outro framework. Acrescente o exemplo dele no framework certo de `estilos.md` sem apagar os validados; para trocar o framework de um tema, mude o campo `framework` dele na pauta (e, se for o roteiro do próximo vídeo, reescreva o `epNN.json` no outro framework); mude um esqueleto ou a regra de escolha só se o pedido mudar isso, e diga ao Iuri o que mudou;
- **pauta** (trocar, tirar ou adiantar temas): edite `pauta.json` mantendo `n` em ordem para os pendentes, com `framework` em todo tema (e `estilo` nos do laboratório) e sem mais de 3 seguidos no mesmo framework.
- **roteiro do próximo vídeo** (o que foi mandado junto com a entrega): edite o `epNN.json` dele, rode `validar` e `npm run dados -- salvar como-funciona`, sem voz nem render; a rotina de amanhã parte dessa versão.
Se for ambígua, escolha a leitura mais provável, aplique e diga qual usou.

**Tempos do vídeo:** o vídeo entregue sai acelerado 1.1x. Quando o Iuri citar um segundo do vídeo ("aos 40 s"), multiplique por 1,1 para achar o tempo no roteiro, no `quadro` e no `enquadramento` (40 s do vídeo = 44 s do roteiro).

## 2. Aplicar no vídeo
1. `cd motor && npm run dados -- baixar` (sessão nova) e edite `public/series/como-funciona/epNN.json`.
2. `npm run validar -- como-funciona <n>`; se mudou fala, `bash voz/instalar.sh` (sessão nova) e `npm run vozes -- como-funciona <n>`.
3. `npm run render -- como-funciona <n>` (qualidade média, 20 a 35 MB; mande o próprio mp4) e confira com `npm run quadro`. Correção de produção (transição, câmera, partícula, círculo, letreiro) segue `como-funciona-produzir/producao.md`.
4. `npm run dados -- entregar como-funciona <n> --dia=... --hora=...` com o mesmo dia e hora de antes. Se já passou do horário, avise que ele talvez já tenha postado o original.

## 3. Virar regra
- Uma linha curta, no imperativo e com data em `public/series/como-funciona/regras.md`: `- (2026-10-27) Mostre o inventor por no máximo 10 s.`
- Leia antes e não duplique: regra parecida é reescrita mais forte; se contradiz uma antiga, a nova vale e a antiga sai. Mantenha abaixo de ~40 linhas, fundindo regras parecidas.
- Defeito do motor (câmera, forma de peça, efeito): anote em `public/series/como-funciona/pendencias-motor.md` com série, número e segundo.

## 4. Salvar e responder
`npm run dados -- salvar como-funciona` e responda ao Iuri em poucas linhas: o que mudou no vídeo, quais regras ficaram gravadas e o que ficou pendente do motor.
