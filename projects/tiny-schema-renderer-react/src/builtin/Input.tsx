export function Input({
  value,
  modelValue,
  onChange,
  placeholder,
  className,
  type = 'text',
}: {
  value?: string;
  modelValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      className={className}
      value={value ?? modelValue ?? ''}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}
