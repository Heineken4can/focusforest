type InlineAlertProps = {
  title?: string;
  description: string;
  tone?: 'error' | 'neutral';
};

const toneStyles: Record<NonNullable<InlineAlertProps['tone']>, string> = {
  error: 'border-toss-red/30 bg-toss-surface text-toss-red',
  neutral: 'border-toss-divider bg-toss-surface text-toss-textMain',
};

export function InlineAlert({
  title,
  description,
  tone = 'error',
}: InlineAlertProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${toneStyles[tone]}`}
      role="alert"
      aria-live="polite"
    >
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      <p className={title ? 'mt-1 text-sm text-toss-textSub' : 'text-sm'}>{description}</p>
    </div>
  );
}
