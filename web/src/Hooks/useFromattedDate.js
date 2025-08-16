import { format as timeagoFormat } from 'timeago.js';

export default function useFormattedDate() {
  return (dateStr) => {
    const utcDate = new Date(dateStr); // Parses as UTC
    return timeagoFormat(utcDate);     // Displays in local browser time
  };
}
