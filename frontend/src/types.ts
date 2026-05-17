export interface User {
  id: number
  name: string
  email: string
}

export interface PoliceOfficer {
  id: number
  name: string
  officer_userid: string
  station_name: string
}

export interface SessionResponse {
  user: User | null
  police_officer: PoliceOfficer | null
}

export interface VerifiedFir {
  fir_id: string
  name: string
  age: number
  gender: string
  phone_number: string
  crime_type: string
  fir_type: string
  confidence_score: number
  confidence_band: string
  complaint: string
  incident_date: string
  incident_time: string | null
  incident_location: string
  latitude: number
  longitude: number
  area: string
  date: string
  upload_filename: string | null
  station_name: string | null
}

export interface ProbabilityEntry {
  crime_type: string
  raw_label: string
  probability: number
  percentage: number
}

export interface PredictionResult {
  fir_id: string
  predicted_crime_type: string
  fir_type: string
  confidence_score: number
  confidence_band: string
  review_recommended: boolean
  probabilities: ProbabilityEntry[]
  guidance: string[]
  record: VerifiedFir
  registry_verified: boolean
  upload_filename?: string | null
}

export interface PoliceFirSummary {
  fir_id: string
  crime_type: string
  incident_location: string
}
