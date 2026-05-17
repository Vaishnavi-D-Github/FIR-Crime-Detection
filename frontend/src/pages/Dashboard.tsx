import { FormEvent, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AnimatedCard } from '../components/AnimatedCard'
import { WorkflowSteps } from '../components/WorkflowSteps'
import { IncidentMap } from '../components/IncidentMap'
import { ResultView } from '../components/ResultView'
import type { PredictionResult, VerifiedFir } from '../types'

export function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [uploadFirId, setUploadFirId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [verified, setVerified] = useState<VerifiedFir | null>(null)
  const [uploadFilename, setUploadFilename] = useState('')
  const [complaint, setComplaint] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)

  const complaintLen = complaint.trim().length

  const animateProgress = useCallback(() => {
    setProgress(0)
    const interval = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p
        return p + Math.random() * 12
      })
    }, 180)
    return () => {
      window.clearInterval(interval)
      setProgress(100)
    }
  }, [])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!uploadFirId.trim()) {
      showToast('Enter the official FIR number before uploading.', 'error')
      return
    }
    if (!file) {
      showToast('Choose an FIR file to upload.', 'error')
      return
    }
    setUploading(true)
    setPreview('Verifying FIR number against uploaded document...')
    const stopProgress = animateProgress()
    try {
      const res = await api.uploadFir(uploadFirId.trim(), file)
      stopProgress()
      setVerified(res.verified_fir)
      setUploadFilename(res.filename)
      setComplaint('')
      setPreview(`✓ ${res.verified_fir.fir_id} verified successfully.`)
      setStep(2)
      showToast('FIR verified. Enter your complaint description to classify.', 'success')
    } catch (err) {
      stopProgress()
      setPreview(err instanceof Error ? err.message : 'Verification failed.')
      showToast(err instanceof Error ? err.message : 'Verification failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handlePredict(e: FormEvent) {
    e.preventDefault()
    if (!verified) {
      showToast('Verify your FIR copy before classification.', 'error')
      return
    }
    if (complaintLen < 40) {
      showToast('Complaint should be at least 40 characters.', 'error')
      return
    }
    setAnalyzing(true)
    setResult(null)
    setStep(3)
    try {
      const res = await api.predict({
        complaint: complaint.trim(),
        upload_filename: uploadFilename,
        official_fir_id: verified.fir_id,
      })
      setResult(res)
      showToast('Classification complete.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Classification failed.', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
  <div className="dashboard-shell">
      <motion.header
        className="dashboard-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 420, margin: '0 auto 1rem', textAlign: 'center' }}
      >
        <span className="eyebrow">Citizen Portal</span>
        <h1 className="headline-accent" style={{ fontSize: '1.5rem' }}>
          Verify, describe &amp; classify
        </h1>
        <p className="subtitle-muted">Upload your official FIR copy, match the registry, then let AI analyze your complaint.</p>
        {user && (
          <div className="hero-user-chip">
            <span>Signed in</span>
            <strong>{user.name}</strong>
          </div>
        )}
      </motion.header>

      <WorkflowSteps step={step} />

      <div className="dashboard-stack">
        <AnimatedCard>
          <div className="card-topline">Step 1</div>
          <h2>Verify FIR copy</h2>
          <p className="card-intro">Enter the FIR number and upload the matching softcopy.</p>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label htmlFor="upload_fir_id">Official FIR number</label>
              <input
                id="upload_fir_id"
                value={uploadFirId}
                onChange={(e) => setUploadFirId(e.target.value)}
                placeholder="FIR-2026-00042"
                required
              />
            </div>
            <div
              className={`file-dropzone ${dragOver ? 'is-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) setFile(f)
              }}
            >
              <input
                type="file"
                id="fir_file"
                accept=".txt,.pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="fir_file">
                <span className="file-dropzone-title">{file ? file.name : 'Drop FIR softcopy here'}</span>
                <span className="file-dropzone-subtitle">TXT, PDF, PNG, JPG</span>
              </label>
            </div>
            {uploading && (
              <div className="upload-progress">
                <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            )}
            <motion.button type="submit" className="btn btn-secondary btn-block" disabled={uploading} whileHover={{ scale: 1.02 }}>
              {uploading ? 'Verifying...' : 'Verify FIR'}
            </motion.button>
          </form>
          {preview && (
            <div className={`status-card ${preview.startsWith('✓') ? 'status-success' : preview.includes('Verifying') ? 'status-neutral' : 'status-warning'}`}>
              {preview}
            </div>
          )}
        </AnimatedCard>

        {verified && (
          <AnimatedCard delay={0.08}>
            <div className="card-topline">Step 2</div>
            <h2>Registry &amp; complaint</h2>
            <p className="card-intro">Registry fields are locked. Enter your narrative for AI classification.</p>
            <form onSubmit={handlePredict}>
              <div className="form-grid two-col">
                <div className="form-group">
                  <label>Official FIR number</label>
                  <input value={verified.fir_id} readOnly className="field-locked" />
                </div>
                <div className="form-group">
                  <label>Registry status</label>
                  <input value="Verified · registry match" readOnly className="field-locked" />
                </div>
              </div>
              <div className="form-grid two-col">
                <div className="form-group">
                  <label>Full name</label>
                  <input value={verified.name} readOnly className="field-locked" />
                </div>
                <div className="form-group">
                  <label>Contact</label>
                  <input value={verified.phone_number} readOnly className="field-locked" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="complaint">Your narrative</label>
                <textarea
                  id="complaint"
                  rows={8}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="Describe what happened in your own words..."
                  required
                />
                <span className={`helper-text ${complaintLen >= 40 ? 'text-ok' : ''}`} style={{ fontSize: '0.8rem', color: complaintLen >= 40 ? '#4ade80' : '#B8BCC8' }}>
                  {complaintLen} characters · minimum 40
                </span>
              </div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Incident map</h3>
              <IncidentMap lat={verified.latitude} lng={verified.longitude} />
              <motion.button type="submit" className="btn btn-primary btn-block" disabled={analyzing || complaintLen < 40} whileHover={{ scale: 1.03 }} style={{ marginTop: '1rem' }}>
                {analyzing ? 'Analyzing...' : 'Classify from description'}
              </motion.button>
            </form>
          </AnimatedCard>
        )}

        {(analyzing || result) && (
          <AnimatedCard delay={0.12}>
            <div className="card-topline">Step 3 · AI Analysis</div>
            <h2>Classification results</h2>
            {analyzing && !result && (
              <div className="ai-loader">
                <div className="ai-loader-ring" />
                <p className="subtitle-muted">AI is analyzing your complaint narrative…</p>
              </div>
            )}
            {result && <ResultView result={result} />}
          </AnimatedCard>
        )}
      </div>
    </div>
  )
}
