'use client'

import { Tooltip } from '@/common/Tooltip'
import { Textarea } from '@/common/forms'
import { useState } from 'react'

export function PublicNoteField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="text-xs text-teal-700 dark:text-teal-300 hover:underline"
          aria-expanded={open}
          onClick={() => {
            if (open) onChange('')
            setOpen(!open)
          }}
        >
          {open ? 'Hide public note' : 'Public Note'}
        </button>
        <Tooltip title="Public note">
          This text will be sent to the reporter and appear in their moderation
          inbox. Do not include private moderation details.
        </Tooltip>
      </div>
      {open && (
        <Textarea
          rows={3}
          placeholder="Message to the reporter (optional)…"
          aria-label="Public note to reporter"
          className="block w-full text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}
