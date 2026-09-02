/**
 * Ponto único de entrada do design system.
 *
 * As telas importam daqui, nunca de um arquivo interno — o que mantém a
 * liberdade de reorganizar as pastas sem tocar em nenhuma página.
 */

export { cn } from "./utils/cn";

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./primitives/Button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  type CardProps,
  type CardElevation,
} from "./primitives/Card";
export { Input, type InputProps } from "./primitives/Input";
export { Dialog, type DialogProps } from "./primitives/Dialog";
export { Badge, type BadgeProps, type BadgeTone } from "./primitives/Badge";
export { Skeleton, SkeletonCard, SkeletonList, type SkeletonProps } from "./primitives/Skeleton";
export { Progress, type ProgressProps } from "./primitives/Progress";
export { Ring, type RingProps } from "./primitives/Ring";
export { StatTile, type StatTileProps } from "./primitives/StatTile";
export { EmptyState, type EmptyStateProps } from "./primitives/EmptyState";
export { Switch, type SwitchProps } from "./primitives/Switch";
export { ThemeToggle } from "./primitives/ThemeToggle";
