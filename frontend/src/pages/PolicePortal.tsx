import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AnimatedCard } from '../components/AnimatedCard'
import { MapPicker } from '../components/MapPicker'
import type { PoliceFirSummary } from '../types'

const CRIME_OPTIONS = [
  'Theft', 'Robbery', 'Burglary', 'Assault', 'Battery', 'Fraud / Deceptive Practice',
  'Motor Vehicle Theft', 'Criminal Damage', 'Kidnapping', 'Sex Offense', 'Narcotics', 'Weapons Violation',
]

export function PolicePortal() {
  const { policeOfficer, setPoliceOfficer } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [recent, setRecent] = useState<PoliceFirSummary[]>([])
  const [today, setToday] = useState('')
  const [ocrStatus, setOcrStatus] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.policePortal()
        setRecent(data.recent_firs)
        setToday(data.today)
      } catch {
        navigate('/police/login')
      }
    })()
    void api.ocrStatus().then((d) => {
      setOcrStatus(d.available ? `Image OCR ready: Tesseract ${d.version}` : d.message || 'OCR unavailable')
    })
  }, [navigate])

  async function handleLogout() {
    await api.policeLogout()
    setPoliceOfficer(null)
    navigate('/police/login')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (lat == null || lng == null) {
      setStatus('Select the official incident location on the map.')
      return
    }
    const fd = new FormData(form)
    fd.set('latitude', String(lat))
    fd.set('longitude', String(lng))
    setLoading(true)
    setStatus('Registering official FIR...')
    try {
      const res = await api.registerPoliceFir(fd)
      setStatus(res.message)
      showToast(res.message, 'success')
      form.reset()
      setLat(null)
      setLng(null)
      const portal = await api.policePortal()
      setRecent(portal.recent_firs)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Registration failed')
      showToast(err instanceof Error ? err.message : 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!policeOfficer) return null

  return (
    <div className="police-layout" style={{ maxWidth: 900, margin: '0 auto' }}>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <span className="eyebrow">Official Registry</span>
          <h1 className="headline-accent" style={{ fontSize: '1.4rem' }}>Register Police-Verified FIR</h1>
          <p className="subtitle-muted">{policeOfficer.name} | {policeOfficer.station_name}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => void handleLogout()}>
          Logout
        </button>
      </motion.header>

      <motion.div className="police-grid">
        <AnimatedCard>
          <div className="card-topline">Police Upload</div>
          <h2>Official FIR Entry</h2>
          <form id="police-fir-form" className="stack-form" onSubmit={handleSubmit}>
            <div className="form-grid two-col">
              <div className="form-group">
                <label htmlFor="fir_id">FIR Number</label>
                <input id="fir_id" name="fir_id" placeholder="FIR-2026-00101" required />
              </div>
              <div className="form-group">
                <label htmlFor="fir_type">Type of FIR</label>
                <select id="fir_type" name="fir_type" required defaultValue="Cognizable FIR">
                  <option>Cognizable FIR</option>
                  <option>Sensitive FIR</option>
                  <option>Non-Cognizable Complaint</option>
                </select>
              </div>
            </div>
            <div className="form-grid two-col">
              <motion.div className="form-group">
                <label htmlFor="name">Complainant Name</label>
                <input id="name" name="name" required />
              </motion.div>
              <div className="form-group">
                <label htmlFor="phone_number">Contact</label>
                <input id="phone_number" name="phone_number" required />
              </div>
            </div>
            <div className="form-grid two-col">
              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input id="age" name="age" type="number" min={1} max={120} required />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" required defaultValue="Male">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="crime_type">Crime Type</label>
              <select id="crime_type" name="crime_type" required>
                {CRIME_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <motion.div className="form-grid two-col">
              <div className="form-group">
                <label htmlFor="incident_date">Incident Date</label>
                <input id="incident_date" name="incident_date" type="date" max={today} required />
              </div>
              <div className="form-group">
                <label htmlFor="incident_time">Incident Time</label>
                <input id="incident_time" name="incident_time" type="time" />
              </div>
            </motion.div>
            <div className="form-group">
              <label htmlFor="incident_location">Incident Address</label>
              <input id="incident_location" name="incident_location" required />
            </div>
            <div className="form-group">
              <label htmlFor="complaint">FIR Narrative</label>
              <textarea id="complaint" name="complaint" rows={5} required />
            </div>
            <div className="coords-display form-grid two-col">
              <div className="form-group">
                <label>Latitude</label>
                <input value={lat?.toFixed(6) ?? ''} readOnly className="field-locked" />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input value={lng?.toFixed(6) ?? ''} readOnly className="field-locked" />
              </div>
            </div>
            <div className="file-dropzone">
              <input type="file" id="fir_file" name="fir_file" accept=".txt,.pdf,.png,.jpg,.jpeg" required />
              <label htmlFor="fir_file">
                <span className="file-dropzone-title">Upload Official FIR Softcopy</span>
                <span className="file-dropzone-subtitle">TXT, PDF, PNG, JPG</span>
              </label>
            </div>
            {ocrStatus && <div className="status-card status-neutral">{ocrStatus}</div>}
            <motion.button type="submit" className="btn btn-primary btn-block" disabled={loading} whileHover={{ scale: 1.03 }}>
              {loading ? 'Registering...' : 'Register Official FIR'}
            </motion.button>
          </form>
          {status && <motion.div className={`status-card ${status.includes('success') ? 'status-success' : 'status-warning'}`}>{status}</motion.div>}
        </AnimatedCard>

        <motion.aside>
          <AnimatedCard delay={0.1}>
            <h2>Location Selector</h2>
            <p className="card-intro">Click the map to set the incident location.</p>
            <MapPicker lat={lat} lng={lng} onPick={(a, b) => { setLat(a); setLng(b) }} />
          </AnimatedCard>
          <AnimatedCard delay={0.15}>
            <h2>Recently Registered</h2>
            <div className="ranked-list">
              {recent.length ? recent.map((f) => (
                <div key={f.fir_id} className="ranked-item">
                  <span>{f.fir_id} | {f.crime_type}</span>
                  <strong>{f.incident_location}</strong>
                </div>
              )) : (
                <div className="ranked-item">
                  <span>No FIRs registered yet</span>
                  <strong>0</strong>
                </div>
              )}
            </div>
          </AnimatedCard>
        </motion.aside>
      </motion.div>
    </div>
  )
}
