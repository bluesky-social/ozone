import { toast } from 'react-toastify'
import { addHours, isBefore } from 'date-fns'

import {
  getLocalStorageData,
  setLocalStorageData,
} from '@/lib/local-storage'

const SNOOZE_STORAGE_KEY = 'snoozed_subjects'
export type SnoozeLocalStorageRecord = Record<
  string,
  { duration: number; at: number }
>

export const getSnoozedSubjectList = (): SnoozeLocalStorageRecord =>
  getLocalStorageData<SnoozeLocalStorageRecord>(SNOOZE_STORAGE_KEY) || {}

// Fetches all snoozed subjects, finds and deletes subjects from snooze list is they are out of snooze period
export const reEvaluateSnoozeSubjectList = (): void => {
  const currentSnoozeList = getSnoozedSubjectList()
  if (!currentSnoozeList) return

  Object.keys(currentSnoozeList).forEach((snoozedSubject) => {
    const { at, duration } = currentSnoozeList[snoozedSubject]
    const isOutOfSnoozePeriod = isBefore(
      addHours(new Date(at), duration),
      new Date(),
    )

    if (isOutOfSnoozePeriod) {
      delete currentSnoozeList[snoozedSubject]
    }
  })

  setLocalStorageData(SNOOZE_STORAGE_KEY, currentSnoozeList)
}

// Given a subject, removes it from the snoozed subject list
export const removeSnoozedSubject = (subject: string): void => {
  const currentSnoozeList = getSnoozedSubjectList()
  if (!currentSnoozeList) return
  delete currentSnoozeList[subject]
  setLocalStorageData(SNOOZE_STORAGE_KEY, currentSnoozeList)
}

// Goes through the snoozed data and returns an array of subjects that should be snoozed
export const getSnoozedSubjects = (): string[] => {
  const currentSnoozeList = getSnoozedSubjectList()
  if (!currentSnoozeList) return []

  const snoozedSubjects: string[] = []

  Object.keys(currentSnoozeList).forEach((snoozedSubject) => {
    const { at, duration } = currentSnoozeList[snoozedSubject]
    const isWithinSnoozePeriod = isBefore(
      new Date(),
      addHours(new Date(at), duration),
    )

    if (isWithinSnoozePeriod) {
      snoozedSubjects.push(snoozedSubject)
    }
  })

  return snoozedSubjects
}

// Updates snooze duration of a subject if it was already snoozed
// Otherwise, snoozes the subject for the given duration
export const snoozeSubject = ({
  snoozeDuration,
  subject,
}: {
  snoozeDuration: number
  subject: string
}) => {
  const currentSnoozeList = getSnoozedSubjectList()
  const newSnooze = { duration: snoozeDuration, at: Date.now() }

  if (!currentSnoozeList) {
    setLocalStorageData(SNOOZE_STORAGE_KEY, { [subject]: newSnooze })
  } else {
    currentSnoozeList[subject] = newSnooze
    setLocalStorageData(SNOOZE_STORAGE_KEY, currentSnoozeList)
  }

  toast(`Subject snoozed for ${snoozeDuration} hours`)
}
