const PREFIX = 'school-management:'

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode, quota exceeded). The app keeps
    // working with in-memory state in that case.
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Ignore storage failures.
  }
}
