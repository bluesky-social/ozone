import { ComponentProps } from 'react'

import { doesProfileNeedBlur } from '@/common/labels'
import { classNames } from '@/lib/util'

type ProfileAndRepo = Parameters<typeof doesProfileNeedBlur>[0]

export const avatarClassNames = (
  profileAndRepo: ProfileAndRepo,
  additionalClassnames?: string,
) => {
  if (doesProfileNeedBlur(profileAndRepo)) {
    return classNames(additionalClassnames, 'blur-sm hover:blur-none')
  }

  return additionalClassnames
}

export const ProfileAvatar = ({
  profile,
  repo,
  className,
  ...rest
}: ProfileAndRepo & ComponentProps<'img'>) => {
  return (
    <img
      alt={`Avatar of ${profile?.displayname || profile?.handle || 'user'}`}
      className={avatarClassNames({ profile, repo }, className)}
      src={profile?.avatar || '/img/default-avatar.jpg'}
      {...rest}
    />
  )
}
