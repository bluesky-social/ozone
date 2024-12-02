export type ProtectedTagConfig = {
  moderators?: string[]
  roles?: string[]
}

export type ProtectedTagSetting = Record<string, ProtectedTagConfig>
