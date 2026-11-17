export const WEEKDAYS = [
  { value: 'mon', label: 'Segunda-feira', shortLabel: 'Seg' },
  { value: 'tue', label: 'Terça-feira', shortLabel: 'Ter' },
  { value: 'wed', label: 'Quarta-feira', shortLabel: 'Qua' },
  { value: 'thu', label: 'Quinta-feira', shortLabel: 'Qui' },
  { value: 'fri', label: 'Sexta-feira', shortLabel: 'Sex' },
  { value: 'sat', label: 'Sábado', shortLabel: 'Sáb' },
  { value: 'sun', label: 'Domingo', shortLabel: 'Dom' },
] as const;

export type Weekday = (typeof WEEKDAYS)[number]['value'];

const WEEKDAY_SET = new Set<string>(WEEKDAYS.map(day => day.value));

export function normalizeWeekdays(days: string | string[] | undefined): Weekday[] {
  const values = Array.isArray(days) ? days : (days ?? '').split(',');
  const selected = new Set(
    values
      .map(day => day.trim().toLowerCase())
      .filter(day => WEEKDAY_SET.has(day))
  );

  return WEEKDAYS
    .map(day => day.value)
    .filter(day => selected.has(day));
}
