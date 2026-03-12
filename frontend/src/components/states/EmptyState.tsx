import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: ReactNode;
};

export function EmptyState({ title, description, actionLabel }: EmptyStateProps) {
  return (
    <section className="surface-panel text-center" aria-label="빈 상태">
      <span className="status-badge">EMPTY</span>
      <h3 className="mt-4 text-xl font-semibold text-toss-textMain">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm text-toss-textSub">{description}</p>
      {actionLabel ? <div className="mt-5 flex justify-center">{actionLabel}</div> : null}
    </section>
  );
}
