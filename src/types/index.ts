export type UserRole = 'admin' | 'logistics' | 'trips'

export interface User {
  id: string
  email: string
  password_hash?: string
  role: UserRole
  full_name: string
  phone: string
  is_active: boolean
  created_at: string
  last_login: string | null
}

export type VehicleStatus = 'available' | 'on_trip' | 'sold'

export interface Vehicle {
  id: string
  registration_number: string
  make: string
  model: string
  year: number
  mileage: number
  status: VehicleStatus
  date_added: string
  current_location: string
  insurance_commencement: string
  insurance_expiry: string
  pmo_commencement: string
  pmo_expiry: string
  psv_expiry: string
  has_toolbox: boolean
  additional_requirements: string
  chassis_number: string
  fuel_type: string
  engine_capacity: string
  current_driver_id?: string
  current_driver?: Pick<Driver, 'full_name' | 'phone'>
  created_at: string
}

export interface ServiceRecord {
  id: string
  vehicle_id: string
  service_date: string
  description: string
  next_service_date: string
  place_done: string
  cost: number
  created_at: string
  vehicles?: Vehicle
}

export interface MaintenanceRecord {
  id: string
  vehicle_id: string
  mechanic_id: string
  repair_types: string[]
  repair_date: string
  garage: string
  cost: number
  created_at: string
  vehicles?: Vehicle
}

export interface Complaint {
  id: string
  vehicle_id: string
  driver_id: string | null
  incident_date: string | null
  complaint_items: string[]
  date_filed: string
  status: 'open' | 'resolved'
  created_at: string
  vehicles?: Vehicle
  drivers?: Driver
}

export interface Driver {
  id: string
  full_name: string
  license_number: string
  phone: string
  date_joined: string
  driving_experience_years: number
  driving_permit: string
  driving_permit_expiry: string
  created_at: string
  is_active: boolean
}

export interface Repair {
  id: string
  vehicle_id: string
  date_of_repair: string
  issue_description: string
  repair_description: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  workshop_mechanic: string
  cost: number
  status: 'scheduled' | 'in_progress' | 'completed'
  created_at: string
  vehicles?: Vehicle
}

export interface MileageRecord {
  id: string
  vehicle_id: string
  date: string
  status: string | null
  current_location: string | null
  opening_mileage: number
  closing_mileage: number
  distance_covered: number
  service_given: number
  service_due: number
  created_at: string
  vehicles?: Vehicle
}

export interface AlertSetting {
  id: string
  user_id: string
  alert_type: string
  days_before: number
  is_enabled: boolean
}

export type TripStatus = 'planned' | 'ongoing' | 'ends_today' | 'completed' | 'cancelled'

export type PaymentMode = 'cash' | 'credit'

export interface Trip {
  id: string
  client_name: string
  number_of_clients: number
  car_type: string
  vehicle_id: string | null
  driver_id: string | null
  amount_paid: number
  currency: string
  amount_in_ugx: number
  payment_mode: PaymentMode
  balance: number
  trip_start_date: string
  trip_end_date: string
  flight_arrival_time: string | null
  pickup_location: string | null
  Destination: string | null
  is_cross_border: boolean
  is_one_way: boolean
  return_trip: boolean | null
  needs_accommodation: boolean
  accommodation_name: string | null
  accommodation_checkin: string | null
  accommodation_checkout: string | null
  accommodation_rooms: number | null
  accommodation_cost: number | null
  car_seats: number | null
  has_gps: boolean | null
  extras: string | null
  gorilla_tracking: boolean | null
  chimpanzee_tracking: boolean | null
  activities: string | null
  status: TripStatus
  created_at: string
  vehicles?: Vehicle
  drivers?: Driver
}

export interface Payment {
  id: string
  trip_id: string
  amount: number
  currency: string
  amount_in_ugx: number
  payment_date: string
  payment_mode: PaymentMode
  created_at: string
  trips?: Trip
}

export type PenaltyStatus = 'unpaid' | 'paid' | 'disputed'

export interface Penalty {
  id: string
  vehicle_id: string
  driver_id: string | null
  incident_date: string | null
  date_issued: string
  amount: number
  reason: string
  status: PenaltyStatus
  issued_by: string
  notes: string
  created_at: string
  vehicles?: Vehicle
  drivers?: Driver
}
