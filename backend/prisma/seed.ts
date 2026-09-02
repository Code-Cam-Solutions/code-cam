/**
 * Popula o banco com dados de desenvolvimento.
 *
 * Os cartões recebem estados de repetição espaçada deliberadamente variados —
 * vencidos, para hoje, para o futuro e nunca estudados — para que o painel de
 * estatísticas e a fila de revisão tenham o que mostrar sem depender de alguém
 * estudar manualmente antes.
 *
 * É idempotente: rodar de novo recria o usuário de demonstração do zero, sem
 * tocar em nenhum outro dado.
 */
import { PrismaClient, ReviewRating } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_USER = 'Demo';

/** Data deslocada em dias a partir de agora. Negativo é passado. */
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

interface SeedCard {
  question: string;
  answer: string;
  /** Dias até vencer. Negativo significa atrasado. `null` = nunca estudado. */
  dueInDays: number | null;
  easeFactor?: number;
  repetitions?: number;
  intervalDays?: number;
}

interface SeedContent {
  title: string;
  summary: string;
  topics: string[];
  rawText: string;
  folder: string;
  cards: SeedCard[];
}

const FOLDERS = [
  { name: 'Biologia', color: '#00B894' },
  { name: 'História', color: '#E17055' },
  { name: 'Matemática', color: '#0984E3' },
];

const CONTENTS: SeedContent[] = [
  {
    title: 'Fotossíntese',
    summary:
      'Processo pelo qual plantas, algas e algumas bactérias convertem luz solar, água e gás carbônico em glicose e oxigênio.',
    topics: ['clorofila', 'cloroplasto', 'ciclo de Calvin'],
    rawText:
      'A fotossíntese ocorre nos cloroplastos. A clorofila capta a energia luminosa. ' +
      'A fase clara produz ATP e NADPH; o ciclo de Calvin fixa o carbono em glicose.',
    folder: 'Biologia',
    cards: [
      {
        question: 'Qual pigmento capta a energia luminosa?',
        answer: 'A clorofila, presente nos cloroplastos.',
        dueInDays: -3,
        easeFactor: 2.36,
        repetitions: 2,
        intervalDays: 6,
      },
      {
        question: 'O que a fase clara produz?',
        answer: 'ATP e NADPH, além de liberar oxigênio.',
        dueInDays: 0,
        easeFactor: 2.5,
        repetitions: 1,
        intervalDays: 1,
      },
      {
        question: 'Onde o carbono é fixado em glicose?',
        answer: 'No ciclo de Calvin, no estroma do cloroplasto.',
        dueInDays: null,
      },
    ],
  },
  {
    title: 'Revolução Francesa',
    summary:
      'Movimento que derrubou o Antigo Regime na França entre 1789 e 1799 e difundiu os ideais de liberdade, igualdade e fraternidade.',
    topics: ['Bastilha', 'Antigo Regime', 'Assembleia Nacional'],
    rawText:
      'A queda da Bastilha em 14 de julho de 1789 marca o início da revolução. ' +
      'A Declaração dos Direitos do Homem e do Cidadão foi aprovada em agosto de 1789.',
    folder: 'História',
    cards: [
      {
        question: 'Que evento marca o início da Revolução Francesa?',
        answer: 'A queda da Bastilha, em 14 de julho de 1789.',
        dueInDays: -1,
        easeFactor: 2.6,
        repetitions: 3,
        intervalDays: 15,
      },
      {
        question: 'Quais eram os três ideais da revolução?',
        answer: 'Liberdade, igualdade e fraternidade.',
        dueInDays: 4,
        easeFactor: 2.5,
        repetitions: 2,
        intervalDays: 6,
      },
    ],
  },
  {
    title: 'Teorema de Pitágoras',
    summary:
      'Em todo triângulo retângulo, o quadrado da hipotenusa é igual à soma dos quadrados dos catetos.',
    topics: ['triângulo retângulo', 'hipotenusa', 'catetos'],
    rawText: 'a² = b² + c², onde a é a hipotenusa e b e c são os catetos.',
    folder: 'Matemática',
    cards: [
      {
        question: 'Enuncie o teorema de Pitágoras.',
        answer: 'O quadrado da hipotenusa é igual à soma dos quadrados dos catetos.',
        dueInDays: 12,
        easeFactor: 2.75,
        repetitions: 4,
        intervalDays: 30,
      },
      {
        question: 'Em que tipo de triângulo o teorema se aplica?',
        answer: 'Apenas em triângulos retângulos.',
        dueInDays: null,
      },
    ],
  },
];

async function main() {
  // Apagar o usuário leva pastas, conteúdos, cartões e revisões por cascata.
  await prisma.user.deleteMany({ where: { name: DEMO_USER } });

  const user = await prisma.user.create({ data: { name: DEMO_USER } });

  const folders = new Map<string, string>();
  for (const folder of FOLDERS) {
    const created = await prisma.folder.create({
      data: { name: folder.name, color: folder.color, userId: user.id },
    });
    folders.set(folder.name, created.id);
  }

  let reviewCount = 0;

  for (const content of CONTENTS) {
    const created = await prisma.content.create({
      data: {
        title: content.title,
        summary: content.summary,
        topics: content.topics,
        rawText: content.rawText,
        folderId: folders.get(content.folder) ?? null,
        userId: user.id,
        flashcards: {
          create: content.cards.map((card, index) => ({
            question: card.question,
            answer: card.answer,
            position: index,
            userId: user.id,
            easeFactor: card.easeFactor ?? 2.5,
            repetitions: card.repetitions ?? 0,
            intervalDays: card.intervalDays ?? 0,
            dueAt: daysFromNow(card.dueInDays ?? 0),
            lastReviewedAt:
              card.dueInDays === null ? null : daysFromNow((card.intervalDays ?? 1) * -1),
          })),
        },
      },
      include: { flashcards: { orderBy: { position: 'asc' } } },
    });

    // Histórico de revisões para os cartões que já foram estudados, de modo que
    // a taxa de acerto e a sequência de dias não apareçam zeradas.
    for (const [index, card] of created.flashcards.entries()) {
      const seed = content.cards[index];
      if (!seed || seed.dueInDays === null) continue;

      const session = await prisma.studySession.create({
        data: {
          userId: user.id,
          startedAt: daysFromNow(-(seed.repetitions ?? 1)),
          endedAt: daysFromNow(-(seed.repetitions ?? 1)),
        },
      });

      await prisma.flashcardReview.create({
        data: {
          flashcardId: card.id,
          userId: user.id,
          sessionId: session.id,
          rating: index % 3 === 0 ? ReviewRating.GOOD : ReviewRating.HARD,
          intervalDays: card.intervalDays,
          easeFactor: card.easeFactor,
          reviewedAt: daysFromNow(-(seed.repetitions ?? 1)),
        },
      });
      reviewCount += 1;
    }
  }

  const cards = await prisma.flashcard.count({ where: { userId: user.id } });
  const due = await prisma.flashcard.count({
    where: { userId: user.id, dueAt: { lte: new Date() } },
  });

  console.warn(
    `Seed concluído — usuário "${DEMO_USER}": ` +
      `${FOLDERS.length} pastas, ${CONTENTS.length} conteúdos, ` +
      `${cards} cartões (${due} vencidos), ${reviewCount} revisões.`,
  );
}

main()
  .catch((error) => {
    console.error('Seed falhou:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
