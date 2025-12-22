import { LinkButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { SeverityLevelEditor } from '@/setting/severity-level/Editor'
import { SeverityLevelList } from '@/setting/severity-level/List'
import { createSeverityLevelPageLink } from '@/setting/severity-level/utils'
import { useServerConfig } from '@/shell/ConfigurationContext'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createPolicyPageLink } from '@/setting/policy/utils'
import { StrikeSuspensionConfig } from '@/setting/severity-level/StrikeSuspensionConfig'

export function SeverityLevelsConfig() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search')
  const showCreateForm = searchParams.has('create')
  const { role } = useServerConfig()
  const canManageSeverityLevels = role === ToolsOzoneTeamDefs.ROLEADMIN

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        {typeof searchQuery === 'string' ? (
          <>
            <Input
              type="text"
              autoFocus
              className="w-3/4"
              placeholder="Search severity levels..."
              value={searchQuery}
              onChange={(e) => {
                const url = createSeverityLevelPageLink({
                  search: e.target.value,
                })
                router.push(url)
              }}
            />{' '}
            <LinkButton
              size="sm"
              className="ml-1"
              appearance="outlined"
              href={createSeverityLevelPageLink({})}
            >
              Cancel
            </LinkButton>
          </>
        ) : (
          <>
            <div className="flex flex-row items-center">
              <Link href={createPolicyPageLink({})}>
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
              </Link>
              <h4 className="font-medium text-gray-700 dark:text-gray-100">
                Manage Severity Levels
              </h4>
            </div>
            {!showCreateForm && (
              <div className="flex flex-row items-center">
                {canManageSeverityLevels && (
                  <LinkButton
                    size="sm"
                    appearance="primary"
                    href={createSeverityLevelPageLink({ create: 'true' })}
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    <span className="text-xs">Add New Severity Level</span>
                  </LinkButton>
                )}

                <LinkButton
                  size="sm"
                  className="ml-1"
                  appearance="outlined"
                  href={createSeverityLevelPageLink({ search: '' })}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </LinkButton>
              </div>
            )}
          </>
        )}
      </div>
      {showCreateForm && (
        <div className="mb-4">
          <SeverityLevelEditor
            onCancel={() => {
              const url = createSeverityLevelPageLink({})
              router.push(url)
            }}
            onSuccess={() => {
              const url = createSeverityLevelPageLink({})
              router.push(url)
            }}
          />
        </div>
      )}

      <SeverityLevelList
        {...{
          searchQuery,
          canEdit: canManageSeverityLevels,
        }}
      />

      <StrikeSuspensionConfig />
    </div>
  )
}
