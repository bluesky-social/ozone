#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const mode = process.argv[2]

if (mode !== '--link' && mode !== '--unlink') {
  console.error('Usage: node scripts/toggle-atproto.js --link | --unlink')
  process.exit(1)
}

function run(cmd) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd: projectRoot, stdio: 'inherit' })
}

if (mode === '--link') {
  // Resolve atproto path
  const atprotoEnv = process.env.ATPROTO_PATH
  const atprotoAbsolute = atprotoEnv
    ? path.resolve(atprotoEnv)
    : path.resolve(projectRoot, '..', 'atproto')

  if (!fs.existsSync(atprotoAbsolute)) {
    console.error(
      `Error: atproto directory not found at ${atprotoAbsolute}\n` +
        'Set the ATPROTO_PATH env var to point to your local atproto checkout, ' +
        'or clone it as a sibling directory:\n' +
        '  git clone https://github.com/bluesky-social/atproto.git ../atproto',
    )
    process.exit(1)
  }

  // Compute the relative path from project root to atproto
  const atprotoRelative = path.relative(projectRoot, atprotoAbsolute)

  console.log(`Linking local atproto packages from ${atprotoAbsolute}`)

  // 1. Patch next.config.js
  console.log('\nPatching next.config.js...')
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.symlinks = false
    return config
  },
}

module.exports = nextConfig
`
  fs.writeFileSync(path.join(projectRoot, 'next.config.js'), nextConfig)

  // 2. Patch package.json
  console.log('Patching package.json...')
  const pkgPath = path.join(projectRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

  // Remove --turbopack from dev script
  pkg.scripts.dev = 'next dev'

  // Replace @atproto deps with link: references
  pkg.dependencies['@atproto/api'] = `link:${atprotoRelative}/packages/api`
  pkg.dependencies['@atproto/oauth-client-browser'] =
    `link:${atprotoRelative}/packages/oauth/oauth-client-browser`
  pkg.dependencies['@atproto/oauth-types'] =
    `link:${atprotoRelative}/packages/oauth/oauth-types`
  pkg.dependencies['@atproto/xrpc'] = `link:${atprotoRelative}/packages/xrpc`

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // 3. Clean and reinstall
  console.log('\nCleaning .next cache and reinstalling dependencies...')
  run('rm -rf .next && yarn')

  console.log('\nLocal atproto packages linked successfully!')
  console.log('Run `yarn dev` to start the dev server.')
} else {
  // --unlink
  console.log('Restoring published atproto packages...')

  // 1. Restore original files from git
  run('git checkout next.config.js package.json yarn.lock')

  // 2. Clean and reinstall
  console.log('\nCleaning .next cache and reinstalling dependencies...')
  run('rm -rf .next && yarn')

  console.log('\nPublished atproto packages restored successfully!')
}
