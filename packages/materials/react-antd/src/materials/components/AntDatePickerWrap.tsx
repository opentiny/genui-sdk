import { DatePicker, type DatePickerProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { forwardRef } from 'react';

type DateInput = DatePickerProps['value'] | string | number | Date | null | undefined;
type AntDatePickerProps = Omit<DatePickerProps, 'value' | 'defaultValue'> & {
  value?: DateInput;
  defaultValue?: DateInput;
};

function isDayjsValue(value: unknown): value is Dayjs {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Dayjs).isValid === 'function' &&
    typeof (value as Dayjs).toISOString === 'function'
  );
}

function normalizeDateValue(value: DateInput): DatePickerProps['value'] {
  if (value == null || value === '') return null;
  if (isDayjsValue(value)) return value.isValid() ? value : null;

  const parsed =
    typeof value === 'object' && value !== null && '$d' in value
      ? dayjs((value as { $d: string | Date }).$d)
      : dayjs(value as string | number | Date);

  return parsed.isValid() ? parsed : null;
}

export const AntDatePicker = forwardRef<any, AntDatePickerProps>(function AntDatePicker(
  { value, defaultValue, ...rest },
  ref,
) {
  return (
    <DatePicker
      {...rest}
      ref={ref}
      value={normalizeDateValue(value)}
      defaultValue={normalizeDateValue(defaultValue)}
    />
  );
});
