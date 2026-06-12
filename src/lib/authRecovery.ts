const AUTH_RECOVERY_STORAGE_KEY = 'desperse:auth-recovery'
const CREATE_PATH = '/create'
const AUTH_RECOVERY_TTL_MS = 30 * 60 * 1000

export interface AuthRecoveryState {
  returnTo: typeof CREATE_PATH
  firstPost: boolean
  source: 'create'
  createdAt: number
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function parseFirstPostValue(value: string | null): boolean {
  return value === 'true' || value === '1'
}

export function buildAuthRecovery(search = ''): AuthRecoveryState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  return {
    returnTo: CREATE_PATH,
    firstPost: params.has('firstPost') ? parseFirstPostValue(params.get('firstPost')) : true,
    source: 'create',
    createdAt: Date.now(),
  }
}

export function saveAuthRecovery(recovery: AuthRecoveryState, storage?: Storage): void {
  const resolvedStorage = getStorage(storage)
  if (!resolvedStorage) return

  resolvedStorage.setItem(AUTH_RECOVERY_STORAGE_KEY, JSON.stringify(recovery))
}

export function readAuthRecovery(storage?: Storage): AuthRecoveryState | null {
  const resolvedStorage = getStorage(storage)
  if (!resolvedStorage) return null

  const raw = resolvedStorage.getItem(AUTH_RECOVERY_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<AuthRecoveryState>
    if (
      parsed.returnTo !== CREATE_PATH ||
      typeof parsed.firstPost !== 'boolean' ||
      parsed.source !== 'create' ||
      typeof parsed.createdAt !== 'number' ||
      Date.now() - parsed.createdAt > AUTH_RECOVERY_TTL_MS
    ) {
      resolvedStorage.removeItem(AUTH_RECOVERY_STORAGE_KEY)
      return null
    }

    return {
      returnTo: CREATE_PATH,
      firstPost: parsed.firstPost,
      source: 'create',
      createdAt: parsed.createdAt,
    }
  } catch {
    resolvedStorage.removeItem(AUTH_RECOVERY_STORAGE_KEY)
    return null
  }
}

export function clearAuthRecovery(storage?: Storage): void {
  const resolvedStorage = getStorage(storage)
  if (!resolvedStorage) return

  resolvedStorage.removeItem(AUTH_RECOVERY_STORAGE_KEY)
}
