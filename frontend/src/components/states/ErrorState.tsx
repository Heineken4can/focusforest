type ErrorStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export function ErrorState({ title, description, actionLabel }: ErrorStateProps) {
  return (
    <section className="surface-panel border-toss-red/40" role="alert" aria-live="polite">
      <h3 className="text-xl font-semibold text-toss-textMain">{title}</h3>
      <p className="mt-3 text-sm text-toss-textSub">{description}</p>
      {actionLabel ? (
        <button type="button" className="button-secondary mt-5">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
