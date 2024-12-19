import { ActionButton, LinkButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { PolicyEditor } from '@/setting/policy/Editor'
import { PolicyList } from '@/setting/policy/List'
import { usePolicyListSetting } from '@/setting/policy/usePolicyList'
import { createPolicyPageLink } from '@/setting/policy/utils'
import { useServerConfig } from '@/shell/ConfigurationContext'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'

export function PoliciesConfig() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search')
  const { role } = useServerConfig()
  const canManagePolicies = role === ToolsOzoneTeamDefs.ROLEADMIN
  const showPoliciesCreateForm = searchParams.has('create')

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        {typeof searchQuery === 'string' ? (
          <>
            <Input
              type="text"
              autoFocus
              className="w-3/4"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => {
                const url = createPolicyPageLink({ search: e.target.value })
                router.push(url)
              }}
            />{' '}
            <LinkButton
              size="sm"
              className="ml-1"
              appearance="outlined"
              href={createPolicyPageLink({})}
            >
              Cancel
            </LinkButton>
          </>
        ) : (
          <>
            <div className="flex flex-row items-center">
              <h4 className="font-medium text-gray-700 dark:text-gray-100">
                Manage Policies
              </h4>
            </div>
            {!showPoliciesCreateForm && (
              <div className="flex flex-row items-center">
                {canManagePolicies && (
                  <LinkButton
                    size="sm"
                    appearance="primary"
                    href={createPolicyPageLink({ create: 'true' })}
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    <span className="text-xs">Add New Policy</span>
                  </LinkButton>
                )}

                <LinkButton
                  size="sm"
                  className="ml-1"
                  appearance="outlined"
                  href={createPolicyPageLink({ search: '' })}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </LinkButton>
              </div>
            )}
          </>
        )}
      </div>
      {showPoliciesCreateForm && (
        <div className="mb-4">
          <PolicyEditor
            onCancel={() => {
              const url = createPolicyPageLink({})
              router.push(url)
            }}
            onSuccess={() => {
              const url = createPolicyPageLink({})
              router.push(url)
            }}
          />
        </div>
      )}

      <PolicyList
        {...{
          searchQuery,
          canEdit: canManagePolicies,
        }}
      />
    </div>
  )
}
