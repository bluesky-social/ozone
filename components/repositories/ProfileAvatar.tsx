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
  const avatarUrl = profile?.avatar
  const image = (
    <img
      alt={`Avatar of ${profile?.displayname || profile?.handle || 'user'}`}
      className={avatarClassNames({ profile, repo }, className)}
      src={profile?.avatar || '/img/default-avatar.jpg'}
      {...rest}
    />
  )

  // If an URL exists on the profile, we won't use the fallback one so we should link to the full avatar
  if (avatarUrl) {
    // use the same classes on the image as the anchor tag
    return (
      <a href={avatarUrl} target="_blank" className={className}>
        {image}
      </a>
    )
  }

  // If no avatar url is available, we are gonna use fallback image in which case, just render the image
  return image
}
