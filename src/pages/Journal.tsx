import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive } from '../db'
import FeelingChips from '../components/FeelingChips'

function stamp(at: number) {
  const d = new Date(at)
  return d
    .toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    .toLowerCase()
}

export default function Journal() {
  const entries = useLiveQuery(async () =>
    (await db.journal.toArray()).filter(alive).sort((a, b) => b.at - a.at),
  )

  return (
    <div>
      <Link to="/journal/new" className="btn btn-solid btn-cta">
        ＋ new entry
      </Link>

      {entries?.map((e) => (
        <Link key={e.id} to={`/journal/${e.id}`} className="card session-item">
          <strong>{stamp(e.at)}</strong>
          <FeelingChips words={e.words} />
          {e.text && (
            <p className="preview" style={{ margin: '6px 0 0' }}>
              {e.text}
            </p>
          )}
        </Link>
      ))}
      {entries && entries.length === 0 && (
        <p className="muted center">
          nothing here yet · name what you're feeling on the wheel, write if you want to — either
          alone counts.
        </p>
      )}
    </div>
  )
}
