import {
  AppBskyFeedFeedViewPost,
  ComAtprotoAdminRepo,
  ComAtprotoAdminModerationReport,
  ComAtprotoRepoRepoRef,
  ComAtprotoRepoStrongRef,
} from '@atproto/api'
import { ReactNode } from 'react'

type Reasons =
  | AppBskyFeedFeedViewPost.ReasonTrend
  | AppBskyFeedFeedViewPost.ReasonRepost
  | {
      $type: string
      [k: string]: unknown
    }
  | undefined

function isRecord(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object'
}

export function isTrend(v: Reasons): v is AppBskyFeedFeedViewPost.ReasonTrend {
  return isRecord(v) && v.$type === 'app.bsky.feed.feedViewPost#reasonTrend'
}

export function isRepost(
  v: Reasons,
): v is AppBskyFeedFeedViewPost.ReasonRepost {
  return isRecord(v) && v.$type === 'app.bsky.feed.feedViewPost#reasonRepost'
}

export type Repo = ComAtprotoAdminRepo.View

export type Report = ComAtprotoAdminModerationReport.View

export function validSubjectString(subject: Report['subject']) {
  if (ComAtprotoRepoRepoRef.isMain(subject)) {
    return subject.did
  } else if (ComAtprotoRepoStrongRef.isMain(subject)) {
    return subject.uri
  }
  return null
}

export type PropsOf<F extends Function> = F extends (
  props: infer P,
) => ReactNode
  ? P
  : never
