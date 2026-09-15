import type { ReactNode } from "react";
import { CircleHelp, CornerDownRight, Lightbulb, Square } from "lucide-react";
import { useReadingAid } from "@/shared/hooks/useReadingAid";
import { splitLeadingEmoji } from "@/shared/lib/emoji";
import { splitSentences } from "@/shared/lib/sentences";
import { cn } from "@/design-system";

/**
 * Apoio visual de leitura, ligado junto com o modo dislexia.
 *
 * Três decisões explicam este arquivo.
 *
 * 1. Ícone, não emoji. A dificuldade de quem tem dislexia é decodificar a
 *    linha; um pictograma colorido no meio dela acrescenta ruído exatamente
 *    onde o olho está trabalhando. Além disso o app lê em voz alta, e um
 *    leitor de tela anunciaria cada emoji por extenso no meio do resumo.
 *
 * 2. Fora do texto, nunca dentro. O ganho conhecido não é enfeitar a frase: é
 *    dar ponto de retorno para reencontrar o lugar depois de desviar o olho.
 *    Marcador na margem serve a isso; símbolo intercalado, não.
 *
 * 3. Desenhado pela interface, não gravado no conteúdo. Se os marcadores
 *    viessem da IA dentro do texto, iriam para o banco: apareceriam para quem
 *    não ativou a opção, desligá-la não os removeria, e o material salvo antes
 *    de ativar nunca os teria. Aqui a preferência é lida no momento de
 *    desenhar, então ligar e desligar vale para tudo que já existe.
 *
 * Todo marcador é `aria-hidden`: ele é pista visual, e anunciá-lo transformaria
 * o apoio em ruído para quem ouve.
 */

const MARKS = {
  summary: Square,
  topic: CornerDownRight,
  question: CircleHelp,
  answer: Lightbulb,
} as const;

export type MarkKind = keyof typeof MARKS;

/** Marcador de margem. Não ocupa a linha do texto. */
export function ReadingMark({ kind, className }: { kind: MarkKind; className?: string }) {
  const Icon = MARKS[kind];
  return (
    <span
      className={cn("grid size-5 shrink-0 place-items-center text-accent", className)}
      aria-hidden="true"
    >
      <Icon size={kind === "summary" ? 9 : 15} strokeWidth={2.2} />
    </span>
  );
}

/**
 * Texto longo com apoio de leitura.
 *
 * Com a opção desligada, é um parágrafo comum — nada muda para quem não pediu.
 * Com ela ligada, cada frase vira um bloco com marcador próprio: seis linhas
 * corridas são uma parede, e a mesma informação em blocos curtos tem por onde
 * ser retomada.
 */
export function ReadableProse({ text, className }: { text: string; className?: string }) {
  const aid = useReadingAid();
  const sentences = aid ? splitSentences(text) : [];

  // Uma frase só não ganha nada em virar lista: o bloco já é curto.
  if (!aid || sentences.length < 2) {
    return <p className={cn("text-base leading-relaxed text-text", className)}>{text}</p>;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {sentences.map((sentence, index) => (
        <p
          key={index}
          className="flex items-start gap-2.5 text-base leading-relaxed text-text"
        >
          <ReadingMark kind="summary" className="mt-2" />
          <span>{sentence}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Texto que pode vir com um emoji de abertura, vindo da IA.
 *
 * O emoji só aparece com o apoio de leitura ligado; sem ele, o texto é exibido
 * limpo. Como a separação acontece na hora de desenhar, e não no banco, ligar e
 * desligar a preferência vale inclusive para o material salvo antes.
 */
export function EmojiText({ value, className }: { value: string; className?: string }) {
  const aid = useReadingAid();
  const { emoji, text } = splitLeadingEmoji(value);

  if (!aid || !emoji) return <span className={className}>{text}</span>;

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      {/*
        `aria-hidden` porque o emoji é pista visual: anunciado por extenso, um
        leitor de tela leria "muda planta" no meio da frase. O texto ao lado já
        diz tudo que importa.
      */}
      <span aria-hidden="true" className="not-italic">
        {emoji}
      </span>
      <span>{text}</span>
    </span>
  );
}

/** Envolve um item de lista, pondo o marcador à esquerda do conteúdo. */
export function MarkedItem({
  kind,
  children,
  className,
}: {
  kind: MarkKind;
  children: ReactNode;
  className?: string;
}) {
  const aid = useReadingAid();
  if (!aid) return <>{children}</>;

  return (
    <span className={cn("flex items-start gap-1.5", className)}>
      <ReadingMark kind={kind} className="mt-0.5" />
      {children}
    </span>
  );
}
