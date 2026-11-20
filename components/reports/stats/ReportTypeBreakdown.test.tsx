import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReportTypeBreakdown } from './ReportTypeBreakdown'
import type { ComponentProps } from 'react'

const spam = 'com.atproto.moderation.defs#reasonSpam'
const zeroAlpha = 'example.report.defs#zeroAlpha'
const zeroBeta = 'example.report.defs#zeroBeta'
const response = {
  computedAt: '2026-11-11T12:00:00.000Z',
  startDate: '2026-11-09T00:00:00.000Z',
  endDate: '2026-11-11T00:00:00.000Z',
  reportTypeBreakdown: {
    totalCount: 1250,
    stats: [
      { reportType: spam, inboundCount: 1000 },
      { reportType: 'example.report.defs#custom', inboundCount: 250 },
    ],
  },
}
const render = (
  props: Partial<ComponentProps<typeof ReportTypeBreakdown>> = {},
) =>
  renderToStaticMarkup(
    <ReportTypeBreakdown
      isLoading={false}
      isError={false}
      onRetry={() => {}}
      {...props}
    />,
  )

function tableRows(markup: string) {
  const body = markup.split('<tbody')[1] ?? ''
  return [...body.matchAll(/<tr>(.*?)<\/tr>/g)].map(([, row]) => ({
    reportType: row.match(/title="([^"]+)"/)?.[1],
    cells: [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map(([, cell]) => cell),
  }))
}

describe('inbound report type table', () => {
  it('shows counts, shares, legacy labels, and custom report reasons', () => {
    const markup = render({ data: response })
    expect(markup).toContain('Inbound by report type')
    expect(markup).toContain('1,000')
    expect(markup).toContain('80.0%')
    expect(markup).toContain('20.0%')
    expect(markup).toContain('(legacy)')
    expect(markup).toContain('example.report.defs#custom')
    expect(markup).toContain('1,250 reports')
  })

  it('merges configured and observed types, deduplicates, and sorts by count then identifier', () => {
    const markup = render({
      data: response,
      reportTypes: [zeroBeta, spam, zeroAlpha, zeroBeta],
    })
    expect(tableRows(markup)).toEqual([
      { reportType: spam, cells: ['1,000', '80.0%'] },
      { reportType: 'example.report.defs#custom', cells: ['250', '20.0%'] },
      { reportType: zeroAlpha, cells: ['0', '0.0%'] },
      { reportType: zeroBeta, cells: ['0', '0.0%'] },
    ])
    expect(markup).toContain('1,250 reports')
  })

  it('shows configured zero-count types for an empty response without inventing percentages', () => {
    const markup = render({
      data: {
        ...response,
        reportTypeBreakdown: { totalCount: 0, stats: [] },
      },
      reportTypes: [zeroBeta, zeroAlpha],
    })
    expect(tableRows(markup)).toEqual([
      { reportType: zeroAlpha, cells: ['0', '—'] },
      { reportType: zeroBeta, cells: ['0', '—'] },
    ])
    expect(markup).toContain('0 reports')
    expect(markup).not.toContain('No inbound reports')
  })

  it.each([
    { isLoading: true, isError: false },
    { isLoading: false, isError: true },
  ])(
    'hides counts and configured zero rows while unavailable: %j',
    (status) => {
      const markup = render({
        ...status,
        data: response,
        reportTypes: [zeroAlpha],
      })
      expect(tableRows(markup)).toEqual([])
      expect(markup).not.toContain(zeroAlpha)
      expect(markup).not.toContain('1,250 reports')
    },
  )

  it('distinguishes loading, errors, and an empty result without showing stale counts', () => {
    expect(render({ isLoading: true })).toContain('Loading report types')
    expect(
      render({
        data: {
          ...response,
          reportTypeBreakdown: { stats: [], totalCount: 0 },
        },
      }),
    ).toContain('No inbound reports')
    const failed = render({ data: response, isError: true })
    expect(failed).toContain('Failed to load report types')
    expect(failed).toContain('Retry')
    expect(failed).not.toContain('1,000')
    expect(failed).not.toContain('1,250 reports')
  })
})
