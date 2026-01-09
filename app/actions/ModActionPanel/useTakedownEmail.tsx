import { compileTemplateContent } from '@/email/helpers'
import { SeverityLevelDetail } from '@/setting/severity-level/types'

export type CompileTemplateInput = {
  handle?: string
  subjectName: string // 'account', 'post', 'list', 'record', etc.
  recordContent?: string
  isPermanent?: boolean

  strikeCount?: string

  // strike info
  totalStrikes: number // after applying this violation
  previousStrikes: number // strikes before
  thresholdCrossed?: number
  nextThreshold?: number
  suspensionDuration?: string | null
  suspensionEndDate?: string | null
  isFirstSev1ForPolicy?: boolean
  policyConfig?: {
    name: string
    url?: string
    emailSummary?: string
    emailBullets?: string
    emailExtraNotes?: string
  }
  severityLevelConfig?: SeverityLevelDetail
}

export function compileTakedownSubject({
  thresholdCrossed,
  suspensionDuration,
  isFirstSev1ForPolicy,
}: {
  thresholdCrossed?: number
  suspensionDuration?: string | null
  isFirstSev1ForPolicy?: boolean
}): string {
  if (isFirstSev1ForPolicy) {
    return `Bluesky Account Warning - Community Guidelines Violation`
  }

  const applyingSuspension = thresholdCrossed && suspensionDuration
  if (applyingSuspension) {
    return `Bluesky Account Suspended - Community Guidelines Violation`
  }
  return `Bluesky Account Notice - Community Guidelines Violation`
}

export function compileTakedownEmail(input: CompileTemplateInput): string {
  const {
    handle,
    subjectName,
    isPermanent,
    recordContent,
    totalStrikes,
    thresholdCrossed,
    nextThreshold,
    suspensionDuration,
    suspensionEndDate,
    isFirstSev1ForPolicy,
    severityLevelConfig,
    policyConfig,
  } = input

  const isAccountLevel = subjectName === 'account'

  const linkPolicy = policyConfig?.url
    ? `[${policyConfig?.name}](${policyConfig?.url})`
    : policyConfig?.name

  const joinParagraphs = (...parts: (string | null | undefined)[]) =>
    parts.filter(Boolean).join('\n\n')

  const severityText = isAccountLevel
    ? severityLevelConfig?.accountEmailSummary
    : severityLevelConfig?.contentEmailSummary

  const intro = (() => {
    if (severityLevelConfig?.strikeCount === 0) {
      return `Hi,\nWe've reviewed a ${subjectName} on your account @${handle} and removed it. This removal relates to Bluesky's Community Guidelines on ${linkPolicy}. ${
        policyConfig?.emailSummary ?? ''
      }`
    }

    if (!isAccountLevel) {
      return `Hi,\nWe've reviewed a ${subjectName} on your account @${handle} and found it violates Bluesky's Community Guidelines on ${linkPolicy}. ${
        policyConfig?.emailSummary ?? ''
      }`
    }

    return `Hi,\nWe've reviewed activity on your account @${handle} and found it violates Bluesky's Community Guidelines on ${linkPolicy}. ${
      policyConfig?.emailSummary ?? ''
    }`
  })()

  const postBlock = recordContent
    ? `The following ${subjectName} was removed:\n\n> ${recordContent
        .split('\n')
        .map((line) => `*${line}*`)
        .join('\n> ')}`
    : null

  // Strike logic (Section 2.5)
  const strikeInfo = (() => {
    if (severityLevelConfig?.needsTakedown || isPermanent) {
      return `You will no longer be able to access this account.`
    }

    if (!severityLevelConfig?.strikeCount) {
      return `Your ${subjectName} was removed, but no new strikes have been applied to your account.`
    }

    if (isFirstSev1ForPolicy) {
      return `This is a warning. Future similar violations will result in strikes against your account.`
    }

    // If 16 strikes => permanent ban
    if (totalStrikes >= 16) {
      return `Because you reached 16 strikes, your account has been permanently removed. You will no longer be able to access this account.`
    }

    // Regular "You now have X strikes"
    let out = totalStrikes ? `You now have ${totalStrikes} total strikes.` : ''
    const lineBreaks = out ? '\n\n' : ''

    // Threshold crossed → suspension triggered
    const needsSuspensionCopy =
      thresholdCrossed && suspensionDuration && suspensionEndDate
    if (needsSuspensionCopy) {
      out += `${lineBreaks}Because you reached ${thresholdCrossed} strikes, your account has been suspended for ${suspensionDuration}. You will be able to access your account again on ${suspensionEndDate}.`
    }

    // Approaching permanent ban (12–15)
    if (totalStrikes >= 12 && totalStrikes <= 15) {
      out += `${lineBreaks}⚠️ **Warning:** You are approaching permanent account removal. At 16 strikes, your account will be permanently banned.`
    } else if (nextThreshold && !needsSuspensionCopy) {
      // No threshold crossed → next threshold message
      out += `${lineBreaks}Please note that at ${nextThreshold} strikes, your account will be suspended for ${suspensionDuration}.`
      return out
    }

    return out
  })()

  // Outro
  const outro = !isAccountLevel
    ? `If you believe this action was taken in error, you can appeal within 14 days by emailing **moderation@blueskyweb.xyz**. Please include context about why you believe this decision was incorrect.\n\nBluesky Moderation Team`
    : `If you believe this action was taken in error, you can appeal within 14 days using our **in-app appeal tool**. Please include context about why you believe this decision was incorrect.\n\nBluesky Moderation Team`

  return compileTemplateContent(
    joinParagraphs(
      intro,
      policyConfig?.emailBullets
        ? `For example:\n ${policyConfig.emailBullets}`
        : '',
      postBlock,
      // Don't add severity text if the sev-level adds no strikes or this is the first offense on the sev-1 violation
      [
        severityLevelConfig?.strikeCount === 0 || isFirstSev1ForPolicy
          ? null
          : severityText,
        strikeInfo,
      ]
        .filter(Boolean)
        .join(' '),
      policyConfig?.emailExtraNotes,
      outro,
    ),
    input,
  )
}
