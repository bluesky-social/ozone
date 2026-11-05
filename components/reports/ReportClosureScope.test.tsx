import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ReportClosureScopeSelector } from './ReportClosureScope'

function renderScope(
  subject: { type: string; subject: string },
  scope: 'current' | 'allOwned' | 'types' = 'current',
) {
  return renderToStaticMarkup(
    <ReportClosureScopeSelector
      subject={subject}
      scope={scope}
      onScopeChange={vi.fn()}
      reportTypes={[]}
      onReportTypesChange={vi.fn()}
    />,
  )
}

describe('report closure scope', () => {
  it('offers account-wide closure only on account reports', () => {
    expect(
      renderScope({ type: 'account', subject: 'did:plc:account' }),
    ).toContain('value="allOwned"')
    expect(
      renderScope({
        type: 'record',
        subject: 'at://did:plc:account/app.bsky.feed.post/1',
      }),
    ).not.toContain('value="allOwned"')
    expect(
      renderScope({
        type: 'message',
        subject: 'at://did:plc:account/chat.bsky.convo.message/1',
      }),
    ).not.toContain('value="allOwned"')
  })

  it('explains active-review and appeal limitations for account-wide closure', () => {
    const markup = renderScope(
      { type: 'account', subject: 'did:plc:account' },
      'allOwned',
    )
    expect(markup).toContain('Other reports under active review remain open')
    expect(markup).toContain('subjects may still show an unresolved appeal')
  })

  it('keeps the type selector available for the existing type scope', () => {
    const markup = renderScope(
      { type: 'account', subject: 'did:plc:account' },
      'types',
    )
    expect(markup).toContain('Select report types')
    expect(markup).not.toContain('Other reports under active review')
  })
})
