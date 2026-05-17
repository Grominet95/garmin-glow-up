interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <span
      className={`block rounded-sm animate-pulse ${className}`}
      style={{ background: "var(--bg-3)", ...style }}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card ${className}`}>
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
