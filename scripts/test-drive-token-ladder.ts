/**
 * Unit-level test for the Drive token source ladder (api/_lib/drive.ts).
 * No real credentials required — mocks global fetch and exercises all three
 * modes: user-oauth (refresh token), service-account (JWT), unconfigured,
 * plus the user-oauth folder-fallback path and the readJson/writeJson surface.
 *
 * Adapted from REBUILD/builds/blink-talent/scripts/test-drive-token-ladder.ts
 * for this app's shape: APP_SUBFOLDER (found/created inside the configured
 * parent folder) with an app-owned-root-folder fallback
 * (findOrCreateAppRootFolder / "SEF Apps Data (mark-sef-personal-hub)"), a
 * LOCAL_DIR disk-backed test mode (must stay unset here), and single-JSON-
 * document readJson/writeJson rather than blink-talent's collection arrays.
 *
 * Run: npx tsx scripts/test-drive-token-ladder.ts
 */

let failures = 0
function assert(cond: boolean, msg: string) {
  if (!cond) { failures++; console.error(`FAIL: ${msg}`) } else { console.log(`ok:   ${msg}`) }
}

type FetchCall = { url: string; init?: RequestInit }
function mockFetch(handler: (call: FetchCall) => Promise<Response> | Response) {
  const calls: FetchCall[] = []
  ;(globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return handler({ url, init })
  }
  return calls
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function bodyName(init?: RequestInit): string | undefined {
  try {
    return init?.body ? (JSON.parse(String(init.body)) as { name?: string }).name : undefined
  } catch {
    return undefined
  }
}

async function freshDriveModule() {
  // Bust the ESM module cache so each scenario gets fresh module-level token/folder caches.
  return import(`../api/_lib/drive.ts?t=${Date.now()}_${Math.random()}`)
}

function resetEnv() {
  delete process.env.LOCAL_STORE_DIR
  delete process.env.GOOGLE_REFRESH_TOKEN
  delete process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_SECRET
  delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  delete process.env.GOOGLE_DRIVE_FOLDER_ID
  delete process.env.DRIVE_SUBFOLDER
}

async function testUserOAuthMode() {
  console.log('\n--- user-oauth mode (configured parent folder visible) ---')
  resetEnv()
  process.env.GOOGLE_REFRESH_TOKEN = 'rt_test'
  process.env.GOOGLE_CLIENT_ID = 'cid_test'
  process.env.GOOGLE_CLIENT_SECRET = 'secret_test'
  process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder_configured'
  process.env.DRIVE_SUBFOLDER = 'mark-sef-hub'

  let createdSubfolder = false
  const calls = mockFetch(async ({ url, init }) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      const body = new URLSearchParams(String(init?.body))
      assert(body.get('grant_type') === 'refresh_token', 'token request uses grant_type=refresh_token')
      assert(body.get('refresh_token') === 'rt_test', 'token request sends the refresh token')
      assert(body.get('client_id') === 'cid_test', 'token request sends the client id')
      assert(body.get('client_secret') === 'secret_test', 'token request sends the client secret')
      return json({ access_token: 'AT_user_oauth', expires_in: 3600 })
    }
    // Configured parent folder is visible in this scenario (GET, not the DELETE below).
    if (url.startsWith('https://www.googleapis.com/drive/v3/files/folder_configured') && (!init || init.method === undefined)) {
      return json({ id: 'folder_configured' })
    }
    if (init?.method === 'POST' && url === 'https://www.googleapis.com/drive/v3/files?fields=id') {
      assert(bodyName(init) === 'mark-sef-hub', 'creates the APP_SUBFOLDER inside the visible configured folder')
      createdSubfolder = true
      return json({ id: 'subfolder_id' })
    }
    if (url.includes('/drive/v3/files?q=')) {
      return json({ files: [] }) // no existing subfolder / no existing named file -> create / fallback path
    }
    if (init?.method === 'POST' && url.startsWith('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart')) {
      return json({ id: 'new_file_id' }) // writeJson creating a new file
    }
    return json({}, 404)
  })

  const drive = await freshDriveModule()
  assert(drive.driveTokenMode() === 'user-oauth', 'driveTokenMode() reports user-oauth when refresh token + client creds are set')

  const health = await drive.driveHealth()
  assert(health.driveAuthMode === 'user-oauth', 'driveHealth().driveAuthMode === user-oauth')
  assert(health.tokenOk === true, 'driveHealth() reports tokenOk under user-oauth mode')
  assert(health.usingFallbackFolder === false, 'configured parent folder is used (subfolder found/created inside it) when visible')
  assert(health.folderIdInUse === 'subfolder_id', 'resolved folder id is the app subfolder inside the configured parent')
  assert(createdSubfolder, 'the app subfolder was created inside the visible configured folder')
  assert(calls.some(c => c.url === 'https://oauth2.googleapis.com/token'), 'a token request was made')

  // Exercise the actual read/write surface this app uses (single JSON documents, not
  // blink-talent's collection arrays): no file exists yet, so read falls back, then
  // write creates it.
  const fallback = { hello: 'fallback' }
  const readBack = await drive.readJson('sample.json', fallback)
  assert(readBack === fallback, 'readJson() returns the fallback when no file exists yet')
  await drive.writeJson('sample.json', { hello: 'world' })
  assert(true, 'writeJson() completes without throwing when creating a new file')
}

async function testUserOAuthFolderFallback() {
  console.log('\n--- user-oauth mode: configured folder invisible -> app-owned root folder fallback ---')
  resetEnv()
  process.env.GOOGLE_REFRESH_TOKEN = 'rt_test'
  process.env.GOOGLE_CLIENT_ID = 'cid_test'
  process.env.GOOGLE_CLIENT_SECRET = 'secret_test'
  process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder_configured'

  let createdFallback = false
  mockFetch(async ({ url, init }) => {
    if (url === 'https://oauth2.googleapis.com/token') return json({ access_token: 'AT2', expires_in: 3600 })
    if (url.startsWith('https://www.googleapis.com/drive/v3/files/folder_configured')) return json({ error: { message: 'not found' } }, 404)
    if (init?.method === 'POST' && url === 'https://www.googleapis.com/drive/v3/files?fields=id') {
      assert(bodyName(init) === 'SEF Apps Data (mark-sef-personal-hub)', 'creates the app-owned root folder, not the subfolder, on fallback')
      createdFallback = true
      return json({ id: 'fallback_folder_id' })
    }
    if (url.includes('/drive/v3/files?q=')) return json({ files: [] }) // no existing fallback folder found -> create
    return json({}, 404)
  })

  const drive = await freshDriveModule()
  const health = await drive.driveHealth()
  assert(health.usingFallbackFolder === true, 'falls back to the app-owned root folder when the configured folder is invisible')
  assert(health.folderIdInUse === 'fallback_folder_id', 'resolved folder id is the app-owned fallback root folder')
  assert(createdFallback, 'the app-owned fallback root folder was created')
}

async function testServiceAccountMode() {
  console.log('\n--- service-account mode (legacy path, unchanged) ---')
  const { generateKeyPairSync } = await import('node:crypto')
  resetEnv()
  process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder_configured'

  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
    client_email: 'sa-test@example.iam.gserviceaccount.com',
    private_key: pem,
  })

  let visibilityChecked = false
  mockFetch(async ({ url, init }) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      const body = new URLSearchParams(String(init?.body))
      assert(body.get('grant_type') === 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'SA mode still uses the JWT-bearer grant')
      return json({ access_token: 'AT_sa', expires_in: 3600 })
    }
    if (url.startsWith('https://www.googleapis.com/drive/v3/files/folder_configured')) {
      visibilityChecked = true
      return json({ id: 'folder_configured' })
    }
    if (init?.method === 'POST' && url === 'https://www.googleapis.com/drive/v3/files?fields=id') {
      return json({ id: 'sa_subfolder_id' })
    }
    if (url.includes('/drive/v3/files?q=')) return json({ files: [] })
    return json({}, 404)
  })

  const drive = await freshDriveModule()
  assert(drive.driveTokenMode() === 'service-account', 'driveTokenMode() reports service-account when only the SA key is set')
  const health = await drive.driveHealth()
  assert(health.driveAuthMode === 'service-account', 'driveHealth().driveAuthMode === service-account')
  assert(health.tokenOk === true, 'SA mode still mints a working token')
  assert(health.usingFallbackFolder === false, 'SA mode always targets the configured folder (unchanged legacy behaviour)')
  assert(health.folderIdInUse === 'sa_subfolder_id', 'SA mode resolves the app subfolder inside the configured folder')
  assert(!visibilityChecked, 'SA mode short-circuits the folder-visibility check entirely (mode === "service-account" always wins)')

  delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
}

async function testUnconfigured() {
  console.log('\n--- unconfigured mode ---')
  resetEnv()

  const calls = mockFetch(async () => json({}, 500)) // must never be called

  const drive = await freshDriveModule()
  assert(drive.driveTokenMode() === 'unconfigured', 'driveTokenMode() reports unconfigured with no credentials')
  assert(drive.isConfigured() === false, 'isConfigured() is false with no credentials and no LOCAL_STORE_DIR')
  const health = await drive.driveHealth()
  assert(health.driveAuthMode === 'unconfigured', 'driveHealth() reports unconfigured honestly, no fetch attempted')
  assert(health.tokenOk === undefined, 'no token attempt is made when unconfigured')

  const probe = await drive.driveWriteProbe()
  assert(probe.writeOk === false, 'driveWriteProbe() fails cleanly when unconfigured')
  assert(calls.length === 0, 'no fetch call was ever attempted in unconfigured mode')
}

async function main() {
  await testUserOAuthMode()
  await testUserOAuthFolderFallback()
  await testServiceAccountMode()
  await testUnconfigured()

  console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
