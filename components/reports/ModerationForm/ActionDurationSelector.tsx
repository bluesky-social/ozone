import { Select } from '@/common/forms'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ComponentProps } from 'react'

export const TakedownActionDurations = {
  0: {
    text: 'Permanent',
  },
  24: {
    text: '1 Day',
  },
  72: {
    text: '3 Days',
  },
  168: {
    text: '7 Days',
  },
  720: {
    text: '30 Days',
  },
  2160: {
    text: '90 Days',
  },
}

export const MuteActionDurations = {
  6: {
    text: '6 Hrs',
  },
  12: {
    text: '12 Hrs',
  },
  24: {
    text: '1 Day',
  },
  48: {
    text: '2 Days',
  },
}

export const ActionDurationSelector = (
  props: { labelText?: string; action?: string } & ComponentProps<
    typeof Select
  >,
) => {
  const { labelText, action, ...rest } = props
  return (
    <Select id="durationInHours" name="durationInHours" required {...rest}>
      <option hidden selected value="">
        {labelText || 'Suspension Period'}
      </option>
      {Object.entries(
        action === MOD_EVENTS.MUTE
          ? MuteActionDurations
          : TakedownActionDurations,
      ).map(([key, info]) => (
        <option key={key} value={key}>
          {info.text}
        </option>
      ))}
    </Select>
  )
}
