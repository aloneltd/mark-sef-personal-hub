// Google Drive as the database.
//
// A service account owns a folder; every "collection" is one small JSON file inside it
// (an array of records). The browser never talks to Google — only this server layer does.
//
// Ported from REBUILD/builds/blink-talent/api/_lib/drive.ts (proven in production) and
// extended with: an auto-created per-app SUBFOLDER (so several apps can share one parent
// folder id safely) and read/write of single JSON documents.
//
// TOKEN SOURCE LADDER: a stored OAuth refresh token acting AS Mark himself (user-OAuth
// mode) is tried first — service accounts have no Drive storage quota of their own and
// cannot create files in a normal My Drive folder. Falls back to the service-account JWT
// path when no refresh token is configured.
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

type DriveTokenMode = 'user-oauth' | 'service-account' | 'unconfigured'

export function driveTokenMode(): DriveTokenMode {
  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) return 'user-oauth'
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return 'service-account'
  return 'unconfigured'
}

let _accessToken: string | null = null
let _tokenExpiry = 0
let _folderId: string | null = null

/** Per-app subfolder created inside GOOGLE_DRIVE_FOLDER_ID (service-account mode only). */
export const APP_SUBFOLDER = process.env.DRIVE_SUBFOLDER || 'mark-sef-hub'

/** Per-app root folder this brick creates and owns itself (user-OAuth fallback mode). */
const APP_FOLDER_NAME = 'SEF Apps Data (mark-sef-personal-hub)'

export function isConfigured(): boolean {
  if (LOCAL_DIR) return true
  return driveTokenMode() !== 'unconfigured' && !!process.env.GOOGLE_DRIVE_FOLDER_ID
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

/** Exchange the stored refresh token for an access token, acting as Mark himself. */
async function getUserOAuthAccessToken(): Promise<{ token: string; expiresIn: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  })
  const data = await res.json() as { access_token?: string; expires_in?: number; error?: string; error_description?: string }
  if (!data.access_token) {
    throw new Error(`Drive user-OAuth token error: ${data.error_description || data.error || JSON.stringify(data).slice(0, 160)}`)
  }
  return { token: data.access_token, expiresIn: data.expires_in ?? 3600 }
}

/** Mint an access token from the service-account JWT (unchanged legacy path). */
async function getServiceAccountAccessToken(): Promise<{ token: string; expiresIn: number }> {
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
  return { token: data.access_token, expiresIn: data.expires_in ?? 3600 }
}

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken

  const mode = driveTokenMode()
  if (mode === 'unconfigured') {
    throw new Error('Google Drive is not configured: set GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (preferred), or GOOGLE_SERVICE_ACCOUNT_KEY')
  }

  const { token, expiresIn } = mode === 'user-oauth'
    ? await getUserOAuthAccessToken()
    : await getServiceAccountAccessToken()

  _accessToken = token
  _tokenExpiry = Date.now() + (expiresIn - 60) * 1000
  return _accessToken
}

// ─── folder resolution ────────────────────────────────────────────────────
//
// Service-account mode (unchanged): find-or-create APP_SUBFOLDER inside the
// configured parent GOOGLE_DRIVE_FOLDER_ID.
//
// User-OAuth mode: the token normally only carries the narrow `drive.file`
// scope, which can only see files/folders the app itself created — so the
// hand-created parent folder can 404/403 even though it visibly exists in
// Mark's Drive. Prefer it when visible (find-or-create the same subfolder
// inside it); otherwise fall back to a per-app root folder this brick
// creates and owns itself ("SEF Apps Data (<app>)"), used directly (no
// nested subfolder needed since it is already app-exclusive).

async function folderIsVisible(token: string, folderId: string): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return res.ok
}

async function findOrCreateSubfolder(token: string, parent: string): Promise<string> {
  const q = `name='${APP_SUBFOLDER}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json() as { files?: { id: string }[] }
  if (data.files?.[0]?.id) return data.files[0].id

  const create = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: APP_SUBFOLDER, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  })
  if (!create.ok) throw new Error(`Drive subfolder create failed (${create.status}): ${(await create.text()).slice(0, 200)}`)
  const created = await create.json() as { id: string }
  return created.id
}

async function findOrCreateAppRootFolder(token: string): Promise<string> {
  const q = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const listData = await listRes.json() as { files?: { id: string }[] }
  if (listData.files?.[0]?.id) return listData.files[0].id

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  if (!createRes.ok) throw new Error(`Could not create app-owned Drive folder (${createRes.status}): ${(await createRes.text()).slice(0, 200)}`)
  const created = await createRes.json() as { id: string }
  return created.id
}

let _usingFallbackFolder = false

/** Find (or create) the folder to store documents in. Cached for the life of the process. */
async function getFolder(): Promise<string> {
  if (_folderId) return _folderId
  const token = await getAccessToken()
  const mode = driveTokenMode()
  const parent = getParentFolder()

  if (mode === 'service-account' || await folderIsVisible(token, parent)) {
    _usingFallbackFolder = false
    _folderId = await findOrCreateSubfolder(token, parent)
    return _folderId
  }

  _usingFallbackFolder = true
  _folderId = await findOrCreateAppRootFolder(token)
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

/**
 * Write probe for /api/health?probe=write — creates (then deletes) a tiny file in the
 * resolved folder and reports Google's own non-secret error text when it fails. This is
 * the only way to tell "folder is readable" apart from "the current identity may actually
 * write here" (service accounts have no personal Drive storage quota).
 */
export async function driveWriteProbe(): Promise<Record<string, unknown>> {
  if (LOCAL_DIR) return { writeOk: true, mode: 'local' }
  const out: Record<string, unknown> = {}
  try {
    const token = await getAccessToken()
    const folder = await getFolder()
    const boundary = 'healthprobe'
    const body = [
      `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '',
      JSON.stringify({ name: '__health_probe.json', parents: [folder] }),
      `--${boundary}`, 'Content-Type: application/json', '', '[]',
      `--${boundary}--`,
    ].join('\r\n')

    const create = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body },
    )
    out.writeStatus = create.status
    const created = await create.json().catch(() => null) as { id?: string; error?: { message?: string } } | null
    if (create.ok && created?.id) {
      out.writeOk = true
      await fetch(`https://www.googleapis.com/drive/v3/files/${created.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
    } else {
      out.writeOk = false
      out.writeError = created?.error?.message ?? 'unknown'
    }
  } catch (e) {
    out.writeOk = false
    out.writeError = String(e).slice(0, 300)
  }
  return out
}

/** Non-secret diagnostics for /api/health — never returns key material. */
export async function driveHealth(): Promise<Record<string, unknown>> {
  if (LOCAL_DIR) {
    mkdirSync(LOCAL_DIR, { recursive: true })
    return { storageMode: 'local', driveAuthMode: 'unconfigured', configured: true, tokenOk: true, folderListStatus: 200, collections: readdirSync(LOCAL_DIR) }
  }
  const driveAuthMode = driveTokenMode()
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''
  const out: Record<string, unknown> = {
    storageMode: 'google-drive',
    driveAuthMode,
    keyPresent: raw.length > 0,
    refreshTokenPresent: !!process.env.GOOGLE_REFRESH_TOKEN,
    clientIdPresent: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretPresent: !!process.env.GOOGLE_CLIENT_SECRET,
    folderConfigured: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    subfolder: APP_SUBFOLDER,
  }
  if (driveAuthMode === 'unconfigured' || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    out.configured = false
    return out
  }
  out.configured = true
  if (driveAuthMode === 'service-account') {
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
  }
  try {
    const token = await getAccessToken()
    out.tokenOk = true
    const folder = await getFolder()
    out.folderIdInUse = folder
    out.usingFallbackFolder = _usingFallbackFolder
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
