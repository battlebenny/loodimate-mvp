import { getDeviceId } from './device'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(method: string, path: string, body?: unknown, opts: { keepalive?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const device = getDeviceId()
  if (device) headers['X-Device-Id'] = device
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(`${BASE}/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive: opts.keepalive,
    })
  } catch {
    throw new ApiError(0, 'network', 'Pas de connexion. Vérifie ton réseau et réessaie.')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data as { error?: { code: string; message: string } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'unknown', err?.message ?? 'Une erreur est survenue. Réessaie dans un instant.')
  }
  return data as T
}
