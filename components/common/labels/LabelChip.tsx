import { ComponentProps } from 'react'
import { ComAtprotoLabelDefs } from '@atproto/api'
import { classNames, getReadableTextColor } from '@/lib/util'
import { LabelGroupsSetting, useLabelGroups } from '@/config/useLabelGroups'

interface LabelColorConfig {
  backgroundColor?: string
  textColor: string
  hasGroupColor: boolean
}

export const getLabelColorConfig = (
  labelValue: string,
  isSelfLabeled = false,
  labelDefFromService?: ComAtprotoLabelDefs.LabelValueDefinition,
  labelGroups?: LabelGroupsSetting | null,
): LabelColorConfig => {
  // Group color has the highest priority
  if (labelGroups) {
    const labelGroup = Object.values(labelGroups).find((group) =>
      group.labels.includes(labelValue),
    )
    const groupColor = labelGroup?.color

    if (groupColor) {
      return {
        backgroundColor: groupColor,
        textColor: getReadableTextColor(groupColor),
        hasGroupColor: true,
      }
    }
  }

  // Then use self-labeling logic
  if (isSelfLabeled) {
    return {
      textColor: 'text-green-700',
      hasGroupColor: false,
    }
  }

  if (labelDefFromService) {
    if (labelDefFromService.severity === 'alert') {
      return {
        textColor: 'text-red-700',
        hasGroupColor: false,
      }
    } else if (labelDefFromService.blurs === 'content') {
      return {
        textColor: 'text-indigo-700',
        hasGroupColor: false,
      }
    } else if (labelDefFromService.blurs === 'media') {
      return {
        textColor: 'text-yellow-700',
        hasGroupColor: false,
      }
    }
  }

  // Default
  return {
    textColor: 'text-gray-600',
    hasGroupColor: false,
  }
}

export const getGroupInfo = (
  labelValue: string,
  labelGroups?: LabelGroupsSetting | null,
) => {
  if (!labelGroups) return null

  const labelGroup = Object.entries(labelGroups).find(([_, group]) =>
    group.labels.includes(labelValue),
  )

  if (!labelGroup) return null

  const [name, group] = labelGroup
  return { name, ...group }
}

export const getLabelWrapperClasses = (
  isSelfLabeled = false,
  labelDefFromService?: ComAtprotoLabelDefs.LabelValueDefinition,
  hasGroupColor = false,
): string => {
  if (hasGroupColor) {
    return '' // No wrapper classes when using group colors (inline style instead)
  }

  const classes: string[] = []

  if (isSelfLabeled) {
    classes.push('bg-green-200 text-green-700')
  } else if (labelDefFromService) {
    if (labelDefFromService.severity === 'alert') {
      classes.push('bg-red-200 text-red-700')
    } else if (labelDefFromService.blurs === 'content') {
      classes.push('bg-indigo-200 text-indigo-700')
    } else if (labelDefFromService.blurs === 'media') {
      classes.push('bg-yellow-200 text-yellow-700')
    }
  }

  return classNames(...classes)
}

export interface LabelChipProps extends ComponentProps<'span'> {
  labelValue: string
  isSelfLabeled?: boolean
  labelDefFromService?: ComAtprotoLabelDefs.LabelValueDefinition
  labelGroups?: Record<string, any> | null
  isSelected?: boolean
  interactive?: boolean
}

export const LabelChip = ({
  labelValue,
  isSelfLabeled = false,
  labelDefFromService,
  labelGroups = null,
  isSelected = false,
  interactive = false,
  className = '',
  children,
  ...props
}: LabelChipProps) => {
  const colorConfig = getLabelColorConfig(
    labelValue,
    isSelfLabeled,
    labelDefFromService,
    labelGroups || undefined,
  )

  const wrapperClasses = getLabelWrapperClasses(
    isSelfLabeled,
    labelDefFromService,
    colorConfig.hasGroupColor,
  )

  const baseClasses = interactive
    ? `mr-1 my-1 px-2 py-0.5 text-xs rounded-md inline-flex items-center border transition-opacity ${
        isSelected
          ? colorConfig.hasGroupColor
            ? `${colorConfig.textColor} border-gray-400 hover:opacity-80`
            : 'bg-indigo-600 border-indigo-500 text-white dark:bg-teal-600 dark:border-teal-500'
          : 'bg-white dark:bg-gray-600 dark:border-slate-500 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-500'
      }`
    : `inline-flex mx-1 items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 font-semibold ${wrapperClasses}`

  const style: Record<string, string | undefined> =
    colorConfig.hasGroupColor && (interactive ? isSelected : true)
      ? {
          backgroundColor: colorConfig.backgroundColor,
          borderColor: colorConfig.backgroundColor,
        }
      : {}

  if (interactive) {
    style.cursor = 'pointer'
  }

  return (
    <span
      className={classNames(baseClasses, className)}
      style={style}
      {...props}
    >
      {children || labelValue}
    </span>
  )
}

export const useLabelColorConfig = (labelValue: string) => {
  const labelGroups = useLabelGroups()
  const colorConfig = getLabelColorConfig(
    labelValue,
    false,
    undefined,
    labelGroups,
  )
  const groupInfo = getGroupInfo(labelValue, labelGroups)

  return {
    colorConfig,
    groupInfo,
    labelGroups,
  }
}
