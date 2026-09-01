export function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{ backgroundColor: "var(--color-surface)" }}
      aria-hidden="true"
    >
      <div
        className="h-4 rounded mb-2"
        style={{ backgroundColor: "var(--color-surface-2)", width: "60%" }}
      />
      <div
        className="h-3 rounded mb-1"
        style={{ backgroundColor: "var(--color-surface-2)", width: "90%" }}
      />
      <div
        className="h-3 rounded"
        style={{ backgroundColor: "var(--color-surface-2)", width: "75%" }}
      />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-label="Carregando...">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
