export const DATE_TIME_FORMAT = 'dd/MM/yyyy HH:mm';
export const DATE_FORMAT = 'dd/MM/yyyy';

export function formatDateTime(dateTime: string | null, format: string = DATE_TIME_FORMAT): string {
  if (!dateTime) { return ''; }
  const date = new Date(dateTime);

  if (format === DATE_TIME_FORMAT) {
    return date.toLocaleString();
  }

  if (format === DATE_FORMAT) {
    return date.toDateString();
  }

  return date.toLocaleString();
}