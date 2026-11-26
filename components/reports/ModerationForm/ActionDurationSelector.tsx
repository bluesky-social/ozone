import { Select } from '@/common/forms'
import { STRIKE_TO_SUSPENSION_DURATION_IN_HOURS } from '@/lib/constants'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ComponentProps } from 'react'

export const TakedownActionDurations = {
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

const strikeSuspensionDurations = Object.fromEntries(
  Object.values(STRIKE_TO_SUSPENSION_DURATION_IN_HOURS)
    .filter((hours) => Number.isFinite(hours) && hours > 0)
    .map((hours) => [
      hours,
      { text: hours % 24 === 0 ? `${hours / 24} Days` : `${hours} Hrs` },
    ]),
)

export const ActionDurationSelector = (
  props: {
    labelText?: string
    action?: string
    // only valid for takedown durations
    showPermanent?: boolean
    includeStrikeSuspensionDurations?: boolean
  } & ComponentProps<typeof Select>,
) => {
  const {
    labelText,
    action,
    showPermanent,
    includeStrikeSuspensionDurations,
    defaultValue = '',
    ...rest
  } = props

  let options: Record<number, { text: string }> = {}
  if (action === MOD_EVENTS.MUTE) {
    options = MuteActionDurations
  } else if (showPermanent) {
    options = { 0: { text: 'Permanent' }, ...TakedownActionDurations }
  } else {
    options = TakedownActionDurations
  }
  if (includeStrikeSuspensionDurations) {
    options = { ...strikeSuspensionDurations, ...options }
  }

  return (
    <Select
      id="durationInHours"
      name="durationInHours"
      required
      defaultValue={rest.value === undefined ? defaultValue : undefined}
      {...rest}
    >
      <option hidden value="">
        {labelText || 'Suspension Period'}
      </option>
      {Object.entries(options).map(([key, info]) => (
        <option key={key} value={key}>
          {info.text}
        </option>
      ))}
    </Select>
  )
}
