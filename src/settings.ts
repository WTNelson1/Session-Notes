const PREFIX = 'anchor.'

export type SettingKey =
  | 'apiKey'
  | 'aboutMe'
  | 'apiKeyUpdatedAt' // shared LWW stamp for all synced settings (apiKey + aboutMe)
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
  // api key + about-me ride along in encrypted sync — stamp edits for LWW merging
  if (key === 'apiKey' || key === 'aboutMe') {
    localStorage.setItem(PREFIX + 'apiKeyUpdatedAt', String(Date.now()))
  }
}

export function syncConfigured(): boolean {
  return !!getSetting('ghToken') && !!getSetting('passphrase')
}
