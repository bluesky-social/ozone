import type { ChangeEvent, ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AppBskyLabelerService,
  ComAtprotoModerationDefs,
  ToolsOzoneReportDefs,
} from '@atproto/api'
import { reasonTypeOptions } from '@/reports/helpers/getType'
import { ReportTypesEditor } from './ReportTypesEditor'
import { LabelerRecordView } from './RecordView'

const checkboxes = vi.hoisted(() => new Map<string, ComponentProps<'input'>>())
vi.mock('@/common/forms', () => ({
  Checkbox: ({
    label,
    ...props
  }: ComponentProps<'input'> & { label: string }) => {
    checkboxes.set(props.name!, props)
    return (
      <label>
        <input type="checkbox" {...props} />
        {label}
      </label>
    )
  },
}))

const spam = ToolsOzoneReportDefs.REASONMISLEADINGSPAM
const custom = 'example.report.defs#customReason'

function render(value?: string[]) {
  const onChange = vi.fn()
  const markup = renderToStaticMarkup(
    <ReportTypesEditor value={value} onChange={onChange} />,
  )
  return { markup, onChange }
}

function toggle(name: string, checked: boolean) {
  const input = checkboxes.get(name)!
  expect(input).toBeDefined()
  input.onChange!({ target: { checked } } as ChangeEvent<HTMLInputElement>)
}

beforeEach(() => checkboxes.clear())

describe('labeler report types', () => {
  it.each([
    { name: 'empty', reasonTypes: [] },
    {
      name: 'legacy-only',
      reasonTypes: [
        ComAtprotoModerationDefs.REASONSPAM,
        ComAtprotoModerationDefs.REASONOTHER,
      ],
    },
    { name: 'modern-only', reasonTypes: [spam] },
    {
      name: 'mixed and custom',
      reasonTypes: [ComAtprotoModerationDefs.REASONSPAM, spam, custom],
    },
  ])(
    'does not expand an existing $name reasonTypes list',
    ({ reasonTypes }) => {
      const savedTypes = [...reasonTypes]
      Object.freeze(reasonTypes)
      const record: AppBskyLabelerService.Record = {
        $type: 'app.bsky.labeler.service',
        createdAt: '2026-01-01T00:00:00.000Z',
        policies: { labelValues: [] },
        subjectTypes: ['account'],
        reasonTypes,
      }
      const onUpdate = vi.fn()

      renderToStaticMarkup(
        <LabelerRecordView record={record} onUpdate={onUpdate} />,
      )

      const selectedTypes = [...checkboxes.values()]
        .filter(
          (input) => input.name?.startsWith('reasonType-') && input.checked,
        )
        .map((input) => input.value)
      expect(selectedTypes.sort()).toEqual([...savedTypes].sort())
      expect(checkboxes.get('all-reason-types')!.checked).toBe(false)
      expect(record.reasonTypes).toEqual(savedTypes)
      expect(onUpdate).not.toHaveBeenCalled()

      if (savedTypes.length) {
        toggle(`reasonType-${savedTypes[0]}`, false)
        expect(onUpdate).toHaveBeenCalledTimes(1)
        expect(onUpdate).toHaveBeenCalledWith({
          ...record,
          reasonTypes: savedTypes.slice(1),
        })
        expect(record.reasonTypes).toEqual(savedTypes)
      }
    },
  )

  it('offers every API reason and additional shared types, including civic reasons', () => {
    render([])
    const apiReasons = Object.values(ToolsOzoneReportDefs).flatMap((value) =>
      typeof value === 'string' && value.includes('#reason') ? [value] : [],
    )
    expect(apiReasons.length).toBeGreaterThan(0)
    for (const type of [...apiReasons, ...Object.keys(reasonTypeOptions)]) {
      expect(checkboxes.has(`reasonType-${type}`)).toBe(true)
    }
    expect(
      checkboxes.has(`reasonType-${ComAtprotoModerationDefs.REASONVIOLATION}`),
    ).toBe(true)
  })

  it('distinguishes unrestricted acceptance from an empty list', () => {
    render()
    expect(checkboxes.get('all-reason-types')!.checked).toBe(true)
    expect(checkboxes.get(`reasonType-${spam}`)!.checked).toBe(true)

    const { markup } = render([])
    expect(checkboxes.get('all-reason-types')!.checked).toBe(false)
    expect(checkboxes.get(`reasonType-${spam}`)!.checked).toBe(false)
    expect(markup).toContain('This labeler accepts no report types.')
  })

  it('keeps an empty list when the final type is deselected', () => {
    const { onChange } = render([spam])
    toggle(`reasonType-${spam}`, false)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('retains modern types when narrowing an unrestricted record', () => {
    const { onChange } = render()
    toggle(`reasonType-${ComAtprotoModerationDefs.REASONSPAM}`, false)
    const selected = onChange.mock.calls[0][0] as string[]
    expect(selected).toContain(spam)
    expect(selected).toContain(ToolsOzoneReportDefs.REASONCHILDSAFETYCSAM)
    expect(selected).not.toContain(ComAtprotoModerationDefs.REASONSPAM)
  })

  it('displays custom types and preserves them when another reason changes', () => {
    const { markup, onChange } = render([custom])
    expect(markup).toContain(custom)
    expect(checkboxes.get(`reasonType-${custom}`)!.checked).toBe(true)
    toggle(`reasonType-${spam}`, true)
    expect(onChange).toHaveBeenCalledWith([custom, spam])
  })

  it('allows configured custom types to be removed', () => {
    const { onChange } = render([custom, spam])
    toggle(`reasonType-${custom}`, false)
    expect(onChange).toHaveBeenCalledWith([spam])
  })

  it('only restores unrestricted acceptance through the explicit control', () => {
    const { onChange } = render([])
    toggle('all-reason-types', true)
    expect(onChange).toHaveBeenCalledWith(undefined)

    const restricted = render()
    toggle('all-reason-types', false)
    expect(restricted.onChange).toHaveBeenCalledWith(
      Object.keys(reasonTypeOptions),
    )
  })

  it('updates the checked state when the parent supplies a different list', () => {
    render([spam])
    expect(checkboxes.get(`reasonType-${spam}`)!.checked).toBe(true)
    render([])
    expect(checkboxes.get(`reasonType-${spam}`)!.checked).toBe(false)
  })
})
