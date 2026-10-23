import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash, X509Certificate } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'

const run = promisify(execFile)
// Fixtures copied unchanged from atproto fc60876949cca1ca28e98273ecfc97a151d3ebfc.
const fixture = JSON.parse(await readFile(new URL('./tls.json', import.meta.url)))

test('native TLS verifier rejects compromised chains before sending HTTP and preserves sibling trust', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ozone-emudhra-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const spki = new X509Certificate(fixture.blocked.intermediate).publicKey.export({ type: 'spki', format: 'der' })
  const blockedHash = createHash('sha256').update(spki).digest('hex')
  const ca = join(directory, 'root.pem')
  await writeFile(ca, fixture.root)

  let blockedRequests = 0
  async function listen(chain, blocked) {
    const server = createServer({ key: fixture.key, cert: chain }, (req, res) => {
      if (blocked) blockedRequests++
      req.resume()
      res.end('ok')
    })
    t.after(() => new Promise((resolve, reject) => {
      server.closeAllConnections()
      server.close((error) => error ? reject(error) : resolve())
    }))
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    return `https://127.0.0.1:${server.address().port}`
  }
  const blockedUrl = await listen(fixture.blocked.cert, true)
  const allowedUrl = await listen(fixture.allowed.cert, false)

  async function request(client, url, { enabled = true, trust = true, hostname = false } = {}) {
    const script = `
      import { request } from 'node:https'
      import { createRequire } from 'node:module'
      // This test-only Node hook changes the native blocklist in this child
      // process. Production never uses --expose-internals or a JS preload.
      if (${enabled}) {
        const { internalBinding } = createRequire(import.meta.url)('internal/test/binding')
        internalBinding('crypto').addBlockedSPKIForTesting(Buffer.from('${blockedHash}', 'hex'))
      }
      try {
        let body
        if (${JSON.stringify(client)} === 'fetch') {
          body = await (await fetch(${JSON.stringify(url)}, {method: 'POST', body: 'private data'})).text()
        } else {
          body = await new Promise((resolve, reject) => {
            const req = request(${JSON.stringify(url)}, {
              method: 'POST',
              agent: false,
              ${hostname ? "servername: 'wrong.example'," : ''}
              ${client === 'custom-check' ? 'checkServerIdentity() {},' : ''}
            }, async (res) => {
              res.setEncoding('utf8')
              let text = ''
              for await (const chunk of res) text += chunk
              resolve(text)
            })
            req.on('error', reject)
            req.end('private data')
          })
        }
        console.log(JSON.stringify({body}))
      } catch (error) {
        console.log(JSON.stringify({code: error.cause?.code ?? error.code}))
      }
    `
    const { stdout } = await run(process.execPath, ['--expose-internals', '--input-type=module', '--eval', script], {
      timeout: 10000,
      env: {
        ...process.env,
        NODE_OPTIONS: '',
        NODE_EXTRA_CA_CERTS: trust ? ca : '',
        NODE_TLS_REJECT_UNAUTHORIZED: '1',
      },
    })
    return JSON.parse(stdout)
  }

  for (const client of ['fetch', 'https', 'custom-check']) {
    assert.deepEqual(await request(client, blockedUrl), { code: 'CERT_REVOKED' }, client)
    assert.deepEqual(await request(client, allowedUrl), { body: 'ok' }, client)
  }
  assert.equal(blockedRequests, 0)
  assert.deepEqual(await request('https', allowedUrl, { hostname: true }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' })
  assert.deepEqual(await request('fetch', allowedUrl, { trust: false }), { code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' })
  assert.deepEqual(await request('fetch', blockedUrl, { enabled: false }), { body: 'ok' })
  assert.equal(blockedRequests, 1, 'control proves that the trusted blocked chain otherwise works')
})
