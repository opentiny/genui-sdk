export function Input({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      className={className}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}
