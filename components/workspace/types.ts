export type WorkspaceFilterItem =
  | {
      field: 'followerCount'
      operator: 'gte' | 'lte'
      value: number
    }
  | {
      field: 'followCount'
      operator: 'gte' | 'lte'
      value: number
    }
  | {
      field: 'accountAge'
      operator: 'gte' | 'lte'
      unit: 'days' | 'weeks' | 'months' | 'years'
      value: number
    }
  | {
      field: 'accountDeactivated'
      operator: 'eq' | 'neq'
      value: boolean
    }
  | {
      field: 'takendown'
      operator: 'eq' | 'neq'
      value: boolean
    }
  | {
      field: 'emailConfirmed'
      operator: 'eq' | 'neq'
      value: boolean
    }
  | {
      field: 'displayName'
      operator: 'ilike'
      value: string
    }
  | {
      field: 'description'
      operator: 'ilike'
      value: string
    }
  | {
      field: 'accountCreated'
      operator: 'gte' | 'lte'
      value: string
    }
  | {
      field: 'recordCreated'
      operator: 'gte' | 'lte'
      value: string
    }
  | {
      field: 'imageEmbed'
      operator: 'eq' | 'neq'
      value: boolean
    }
  | {
      field: 'videoEmbed'
      operator: 'eq' | 'neq'
      value: boolean
    }
  | {
      field: 'content'
      operator: 'ilike'
      value: string
    }
  | {
      field: 'reviewState'
      operator: 'eq' | 'neq'
      value: string
    }

export type FilterOperator = 'AND' | 'OR'

export type FilterGroup = {
  operator?: FilterOperator
  filters: WorkspaceFilterItem[]
}
