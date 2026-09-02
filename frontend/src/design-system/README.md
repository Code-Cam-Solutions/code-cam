# Design system do CodeCam

Sistema de tokens e primitivos que sustenta tema claro, escuro e alto contraste
sem nenhum condicional de cor no código das telas.

## Regra única

**Nenhum componente escreve uma cor.** Nem hex, nem `text-white`, nem
`rgb(...)`. Componentes pedem tokens semânticos; o tema decide o que significam.

```tsx
// errado — quebra no tema claro
<p className="text-white">Olá</p>

// certo
<p className="text-text">Olá</p>
```

## Tokens de cor

| Classe                             | Significado                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `bg-bg`                            | Fundo da página                                       |
| `bg-surface`                       | Card padrão                                           |
| `bg-surface-raised`                | Card elevado, modal, barra flutuante                  |
| `bg-surface-sunken`                | Área rebaixada: campo, trilho, estado hover           |
| `border-border`                    | Divisória sutil                                       |
| `border-border-strong`             | Borda de campo — atinge 3:1, exigido pela WCAG 1.4.11 |
| `text-text`                        | Texto principal                                       |
| `text-text-muted`                  | Texto secundário                                      |
| `text-text-subtle`                 | Texto terciário, dicas                                |
| `text-accent` / `bg-accent`        | Marca                                                 |
| `text-accent-contrast`             | Texto **sobre** o acento                              |
| `bg-accent-subtle`                 | Fundo tingido de acento                               |
| `*-success` `*-warning` `*-danger` | Estados, cada um com par `-subtle`                    |

Tipografia: `text-2xs` … `text-4xl`. Escalam junto com o ajuste de tamanho de
fonte da acessibilidade — não use `text-[14px]`.

## Primitivos

```tsx
import {
  Button,
  Card,
  Input,
  Dialog,
  Badge,
  Progress,
  StatTile,
  EmptyState,
  Switch,
  SkeletonList,
  cn,
} from "@/design-system";
```

- **Button** — `variant`: `primary | secondary | subtle | ghost | danger`;
  `size`: `sm | md | lg`; `loading`, `icon`, `fullWidth`
- **Card** — `elevation`: `flat | raised | floating`; `interactive`; `padding`
- **Input** — `label` é **obrigatório** (placeholder não é rótulo); `error`, `hint`, `icon`
- **Dialog** — armadilha de foco, Escape, devolução de foco e trava de rolagem já
  resolvidos. Não use `autoFocus` dentro dele: marque o campo principal com
  `data-autofocus` e o `Dialog` o focará em vez do botão de fechar
- **Badge** — `tone`: `neutral | accent | success | warning | danger`
- **Progress**, **StatTile**, **EmptyState**, **Switch**, **SkeletonList**

## Acessibilidade obrigatória

1. Alvo de toque mínimo de 44px (`min-h-[2.75rem]`) em qualquer controle
2. Ícone decorativo sempre com `aria-hidden="true"`
3. Cor nunca é o único portador de significado — acompanhe de texto ou ícone
4. Todo campo tem rótulo associado
5. Toda camada sobreposta fecha com Escape — use `Dialog`, não uma `div` solta

## Alterar a paleta

As cores vivem em dois lugares que precisam andar juntos:

- `tokens/tokens.css` — o que o navegador consome
- `tokens/palette.ts` — a mesma paleta em dado puro, que os testes inspecionam

A duplicação é deliberada e restrita a esse par. Ao mudar uma cor, altere os
dois e rode:

```bash
npm test
```

`tokens/contrast.test.ts` confere os 16 pares que aparecem juntos na interface,
nas quatro combinações de tema, contra os limiares da WCAG 2.2 — 66 asserções.
Uma cor que reprova quebra o build antes de chegar a qualquer usuário.
