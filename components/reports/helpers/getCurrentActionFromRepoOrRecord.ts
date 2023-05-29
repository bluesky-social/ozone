import { ComAtprotoAdminDefs } from '@atproto/api'

export function getCurrentActionFromRepoOrRecord({
  repo,
  record,
}: {
  repo: ComAtprotoAdminDefs.RepoViewDetail | undefined
  record: ComAtprotoAdminDefs.RecordViewDetail | undefined
}): ComAtprotoAdminDefs.ActionView | undefined {
  let { moderation = undefined } = repo ? repo : record ? record : {}

  if (!moderation?.currentAction) return undefined
  return moderation.actions?.find(
    ({ id }) => id === moderation?.currentAction?.id,
  )
}
