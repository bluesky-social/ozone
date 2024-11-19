import { Checkbox } from '@/common/forms'
import { ConfirmationModal } from '@/common/modals/confirmation'
import {
  ComponentProps,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

export type CheckboxesModalProps<T> = {
  title: string
  items: T[]
  itemCmp?: (a: T, b: T) => boolean
  itemLabel?: (item: T) => string | ReactNode
  label?: string
  value?: T[]
  required?: boolean
  confirmButtonText?: string
  onChange?: (value: T[]) => void
  onConfirm?: (value: T[]) => void
} & ComponentProps<'button'>

export function CheckboxesModal<T>({
  title,
  value,
  required,
  onChange,
  onConfirm,
  items,
  itemCmp = (a, b) => a === b,
  itemLabel,
  confirmButtonText,

  // button props
  children,
  onClick,
  ...buttonProps
}: CheckboxesModalProps<T>) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [internal, setInternal] = useState<T[]>(value ?? [])

  const reset = useCallback(() => {
    setInternal(value ?? [])
  }, [value])

  const updateValue = (newValue: T[]) => {
    setInternal(newValue)
    onChange?.(newValue)
  }

  const updateOpen = (isOpen: boolean) => {
    reset()
    setIsOpen(isOpen)
  }

  useEffect(() => {
    reset()
  }, [reset])

  return (
    <button
      {...buttonProps}
      onClick={(event) => {
        onClick?.(event)
        if (
          !event.defaultPrevented &&
          !dialogRef.current?.contains(event.target as Node)
        ) {
          updateOpen(true)
        }
      }}
    >
      {children}
      <ConfirmationModal
        ref={dialogRef}
        isOpen={isOpen}
        title={title}
        confirmButtonText={confirmButtonText}
        confirmButtonDisabled={!!required && !internal.length}
        onConfirm={() => {
          if (internal.length || !required) {
            onConfirm?.(internal)
            updateOpen(false)
          }
        }}
        setIsOpen={updateOpen}
      >
        {items?.map((item, i) => (
          <Checkbox
            key={i}
            className="mt-3 flex items-center"
            label={itemLabel?.(item) ?? `Item ${i + 1}`}
            checked={internal.some((other) => itemCmp(other, item))}
            onChange={(e) => {
              const filtered = internal.filter((other) => !itemCmp(other, item))
              updateValue(e.target.checked ? [...filtered, item] : filtered)
            }}
          />
        ))}
      </ConfirmationModal>
    </button>
  )
}
