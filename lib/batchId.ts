import { v4 as uuidv4 } from 'uuid'

const BATCH_ID_KEY = 'ozone-workspace-batch-id'

export const generateBatchId = (): string => {
  // Generate a unique ID with timestamp to ensure uniqueness across users
  const timestamp = Date.now()
  const uuid = uuidv4()
  return `${timestamp}-${uuid}`
}

export const getBatchId = (): string => {
  let batchId = localStorage.getItem(BATCH_ID_KEY)
  if (!batchId) {
    batchId = generateBatchId()
    localStorage.setItem(BATCH_ID_KEY, batchId)
  }
  return batchId
}

export const regenerateBatchId = (): string => {
  const newBatchId = generateBatchId()
  localStorage.setItem(BATCH_ID_KEY, newBatchId)
  return newBatchId
}