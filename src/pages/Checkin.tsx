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
          <h2>logged</h2>
          <p className="muted">that's all it takes.</p>
          <div className="stack" style={{ marginTop: 16 }}>
            <button onClick={() => setDone(false)}>log another</button>
            <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
              open anchor
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ marginBottom: 4 }}>quick check-in</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            how are you feeling right now?
          </p>
          <MoodStrip big onLogged={() => setDone(true)} />
        </>
      )}
    </div>
  )
}
