// GlanceMail backend client — talks to our own local server, which owns
// Gmail OAuth, triage, AI drafts and sending. No tokens or keys in the app.
// Base URL: VITE_BACKEND_URL, default http://localhost:8787.
// Contract (MVP): GET /api/health, GET /api/inbox?limit=3,
// POST /api/draft {messageId}, POST /api/send {messageId, body}.
// All calls time out after 5s so a dead backend fails fast to mock fallback.

export interface InboxEmail {
  id: string
  threadId?: string
  from: string
  subject?: string
  time: string
  summary: string
  priority: 'HIGH' | 'MED' | 'LOW'
  actionable: boolean
  kind: 'reply' | 'newsletter' | 'meeting'
  snippet?: string
}

export interface HealthResponse {
  ok: boolean
  gmail: boolean
  llm: string
}

export interface InboxResponse {
  emails: InboxEmail[]
}

export interface DraftResponse {
  draft: string
  messageId: string
  threadId: string
  engine: string
}

export interface SendResponse {
  ok: boolean
  sentMessageId?: string
  error?: string
}

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8787'

const TIMEOUT_MS = 5000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new Error(`backend ${res.status} on ${path}`)
    return (await res.json()) as T
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new Error(`backend timeout (${TIMEOUT_MS}ms) on ${path}`)
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health')
}

export function getInbox(limit = 3): Promise<InboxResponse> {
  return request<InboxResponse>(`/api/inbox?limit=${limit}`)
}

export function getDraft(messageId: string): Promise<DraftResponse> {
  return request<DraftResponse>('/api/draft', {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  })
}

export async function sendReply(messageId: string, body: string): Promise<SendResponse> {
  const res = await request<SendResponse>('/api/send', {
    method: 'POST',
    body: JSON.stringify({ messageId, body }),
  })
  if (!res.ok) throw new Error(res.error || 'send failed')
  return res
}
