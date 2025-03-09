import React, { FormEvent } from 'react'
import { Card } from '@/common/Card'
import { FormLabel, Input } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { TrashIcon } from '@heroicons/react/24/outline'
import { LabelChip } from '@/common/labels'
import { MemberRoleNames } from 'components/team/helpers'
import { RepoFinder } from '@/repositories/Finder'
import { AppBskyActorDefs } from '@atproto/api'
import { ProtectedTagSetting } from './types'
import { getMembersList } from '@/team/useMemberList'

export const ProtectedTagEditor = ({
  editorData,
  assignedMods,
  handleRemoveKey,
  handleAddKey,
  handleUpdateField,
  canManageTags,
}: {
  editorData: ProtectedTagSetting
  assignedMods: Record<string, AppBskyActorDefs.ProfileViewDetailed>
  handleRemoveKey: (key: string) => void
  handleAddKey: (key: string) => void
  handleUpdateField: (
    key: string,
    field: 'moderators' | 'roles',
    value: string[],
  ) => void
  canManageTags: boolean
}) => {
  return (
    <div>
      <p className="mb-3 text-sm text-gray-900 dark:text-gray-200">
        Configure which tags are protected and when those tags are added to any
        subject, which specific user/role can take destructive actions (Takedown
        and Label) on those subjects.
        <br />
      </p>
      <form
        onSubmit={(
          ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
        ) => {
          ev.preventDefault()
          const formData = new FormData(ev.currentTarget)
          const tag = formData.get('tag') as string
          if (tag?.trim()) {
            handleAddKey(tag.trim())
            ev.currentTarget.reset()
          }
        }}
      >
        <div className="flex items-end gap-3">
          <FormLabel label="New Tag" htmlFor="tag" className="flex-1">
            <Input
              required
              type="text"
              id="tag"
              name="tag"
              className="block w-full"
              placeholder="vip, high-profile etc."
              disabled={!canManageTags}
            />
          </FormLabel>
          <ActionButton
            size="sm"
            type="submit"
            appearance="primary"
            className="px-2 sm:px-4 sm:mr-2 py-1.5"
            disabled={!canManageTags}
          >
            <span className="leading-6">Add Tag</span>
          </ActionButton>
        </div>
      </form>

      {/* List of Keys */}
      <div className="space-y-4">
        {Object.entries(editorData).map(([key, value]) => (
          <Card key={key} className="mt-3 pt-2">
            <div className="flex justify-between items-center">
              <LabelChip>{key}</LabelChip>
              <div className="flex gap-2 items-center">
                <span className="text-sm">Manager:</span>
                <ActionButton
                  size="xs"
                  disabled={!canManageTags}
                  appearance={value.moderators ? 'secondary' : 'outlined'}
                  onClick={() => handleUpdateField(key, 'moderators', [])}
                >
                  Moderators
                </ActionButton>
                <ActionButton
                  size="xs"
                  disabled={!canManageTags}
                  appearance={value.roles ? 'secondary' : 'outlined'}
                  onClick={() => handleUpdateField(key, 'roles', [])}
                >
                  Roles
                </ActionButton>
                <ActionButton
                  size="xs"
                  disabled={!canManageTags}
                  appearance="outlined"
                  onClick={() => canManageTags && handleRemoveKey(key)}
                >
                  <TrashIcon className="w-3 h-3" />
                </ActionButton>
              </div>
            </div>

            {/* List Inputs for Moderators or Roles */}
            {value.moderators && (
              <div className="mt-3">
                <h3 className="text-sm mb-2">
                  Select moderators who can manage this tag
                </h3>

                <RepoFinder
                  clearOnSelect
                  getProfiles={async (agent, q) => {
                    const { members } = await getMembersList(agent, {
                      q,
                      disabled: false,
                    })

                    return members.map((m) => ({
                      did: m.did,
                      avatar: m.profile?.avatar,
                      handle: m.profile?.handle || '',
                      displayName: m.profile?.displayName,
                    }))
                  }}
                  onChange={(did) => {
                    if (canManageTags) {
                      handleUpdateField(key, 'moderators', [
                        ...(value.moderators || []),
                        did,
                      ])
                    }
                  }}
                  inputProps={{
                    required: true,
                    className: 'block w-full',
                    id: 'did',
                    name: 'did',
                    autoFocus: true,
                  }}
                />

                {value.moderators.map((mod, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-center justify-between mt-2 border-t border-gray-300 dark:border-gray-700"
                  >
                    <ModeratorItem did={mod} profile={assignedMods[mod]} />
                    <ActionButton
                      appearance="outlined"
                      disabled={!canManageTags}
                      size="xs"
                      onClick={() => {
                        if (!value.moderators || !canManageTags) return
                        handleUpdateField(
                          key,
                          'moderators',
                          value.moderators.filter((_, i) => i !== index),
                        )
                      }}
                    >
                      <TrashIcon className="w-3 h-3" />
                    </ActionButton>
                  </div>
                ))}
              </div>
            )}

            {value.roles && (
              <div className="mt-3">
                <h3 className="text-sm mb-2">
                  Select manager roles for this tag
                </h3>
                {Object.entries(MemberRoleNames).map(([role, name]) => {
                  const isSelected = value.roles?.includes(role)
                  return (
                    <ActionButton
                      size="sm"
                      key={role}
                      disabled={!canManageTags}
                      onClick={(e) => {
                        e.preventDefault()
                        if (!canManageTags) return
                        handleUpdateField(
                          key,
                          'roles',
                          isSelected
                            ? value.roles?.filter((r) => r !== role) || []
                            : [...(value.roles || []), role],
                        )
                      }}
                      appearance={isSelected ? 'secondary' : 'outlined'}
                      className="mr-2"
                    >
                      {name}
                    </ActionButton>
                  )
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

const ModeratorItem = ({
  did,
  profile,
}: {
  did: string
  profile: AppBskyActorDefs.ProfileViewDetailed | undefined
}) => {
  if (!profile) {
    return <span className="flex-grow">{did}</span>
  }

  return (
    <div className={`p-2 flex items-center space-x-3`}>
      <img
        alt={profile?.displayName || profile?.handle}
        className="h-7 w-7 rounded-full"
        src={profile?.avatar || '/img/default-avatar.jpg'}
      />
      <div>
        <div className="font-semibold text-sm">@{profile?.handle}</div>
        <div className="text-sm">
          {profile?.displayName || 'No display name'}
        </div>
      </div>
    </div>
  )
}
