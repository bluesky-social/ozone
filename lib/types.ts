import {
  ChatBskyConvoDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
  ComAtprotoServerDefs,
  ComAtprotoAdminDefs,
  asPredicate,
} from '@atproto/api'
import { ReactNode } from 'react'
import { CollectionId } from '@/reports/helpers/subject'

export type Repo =
  | ToolsOzoneModerationDefs.RepoView
  | ToolsOzoneModerationDefs.RepoViewDetail

export type SubjectStatus = ToolsOzoneModerationDefs.SubjectStatusView

export type InviteCode = ComAtprotoServerDefs.InviteCode

const isConvoRef = asPredicate(ChatBskyConvoDefs.validateConvoRef)

export function validSubjectString(subject: SubjectStatus['subject']) {
  if (ComAtprotoAdminDefs.isRepoRef(subject)) {
    return subject.did
  } else if (ComAtprotoRepoStrongRef.isMain(subject)) {
    return subject.uri
  } else if (isConvoRef(subject)) {
    return `at://${subject.did}/${CollectionId.Convo}/${subject.convoId}`
  }
  return null
}

export type PropsOf<F extends Function> = F extends (
  props: infer P,
) => ReactNode
  ? P
  : never

export type TakedownTargetService = 'appview' | 'pds'
