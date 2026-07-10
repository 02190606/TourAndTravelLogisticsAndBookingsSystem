import { format, formatDistanceToNow, isAfter, isBefore, isToday, addDays, differenceInDays, parseISO } from 'date-fns'

export function formatDate(date: string | Date, fmt: string = 'dd MMM yyyy'): string {
  return format(typeof date === 'string' ? parseISO(date) : date, fmt)
}

export function formatDateTime(date: string | Date): string {
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy HH:mm')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true })
}

export function isExpired(date: string | Date): boolean {
  return isAfter(new Date(), typeof date === 'string' ? parseISO(date) : date)
}

export function isExpiringSoon(date: string | Date, days: number = 30): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return !isExpired(d) && isBefore(d, addDays(new Date(), days))
}

export function daysUntil(date: string | Date): number {
  return differenceInDays(typeof date === 'string' ? parseISO(date) : date, new Date())
}

export function isDueToday(date: string | Date): boolean {
  return isToday(typeof date === 'string' ? parseISO(date) : date)
}

export function getDaysBetween(start: string | Date, end: string | Date): number {
  return differenceInDays(
    typeof end === 'string' ? parseISO(end) : end,
    typeof start === 'string' ? parseISO(start) : start
  )
}
