import { format, formatDistanceToNow, isAfter, isBefore, isToday, addDays, differenceInDays, parseISO } from 'date-fns'

function safeDate(date: string | Date | null | undefined): Date | null {
  if (date == null || date === '') return null
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date
  if (typeof date === 'string') {
    const trimmed = date.split('T')[0]
    if (!trimmed) return null
    const d = parseISO(trimmed)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formatDate(date: string | Date | null | undefined, fmt: string = 'dd MMM yyyy'): string {
  const d = safeDate(date)
  return d ? format(d, fmt) : '—'
}

export function formatDateTime(date: string | Date | null | undefined): string {
  const d = safeDate(date)
  return d ? format(d, 'dd MMM yyyy HH:mm') : '—'
}

export function timeAgo(date: string | Date | null | undefined): string {
  const d = safeDate(date)
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}

export function isExpired(date: string | Date): boolean {
  const d = safeDate(date)
  return d ? isAfter(new Date(), d) : false
}

export function isExpiringSoon(date: string | Date, days: number = 30): boolean {
  const d = safeDate(date)
  return d ? !isExpired(d) && isBefore(d, addDays(new Date(), days)) : false
}

export function daysUntil(date: string | Date): number {
  const d = safeDate(date)
  return d ? differenceInDays(d, new Date()) : 0
}

export function isDueToday(date: string | Date): boolean {
  const d = safeDate(date)
  return d ? isToday(d) : false
}

export function getDaysBetween(start: string | Date, end: string | Date): number {
  const s = safeDate(start)
  const e = safeDate(end)
  if (!s || !e) return 0
  return differenceInDays(e, s) + 1
}
