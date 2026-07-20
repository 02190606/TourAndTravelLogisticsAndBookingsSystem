import type { Trip, TripStatus } from '@/types'

export function isActiveTrip(trip: { status: string }): boolean {
  return trip.status !== 'cancelled'
}

export function computeTripStatus(trip: Pick<Trip, 'status' | 'trip_start_date' | 'trip_end_date'>): TripStatus {
  if (trip.status === 'cancelled') return 'cancelled'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(trip.trip_start_date); start.setHours(0, 0, 0, 0)
  const end = new Date(trip.trip_end_date); end.setHours(0, 0, 0, 0)
  if (today < start) return 'planned'
  if (today > end) return 'completed'
  if (today.getTime() === end.getTime()) return 'ends_today'
  return 'ongoing'
}
