import { useState } from 'react'
import { Link } from 'react-router-dom'
import MoodStrip from '../components/MoodStrip'

export default function Checkin() {
  const [done, setDone] = useState(false)

  return (
    <div className="checkin-page center">
      {done ? (
        <>
          <div className="big-check">✓</div>
          <h2>Logged</h2>
          <p className="muted">Nice. That's all it takes.</p>
          <div className="stack" style={{ marginTop: 16 }}>
            <button onClick={() => setDone(false)}>Log another</button>
            <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
              Open Anchor
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ marginBottom: 4 }}>Quick check-in</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            How are you feeling right now?
          </p>
          <MoodStrip big onLogged={() => setDone(true)} />
        </>
      )}
    </div>
  )
}
