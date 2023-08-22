import { Select } from '@/common/forms'
import { ComponentProps } from 'react'

export const ActionDurations = {
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
}

export const ActionDurationSelector = (
  props: {} & ComponentProps<typeof Select>,
) => {
  return (
    <Select
      id="durationInHours"
      name="durationInHours"
      required
      {...props}
    >
      <option hidden selected value="">
        Suspension Period
      </option>
      {Object.entries(ActionDurations).map(([key, info]) => (
        <option key={key} value={key}>
          {info.text}
        </option>
      ))}
    </Select>
  )
}
