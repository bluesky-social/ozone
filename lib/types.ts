import {
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
  ComAtprotoServerDefs,
  ComAtprotoAdminDefs,
} from '@atproto/api'
import { ReactNode } from 'react'

export type Repo =
  | ToolsOzoneModerationDefs.RepoView
  | ToolsOzoneModerationDefs.RepoViewDetail

export type SubjectStatus = ToolsOzoneModerationDefs.SubjectStatusView

export type InviteCode = ComAtprotoServerDefs.InviteCode

export function validSubjectString(subject: SubjectStatus['subject']) {
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
