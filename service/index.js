const next = require('next')
const {
  readEnv,
  httpLogger,
  envToCfg,
  envToSecrets,
  OzoneService,
  OzoneDaemon,
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

  // Note: We must use `use()` here. This should be the last middleware.
  ozone.app.use((req, res) => {
    void frontendHandler(req, res, undefined)
  })
  // run
  const httpServer = await ozone.start()
  /** @type {import('net').AddressInfo} */
  const addr = httpServer.address()
  httpLogger.info(`Ozone is running at http://localhost:${addr.port}`)

  if (process.env.DAEMON_ENABLED) {
    const daemon = await OzoneDaemon.create(config, secrets)
    await daemon.start()
    process.on('SIGTERM', async () => {
      await daemon.destroy()
    })
  }
}

main().catch(console.error)
