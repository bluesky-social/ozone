// TODO : replace this with useLocalStorage from 'react-use'

const getItem = (key: string) => localStorage.getItem(key)
const setItem = (key: string, value: string) => localStorage.setItem(key, value)

export const getLocalStorageData = <T>(key: string): T | undefined => {
  const data = getItem(key)
  if (!data) return undefined
  try {
    return JSON.parse(data)
  } catch (err) {
    return data as T
  }
}

export const setLocalStorageData = <T>(key: string, data: T) => {
  if (!data) {
    localStorage.removeItem(key)
    return
  }

  if (typeof data === 'string') {
    setItem(key, data)
    return
  }

  setItem(key, JSON.stringify(data))
}
