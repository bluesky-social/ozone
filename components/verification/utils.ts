import {
  isValidProfileViewDetailed,
  isValidRepoViewDetailed,
} from '@/repositories/helpers'
import { ToolsOzoneVerificationDefs } from '@atproto/api'

export const getVerificationIssuerHandle = (
  verification: ToolsOzoneVerificationDefs.VerificationView,
) => {
  const { issuerRepo, issuerProfile, issuer } = verification
  if (isValidRepoViewDetailed(issuerRepo)) {
    return issuerRepo.handle
  }
  if (issuerProfile && isValidProfileViewDetailed(issuerProfile)) {
    return issuerProfile.handle
  }
  return issuer
}
