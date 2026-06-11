const CREATE_INTENT_STORAGE_KEY = 'desperse:create-intent'
const CREATE_PATH = '/create'
const CREATE_INTENT_TTL_MS = 60 * 60 * 1000

export interface CreateIntent {
  path: typeof CREATE_PATH
  firstPost: boolean
  createdAt: number
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function normalizeCreatePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/'
}

function parseFirstPostValue(value: string | null): boolean {
  return value === 'true' || value === '1'
}

export function shouldPreserveCreateIntent(pathname: string): boolean {
  return normalizeCreatePath(pathname) === CREATE_PATH
}

export function buildCreateIntent(search = ''): CreateIntent {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  return {
    path: CREATE_PATH,
    // Signed-out /create visits use first-post framing by default until the route explicitly opts out.
    firstPost: params.has('firstPost') ? parseFirstPostValue(params.get('firstPost')) : true,
    createdAt: Date.now(),
  }
}

export function saveCreateIntent(intent: CreateIntent, storage?: Storage): void {
  const resolvedStorage = getStorage(storage)
  if (!resolvedStorage) return

  resolvedStorage.setItem(CREATE_INTENT_STORAGE_KEY, JSON.stringify(intent))
}

export function readCreateIntent(storage?: Storage): CreateIntent | null {
  const resolvedStorage = getStorage(storage)
  if (!resolvedStorage) return null

  const raw = resolvedStorage.getItem(CREATE_INTENT_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<CreateIntent>
    if (
      parsed.path !== CREATE_PATH ||
      typeof parsed.firstPost !== 'boolean' ||
      typeof parsed.createdAt !== 'number' ||
      Date.now() - parsed.createdAt > CREATE_INTENT_TTL_MS
    ) {
      resolvedStorage.removeItem(CREATE_INTENT_STORAGE_KEY)
      return null
    }

    return {
      path: CREATE_PATH,
      firstPost: parsed.firstPost,
      createdAt: parsed.createdAt,
    }
  } catch {
    resolvedStorage.removeItem(CREATE_INTENT_STORAGE_KEY)
    return null
  }
}

export function clearCreateIntent(storage?: Storage): void {
  const resolvedStorage = getStorage(storage)
  if (!resolvedStorage) return
  resolvedStorage.removeItem(CREATE_INTENT_STORAGE_KEY)
}
