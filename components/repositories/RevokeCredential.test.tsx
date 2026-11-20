import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import { ActionButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { RevokeCredentialsForm } from './RevokeCredential'

vi.mock('components/communication-template/action-template', () => ({}))
vi.mock('components/communication-template/hooks', () => ({}))
vi.mock('@/shell/ConfigurationContext', () => ({}))
vi.mock('@/mod-event/helpers/emitEvent', () => ({}))
vi.mock('@/lib/batchId', () => ({
  getBatchId: () => 'test-batch',
  regenerateBatchId: () => 'next-batch',
  setBatchId: vi.fn(),
}))
vi.mock('react-toastify', () => ({ toast: { warning: vi.fn() } }))

type Props = ComponentProps<typeof RevokeCredentialsForm>
const alice = { did: 'did:plc:alice', handle: 'alice.test' }
const bob = { did: 'did:plc:bob', handle: 'bob.test' }

function findProps<T>(node: ReactNode, type: unknown): T | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue
    if (child.type === type) return child.props as T
    const nested = findProps<T>(child.props.children, type)
    if (nested) return nested
  }
}

function exercise(
  props: Partial<Props>,
  interact: (
    controls: {
      request: ComponentProps<typeof ActionButton>
      confirmation: ComponentProps<typeof ConfirmationModal>
    },
    render: number,
  ) => void,
) {
  const revokeCredentials = vi.fn()
  let render = 0
  function Harness() {
    const view = RevokeCredentialsForm({
      accounts: [alice],
      revokeCredentials,
      isLoading: false,
      error: null,
      ...props,
    })
    const reason = findProps<ComponentProps<typeof Input>>(view, Input)!
    if (!reason.value) {
      reason.onChange?.({ target: { value: 'Account recovery' } } as never)
      return null
    }
    interact(
      {
        request: findProps(view, ActionButton)!,
        confirmation: findProps(view, ConfirmationModal)!,
      },
      render++,
    )
    return null
  }
  renderToStaticMarkup(<Harness />)
  return revokeCredentials
}

beforeEach(() => vi.clearAllMocks())

describe('credential revocation selection', () => {
  it('reads the latest selection when requested and revokes the confirmed snapshot', () => {
    let selected = [alice]
    const accounts = vi.fn(() => selected)
    const revoke = exercise({ accounts }, ({ request, confirmation }, render) => {
      if (render === 0) {
        expect(accounts).not.toHaveBeenCalled()
        selected = [bob]
        request.onClick?.({} as never)
      } else {
        expect(confirmation.isOpen).toBe(true)
        expect(renderToStaticMarkup(confirmation.description)).toContain(
          '@bob.test',
        )
        selected = [alice, bob]
        confirmation.onConfirm()
      }
    })
    expect(accounts).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith(
      expect.objectContaining({ accounts: [bob], batchId: 'test-batch' }),
      expect.any(Object),
    )
  })

  it.each([[], () => []])('rejects an empty selection: %s', (accounts) => {
    const revoke = exercise({ accounts }, ({ request, confirmation }) => {
      request.onClick?.({} as never)
      expect(confirmation.isOpen).toBe(false)
      expect(confirmation.confirmButtonDisabled).toBe(true)
      confirmation.onConfirm()
    })
    expect(toast.warning).toHaveBeenCalledWith(
      'Please select at least one account to revoke credentials.',
    )
    expect(revoke).not.toHaveBeenCalled()
  })

  it.each([
    { accounts: [alice], description: '@alice.test', batchId: undefined },
    { accounts: [alice, bob], description: '2 accounts', batchId: 'test-batch' },
  ])(
    'preserves direct account actions: $description',
    ({ accounts, description, batchId }) => {
      const revoke = exercise(
        { accounts },
        ({ request, confirmation }, render) => {
          if (render === 0) {
            request.onClick?.({} as never)
          } else {
            expect(renderToStaticMarkup(confirmation.description)).toContain(
              description,
            )
            confirmation.onConfirm()
          }
        },
      )
      expect(revoke).toHaveBeenCalledWith(
        expect.objectContaining({ accounts, batchId }),
        expect.any(Object),
      )
    },
  )
})
