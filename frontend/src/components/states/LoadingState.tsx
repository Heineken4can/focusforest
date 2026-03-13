type LoadingStateProps = {
  title: string;
  description: string;
};

export function LoadingState({ title, description }: LoadingStateProps) {
  return (
    <section className="surface-panel animate-pulse" aria-busy="true" aria-live="polite">
      <h3 className="text-xl font-semibold text-toss-textMain">{title}</h3>
      <p className="mt-3 text-sm text-toss-textSub">{description}</p>
      <div className="mt-5 space-y-3">
        <div className="placeholder-line w-3/4" />
        <div className="placeholder-line w-full" />
        <div className="placeholder-line w-5/6" />
      </div>
    </section>
  );
}
