const PREFIX = 'anchor.'

export type SettingKey =
  | 'apiKey'
  | 'apiKeyUpdatedAt'
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
  // the api key rides along in encrypted sync — stamp edits for LWW merging
  if (key === 'apiKey') {
    localStorage.setItem(PREFIX + 'apiKeyUpdatedAt', String(Date.now()))
  }
}

export function syncConfigured(): boolean {
  return !!getSetting('ghToken') && !!getSetting('passphrase')
}
