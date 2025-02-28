import { copyToClipboard } from '@/common/CopyButton'
import { AppBskyActorDefs, ToolsOzoneModerationDefs } from '@atproto/api'

export const useCopyAccountDetails = ({
  repo,
  profile,
}: {
  repo?: ToolsOzoneModerationDefs.RepoViewDetail
  profile?: AppBskyActorDefs.ProfileViewDetailed
}) => {
  return () => {
    let data = ``
    if (repo?.handle) {
      data += `Username: ${repo.handle}`
    }
    if (profile?.displayName) {
      data += `Display name: ${profile.displayName}\n`
    }
    if (repo?.did) {
      data += `DID: ${repo.did}\n`
    }
    if (profile?.createdAt) {
      data += `Registration date/time: ${profile?.createdAt}\n`
    }
    if (repo?.threatSignatures?.length) {
      const registrationIp = repo.threatSignatures.find(
        ({ property }) => property === 'registrationIp',
      )?.value
      const lastSigninIp = repo.threatSignatures.find(
        ({ property }) => property === 'lastSigninIp',
      )?.value
      const lastSigninTime = repo.threatSignatures.find(
        ({ property }) => property === 'lastSigninTime',
      )?.value
      if (registrationIp) data += `Registration IP: ${registrationIp}\n`
      if (lastSigninIp) data += `Last signin IP: ${lastSigninIp}\n`
      if (lastSigninTime) data += `Last signed in: ${lastSigninTime}\n`
    }
    if (repo?.email) {
      data += `Email: ${repo.email}\n`
    }
    if (repo?.emailConfirmedAt) {
      data += `Email confirmed: ${repo.emailConfirmedAt}\n`
    }
    const status = repo?.deactivatedAt
      ? 'Deactivated'
      : repo?.moderation.subjectStatus?.takendown
      ? 'Taken down'
      : 'Active'
    data += `Account status: Deactivated on ${status}\n`
    copyToClipboard(data, 'account details ')
  }
}
