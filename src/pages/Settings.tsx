import { useRef, useState } from 'react'
import { db, TABLES } from '../db'
import { getSetting, setSetting, type SettingKey } from '../settings'
import { localSnapshot, importData, syncNow } from '../sync'

function SettingInput({
  settingKey,
  label,
  placeholder,
  password = false,
}: {
  settingKey: SettingKey
  label: string
  placeholder?: string
  password?: boolean
}) {
  const [value, setValue] = useState(getSetting(settingKey))
  const [show, setShow] = useState(false)
  return (
    <label className="field">
      <span className="label-text">{label}</span>
      <div className="row">
        <input
          type={password && !show ? 'password' : 'text'}
          placeholder={placeholder}
          value={value}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setValue(e.target.value)
            setSetting(settingKey, e.target.value.trim())
          }}
        />
        {password && (
          <button
            type="button"
            className="btn-small btn-ghost"
            onClick={() => setShow(!show)}
          >
            {show ? 'hide' : 'show'}
          </button>
        )}
      </div>
    </label>
  )
}

export default function Settings() {
  const [syncMsg, setSyncMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const lastSync = getSetting('lastSyncAt')
  const checkinUrl = `${location.origin}${location.pathname}#/checkin`

  async function doSync() {
    setSyncMsg('Syncing…')
    try {
      await syncNow()
      setSyncMsg('Synced ✓')
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed')
    }
  }

  async function exportJSON() {
    const snap = await localSnapshot()
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `anchor-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importJSON(file: File) {
    try {
      const snap = JSON.parse(await file.text())
      await importData(snap)
      alert('Import complete — records merged.')
    } catch {
      alert('Could not read that file. It should be an Anchor JSON export.')
    }
  }

  async function eraseLocal() {
    if (!confirm('Erase ALL local data on this device? (Synced copies on other devices are not affected.)')) return
    if (!confirm('Really erase? This cannot be undone on this device.')) return
    await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
      for (const t of TABLES) await db.table(t).clear()
    })
    localStorage.clear()
    location.reload()
  }

  return (
    <div>
      <div className="card">
        <h2>AI insights</h2>
        <SettingInput
          settingKey="apiKey"
          label="Anthropic API key"
          placeholder="sk-ant-…"
          password
        />
        <p className="muted small" style={{ marginBottom: 0 }}>
          create a key at <code>console.anthropic.com</code> → api keys. once sync is set up, the
          key travels to your other devices inside the same encrypted blob as your notes — enter it
          once. notes are sent to the claude api when you run an analysis or save a session note
          (for its ✦ preview summary) — never in the background.
        </p>
      </div>

      <div className="card">
        <h2>Sync across devices</h2>
        <SettingInput
          settingKey="ghToken"
          label="GitHub token (gist scope)"
          placeholder="github_pat_… or ghp_…"
          password
        />
        <SettingInput
          settingKey="passphrase"
          label="Sync passphrase (same on every device)"
          placeholder="A phrase only you know"
          password
        />
        <SettingInput settingKey="gistId" label="Gist ID (auto-filled on first sync; paste on second device)" />
        <div className="row">
          <button className="btn-primary" onClick={doSync}>
            Sync now
          </button>
          <span className="muted small">
            {syncMsg ||
              (lastSync ? `Last synced ${new Date(Number(lastSync)).toLocaleString()}` : 'Never synced')}
          </span>
        </div>
        <details className="help">
          <summary>How to set up sync</summary>
          <ol>
            <li>Create a free account at github.com (if you don't have one).</li>
            <li>
              Go to Settings → Developer settings → Personal access tokens → <em>Tokens (classic)</em> →
              Generate new token. Tick only the <code>gist</code> scope. Copy it here.
            </li>
            <li>Pick a strong passphrase. Your notes are encrypted with it <em>before</em> they leave the device — GitHub only ever stores ciphertext. If you lose the passphrase, the synced copy is unrecoverable.</li>
            <li>Tap “Sync now”. A private gist is created and its ID appears above.</li>
            <li>On your other devices: enter the same token, same passphrase, and paste the same Gist ID, then sync.</li>
          </ol>
        </details>
      </div>

      <div className="card">
        <h2>feelings check-in shortcut</h2>
        <p className="muted small">
          this link opens straight to the feelings wheel:
        </p>
        <div className="row">
          <code style={{ flex: 1 }}>{checkinUrl}</code>
          <button
            className="btn-small"
            onClick={() => {
              void navigator.clipboard.writeText(checkinUrl)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
        <details className="help">
          <summary>Automate the reminder (iPhone)</summary>
          <p>
            Open the <strong>Shortcuts</strong> app → Automation → New → “Time of Day” → pick a time
            and “Run immediately”. Add the action <em>Open URLs</em> and paste the link above. Your
            phone will open the check-in at that time each day — one tap and you're done. (Or add a
            daily Reminder with the URL in its notes.)
          </p>
        </details>
      </div>

      <div className="card">
        <h2>Your data</h2>
        <div className="row">
          <button onClick={exportJSON}>Export JSON</button>
          <button onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importJSON(f)
              e.target.value = ''
            }}
          />
        </div>
        <p className="muted small">
          Everything lives in this browser's local storage. Data leaves the device only via
          encrypted sync (to your private gist) or when you run an AI analysis.
        </p>
        <button className="btn-danger btn-small" onClick={eraseLocal}>
          Erase all local data
        </button>
      </div>

      <p className="muted small center">
        Anchor is a personal journal, not medical care. If you're in crisis, call or text 988
        (US) or your local crisis line.
      </p>
    </div>
  )
}
