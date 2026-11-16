import { useState } from 'react'
import { ButtonGroup } from '@/common/buttons'
import { ActionDurationSelector } from './ActionDurationSelector'
import { Checkbox, FormLabel, Select } from '@/common/forms'
import { ComponentProps } from 'react'

type TakedownOption = 'permanent' | 'suspension' | 'scheduled'

const ScheduledDurations = {
  24: {
    text: '1 day from now',
  },
  72: {
    text: '3 days from now',
  },
  120: {
    text: '5 days from now',
  },
  168: {
    text: '7 days from now',
  },
  336: {
    text: '14 days from now',
  },
  720: {
    text: '30 days from now',
  },
}

export const TakedownScheduleSelector = (
  props: {
    form?: string
    onScheduledChange?: (scheduled: boolean) => void
  } & ComponentProps<'div'>,
) => {
  const { form, onScheduledChange, ...rest } = props
  const [selectedOption, setSelectedOption] =
    useState<TakedownOption>('permanent')
  const selectOption = (option: TakedownOption) => {
    setSelectedOption(option)
    onScheduledChange?.(option === 'scheduled')
  }

  const buttonGroupItems = [
    {
      id: 'permanent',
      text: 'Permanent',
      isActive: selectedOption === 'permanent',
      onClick: () => selectOption('permanent'),
    },
    {
      id: 'suspension',
      text: 'Suspension',
      isActive: selectedOption === 'suspension',
      onClick: () => selectOption('suspension'),
    },
    {
      id: 'scheduled',
      text: 'Scheduled',
      isActive: selectedOption === 'scheduled',
      onClick: () => selectOption('scheduled'),
    },
  ]

  return (
    <div {...rest}>
      <ButtonGroup
        items={buttonGroupItems}
        appearance="outlined"
        size="xs"
        leftAligned
      />

      {/* since we use browser's form api, use hidden input to store the selected takedown type */}
      <input
        type="hidden"
        name="takedownType"
        value={selectedOption}
        form={form}
      />

      {selectedOption === 'suspension' && (
        <FormLabel label="" htmlFor="durationInHours" className={`mt-1`}>
          <ActionDurationSelector form={form} required defaultValue={24} />
        </FormLabel>
      )}

      {selectedOption === 'scheduled' && (
        <div className="mt-2">
          <Select
            id="scheduledDurationInHours"
            name="scheduledDurationInHours"
            required
            defaultValue=""
            form={form}
          >
            {Object.entries(ScheduledDurations).map(([hours, info], i) => (
              <option selected={i === 0} key={hours} value={hours}>
                {info.text}
              </option>
            ))}
          </Select>
          <Checkbox
            value="true"
            defaultChecked
            form={form}
            id="randomizeExecutionTime"
            name="randomizeExecutionTime"
            className="flex items-center leading-3 mt-2"
            label={'Randomize execution time by +8 hours'}
          />
        </div>
      )}
    </div>
  )
}
