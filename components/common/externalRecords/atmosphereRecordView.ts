import type {
  $Typed,
  Agent,
  AppBskyEmbedExternal,
  ComAtprotoRepoStrongRef,
} from '@atproto/api'

// The installed @atproto/api predates this endpoint. Until the SDK ships it,
// register the upstream query schema (lexicons-overrides/app/bsky/unspecced/
// getAtmosphereRecordView.json in bluesky-social/atproto) on the agent so the
// call keeps auth, the Ozone proxy header, and request/response validation.
const NSID = 'app.bsky.unspecced.getAtmosphereRecordView'

// (@atproto/lexicon is not a direct dependency, so derive its doc type.)
const queryLexicon: Parameters<Agent['lex']['add']>[0] = {
  lexicon: 1,
  id: NSID,
  defs: {
    main: {
      type: 'query',
      parameters: {
        type: 'params',
        required: ['uri'],
        properties: {
          uri: { type: 'string', format: 'at-uri' },
          cid: { type: 'string', format: 'cid' },
        },
      },
      output: {
        encoding: 'application/json',
        schema: {
          type: 'object',
          properties: {
            view: {
              type: 'union',
              refs: [
                'app.bsky.embed.external#viewArticle',
                'app.bsky.embed.external#viewArticlePublication',
                'app.bsky.embed.external#viewGallery',
                'app.bsky.embed.external#viewLivestream',
              ],
            },
            associatedRefs: {
              type: 'array',
              items: { type: 'ref', ref: 'com.atproto.repo.strongRef' },
            },
            associatedRecords: { type: 'array', items: { type: 'unknown' } },
          },
        },
      },
    },
  },
}

export type AtmosphereRecordView = {
  view?:
    | $Typed<AppBskyEmbedExternal.ViewArticle>
    | $Typed<AppBskyEmbedExternal.ViewArticlePublication>
    | $Typed<AppBskyEmbedExternal.ViewGallery>
    | $Typed<AppBskyEmbedExternal.ViewLivestream>
    | { $type: string }
  associatedRefs?: ComAtprotoRepoStrongRef.Main[]
  associatedRecords?: unknown[]
}

// Returns `{}` when the record is unavailable, and associations only when it
// is visible but cannot produce a view.
export async function fetchAtmosphereRecordView(
  agent: Agent,
  params: { uri: string; cid: string },
  signal?: AbortSignal,
): Promise<AtmosphereRecordView> {
  if (!agent.lex.get(NSID)) agent.lex.add(queryLexicon)
  const { data } = await agent.call(NSID, params, undefined, { signal })
  // The registered schema has validated this response.
  return data as AtmosphereRecordView
}
