import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import { FilterProvider, useFilter } from './FilterContext'
import type { WorkspaceListData } from './useWorkspaceListData'

vi.mock('./utils', () => ({ checkFilterMatchForWorkspaceItem: vi.fn() }))
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

type Checkbox = Pick<HTMLInputElement, 'value' | 'checked'>
let checkboxes: Checkbox[]
const queries = {
  querySelector: vi.fn((selector: string) => {
    const value = selector.match(/\[value="([^"]+)"\]$/)?.[1]
    return checkboxes.find((checkbox) => checkbox.value === value) ?? null
  }),
  querySelectorAll: vi.fn((_selector: string) => checkboxes),
}

const account = 'did:plc:example'
const record = `at://${account}/app.bsky.feed.post/example`
const partialData: WorkspaceListData = {
  [account]: { type: 'account', subject: account },
}
const detailCases = [
  ['unavailable', undefined],
  ['empty', {}],
  ['partial', partialData],
] as const

function captureFilter(listData?: WorkspaceListData) {
  let filter: ReturnType<typeof useFilter> | undefined
  function Capture() {
    filter = useFilter()
    return null
  }
  renderToStaticMarkup(
    <FilterProvider listData={listData}>
      <Capture />
    </FilterProvider>,
  )
  return filter!
}

beforeEach(() => {
  vi.clearAllMocks()
  checkboxes = [
    { value: account, checked: false },
    { value: record, checked: false },
    ...Array.from({ length: 399 }, (_, i) => ({
      value: i % 2 ? `did:plc:example${i}` : `${record}${i}`,
      checked: false,
    })),
  ]
  vi.stubGlobal('document', queries)
  vi.stubGlobal('React', React)
})

afterEach(() => vi.unstubAllGlobals())

describe('unfiltered workspace selection', () => {
  it.each(detailCases)(
    'selects every displayed account and record when details are %s',
    (_, listData) => {
      captureFilter(listData).selectAll()
      expect(checkboxes).toHaveLength(401)
      expect(checkboxes.every(({ checked }) => checked)).toBe(true)
    },
  )

  it.each(detailCases)(
    'clears every displayed account and record when details are %s',
    (_, listData) => {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = true
      })
      captureFilter(listData).unselectAll()
      expect(checkboxes.every(({ checked }) => !checked)).toBe(true)
    },
  )

  it('confines both controls to subject checkboxes in the workspace', () => {
    const filter = captureFilter(partialData)
    filter.selectAll()
    filter.unselectAll()
    expect(queries.querySelectorAll).toHaveBeenCalledTimes(2)
    for (const [selector] of queries.querySelectorAll.mock.calls) {
      expect(selector).toBe(
        '#mod-workspace input[type="checkbox"][name="workspaceItem"]',
      )
    }
    expect(queries.querySelector).not.toHaveBeenCalled()
  })

  it('leaves checkbox values intact and can repeatedly select and clear mixed selections', () => {
    checkboxes[0].checked = true
    const values = checkboxes.map(({ value }) => value)
    const filter = captureFilter({})
    filter.selectAll()
    expect(checkboxes.every(({ checked }) => checked)).toBe(true)
    filter.unselectAll()
    expect(checkboxes.every(({ checked }) => !checked)).toBe(true)
    filter.selectAll()
    expect(checkboxes.every(({ checked }) => checked)).toBe(true)
    expect(checkboxes.map(({ value }) => value)).toEqual(values)
  })

  it('only includes newly displayed subjects after another explicit Select All', () => {
    const filter = captureFilter({})
    filter.selectAll()
    const newCheckbox = { value: 'did:plc:later', checked: false }
    checkboxes.push(newCheckbox)
    expect(newCheckbox.checked).toBe(false)
    filter.selectAll()
    expect(newCheckbox.checked).toBe(true)
  })

  it('is harmless when no workspace subject checkboxes are displayed', () => {
    checkboxes = []
    const filter = captureFilter(partialData)
    expect(() => {
      filter.selectAll()
      filter.unselectAll()
    }).not.toThrow()
    expect(checkboxes).toEqual([])
  })

  it('keeps filtered operations from toggling all rows without matching details', () => {
    const filter = captureFilter(partialData)
    filter.toggleFilteredItems(true)
    expect(checkboxes.every(({ checked }) => !checked)).toBe(true)
    expect(toast.error).toHaveBeenCalledWith('No items match your filters')
    expect(queries.querySelectorAll).not.toHaveBeenCalled()
  })
})
