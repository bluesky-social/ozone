import { AppBskyActorDefs } from '@atproto/api'
import {
  CheckCircleIcon as VerifiedIcon,
  CheckBadgeIcon as VerifierIcon,
} from '@heroicons/react/24/solid'
import {
  CheckCircleIcon as InvalidVerificationIcon,
  CheckBadgeIcon as InvalidVerifierIcon,
} from '@heroicons/react/24/outline'
import { classNames } from '@/lib/util'

const sizeClasNames = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const statusClassNames = {
  valid: 'text-blue-600 dark:text-blue-500',
  invalid: 'text-red-600 dark:text-red-200',
}

export const VerificationBadge = ({
  profile,
  size = 'md',
  className,
}: {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  profile?:
    | AppBskyActorDefs.ProfileViewDetailed
    | AppBskyActorDefs.ProfileViewBasic
}) => {
  if (!profile || !profile?.verification) return null
  const { verification } = profile
  const classes = classNames(className, 'inline-block', sizeClasNames[size])

  if (verification?.trustedVerifierStatus === 'valid') {
    return (
      <VerifierIcon
        className={classNames(classes, statusClassNames.valid)}
        title="This user is a trusted verifier"
      />
    )
  }

  if (verification?.trustedVerifierStatus === 'invalid') {
    return (
      <InvalidVerifierIcon
        className={classNames(classes, statusClassNames.invalid)}
        title="This user is no longer a trusted a verifier"
      />
    )
  }

  if (verification?.verifiedStatus === 'valid') {
    return (
      <VerifiedIcon
        className={classNames(classes, statusClassNames.valid)}
        title="This is a verified user"
      />
    )
  }

  if (verification?.verifiedStatus === 'valid') {
    return (
      <InvalidVerificationIcon
        className={classNames(classes, statusClassNames.invalid)}
        title="This user has an invalid verification"
      />
    )
  }
}
