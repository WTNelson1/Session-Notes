const PREFIX = 'anchor.'

export type SettingKey =
  | 'apiKey'
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
}

export function syncConfigured(): boolean {
  return !!getSetting('ghToken') && !!getSetting('passphrase')
}
