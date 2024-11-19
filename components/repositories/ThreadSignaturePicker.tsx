import { Checkbox } from '@/common/forms'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { MagnifyingGlassPlusIcon } from '@heroicons/react/20/solid'
import {
  ComponentProps,
  forwardRef,
  Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

export type ThreatSignature = ComAtprotoAdminDefs.ThreatSignature

export type ThreadSignaturePickerProps = {
  threatSignatures?: ThreatSignature[]
  label?: string
  value?: ThreatSignature[]
  required?: boolean
  confirmButtonText?: string
  onChange?: (value: ThreatSignature[]) => void
  onConfirm?: (value: ThreatSignature[]) => void
} & Omit<ComponentProps<'button'>, 'children'>

export const ThreadSignaturePicker = forwardRef(function ThreadSignaturePicker(
  {
    title = 'Select Threat Signatures',
    value,
    required,
    onChange,
    onConfirm,
    threatSignatures,
    confirmButtonText,

    onClick,
    ...buttonProps
  }: ThreadSignaturePickerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [internal, setInternal] = useState<ThreatSignature[]>(value ?? [])

  const reset = useCallback(() => {
    setInternal(value ?? [])
  }, [value])

  const updateValue = (newValue: ThreatSignature[]) => {
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
      ref={ref}
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
      <MagnifyingGlassPlusIcon className="h-3 w-3 inline" />
      <ConfirmationModal
        ref={dialogRef}
        isOpen={isOpen}
        title={title}
        confirmButtonText={confirmButtonText}
        confirmButtonDisabled={required === true && !internal.length}
        onConfirm={() => {
          onConfirm?.(internal)
          updateOpen(false)
        }}
        setIsOpen={updateOpen}
      >
        {threatSignatures?.map((signature, i) => (
          <Checkbox
            key={i}
            value={signature.value}
            name={signature.property}
            className="mt-3 flex items-center"
            label={signature.property}
            onChange={(e) => {
              const filtered = internal.filter(
                (s) =>
                  s.property !== signature.property &&
                  s.value !== signature.value,
              )
              updateValue(
                e.target.checked ? [...filtered, signature] : filtered,
              )
            }}
          />
        ))}
      </ConfirmationModal>
    </button>
  )
})
