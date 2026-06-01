export function Text({ text, className, class: cls }: { text?: string; className?: string; class?: string }) {
  return <span className={className || cls}>{text}</span>;
}
