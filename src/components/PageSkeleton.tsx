export function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-hidden="true">
      <div className="skeleton-block skeleton-title" />
      <div className="skeleton-row">
        <div className="skeleton-block skeleton-card" />
        <div className="skeleton-block skeleton-card" />
        <div className="skeleton-block skeleton-card" />
      </div>
      <div className="skeleton-block skeleton-panel" />
    </div>
  );
}
