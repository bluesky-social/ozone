export type DurationUnit = 'days' | 'weeks' | 'months' | 'years'

export type WorkspaceFilterItem =
  | {
      field: 'followersCount'
      operator: 'gte' | 'lte'
      value: number
    }
  | {
      field: 'followsCount'
      operator: 'gte' | 'lte'
      value: number
    }
  | {
      field: 'accountAge'
      operator: 'gte' | 'lte'
      unit: DurationUnit
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
      field: 'recordCreated'
      operator: 'gte' | 'lte'
      unit: DurationUnit
      value: number
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
