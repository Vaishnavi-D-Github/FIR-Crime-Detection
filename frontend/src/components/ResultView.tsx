import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { motion } from 'framer-motion'
import type { PredictionResult } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const CRIME_COLORS: Record<string, string> = {
  Arson: '#f472b6',
  Assault: '#34d399',
  Theft: '#4ade80',
  Robbery: '#c084fc',
  Homicide: '#fb7185',
}

export function ResultView({ result }: { result: PredictionResult }) {
  const [animateBars, setAnimateBars] = useState(false)
  const band = result.confidence_band.toLowerCase()

  useEffect(() => {
    const t = window.setTimeout(() => setAnimateBars(true), 120)
    return () => window.clearTimeout(t)
  }, [result])

  const topProbs = (result.probabilities || []).slice(0, 5)
  const labels = topProbs.map((p) => p.crime_type)
  const values = topProbs.map((p) => p.percentage)
  const colors = labels.map((l) => CRIME_COLORS[l] || '#64748b')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="result-hero">
        <motion.div>
          <div className="result-fir-id">{result.fir_id}</div>
          <motion.h2 className="result-crime" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
            {result.predicted_crime_type}
          </motion.h2>
          <div className="result-meta">Top match · {result.fir_type}</div>
        </motion.div>
        <span className={`confidence-pill confidence-${band}`}>
          {result.confidence_score}% {result.confidence_band}
        </span>
      </div>

      <div className="result-panel">
        <h3>Confidence breakdown</h3>
        {topProbs.map((entry) => (
          <div key={entry.crime_type} className="probability-bar">
            <div className="prob-label">
              <span>{entry.crime_type}</span>
              <strong>{entry.percentage}%</strong>
            </div>
            <div className="prob-track">
              <motion.div
                className="prob-fill"
                style={{ width: animateBars ? `${entry.percentage}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="result-panel chart-panel">
        <h3>AI analysis chart</h3>
        <div className="chart-wrap">
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: 'Confidence %',
                  data: values,
                  backgroundColor: colors.map((c) => `${c}cc`),
                  borderColor: colors,
                  borderWidth: 1,
                  borderRadius: 8,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { beginAtZero: true, max: 100, ticks: { color: '#B8BCC8' } },
                y: { ticks: { color: '#fff' } },
              },
            }}
          />
        </div>
      </div>

      <div className="result-panel">
        <h3>Summary</h3>
        <div className="result-item">
          <span>Review recommended</span>
          <strong>{result.review_recommended ? 'Yes' : 'No'}</strong>
        </div>
        <div className="result-item">
          <span>Police station</span>
          <strong>{result.record.station_name || 'Registered station'}</strong>
        </div>
        <div className="result-item">
          <span>Incident area</span>
          <strong>{result.record.incident_location}</strong>
        </div>
      </div>

      <div className="result-panel">
        <h3>Guidance</h3>
        <ul className="guidance-list">
          {result.guidance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
