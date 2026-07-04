interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
  count?: number;
}

export function Skeleton({ className = '', variant = 'text', width, height, count = 1 }: SkeletonProps) {
  const baseClass = 'skeleton animate-pulse';
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl h-32',
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClass} ${variants[variant]} ${className}`}
      style={{ width: width || (variant === 'text' ? `${70 + Math.random() * 30}%` : undefined), height }}
      aria-hidden="true"
    />
  ));

  return <>{items}</>;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-4" aria-label="로딩 중">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width="40px" height="40px" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="16px" />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      <Skeleton count={3} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-fadeIn" aria-label="대시보드 로딩 중">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card flex items-center gap-4">
            <Skeleton variant="circular" width="48px" height="48px" />
            <div className="space-y-2 flex-1">
              <Skeleton width="50%" height="12px" />
              <Skeleton width="70%" height="20px" />
            </div>
          </div>
        ))}
      </div>
      <SkeletonCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="테이블 로딩 중">
      <Skeleton height="40px" variant="rectangular" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height="48px" variant="rectangular" className="opacity-75" />
      ))}
    </div>
  );
}
