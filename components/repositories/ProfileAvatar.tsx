import { ComponentProps, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'

import { doesProfileNeedBlur } from '@/common/labels'
import { classNames } from '@/lib/util'

type ProfileAndRepo = Parameters<typeof doesProfileNeedBlur>[0]

export const avatarClassNames = (
  profileAndRepo: ProfileAndRepo,
  additionalClassnames?: string,
) => {
  if (doesProfileNeedBlur(profileAndRepo)) {
    return classNames(
      additionalClassnames,
      'blur-sm hover:blur-none opacity-50 grayscale',
    )
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
  const alt = `Avatar of ${profile?.displayname || profile?.handle || 'user'}`
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
    }
  }

  const image = (
    <img
      alt={alt}
      className={avatarClassNames({ profile, repo }, className)}
      src={profile?.avatar || '/img/default-avatar.jpg'}
      {...rest}
    />
  )

  // If an URL exists on the profile, we won't use the fallback one so we should link to the full avatar
  if (avatarUrl) {
    // use the same classes on the image as the anchor tag
    return (
      <>
        <Lightbox
          open={isImageViewerOpen}
          carousel={{ finite: true }}
          controller={{ closeOnBackdropClick: true }}
          close={() => setIsImageViewerOpen(false)}
          slides={[
            {
              src: avatarUrl,
              description: alt,
            },
          ]}
          on={{
            // The lightbox may open from other Dialog/modal components
            // in that case, we want to make sure that esc button presses
            // only close the lightbox and not the parent Dialog/modal underneath
            entered: () => {
              document.addEventListener('keydown', handleKeyDown)
            },
            exited: () => {
              document.removeEventListener('keydown', handleKeyDown)
            },
          }}
        />
        <button
          type="button"
          className={className}
          onClick={() => setIsImageViewerOpen(true)}
        >
          {image}
        </button>
      </>
    )
  }

  // If no avatar url is available, we are gonna use fallback image in which case, just render the image
  return image
}
