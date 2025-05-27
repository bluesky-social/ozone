import { ComponentProps, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'

import { classNames } from '@/lib/util'
import {
  GraphicMediaFilterPreference,
  useGraphicMediaPreferences,
} from '@/config/useLocalPreferences'
import { getProfileAndRepoLabels } from '@/common/labels/util'
import { AppBskyActorDefs, ToolsOzoneModerationDefs } from '@atproto/api'

export const avatarClassNames = (
  mediaFilters: GraphicMediaFilterPreference,
  additionalClassnames?: string,
) => {
  return classNames(
    additionalClassnames,
    mediaFilters.blur ? 'blur-sm hover:blur-none' : '',
    mediaFilters.grayscale ? 'grayscale' : '',
    mediaFilters.translucent ? 'opacity-50 ' : '',
  )
}

export const ProfileAvatar = ({
  profile,
  repo,
  className,
  ...rest
}: {
  profile?:
    | AppBskyActorDefs.ProfileView
    | AppBskyActorDefs.ProfileViewBasic
    | AppBskyActorDefs.ProfileViewDetailed
  repo?:
    | ToolsOzoneModerationDefs.RepoView
    | ToolsOzoneModerationDefs.RepoViewDetail
} & ComponentProps<'img'>) => {
  const avatarUrl = profile?.avatar
  const alt = `Avatar of ${profile?.displayName || profile?.handle || 'user'}`
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const { getMediaFiltersForLabels } = useGraphicMediaPreferences()
  const allLabels = getProfileAndRepoLabels({ profile, repo })
  const mediaFilters = getMediaFiltersForLabels(allLabels)

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
    }
  }

  const image = (
    <img
      alt={alt}
      className={avatarClassNames(mediaFilters, className)}
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
