import {
  ComAtprotoRepoStrongRef,
  ComAtprotoAdminDefs,
  ComAtprotoServerDefs,
  AppBskyFeedDefs,
} from '@atproto/api'
import { ReactNode } from 'react'

type Reason = AppBskyFeedDefs.FeedViewPost['reason']

export function isRepost(v: Reason): v is AppBskyFeedDefs.ReasonRepost {
  return AppBskyFeedDefs.isReasonRepost(v)
}

export type Repo = ComAtprotoAdminDefs.RepoView

export type Report = ComAtprotoAdminDefs.ReportView

export type InviteCode = ComAtprotoServerDefs.InviteCode

export function validSubjectString(subject: Report['subject']) {
  if (ComAtprotoAdminDefs.isRepoRef(subject)) {
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
