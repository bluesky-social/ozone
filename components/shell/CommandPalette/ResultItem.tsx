import React from 'react'
import { ActionImpl } from 'kbar'

const ResultItem = (
  {
    action,
    active,
    currentRootActionId,
  }: {
    action: ActionImpl
    active: boolean
    currentRootActionId?: string | null
  },
  ref: React.Ref<HTMLDivElement>,
) => {
  const ancestors = React.useMemo(() => {
    if (!currentRootActionId) return action.ancestors
    const index = action.ancestors.findIndex(
      (ancestor) => ancestor.id === currentRootActionId,
    )
    return action.ancestors.slice(index + 1)
  }, [action.ancestors, currentRootActionId])

  return (
    <div
      ref={ref}
      className={`${
        active
          ? 'bg-blue-400  rounded-lg text-gray-100 '
          : 'transparent text-gray-500'
      } rounded-lg px-4 py-3 flex items-center cursor-pointer justify-between `}
    >
      <div className="flex items-center gap-2 text-base">
        {action.icon && action.icon}
        <div className="flex flex-col">
          <div>
            {ancestors.length > 0 &&
              ancestors.map((ancestor) => (
                <React.Fragment key={ancestor.id}>
                  <span className="mr-4 opacity-50">{ancestor.name}</span>
                  <span className="mr-4">&rsaquo;</span>
                </React.Fragment>
              ))}
            <span>{action.name}</span>
          </div>
          {action.subtitle && (
            <span className="text-sm">{action.subtitle}</span>
          )}
        </div>
      </div>
      {action.shortcut?.length ? (
        <div aria-hidden className="grid grid-flow-col gap-2">
          {action.shortcut.map((sc) => (
            <kbd
              key={sc}
              className={`${
                active ? 'bg-white text-blue-400 ' : 'bg-gray-200 text-gray-500'
              } ' px-3 py-2 flex rounded-md items-center cursor-pointer justify-between `}
            >
              {sc}
            </kbd>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const CommandPaletteResultItem = React.forwardRef(ResultItem)
