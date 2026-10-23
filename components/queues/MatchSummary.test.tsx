import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MatchSummary } from './MatchSummary'

describe('queue matching summaries', () => {
  it.each([
    ['com.atproto.moderation.defs#reasonSpam'],
    ['com.atproto.moderation.defs#reasonSpam', 'custom-reason'],
  ])(
    'combines selected reasons with all tag conditions: %j',
    (...reportTypes) => {
      const markup = renderToStaticMarkup(
        <MatchSummary
          subjectTypes={['account', 'record']}
          reportTypes={reportTypes}
          reporterTags={['team:alpha', 'team:beta']}
          accountTags={['needs-review']}
        />,
      )
      expect(markup).toContain('Spam')
      for (const reportType of reportTypes) {
        if (reportType === 'custom-reason') expect(markup).toContain(reportType)
      }
      expect(markup).toContain('All record collections.')
      expect(markup).toContain('Reporter account must have any of these tags:')
      expect(markup).toContain('team:alpha, team:beta')
      expect(markup).toContain(
        'Account being reported against must have any of these tags:',
      )
      expect(markup).toContain('needs-review')
      expect(markup).toContain('Both tag conditions must match.')
      expect(markup).toContain('All configured conditions must match.')
      expect(markup).toContain('Tool destinations take precedence.')
      expect(markup).toContain(
        'lowest matching queue ID wins, regardless of tags.',
      )
      expect(markup).not.toContain(
        'No reports will match this queue automatically.',
      )
    },
  )

  it.each([
    { subjectTypes: ['record'], reportTypes: [] },
    {
      subjectTypes: ['record'],
      reportTypes: [],
      accountTags: ['needs-review'],
    },
    { subjectTypes: [], reporterTags: ['team:alpha'] },
    {
      subjectTypes: [],
      reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
    },
  ])(
    'keeps queues explicit-only when subject or reason criteria are absent: %j',
    (criteria) => {
      const markup = renderToStaticMarkup(<MatchSummary {...criteria} />)
      expect(markup).toContain(
        'No reports will match this queue automatically.',
      )
      expect(markup).not.toContain('take precedence over tool destinations')
    },
  )

  it.each([
    { reporterTags: ['team:alpha'] },
    { accountTags: ['needs-review'] },
  ])(
    'keeps tag queues explicit-only without a reportTypes list: %j',
    (criteria) => {
      const markup = renderToStaticMarkup(
        <MatchSummary subjectTypes={['record']} {...criteria} />,
      )
      expect(markup).toContain('None selected.')
      expect(markup).toContain(
        'No reports will match this queue automatically.',
      )
      expect(markup).not.toContain('Tool destinations take precedence.')
    },
  )

  it('renders legacy defaults and the collection without inventing tag restrictions', () => {
    const markup = renderToStaticMarkup(
      <MatchSummary
        subjectTypes={['record']}
        collection="app.bsky.feed.post"
        reportTypes={['com.atproto.moderation.defs#reasonSpam']}
      />,
    )
    expect(markup).toContain('Spam')
    expect(markup).toContain('Record collection: app.bsky.feed.post')
    expect(markup).not.toContain('All report reasons')
    expect(markup).not.toContain('account must have')
    expect(markup).not.toContain(
      'No reports will match this queue automatically.',
    )
  })
})
