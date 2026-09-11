import type { StudyFormat } from './scan.types';

/**
 * Monta a instrução enviada ao modelo.
 *
 * O prompt é construído a partir dos formatos pedidos, e não fixo, por um
 * motivo prático: gerar oito flashcards que ninguém pediu custa tokens, custa
 * segundos de espera e ainda dilui a atenção do modelo no que foi realmente
 * solicitado. Quem pede só o resumo recebe um prompt que só fala de resumo.
 *
 * O que cada regra pede vem de olhar o que o modelo produzia sem ela. A
 * primeira versão deste arquivo dizia apenas "entre 3 e 7 tópicos principais",
 * e para uma lousa de fotossíntese devolveu `["CO2", "H2O", "C6H12O6", "O2"]` —
 * quatro rótulos que não ensinam nada a quem os lê depois. Os flashcards
 * saíam no mesmo tom: "O que é CO2?" / "Dióxido de carbono". As regras abaixo
 * existem para fechar essa porta, e cada uma traz o exemplo do erro que evita.
 */

interface FieldSpec {
  schema: string;
  rules: string[];
}

const FIELD_SPECS: Record<StudyFormat, FieldSpec> = {
  summary: {
    schema: '"summary": "Resumo em 3 a 5 frases, conforme as regras"',
    rules: [
      'RESUMO',
      '- Comece afirmando o conceito, não a imagem. Escreva "A fotossíntese é o processo…" e nunca "A imagem mostra…" ou "O material aborda…".',
      '- Estruture em três movimentos, nesta ordem: o que é, como funciona, por que importa.',
      '- Aqui você pode ir além da imagem. Se o material só traz a equação, explique o que ela significa; se cita um termo sem definir, defina. O objetivo é que alguém entenda o assunto lendo só isto.',
      '- O que você acrescentar precisa explicar o que está na imagem, não mudar de assunto. Contexto que ajuda a entender a lousa, sim; um tema vizinho que ela não toca, não.',
      '- Frases curtas, uma ideia por frase. O texto costuma ser ouvido em voz alta, e período longo se perde no meio.',
      '- Escreva por extenso o que é sigla ou fórmula na primeira aparição: "gás carbônico (CO₂)". Um leitor de tela pronuncia "CO2" como "cê-ó-dois".',
      '- Sem marcação: nada de asteriscos, hashtags, traços de lista ou títulos. O app exibe texto puro, e os símbolos apareceriam crus na tela.',
    ],
  },
  topics: {
    schema: '"topics": ["afirmação curta e completa", "…"]',
    rules: [
      'TÓPICOS',
      '- Só o que está na imagem. Diferente do resumo, aqui não se acrescenta nada: cada tópico precisa ter origem visível no material fotografado.',
      '- Tire os tópicos do texto que você transcreveu, não do resumo que escreveu. O resumo pode ter contexto que a lousa não traz, e esse contexto não pode vazar para cá.',
      '- No máximo 7, e só quantos o material sustentar. Quatro tópicos certos valem mais que sete com enchimento.',
      '- Nunca reformule o mesmo fato em dois tópicos. "É essencial para as plantas" e "é essencial para a vida na Terra" são o mesmo tópico escrito duas vezes.',
      '- Não transforme legenda em tópico. Se a imagem traz "CO₂ → gás carbônico", isso é vocabulário, não um tópico: escreva o que o gás carbônico FAZ no processo.',
      '- Cada tópico é uma afirmação que ensina algo sozinha, não um rótulo. Escreva "A clorofila capta a energia da luz solar", não "Clorofila".',
      '- Uma linha cada, no máximo 90 caracteres. Sem ponto final.',
      '- Ordene do mais geral ao mais específico, para que a lista possa ser lida como um roteiro de estudo.',
      '- Não repita entre tópicos o que já foi dito no resumo com as mesmas palavras.',
    ],
  },
  flashcards: {
    schema: '"flashcards": [{ "question": "…?", "answer": "…" }]',
    rules: [
      'FLASHCARDS',
      '- Só o que está na imagem. Cada pergunta e cada resposta têm de sair do material fotografado — é aqui que a invenção causa o dano maior, porque o cartão volta semanas depois como se fosse matéria da aula.',
      '- No máximo 8, e só quantos o conteúdo da imagem sustentar. Três cartões corretos são melhores que oito, dos quais dois inventados.',
      '- Se faltar material para outro cartão, pare. Completar a cota inventando é o pior resultado possível: quem estuda decora algo que a aula não disse e leva isso para a prova.',
      '- A pergunta cobra entendimento, não reconhecimento de rótulo. "Por que a planta precisa de luz para produzir glicose?" ensina; "O que é CO₂?" apenas devolve a legenda.',
      '- Cada pergunta usa uma construção diferente. Se um cartão começa com "Qual é o papel de", nenhum outro pode começar assim. Oito perguntas no mesmo molde viram um exercício de preencher lacuna, não de lembrar.',
      '- Cubra tipos diferentes: uma causa ("por que…"), uma consequência ("o que acontece se…"), uma relação entre dois elementos, uma aplicação. Definição pura, no máximo uma.',
      '- A resposta se sustenta sozinha, sem depender da pergunta nem da imagem, e cabe em 1 a 3 frases.',
      '- Nunca cite a imagem. "Segundo a lousa" e "conforme a figura" tornam o cartão inútil longe dela.',
      '- Tire os cartões do texto que você transcreveu, não do resumo que escreveu.',
      '- Antes de fechar a lista, releia: dois cartões que aceitam a mesma resposta são um cartão só. "Por que é essencial?" e "Qual é a importância?" são a mesma pergunta — descarte uma.',
    ],
  },
};

export function buildScanPrompt(formats: readonly StudyFormat[]): string {
  const requested = formats.length > 0 ? formats : (['summary'] as const);

  const schemaLines = [
    '"title": "Nome do assunto, até 60 caracteres"',
    ...requested.map((format) => FIELD_SPECS[format].schema),
    '"rawText": "Todo o texto legível da imagem, transcrito literalmente"',
  ];

  const rules = requested.map((format) => FIELD_SPECS[format].rules.join('\n')).join('\n\n');

  return `Você prepara material de estudo para estudantes, e boa parte deles usa leitor de tela ou tem dislexia. O que você escrever será ouvido em voz alta tantas vezes quanto lido.

Analise esta imagem de material de estudo — lousa, caderno, livro ou folha — e devolva um JSON.

Responda APENAS com o JSON. Sem markdown, sem cercas de código, sem comentário antes ou depois.

Formato:
{
  ${schemaLines.join(',\n  ')}
}

${rules}

TÍTULO
- Nomeie o assunto, não o suporte: "Fotossíntese", e não "Anotações de biologia" nem "Lousa da aula".
- Se houver um recorte claro, inclua: "Fotossíntese: fase clara e fase escura".

TRANSCRIÇÃO (rawText)
- Copie o texto como está na imagem, preservando quebras de linha e fórmulas.
- Não corrija, não complete e não reordene. Este campo é a prova do que estava escrito; todo o resto é interpretação.

SEMPRE
- Português do Brasil.
- Em tópicos e flashcards, trabalhe SOMENTE com o que está na imagem, e essa regra vale mais que qualquer outra daqui: prefira devolver menos a devolver o que o material não contém. Não acrescente etapas, fases ou classificações que ele não cita — se a imagem traz a equação da fotossíntese mas não fala em fase clara e fase escura, essas fases não existem para você. É o que a pessoa vai revisar semanas depois achando que era matéria da aula.
- O resumo é a exceção: ali você pode explicar e contextualizar, desde que a explicação sirva ao que foi fotografado.
- Se um trecho estiver ilegível, ignore-o em silêncio.
- Se a imagem não tiver texto legível, devolva title "Imagem sem texto identificado", explique em summary o que impediu a leitura e sugira o que fazer (aproximar, melhorar a luz, evitar reflexo), e deixe os demais campos vazios.`;
}
