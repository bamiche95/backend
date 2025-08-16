import { format, isToday, isYesterday } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale'; // Choose locale based on user

export function formatMessageTimeWithDay(date, locale = enUS) {
  const d = new Date(date);

  if (isToday(d)) {
    return `Today at ${format(d, 'p', { locale })}`; // e.g., 3:30 PM
  }

  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'p', { locale })}`;
  }

  return format(d, 'MMM d \'at\' p', { locale }); // e.g., May 18 at 1:00 PM
}
