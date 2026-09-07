// Google Drive as the database.
//
// A service account owns a folder; every "collection" is one small JSON file inside it
// (an array of records). The browser never talks to Google — only this server layer does.
//
// Ported from REBUILD/builds/blink-talent/api/_lib/drive.ts (proven in production) and
// extended with: an auto-created per-app SUBFOLDER (so several apps can share one parent
// folder id safely) and read/write of single JSON documents.
import { createSign, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Local development / test backend. When LOCAL_STORE_DIR is set the collections live in
// plain files on disk instead of Drive, so the app runs (and is testable) end-to-end with
// no Google credentials. Never set in production.
const LOCAL_DIR = process.env.LOCAL_STORE_DIR || ''
export const isLocalMode = (): boolean => !!LOCAL_DIR

interface SAKey {
  client_email: string
  private_key: string
}

let _accessToken: string | null = null
let _tokenExpiry = 0
let _folderId: string | null = null

/** Per-app subfolder created inside GOOGLE_DRIVE_FOLDER_ID. Keeps apps isolated. */
export const APP_SUBFOLDER = process.env.DRIVE_SUBFOLDER || 'mark-sef-hub'

export function isConfigured(): boolean {
  if (LOCAL_DIR) return true
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !!process.env.GOOGLE_DRIVE_FOLDER_ID
}

function getParentFolder(): string {
  const f = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!f) throw new Error('GOOGLE_DRIVE_FOLDER_ID env var not set')
  return f
}

function escapeControlCharsInStrings(json: string): string {
  let out = ''
  let inString = false
  for (let i = 0; i < json.length; i++) {
    const ch = json[i]
    if (inString) {
      if (ch === '\\') { out += ch + (json[i + 1] ?? ''); i++; continue }
      if (ch === '"') { inString = false; out += ch; continue }
      if (ch === '\n') { out += '\\n'; continue }
      if (ch === '\r') { continue }
      if (ch === '\t') { out += '\\t'; continue }
      out += ch
    } else {
      if (ch === '"') inString = true
      out += ch
    }
  }
  return out
}

// Parses GOOGLE_SERVICE_ACCOUNT_KEY tolerantly: raw JSON, JSON wrapped in quotes,
// base64-encoded JSON, or JSON whose private_key contains real newlines
// (a common paste artefact that makes strict JSON.parse throw).
function getSAKey(): SAKey {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim()
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set')

  const candidates: string[] = [raw]
  if (/^['"]/.test(raw)) candidates.push(raw.replace(/^['"]|['"]$/g, ''))
  if (!raw.startsWith('{')) {
    try { candidates.push(Buffer.from(raw, 'base64').toString('utf8')) } catch { /* not base64 */ }
  }
  candidates.push(...candidates.map(escapeControlCharsInStrings))

  let lastErr: unknown = null
  for (const c of candidates) {
    try {
      const k = JSON.parse(c) as SAKey
      if (k && k.client_email && k.private_key) {
        k.private_key = k.private_key.replace(/\\n/g, '\n')
        return k
      }
      lastErr = new Error('parsed JSON is missing client_email/private_key')
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY is not valid service-account JSON: ${String(lastErr).slice(0, 120)}`)
}

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken

  const key = getSAKey()
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url')
  const toSign = `${header}.${payload}`

  const sign = createSign('RSA-SHA256')
  sign.update(toSign)
  const sig = sign.sign(key.private_key, 'base64url')
  const jwt = `${toSign}.${sig}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })

  const data = await res.json() as { access_token?: string; expires_in?: number; error_description?: string }
  if (!data.access_token) throw new Error(`Drive token error: ${data.error_description || JSON.stringify(data).slice(0, 160)}`)

  _accessToken = data.access_token
  _tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000
  return _accessToken
}

/** Find (or create) the per-app subfolder inside the shared parent folder. */
async function getFolder(): Promise<string> {
  if (_folderId) return _folderId
  const token = await getAccessToken()
  const parent = getParentFolder()
  const q = `name='${APP_SUBFOLDER}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json() as { files?: { id: string }[] }
  if (data.files?.[0]?.id) { _folderId = data.files[0].id; return _folderId }

  const create = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: APP_SUBFOLDER, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  })
  if (!create.ok) throw new Error(`Drive subfolder create failed (${create.status}): ${(await create.text()).slice(0, 200)}`)
  const created = await create.json() as { id: string }
  _folderId = created.id
  return _folderId
}

async function findFile(name: string): Promise<string | null> {
  const token = await getAccessToken()
  const folder = await getFolder()
  const q = `name='${name}' and '${folder}' in parents and trashed=false`
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json() as { files?: { id: string }[] }
  return data.files?.[0]?.id ?? null
}

/** Read a JSON file from the app folder. Returns `fallback` when it does not exist. */
export async function readJson<T>(filename: string, fallback: T): Promise<T> {
  if (LOCAL_DIR) {
    const f = join(LOCAL_DIR, filename)
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as T : fallback
  }
  const token = await getAccessToken()
  const fileId = await findFile(filename)
  if (!fileId) return fallback
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive read failed (${res.status})`)
  return await res.json() as T
}

/** Create or overwrite a JSON file in the app folder. */
export async function writeJson(filename: string, data: unknown): Promise<void> {
  if (LOCAL_DIR) {
    mkdirSync(LOCAL_DIR, { recursive: true })
    writeFileSync(join(LOCAL_DIR, filename), JSON.stringify(data))
    return
  }
  const token = await getAccessToken()
  const folder = await getFolder()
  const body = JSON.stringify(data)
  const fileId = await findFile(filename)

  if (fileId) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) throw new Error(`Drive update failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
    return
  }

  const boundary = `b${randomUUID().replace(/-/g, '')}`
  const meta = JSON.stringify({ name: filename, parents: [folder] })
  const multipart = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', meta,
    `--${boundary}`, 'Content-Type: application/json', '', body,
    `--${boundary}--`,
  ].join('\r\n')

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  })
  if (!res.ok) throw new Error(`Drive create failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

/** Non-secret diagnostics for /api/health — never returns key material. */
export async function driveHealth(): Promise<Record<string, unknown>> {
  if (LOCAL_DIR) {
    mkdirSync(LOCAL_DIR, { recursive: true })
    return { mode: 'local', configured: true, tokenOk: true, folderListStatus: 200, collections: readdirSync(LOCAL_DIR) }
  }
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''
  const out: Record<string, unknown> = {
    mode: 'google-drive',
    keyPresent: raw.length > 0,
    folderConfigured: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    subfolder: APP_SUBFOLDER,
  }
  if (!raw || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    out.configured = false
    return out
  }
  out.configured = true
  try {
    const k = getSAKey()
    out.keyParses = true
    out.serviceAccountDomain = k.client_email.split('@')[1] ?? null
    out.privateKeyIsPem = /BEGIN [A-Z ]*PRIVATE KEY/.test(k.private_key)
  } catch (e) {
    out.keyParses = false
    out.keyError = String(e).slice(0, 200)
    return out
  }
  try {
    const token = await getAccessToken()
    out.tokenOk = true
    const folder = await getFolder()
    const q = `'${folder}' in parents and trashed=false`
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(name)&pageSize=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    out.folderListStatus = res.status
    const data = await res.json() as { files?: { name: string }[]; error?: { message?: string } }
    out.collections = data.files?.map(f => f.name) ?? null
    if (data.error) out.folderError = data.error.message
  } catch (e) {
    out.tokenOk = false
    out.tokenError = String(e).slice(0, 200)
  }
  return out
}
