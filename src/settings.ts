const PREFIX = 'anchor.'

export type SettingKey =
  | 'apiKey'
  | 'aboutMe'
  | 'apiKeyUpdatedAt' // LWW stamp for apiKey (and, in pre-split blobs, for both)
  | 'aboutMeUpdatedAt' // LWW stamp for aboutMe — split so a key edit can't drag it
  | 'aiProvider' // 'claude' (default) or 'local'
  | 'localUrl' // root of an OpenAI-compatible server, e.g. LM Studio on the studio
  | 'localModel'
  | 'aiUpdatedAt' // one LWW stamp for the three above: they only make sense together
  | 'ghToken'
  | 'gistId'
  | 'passphrase'
  | 'lastSyncAt'

export function getSetting(key: SettingKey): string {
  return localStorage.getItem(PREFIX + key) ?? ''
}

export function setSetting(key: SettingKey, value: string) {
  if (value) localStorage.setItem(PREFIX + key, value)
  else localStorage.removeItem(PREFIX + key)
  // Both ride along in encrypted sync; each edit stamps ONLY its own field.
  // They used to share one stamp, which meant pasting the api key into a fresh
  // device pushed {apiKey, aboutMe: ''} as the newest pair and blanked the
  // about-you text on every other device.
  if (key === 'apiKey') localStorage.setItem(PREFIX + 'apiKeyUpdatedAt', String(Date.now()))
  if (key === 'aboutMe') localStorage.setItem(PREFIX + 'aboutMeUpdatedAt', String(Date.now()))
  if (key === 'aiProvider' || key === 'localUrl' || key === 'localModel')
    localStorage.setItem(PREFIX + 'aiUpdatedAt', String(Date.now()))
}

export function syncConfigured(): boolean {
  return !!getSetting('ghToken') && !!getSetting('passphrase')
}
