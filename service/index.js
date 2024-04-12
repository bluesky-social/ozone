const next = require('next')
const {
  readEnv,
  httpLogger,
  envToCfg,
  envToSecrets,
  OzoneService,
  Database,
} = require('@atproto/ozone')
const pkg = require('@atproto/ozone/package.json')

async function main() {
  // frontend
  const dev = process.env.NODE_ENV !== 'production'
  const frontend = next({ dev })
  const frontendHandler = frontend.getRequestHandler()
  await frontend.prepare()
  // backend
  const env = readEnv()
  env.version ??= pkg.version
  const config = envToCfg(env)
  const secrets = envToSecrets(env)
  const migrate = process.env.OZONE_DB_MIGRATE === '1'
  if (migrate) {
    const db = new Database({
      url: config.db.postgresUrl,
      schema: config.db.postgresSchema,
    })
    await db.migrateToLatestOrThrow()
    await db.close()
  }
  const ozone = await OzoneService.create(config, secrets)
  // setup handlers
  ozone.app.get('/.well-known/ozone-metadata.json', (_req, res) => {
    return res.json({
      did: ozone.ctx.cfg.service.did,
      url: ozone.ctx.cfg.service.publicUrl,
      publicKey: ozone.ctx.signingKey.did(),
    })
  })
  ozone.app.get('*', (req, res) => {
    return frontendHandler(req, res)
  })
  // run
  const httpServer = await ozone.start()
  /** @type {import('net').AddressInfo} */
  const addr = httpServer.address()
  httpLogger.info(`Ozone is running at http://localhost:${addr.port}`)
}

main().catch(console.error)
