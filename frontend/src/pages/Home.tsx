import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ThreeHero } from '../components/ThreeHero'
import { PageDots } from '../components/PageDots'
import { AnimatedCard } from '../components/AnimatedCard'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: '🛡️', title: 'Verify Your FIR', text: 'Upload your official FIR softcopy and match it against the police registry in seconds.' },
  { icon: '📝', title: 'Describe the Incident', text: 'Enter your complaint narrative — only your words are used for AI classification.' },
  { icon: '🤖', title: 'AI Crime Analysis', text: 'View predicted crime type, confidence scores, and guidance in a premium results view.' },
]

const crimeTags = [
  '#FFB000', '#FFC93C', '#fb923c', '#a78bfa', '#4ade80', '#f87171', '#22d3ee', '#86efac', '#f472b6', '#c4b5fd',
]

export function Home() {
  const { user } = useAuth()

  return (
    <>
      <motion.section
        className="onboarding-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}
      >
        <ThreeHero />
        <span className="eyebrow">AI-Powered Safety</span>
        <h1 className="headline-accent">Safety over Speed</h1>
        <p className="subtitle-muted">
          Verify your FIR against the police registry and get instant AI crime classification from your complaint — built
          for citizens, not just demos.
        </p>
        <PageDots active={1} />
        <motion.div className="hero-actions" whileHover={{ scale: 1.01 }}>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg btn-block">
              Get Started
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg btn-block">
                Get Started
              </Link>
              <Link to="/login" className="btn-text-link">
                Already have an account? Sign in
              </Link>
            </>
          )}
        </motion.div>
      </motion.section>

      <section style={{ maxWidth: 420, margin: '2rem auto 0' }}>
        <h2 className="headline-accent" style={{ fontSize: '1.15rem', textAlign: 'center', marginBottom: '0.5rem' }}>
          How It Works
        </h2>
        {features.map((f, i) => (
          <AnimatedCard key={f.title} delay={i * 0.08}>
            <div className="feature-slide">
              <motion.div className="feature-icon-wrap" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 + i }}>
                {f.icon}
              </motion.div>
              <h3 style={{ color: 'var(--accent)' }}>{f.title}</h3>
              <p className="subtitle-muted">{f.text}</p>
            </div>
          </AnimatedCard>
        ))}
      </section>

      <p className="subtitle-muted" style={{ textAlign: 'center', fontSize: '0.78rem', marginTop: '1.5rem' }}>
        FIR Crime Detection — registry verification &amp; AI classification
      </p>
    </>
  )
}
