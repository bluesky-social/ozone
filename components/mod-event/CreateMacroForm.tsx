import { ActionButton } from '@/common/buttons'
import { FormLabel, Input } from '@/common/forms'
import Link from 'next/link'

export const CreateMacroForm = ({
  onCreate,
  error,
}: {
  error?: string
  onCreate: (name: string) => Promise<boolean>
}) => {
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const success = await onCreate(name)
    if (success) {
      e.target.reset()
    }
  }

  return (
    <form action="" onSubmit={handleSubmit}>
      <div className="flex flex-row gap-2 items-end">
        <FormLabel label="Macro Name" required className="w-3/4">
          <Input
            type="text"
            name="name"
            id="name"
            className="py-1 w-full"
            placeholder="Enter a name for the macro"
            required
          />
        </FormLabel>
        <ActionButton appearance="primary" type="submit" size="xs">
          <span className="text-sm">Save Macro</span>
        </ActionButton>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <p className="text-sm leading-4 pt-1 text-gray-400">
        If you want to reuse your current filter config, give it a name and save
        it as a macro. Your macros are private and only saved in your browser.
        Manage{' '}
        <Link href="/events/filters/macros" className="underline">
          all your macros here
        </Link>
        .
      </p>
    </form>
  )
}
