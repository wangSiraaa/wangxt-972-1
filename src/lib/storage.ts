const PREFIX = 'gym_'

function key(name: string): string {
  return PREFIX + name
}

export function load<T>(name: string): T[] {
  try {
    const raw = localStorage.getItem(key(name))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function save<T>(name: string, data: T[]): void {
  localStorage.setItem(key(name), JSON.stringify(data))
}

export function clearAll(): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(PREFIX)) keysToRemove.push(k)
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}
