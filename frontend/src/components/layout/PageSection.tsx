import type { ReactNode } from 'react';

type PageSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function PageSection({
  eyebrow,
  title,
  description,
  children,
}: PageSectionProps) {
  return (
    <section className="surface-panel space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-toss-textSub">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-bold text-toss-textMain">{title}</h2>
        <p className="max-w-3xl text-sm text-toss-textSub">{description}</p>
      </header>
      {children}
    </section>
  );
}
