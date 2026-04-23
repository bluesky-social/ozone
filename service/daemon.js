const {
  readEnv,
  httpLogger,
  envToCfg,
  envToSecrets,
  OzoneDaemon,
} = require('@atproto/ozone')

async function main() {
  const env = readEnv()
  const config = envToCfg(env)
  const secrets = envToSecrets(env)
  const daemon = await OzoneDaemon.create(config, secrets)
  await daemon.start()
  httpLogger.info('Ozone daemon is running')
  const shutdown = async () => {
    try {
      await daemon.destroy()
    } finally {
      process.exit(0)
    }
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch(console.error)
