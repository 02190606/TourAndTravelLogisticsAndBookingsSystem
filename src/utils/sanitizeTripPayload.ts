const NULLABLE_FIELDS = [
  'vehicle_id',
  'driver_id',
  'pickup_location',
  'Destination',
  'flight_arrival_time',
  'accommodation_name',
  'accommodation_checkin',
  'accommodation_checkout',
  'return_date',
] as const

export function sanitizeTripPayload<T extends Record<string, unknown>>(payload: T): T {
  const sanitized = { ...payload }
  for (const key of NULLABLE_FIELDS) {
    if (key in sanitized && (sanitized[key] === '' || sanitized[key] === undefined)) {
      ;(sanitized as Record<string, unknown>)[key] = null
    }
  }
  return sanitized
}
