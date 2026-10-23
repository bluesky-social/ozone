import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          // Cypress 14 predates the fix for Chrome's local-network permission
          // prompt, which can block localhost requests before cy.intercept.
          // Preserve Cypress's other disabled features in the same switch.
          const index = launchOptions.args.findIndex((arg) =>
            arg.startsWith('--disable-features='),
          )
          if (index === -1) {
            launchOptions.args.push('--disable-features=LocalNetworkAccessChecks')
          } else {
            launchOptions.args[index] += ',LocalNetworkAccessChecks'
          }
        }
        if (browser.name === 'chrome' && browser.isHeadless) {
          // fullPage screenshot size is 1400x1200 on non-retina screens
          // and 2800x2400 on retina screens
          launchOptions.args.push('--window-size=1400,1200')

          // force screen to be non-retina (1400x1200 size)
          launchOptions.args.push('--force-device-scale-factor=1')

          // force screen to be retina (2800x2400 size)
          // launchOptions.args.push('--force-device-scale-factor=2')
        }
        return launchOptions
      })
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
})
