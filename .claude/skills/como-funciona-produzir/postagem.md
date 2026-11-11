# Postagem do Como Funciona (título, descrição, hashtags, comentário e capa)

Vídeo bom ainda precisa ser achado. Pesquisa de 03/11, pedida pelo Iuri porque os vídeos não passavam de mil visualizações. Vale só para o Como Funciona; as histórias têm a delas.

O Como Funciona tem uma vantagem que as histórias não têm: as pessoas **buscam** isso ("como funciona o micro-ondas", "por que o ventilador refresca"). O título e a descrição são escritos para essa busca, no YouTube e no Instagram.

Preencha o campo `postagem` do `epNN.json` junto com o roteiro (passo 3 da skill), inclusive no roteiro do próximo vídeo. O `validar` avisa se faltar algo. No `entregar`, o motor monta com ele o texto de cada plataforma (`videos/como-funciona-epNN.md` no ramo `dados`), com a seção "Na hora de postar".

```json
"postagem": {
  "titulo": "Como funciona o ventilador? Ele não esfria o ar",
  "descricao": "Como funciona o ventilador por dentro: motor, bobinas e pás tortas. E por que o vento dá frio, se o ar sai na mesma temperatura do quarto.",
  "hashtags": ["comofunciona", "ventilador", "curiosidades", "ciencia"],
  "comentario": "Eu jurava que o ventilador gelava o ar. Você também achava?",
  "capa": "f1:fim"
}
```

## Título (YouTube): `titulo`
- **Começa pelo que as pessoas digitam:** "Como funciona o/a [objeto]" ou "Por que o/a [objeto] [faz a coisa]?", e depois o gancho do vídeo. Até 60 caracteres; o feed mostra só o começo, então o nome do objeto vem nas primeiras palavras.
- Sem hashtag, emoji nem "#N". O `entregar` não acrescenta nada.
- Bom: "Como funciona o zíper? A pecinha que faz tudo", "Por que o ventilador refresca se não esfria o ar?". Ruim: "A pecinha que faz todo o trabalho" (sem o nome do objeto ninguém acha).

## Descrição: `descricao`
- 1 ou 2 frases com o nome do objeto e das peças principais em palavras de busca ("por dentro", "como funciona", o nome comum de cada peça). A busca do Instagram lê a legenda mais do que as hashtags. Ela abre a descrição do YouTube e a legenda do Instagram.
- O `entregar` junta o selo "COMO FUNCIONA #N", o pedido e as hashtags. No YouTube vai o "Comenta [PRÓXIMO TEMA]". No Instagram, a legenda faz a pergunta do próximo tema e pede para seguir o perfil: o Instagram diz que pedir para comentar uma palavra pode tirar o vídeo das recomendações para quem não segue.

## Hashtags: `hashtags`
- **3 a 5**, sem "#": `comofunciona`, o objeto (`ventilador`, `microondas`), o assunto (`fisica`, `engenharia`, `eletricidade`, `cozinha`) e `curiosidades`. Da mais específica para a mais ampla.
- Nada de hashtag genérica ("viral", "fyp"). Hashtag só diz ao algoritmo do que o vídeo trata.

## Comentário fixado: `comentario`
- O Iuri posta e fixa logo depois de publicar, nas duas plataformas. É a voz do Tito numa frase: confessa o mito que ele também acreditava, ou faz uma pergunta que qualquer um responde ("Você também achava?", "Na sua casa ele faz esse barulho?"). Até ~120 caracteres, sem pedir curtida nem "comenta X".

## Capa: `capa`
- Âncora como as do roteiro (`"f1:fim"`, `"f9:mas"`): o quadro que vira capa no perfil do Instagram e na lista de Shorts do canal.
- A coisa em corte no momento mais curioso (a coisa estranha da abertura, a falha, a peça que resolve), com uma palavra de impacto na legenda. O Tito não aparece na tela (11/11). Nunca um quadro de transição, a oficina escura ou a chamada.
- Confira com `npm run quadro -- como-funciona <n> <segundo da capa> --escala=0.5` (o `validar` mostra o segundo) e mande a imagem junto com o vídeo para o Iuri.

## O que o Iuri faz à mão (o .md de postagem lembra)
- escolher a capa no app (o quadro e a palavra da legenda estão no .md);
- no YouTube, pôr o vídeo anterior em "Vídeo relacionado" e o vídeo na playlist "COMO FUNCIONA";
- postar e fixar o comentário.
