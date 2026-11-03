import { useEffect, useRef, useState } from 'react'
import { db, TABLES, alive, ensureTrack, patch, renameTrack, setDefaultTrack, softDelete } from '../db'
import { useTracks, type TrackUsage } from '../tracks'
import { getSetting, setSetting, type SettingKey } from '../settings'
import { localSnapshot, importData, scheduleAutoSync, syncNow } from '../sync'
import { summarizeSession, textHash, aiConfigured, aiProvider, listLocalModels, localBase, type Provider } from '../ai'

function SettingInput({
  settingKey,
  label,
  placeholder,
  password = false,
  multiline = false,
}: {
  settingKey: SettingKey
  label: string
  placeholder?: string
  password?: boolean
  multiline?: boolean
}) {
  const [value, setValue] = useState(getSetting(settingKey))
  const [show, setShow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // macOS turns on Secure Event Input while a password field holds focus, and
  // the browser only turns it back off once focus leaves. Leave the window
  // with the cursor still sitting in the api key, token, or passphrase and it
  // can stay on system-wide, eating other apps' keystrokes. So let the field
  // go the moment the page stops being the thing you are looking at.
  useEffect(() => {
    if (!password) return
    const release = () => {
      if (inputRef.current && document.activeElement === inputRef.current) {
        inputRef.current.blur()
      }
    }
    const onVisibility = () => {
      if (document.hidden) release()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', release)
    // Fires on cmd-tab, when the window is still visible but no longer yours.
    window.addEventListener('blur', release)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', release)
      window.removeEventListener('blur', release)
      release() // and on unmount — leaving settings must not hold it either
    }
  }, [password])

  function commit(v: string) {
    setValue(v)
    setSetting(settingKey, v.trim())
  }

  return (
    <label className="field">
      <span className="label-text">{label}</span>
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          rows={4}
          onChange={(e) => commit(e.target.value)}
        />
      ) : (
        <div className="row">
          <input
            ref={inputRef}
            type={password && !show ? 'password' : 'text'}
            placeholder={placeholder}
            value={value}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => commit(e.target.value)}
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
      )}
    </label>
  )
}

/** Where the ✦ features send notes: Claude, or a model served from your own
 * machine. The choice syncs, so flipping it here flips every device. */
function AiProvider() {
  const [provider, setProvider] = useState<Provider>(aiProvider)
  const [url, setUrl] = useState(getSetting('localUrl'))
  const [model, setModel] = useState(getSetting('localModel'))
  const [models, setModels] = useState<string[] | null>(null)
  const [probe, setProbe] = useState('')

  function choose(p: Provider) {
    setProvider(p)
    setSetting('aiProvider', p)
    scheduleAutoSync()
  }
  function commitUrl(v: string) {
    setUrl(v)
    setSetting('localUrl', v.trim())
    setModels(null)
    scheduleAutoSync()
  }
  function commitModel(v: string) {
    setModel(v)
    setSetting('localModel', v.trim())
    scheduleAutoSync()
  }
  async function findModels() {
    setProbe('checking…')
    try {
      const found = await listLocalModels(url)
      setModels(found)
      setProbe(found.length ? `connected · ${found.length} available` : 'connected, but no models are loaded')
      if (found.length === 1 && !model) commitModel(found[0])
    } catch (e) {
      setModels(null)
      setProbe(e instanceof Error ? e.message : 'could not connect')
    }
  }

  return (
    <>
      <div className="field">
        <span className="label-text">where the ai runs</span>
        <span className="track-chips" role="radiogroup" aria-label="AI provider">
          {(
            [
              ['claude', 'claude (anthropic)'],
              ['local', 'local model'],
            ] as const
          ).map(([p, label]) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={provider === p}
              className={`btn-small ${provider === p ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => choose(p)}
            >
              {label}
            </button>
          ))}
        </span>
      </div>

      {provider === 'claude' ? (
        <>
          <SettingInput settingKey="apiKey" label="Anthropic API key" placeholder="sk-ant-…" password />
          <p className="muted small">
            create a key at <code>console.anthropic.com</code> → api keys. notes are sent to the
            claude api when you run an analysis or open/save a session note (for its ✦ summary and
            review) — never otherwise.
          </p>
        </>
      ) : (
        <>
          <label className="field">
            <span className="label-text">server address</span>
            <div className="row">
              <input
                type="text"
                placeholder="http://localhost:1234"
                value={url}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => commitUrl(e.target.value)}
              />
              <button
                type="button"
                className="btn-small"
                disabled={!url.trim()}
                onClick={() => void findModels()}
              >
                find models
              </button>
            </div>
          </label>
          {probe && <p className="muted small" style={{ marginTop: -6 }}>{probe}</p>}
          <label className="field">
            <span className="label-text">model</span>
            <input
              type="text"
              placeholder="tap find models, or type its name"
              value={model}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => commitModel(e.target.value)}
            />
          </label>
          {models && models.length > 1 && (
            <div className="track-chips" style={{ marginBottom: 10 }}>
              {models.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn-small ${m === model ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => commitModel(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <p className="muted small">
            requests go only to {url.trim() ? <code>{localBase(url)}</code> : 'this server'} — if it
            can't be reached the feature says so; it never falls back to claude. any server that
            speaks the openai chat api works (lm studio, ollama). on the machine running it the
            address can be <code>http://localhost:…</code>; from your other devices it has to be an
            https address, e.g. one from <code>tailscale serve</code>.
          </p>
        </>
      )}
    </>
  )
}

function TrackRow({
  name,
  usage,
  isDefault,
  others,
}: {
  name: string
  usage?: TrackUsage
  isDefault: boolean
  others: string[]
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(name)
  const target = draft.trim().toLowerCase()
  const merging = target !== name && others.includes(target)
  const counts = [
    usage?.sessions ? `${usage.sessions} ${usage.sessions === 1 ? 'note' : 'notes'}` : '',
    usage?.topics ? `${usage.topics} ${usage.topics === 1 ? 'topic' : 'topics'}` : '',
  ].filter(Boolean)
  const inUse = counts.length > 0

  if (renaming) {
    return (
      <form
        className="track-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (target && target !== name) void renameTrack(name, target)
          setRenaming(false)
        }}
      >
        <input
          autoFocus
          type="text"
          className="track-new"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setRenaming(false)
          }}
        />
        <button
          type="submit"
          className={`btn-small ${merging ? 'btn-danger' : 'btn-primary'}`}
          disabled={!target || target === name}
        >
          {merging ? `merge into ${target}` : 'rename'}
        </button>
        <button type="button" className="btn-small btn-ghost" onClick={() => setRenaming(false)}>
          cancel
        </button>
        {merging && (
          <span className="muted small track-row-note">
            everything in {name} moves to {target}. there is no splitting them back apart.
          </span>
        )}
      </form>
    )
  }

  return (
    <div className="track-row">
      <span className="track-row-name">{name}</span>
      {isDefault && <span className="track-default">★ default</span>}
      <span className="muted small track-row-counts">{inUse ? counts.join(' · ') : 'empty'}</span>
      <span className="track-row-actions">
        {!isDefault && (
          <button className="btn-small btn-ghost" onClick={() => void setDefaultTrack(name)}>
            make default
          </button>
        )}
        <button
          className="btn-small btn-ghost"
          onClick={() => {
            setDraft(name)
            setRenaming(true)
          }}
        >
          rename
        </button>
        {!inUse && (
          <button
            className="btn-small btn-ghost"
            onClick={() => softDelete(db.tracks, name)}
            aria-label={`Remove ${name}`}
            title="remove"
          >
            ×
          </button>
        )}
      </span>
    </div>
  )
}

/** Every room — saved ones and any a note or topic is tagged with — with the
 * default, renames, and merges. Rename into an existing name to fold two rooms
 * together. Only empty rooms can be removed; a room with notes in it is
 * renamed or merged instead, so nothing is ever left pointing at nowhere. */
function TrackRoster() {
  const [name, setName] = useState('')
  const { known, usage, defaultTrack, starred, ready } = useTracks()

  return (
    <>
      <p className="muted small" style={{ marginTop: 0 }}>
        new session notes and jotted topics start in the ★ room
        {starred ? '' : ' (until you pick one, that is the busiest room)'} — one tap switches any
        single one.
      </p>
      <div className="track-list">
        {known.map((t) => (
          <TrackRow
            key={t}
            name={t}
            usage={usage.get(t)}
            isDefault={t === defaultTrack}
            others={known.filter((o) => o !== t)}
          />
        ))}
        {ready && known.length === 0 && (
          <span className="muted small">no tracks yet — your first session note creates one</span>
        )}
      </div>
      <form
        className="row"
        style={{ marginTop: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          const t = name.trim().toLowerCase()
          if (t) void ensureTrack(t)
          setName('')
        }}
      >
        <input
          type="text"
          placeholder="add a track (e.g. group)…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn-small" disabled={!name.trim()}>
          add
        </button>
      </form>
    </>
  )
}

export default function Settings() {
  const [syncMsg, setSyncMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [regenProgress, setRegenProgress] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /** one-time maintenance: re-run every ✦ summary under the current about-you text */
  async function regenerateSummaries() {
    const aiReady = aiConfigured()
    if (!aiReady || regenProgress) return
    const targets = (await db.sessions.toArray()).filter((s) => alive(s) && s.notes.trim())
    let done = 0
    for (const s of targets) {
      setRegenProgress(`✦ ${done + 1}/${targets.length}…`)
      try {
        const summary = await summarizeSession(s.notes, s.takeaways)
        if (summary) {
          await patch(db.sessions, s.id, {
            summary,
            summaryHash: textHash(s.notes + '|' + s.takeaways),
          })
        }
      } catch {
        // skip failures; those notes keep their current summary
      }
      done++
    }
    setRegenProgress('done ✓')
    setTimeout(() => setRegenProgress(null), 2500)
  }

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
        <AiProvider />
        <SettingInput
          settingKey="aboutMe"
          label="about you (shared with the ai)"
          placeholder="e.g. My pronouns are …. My therapist is …. People who come up often: …"
          multiline
        />
        <p className="muted small">
          once sync is set up, these settings travel to your other devices inside the same encrypted
          blob as your notes — enter them once.
        </p>
        <button className="btn-small btn-ghost" disabled={!!regenProgress} onClick={regenerateSummaries}>
          {regenProgress ?? '↻ regenerate all summaries (after editing the text above)'}
        </button>
      </div>

      <div className="card">
        <h2>tracks (therapy rooms)</h2>
        <TrackRoster />
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
