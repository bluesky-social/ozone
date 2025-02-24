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
    if (repo?.did) {
      data += `DID: ${repo.did}\n`
    }
    if (profile?.createdAt) {
      data += `Registration date/time: ${profile?.createdAt}\n`
    }
    if (repo?.threatSignatures?.length) {
      const ip = (
        repo.threatSignatures.find(
          ({ property }) => property === 'registrationIp',
        ) ||
        repo.threatSignatures.find(
          ({ property }) => property === 'lastSigninIp',
        )
      )?.value
      if (ip) data += `IP address: ${ip}\n`
    }
    if (profile?.displayName) {
      data += `Display name: ${profile.displayName}\n`
    }
    if (repo?.deactivatedAt) {
      data += `Account status: Deactivated on ${repo?.deactivatedAt}\n`
    }
    if (repo?.email) {
      data += `Email: ${repo.email}\n`
    }
    if (repo?.emailConfirmedAt) {
      data += `Email confirmed: ${repo.emailConfirmedAt}\n`
    }
    if (repo?.handle) {
      data += `Username: ${repo.handle}`
    }
    copyToClipboard(data, 'account details ')
  }
}
