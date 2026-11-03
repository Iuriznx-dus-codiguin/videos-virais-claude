# Postagem das histórias (título, descrição, hashtags, comentário e capa)

Vídeo bom ainda precisa ser achado. Pesquisa de 03/11, pedida pelo Iuri porque os vídeos não passavam de mil visualizações. Vale só para as séries de histórias; o Como Funciona tem a dele.

Preencha o campo `postagem` do `epNN.json` junto com o roteiro (passo 3 da skill), inclusive no rascunho da próxima parte. O `validar` avisa se faltar algo. No `entregar`, o motor monta com ele o texto de cada plataforma (`videos/<serie>-epNN.md` no ramo `dados`), com a seção "Na hora de postar".

```json
"postagem": {
  "titulo": "Ela sumiu de madrugada e só deixou pegadas",
  "descricao": "Quatro sobreviventes de um avião que caiu numa ilha deserta. De madrugada, a menina de 13 anos some, e a maré vai apagar as pegadas dela em uma hora.",
  "hashtags": ["ilhadeserta", "sobrevivencia", "suspense", "animacao"],
  "comentario": "Eu seguiria as botas. E você: seguia ou voltava pra praia?",
  "capa": "f9:inicio"
}
```

## Título (YouTube): `titulo`
- A situação mais forte da parte, como manchete: **até ~50 caracteres** (o feed mostra só o começo), com palavras que alguém buscaria (avião, ilha deserta, sobreviver, naufrágio, desaparecida).
- O `entregar` acrescenta " | VOO 818 parte 7" no fim. Não escreva série, parte, emoji nem hashtag.
- Não conte a virada. Bom: "Ela sumiu de madrugada e só deixou pegadas". Ruim: "Pegadas" (não diz nada) ou "Alguém sequestrou a Lia" (conta o fim).

## Descrição: `descricao`
- 1 ou 2 frases que contam a premissa para quem nunca viu a série, com as palavras de busca. A busca do Instagram lê a legenda mais do que as hashtags. Ela abre a descrição do YouTube e a legenda do Instagram.
- O `entregar` junta o nome da parte, a pergunta da chamada e as hashtags. No YouTube vai o "Comenta PARTE N". No Instagram, a legenda faz a pergunta e pede para seguir o perfil: o Instagram diz que pedir para comentar uma palavra pode tirar o vídeo das recomendações para quem não segue.

## Hashtags: `hashtags`
- **3 ou 4**, sem "#", da mais específica para a mais ampla: o assunto da parte (ilhadeserta, naufragio, desaparecida), o gênero (sobrevivencia, suspense, misterio) e o formato (animacao). O nome da série entra sozinho, como a primeira.
- Nada de hashtag genérica ("viral", "fyp", "foryou"). Hashtag só diz ao algoritmo do que o vídeo trata; quem leva o vídeo longe é quem assiste até o fim e manda para alguém.

## Comentário fixado: `comentario`
- O Iuri posta e fixa logo depois de publicar, nas duas plataformas. É a voz do narrador escolhendo um lado do dilema da chamada e devolvendo a pergunta, para puxar resposta de verdade. Até ~120 caracteres, sem pedir curtida nem "comenta X".

## Capa: `capa`
- Âncora como as do roteiro (`"f9:inicio"`, `"f4:fim+0.2"`): o quadro que vira capa no perfil do Instagram e na lista de Shorts do canal. Quem chega pelo perfil escolhe pela capa.
- Close do personagem com expressão forte ou o quadro do gancho com o perigo bem claro, com uma palavra de impacto na legenda. Nunca o quadro da virada, um quadro de transição ou um quadro escuro.
- Confira com `npm run quadro -- <serie> <parte> <segundo da capa> --escala=0.5` (o `validar` mostra o segundo) e mande a imagem junto com o vídeo para o Iuri.

## O que o Iuri faz à mão (o .md de postagem lembra)
- escolher a capa no app (o quadro e a palavra da legenda estão no .md);
- no YouTube, pôr a parte anterior em "Vídeo relacionado" e o vídeo na playlist "<SÉRIE> (em ordem)", para quem chegou na parte 7 achar a 1;
- postar e fixar o comentário.
