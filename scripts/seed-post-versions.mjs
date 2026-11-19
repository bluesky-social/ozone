#!/usr/bin/env node

/*
 * Seeds edited and reported posts into a local atproto dev-env, for working on
 * the post versions UI before app.bsky.feed.getPostVersions exists.
 *
 * The dev-env's data plane applies edits but keeps no history, so the earlier
 * versions are written to public/dev-fixtures/post-versions.json, which the UI
 * reads when NEXT_PUBLIC_MOCK_POST_VERSIONS=true.
 *
 * Usage:
 *   node scripts/seed-post-versions.mjs           # all scenarios, new fixture
 *   node scripts/seed-post-versions.mjs both      # scenarios matching "both", added to the fixture
 *
 * Env:
 *   DEV_ENV_URL    dev-env introspection server (default http://localhost:2581)
 *   ATPROTO_PATH   atproto checkout, for a test image (default ../atproto)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AtpAgent } from '@atproto/api'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURE = resolve(root, 'public/dev-fixtures/post-versions.json')
const IMAGE = resolve(
  process.env.ATPROTO_PATH ?? resolve(root, '../atproto'),
  'packages/dev-env/assets/key-landscape-small.jpg',
)
const DEV_ENV_URL = process.env.DEV_ENV_URL ?? 'http://localhost:2581'

const only = process.argv[2]?.toLowerCase()
const services = await (await fetch(DEV_ENV_URL)).json()
const fixture =
  only && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {}

async function login(identifier, password) {
  const agent = new AtpAgent({ service: services.pds.url })
  await agent.login({ identifier, password })
  return agent
}

const users = {
  alice: await login('alice.test', 'hunter2'),
  bob: await login('bob.test', 'hunter2'),
  carla: await login('carla.test', 'hunter2'),
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getIndexedAt(uri) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      `${services.bsky.url}/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`,
    )
    const body = await res.json()
    if (body.posts?.[0]) return body.posts[0].indexedAt
    await sleep(250)
  }
  return new Date().toISOString()
}

async function report(reporter, uri, cid, reasonType, reason) {
  await users[reporter]
    .withProxy('atproto_labeler', services.ozone.did)
    .com.atproto.moderation.createReport({
      reasonType: `com.atproto.moderation.defs#${reasonType}`,
      reason,
      subject: { $type: 'com.atproto.repo.strongRef', uri, cid },
    })
}

/**
 * Creates a post, reports v1, edits it to v2, then reports v2. `counts` are
 * fake per-version engagement counts for the fixture.
 */
async function scenario({
  name,
  author,
  v1,
  v2,
  reportsV1 = [],
  reportsV2 = [],
  counts,
}) {
  if (only && !name.toLowerCase().includes(only)) return
  const agent = users[author]
  const createdAt = new Date().toISOString()

  const r1 = { $type: 'app.bsky.feed.post', createdAt, ...(await v1()) }
  const { data: created } = await agent.com.atproto.repo.createRecord({
    repo: agent.session.did,
    collection: 'app.bsky.feed.post',
    record: r1,
  })
  const { uri, cid: cid1 } = created
  const indexedAt = await getIndexedAt(uri)
  for (const [reporter, type, reason] of reportsV1) {
    await report(reporter, uri, cid1, type, reason)
  }

  const r2 = { $type: 'app.bsky.feed.post', createdAt, ...(await v2(r1)) }
  const { data: edited } = await agent.com.atproto.repo.putRecord({
    repo: agent.session.did,
    collection: 'app.bsky.feed.post',
    rkey: uri.split('/').pop(),
    swapRecord: cid1,
    record: r2,
  })
  const editedAt = new Date().toISOString()
  for (const [reporter, type, reason] of reportsV2) {
    await report(reporter, uri, edited.cid, type, reason)
  }

  fixture[uri] = {
    name,
    versions: [
      { cid: cid1, record: r1, indexedAt, ...counts[0] },
      { cid: edited.cid, record: r2, indexedAt, editedAt, ...counts[1] },
    ],
  }
  console.log(
    `${name}\n  http://localhost:3000/repositories/${uri.replace('at://', '')}`,
  )
}

await scenario({
  name: 'Reported, then edited to look innocent',
  author: 'alice',
  v1: () => ({
    text: 'Honestly anyone who liked that finale is a complete idiot and should log off forever.',
  }),
  v2: () => ({
    text: 'Honestly I did not enjoy that finale at all. Glad some of you did though!',
  }),
  reportsV1: [
    ['bob', 'reasonRude', 'calling people idiots'],
    ['carla', 'reasonRude', 'harassment'],
  ],
  counts: [
    { likeCount: 14, repostCount: 3, replyCount: 9, quoteCount: 2 },
    { likeCount: 2, repostCount: 0, replyCount: 1, quoteCount: 0 },
  ],
})

await scenario({
  name: 'Typo fix, reported after the edit',
  author: 'carla',
  v1: () => ({
    text: 'Their going to annouce the new park opening tomorow! Free entry for everyone',
  }),
  v2: () => ({
    text: "They're going to announce the new park opening tomorrow! Free entry for everyone",
  }),
  reportsV2: [['bob', 'reasonMisleading', 'not free, there is a fee']],
  counts: [
    { likeCount: 4, repostCount: 1, replyCount: 0, quoteCount: 0 },
    { likeCount: 31, repostCount: 6, replyCount: 3, quoteCount: 1 },
  ],
})

await scenario({
  name: 'Edited, never reported',
  author: 'bob',
  v1: () => ({ text: 'Big announcement coming at 5pm, stay tuned 👀' }),
  v2: () => ({ text: 'Big announcement coming at 6pm, stay tuned 👀' }),
  counts: [
    { likeCount: 7, repostCount: 0, replyCount: 2, quoteCount: 0 },
    { likeCount: 12, repostCount: 2, replyCount: 0, quoteCount: 0 },
  ],
})

await scenario({
  name: 'Reported both before and after the edit',
  author: 'carla',
  v1: () => ({
    text: 'Drop your wallet address below and I will send you free crypto, first 100 only',
  }),
  v2: () => ({
    text: 'Drop your wallet address below and I will send you free crypto, first 50 only. Hurry!',
  }),
  reportsV1: [
    ['alice', 'reasonSpam', 'crypto scam'],
    ['bob', 'reasonSpam', 'scam'],
  ],
  reportsV2: [['alice', 'reasonSpam', 'still a scam after the edit']],
  counts: [
    { likeCount: 3, repostCount: 8, replyCount: 40, quoteCount: 1 },
    { likeCount: 1, repostCount: 2, replyCount: 6, quoteCount: 0 },
  ],
})

if (existsSync(IMAGE)) {
  await scenario({
    name: 'Alt text added after a report about missing alt text',
    author: 'alice',
    v1: async () => {
      const { data } = await users.alice.uploadBlob(readFileSync(IMAGE), {
        encoding: 'image/jpeg',
      })
      return {
        text: 'New desk setup is finally done',
        embed: {
          $type: 'app.bsky.embed.images',
          images: [{ image: data.blob, alt: '' }],
        },
      }
    },
    v2: (r1) => ({
      text: r1.text,
      embed: {
        ...r1.embed,
        images: [
          {
            image: r1.embed.images[0].image,
            alt: 'A mechanical keyboard on a wooden desk next to a monitor',
          },
        ],
      },
    }),
    reportsV1: [['carla', 'reasonOther', 'no alt text, inaccessible']],
    counts: [
      { likeCount: 22, repostCount: 1, replyCount: 4, quoteCount: 0 },
      { likeCount: 5, repostCount: 0, replyCount: 0, quoteCount: 0 },
    ],
  })
} else {
  console.log(`Skipping the alt text scenario: no test image at ${IMAGE}`)
}

mkdirSync(dirname(FIXTURE), { recursive: true })
writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2))
console.log(`\nWrote ${Object.keys(fixture).length} posts to ${FIXTURE}`)
