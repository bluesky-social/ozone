import { ClipboardIcon } from '@heroicons/react/20/solid'
import { toast } from 'react-toastify'

export const CopyButton = ({
  text,
  label,
  ...rest
}: { text: string; label?: string } & JSX.IntrinsicElements['button']) => {
  const labelText = label ? `${label} ` : ''
  const handleCopy = (e) => {
    e.preventDefault()
    toast.promise(navigator.clipboard.writeText(text), {
      pending: `Copying ${labelText}to clipboard...`,
      success: {
        render() {
          return `Copied ${labelText}to clipboard`
        },
      },
      error: {
        render() {
          return `Error copying ${labelText}to clipboard`
        },
      },
    })
  }
  return (
    <button type="button" onClick={handleCopy} {...rest}>
      <ClipboardIcon className="h-3 w-3" />
    </button>
  )
}
