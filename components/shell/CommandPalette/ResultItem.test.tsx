import { ActionImpl } from 'kbar'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CommandPaletteResultItem } from './ResultItem'

function createAction() {
  const store: Record<string, ActionImpl> = {}
  const accounts = ActionImpl.create(
    { id: 'accounts', name: 'Accounts' },
    { store },
  )
  store[accounts.id] = accounts
  const recent = ActionImpl.create(
    { id: 'recent', name: 'Recent', parent: accounts.id },
    { store },
  )
  store[recent.id] = recent
  return ActionImpl.create(
    {
      id: 'take-action',
      name: 'Take action on alice.test',
      subtitle: 'Open account in action panel',
      shortcut: ['a'],
      parent: recent.id,
    },
    { store },
  )
}

describe('command palette results', () => {
  it.each([undefined, 'accounts'])(
    'renders no row for a stale virtual item with root %s',
    (currentRootActionId) => {
      expect(
        renderToStaticMarkup(
          <CommandPaletteResultItem
            action={undefined}
            active={false}
            currentRootActionId={currentRootActionId}
          />,
        ),
      ).toBe('')
    },
  )

  it('renders a valid action with its ancestors, subtitle and shortcut', () => {
    const markup = renderToStaticMarkup(
      <CommandPaletteResultItem action={createAction()} active />,
    )
    for (const text of [
      'Accounts',
      'Recent',
      'Take action on alice.test',
      'Open account in action panel',
      '>a</kbd>',
    ]) {
      expect(markup).toContain(text)
    }
  })

  it('shows only ancestors below the current root action', () => {
    const markup = renderToStaticMarkup(
      <CommandPaletteResultItem
        action={createAction()}
        active={false}
        currentRootActionId="accounts"
      />,
    )
    expect(markup).not.toContain('Accounts')
    expect(markup).toContain('Recent')
    expect(markup).toContain('Take action on alice.test')
  })
})
