const next = require('next')
const {
  readEnv,
  httpLogger,
  envToCfg,
  envToSecrets,
  OzoneService,
  MetricsService,
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
  // Metrics are opt-in for self-hosters via OZONE_METRICS_PORT. Off by default:
  // when unset, no registry is created and no metrics are collected or served.
  // MetricsService is only present in newer @atproto/ozone versions, so guard on it.
  let register
  if (config.service.metricsPort && MetricsService) {
    const prometheus = require('prom-client')
    register = new prometheus.Registry()
  }

  const ozone = await OzoneService.create(config, secrets, undefined, register)

  // Note: We must use `use()` here. This should be the last middleware.
  ozone.app.use((req, res) => {
    void frontendHandler(req, res, undefined)
  })
  // run
  const httpServer = await ozone.start()
  /** @type {import('net').AddressInfo} */
  const addr = httpServer.address()
  httpLogger.info(`Ozone is running at http://localhost:${addr.port}`)

  if (register && config.service.metricsPort) {
    const metrics = MetricsService.create(register)
    await metrics.start(config.service.metricsPort)
    httpLogger.info(
      `Ozone metrics is running at http://localhost:${config.service.metricsPort}/metrics`,
    )
  }
}

main().catch(console.error)
