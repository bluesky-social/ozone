const {
  readEnv,
  httpLogger,
  envToCfg,
  envToSecrets,
  OzoneDaemon,
  Database,
} = require('@atproto/ozone')

async function main() {
  const env = readEnv()
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
  const daemon = await OzoneDaemon.create(config, secrets)
  await daemon.start()
  httpLogger.info('Ozone daemon is running')
  process.on('SIGTERM', async () => {
    await daemon.destroy()
  })
}

main().catch(console.error)
