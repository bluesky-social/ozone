export const deepCopy = <T>(obj: T): T => {
  return structuredClone(obj)
}
