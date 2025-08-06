import { ComAtprotoModerationDefs } from '@atproto/api'

export function getType(obj: unknown): string {
  if (obj && typeof obj['$type'] === 'string') {
    return obj['$type']
  }
  return ''
}

export const reasonTypeOptions = {
  // Legacy constant-based reasons
  [ComAtprotoModerationDefs.REASONSPAM]: 'Spam',
  [ComAtprotoModerationDefs.REASONVIOLATION]: 'Violation of Terms',
  [ComAtprotoModerationDefs.REASONMISLEADING]: 'Misleading',
  [ComAtprotoModerationDefs.REASONSEXUAL]: 'Sexual',
  [ComAtprotoModerationDefs.REASONRUDE]: 'Rude or Harassment',
  [ComAtprotoModerationDefs.REASONOTHER]: 'Other',
  [ComAtprotoModerationDefs.REASONAPPEAL]: 'Appeal',

  // tools.ozone.report.defs - Appeal
  'tools.ozone.report.defs#reasonAppeal': 'Appeal',

  // Violence and Welfare
  'tools.ozone.report.defs#reasonViolenceAnimalWelfare':
    'Animal Welfare Violation',
  'tools.ozone.report.defs#reasonViolenceThreats': 'Violent Threats',
  'tools.ozone.report.defs#reasonViolenceGraphicContent':
    'Graphic Violent Content',
  'tools.ozone.report.defs#reasonViolenceSelfHarm': 'Self-Harm Content',
  'tools.ozone.report.defs#reasonViolenceGlorification':
    'Violence Glorification',
  'tools.ozone.report.defs#reasonViolenceExtremistContent': 'Extremist Content',
  'tools.ozone.report.defs#reasonViolenceTrafficking': 'Human Trafficking',
  'tools.ozone.report.defs#reasonViolenceOther': 'Other Violence',

  // Sexual Content
  'tools.ozone.report.defs#reasonSexualAbuseContent': 'Sexual Abuse Content',
  'tools.ozone.report.defs#reasonSexualNCII': 'Non-Consensual Intimate Images',
  'tools.ozone.report.defs#reasonSexualSextortion': 'Sextortion',
  'tools.ozone.report.defs#reasonSexualDeepfake': 'Sexual Deepfake',
  'tools.ozone.report.defs#reasonSexualAnimal':
    'Sexual Content Involving Animals',
  'tools.ozone.report.defs#reasonSexualUnlabeled': 'Unlabeled Sexual Content',
  'tools.ozone.report.defs#reasonSexualOther': 'Other Sexual Content',

  // Child Safety
  'tools.ozone.report.defs#reasonChildSafetyCSAM':
    'Child Sexual Abuse Material',
  'tools.ozone.report.defs#reasonChildSafetyGroom': 'Child Grooming',
  'tools.ozone.report.defs#reasonChildSafetyMinorPrivacy':
    'Minor Privacy Violation',
  'tools.ozone.report.defs#reasonChildSafetyEndangerment': 'Child Endangerment',
  'tools.ozone.report.defs#reasonChildSafetyHarassment': 'Child Harassment',
  'tools.ozone.report.defs#reasonChildSafetyPromotion':
    'Promotion of Child Abuse',
  'tools.ozone.report.defs#reasonChildSafetyOther': 'Other Child Safety Issue',

  // Harassment
  'tools.ozone.report.defs#reasonHarassmentTroll': 'Trolling',
  'tools.ozone.report.defs#reasonHarassmentTargeted': 'Targeted Harassment',
  'tools.ozone.report.defs#reasonHarassmentHateSpeech': 'Hate Speech',
  'tools.ozone.report.defs#reasonHarassmentDoxxing': 'Doxxing',
  'tools.ozone.report.defs#reasonHarassmentOther': 'Other Harassment',

  // Misleading Content
  'tools.ozone.report.defs#reasonMisleadingBot': 'Bot Account',
  'tools.ozone.report.defs#reasonMisleadingImpersonation': 'Impersonation',
  'tools.ozone.report.defs#reasonMisleadingSpam': 'Spam',
  'tools.ozone.report.defs#reasonMisleadingScam': 'Scam',
  'tools.ozone.report.defs#reasonMisleadingSyntheticContent':
    'Synthetic Content',
  'tools.ozone.report.defs#reasonMisleadingMisinformation': 'Misinformation',
  'tools.ozone.report.defs#reasonMisleadingOther': 'Other Misleading Content',

  // Rule Violations
  'tools.ozone.report.defs#reasonRuleSiteSecurity': 'Site Security Violation',
  'tools.ozone.report.defs#reasonRuleStolenContent': 'Stolen Content',
  'tools.ozone.report.defs#reasonRuleProhibitedSales': 'Prohibited Sales',
  'tools.ozone.report.defs#reasonRuleBanEvasion': 'Ban Evasion',
  'tools.ozone.report.defs#reasonRuleOther': 'Other Rule Violation',

  // Civic Issues
  'tools.ozone.report.defs#reasonCivicElectoralProcess':
    'Electoral Process Interference',
  'tools.ozone.report.defs#reasonCivicDisclosure': 'Missing Civic Disclosure',
  'tools.ozone.report.defs#reasonCivicInterference': 'Civic Interference',
  'tools.ozone.report.defs#reasonCivicMisinformation': 'Civic Misinformation',
  'tools.ozone.report.defs#reasonCivicImpersonation': 'Civic Impersonation',
}

export const groupedReasonTypes = {
  Legacy: [
    ComAtprotoModerationDefs.REASONSPAM,
    ComAtprotoModerationDefs.REASONVIOLATION,
    ComAtprotoModerationDefs.REASONMISLEADING,
    ComAtprotoModerationDefs.REASONSEXUAL,
    ComAtprotoModerationDefs.REASONRUDE,
    ComAtprotoModerationDefs.REASONOTHER,
    ComAtprotoModerationDefs.REASONAPPEAL,
  ],
  Appeal: ['tools.ozone.report.defs#reasonAppeal'],
  Violence: [
    'tools.ozone.report.defs#reasonViolenceAnimalWelfare',
    'tools.ozone.report.defs#reasonViolenceThreats',
    'tools.ozone.report.defs#reasonViolenceGraphicContent',
    'tools.ozone.report.defs#reasonViolenceSelfHarm',
    'tools.ozone.report.defs#reasonViolenceGlorification',
    'tools.ozone.report.defs#reasonViolenceExtremistContent',
    'tools.ozone.report.defs#reasonViolenceTrafficking',
    'tools.ozone.report.defs#reasonViolenceOther',
  ],
  Sexual: [
    'tools.ozone.report.defs#reasonSexualAbuseContent',
    'tools.ozone.report.defs#reasonSexualNCII',
    'tools.ozone.report.defs#reasonSexualSextortion',
    'tools.ozone.report.defs#reasonSexualDeepfake',
    'tools.ozone.report.defs#reasonSexualAnimal',
    'tools.ozone.report.defs#reasonSexualUnlabeled',
    'tools.ozone.report.defs#reasonSexualOther',
  ],
  'Child Safety': [
    'tools.ozone.report.defs#reasonChildSafetyCSAM',
    'tools.ozone.report.defs#reasonChildSafetyGroom',
    'tools.ozone.report.defs#reasonChildSafetyMinorPrivacy',
    'tools.ozone.report.defs#reasonChildSafetyEndangerment',
    'tools.ozone.report.defs#reasonChildSafetyHarassment',
    'tools.ozone.report.defs#reasonChildSafetyPromotion',
    'tools.ozone.report.defs#reasonChildSafetyOther',
  ],
  Harassment: [
    'tools.ozone.report.defs#reasonHarassmentTroll',
    'tools.ozone.report.defs#reasonHarassmentTargeted',
    'tools.ozone.report.defs#reasonHarassmentHateSpeech',
    'tools.ozone.report.defs#reasonHarassmentDoxxing',
    'tools.ozone.report.defs#reasonHarassmentOther',
  ],
  Misleading: [
    'tools.ozone.report.defs#reasonMisleadingBot',
    'tools.ozone.report.defs#reasonMisleadingImpersonation',
    'tools.ozone.report.defs#reasonMisleadingSpam',
    'tools.ozone.report.defs#reasonMisleadingScam',
    'tools.ozone.report.defs#reasonMisleadingSyntheticContent',
    'tools.ozone.report.defs#reasonMisleadingMisinformation',
    'tools.ozone.report.defs#reasonMisleadingOther',
  ],
  'Rule Violations': [
    'tools.ozone.report.defs#reasonRuleSiteSecurity',
    'tools.ozone.report.defs#reasonRuleStolenContent',
    'tools.ozone.report.defs#reasonRuleProhibitedSales',
    'tools.ozone.report.defs#reasonRuleBanEvasion',
    'tools.ozone.report.defs#reasonRuleOther',
  ],
  Civic: [
    'tools.ozone.report.defs#reasonCivicElectoralProcess',
    'tools.ozone.report.defs#reasonCivicDisclosure',
    'tools.ozone.report.defs#reasonCivicInterference',
    'tools.ozone.report.defs#reasonCivicMisinformation',
    'tools.ozone.report.defs#reasonCivicImpersonation',
  ],
}
