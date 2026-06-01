export function Img({ src, alt, className, style }: { src?: string; alt?: string; className?: string; style?: string }) {
  return <img src={src} alt={alt || ''} className={className} style={typeof style === 'string' ? undefined : style} />;
}
