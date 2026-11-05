import { useRef } from 'react'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from '@headlessui/react'
import { ActionButton } from '@/common/buttons'
import { copyToClipboard } from '@/common/CopyButton'
import examples from './fixtures/examples.json'
import settingsSchema from './schemas/settings.schema.json'

const exampleJson = JSON.stringify(examples, null, 2)
const schemaJson = JSON.stringify(settingsSchema, null, 2)

export function CustomActionSettingsHelp({ onClose }: { onClose: () => void }) {
  const helpRef = useRef<HTMLDivElement>(null)
  function copyInstructions() {
    const instructions = Array.from(
      helpRef.current?.querySelectorAll('h2, h3, p, li, pre') ?? [],
      (element) => {
        if (element.tagName === 'PRE')
          return `\`\`\`json\n${element.textContent}\n\`\`\``
        const content = element.cloneNode(true) as HTMLElement
        content.querySelectorAll('code').forEach((code) => {
          code.replaceWith(`\`${code.textContent}\``)
        })
        const text = content.textContent
        if (element.tagName === 'H2') return `# ${text}`
        if (element.tagName === 'H3') return `## ${text}`
        if (element.tagName === 'LI') return `- ${text}`
        return text
      },
    ).join('\n\n')
    copyToClipboard(
      `${instructions}\n\n## JSON schema\n\n\`\`\`json\n${schemaJson}\n\`\`\``,
      'instructions ',
    )
  }
  return (
    <Dialog open onClose={onClose} className="relative z-40">
      <div className="fixed inset-0 bg-black/25" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          ref={helpRef}
          className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 shadow-xl"
        >
          <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-lg font-medium">
                Custom actions help
              </DialogTitle>
              <ActionButton
                appearance="outlined"
                size="sm"
                className="shrink-0"
                onClick={copyInstructions}
              >
                Copy instructions
              </ActionButton>
            </div>
            <Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Browse moderation workflows and edit their JSON definitions.
            </Description>
          </div>
          <div className="min-h-0 overflow-y-auto p-4 space-y-5 text-sm select-text">
            <section>
              <p>
                Custom actions appear in the moderation dropdown and run their
                steps in order. Use <code>version: 1</code> and a{' '}
                <code>customActions</code> array containing your workflows.
              </p>
              <p className="mt-2">
                Settings show a list of workflows. Select a workflow to edit its
                JSON, then choose Save action. Choose Add to start a new
                workflow in the same editor; the starter action is disabled
                until you enable it in the JSON. Saving appends it to the list.
                Other workflows keep their definitions and order. Use Edit raw
                JSON to edit or import the full configuration, including adding,
                removing, or reordering workflows. Unsaved edits require an
                explicit discard before returning to the list.
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>
                  <code>id</code> identifies a workflow; <code>name</code> is
                  its dropdown label. Optional <code>helpText</code> explains
                  when to use it and appears when selected.
                </li>
                <li>
                  <code>allowedRoles</code> uses full role identifiers; include
                  admins explicitly. <code>subjectTypes</code> allows accounts,
                  records, or both. Existing step permissions still apply.
                </li>
                <li>
                  Optional <code>queueIds</code> limits a workflow to specific
                  report queues. Use numeric queue IDs and <code>-1</code> for
                  unassigned reports. Omit it for all queues. Scoped actions
                  require a current report and its queue is checked again before
                  execution. Empty lists are invalid.
                </li>
                <li>
                  Optional <code>allowedModeratorDids</code> limits who can run
                  a workflow, in addition to <code>allowedRoles</code>. Use a
                  one-item list for one moderator, or omit it for everyone with
                  an allowed role. These are moderator DIDs, not the account
                  being reviewed. Existing API permissions still apply.
                </li>
                <li>
                  <code>actions</code> lists steps in execution order, each with
                  a unique <code>id</code>. Target <code>subject</code> for the
                  current account or content, <code>account</code> for its
                  owning account, or <code>report</code> for a report activity.
                </li>
                <li>
                  Steps support moderation events, report activities, and
                  account verification. Report activities and{' '}
                  <code>reportAction</code> require a current report. Activity{' '}
                  <code>internalNote</code> is for moderators;{' '}
                  <code>publicNote</code> and <code>reportAction.note</code> are
                  visible to the reporter.
                </li>
                <li>
                  Steps stop the workflow on error by default. Tag and label
                  steps can opt in with <code>continueOnError: true</code> to
                  continue after a failed request or an unconfirmed response,
                  without retrying. Failed steps stay visible and the result
                  says “Completed with errors.” Validation, permission checks,
                  authentication or permission failures (HTTP 401/403),
                  cancellation, and the time limit still stop execution. If a
                  label step also uses <code>reportAction</code>, the option
                  applies to the whole request, including report closure. Review
                  history before running the workflow again.
                </li>
              </ul>
              <p className="mt-3">
                Copy the example configuration below, adjust its workflows,
                tags, and labels, then choose Edit raw JSON and paste it into
                the editor. Save replacement replaces the full configuration.
                Saving does not run actions; moderators select one and choose
                Confirm and run.
              </p>
            </section>
            <section aria-labelledby="custom-action-examples-title">
              <h3
                id="custom-action-examples-title"
                className="font-medium mb-2"
              >
                Example configuration
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                {examples.customActions.map((action) => (
                  <li key={action.id}>
                    <span className="font-medium">{action.name}:</span>{' '}
                    {action.helpText}
                  </li>
                ))}
              </ul>
              <div className="my-3 flex flex-wrap gap-2">
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  onClick={() => copyToClipboard(exampleJson, 'JSON ')}
                >
                  Copy JSON
                </ActionButton>
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  onClick={() => copyToClipboard(schemaJson, 'JSON schema ')}
                >
                  Copy JSON schema
                </ActionButton>
              </div>
              <pre
                tabIndex={0}
                aria-label="Example custom action configuration"
                className="max-h-96 overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-3 text-xs"
              >
                <code>{exampleJson}</code>
              </pre>
            </section>
          </div>
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
            <ActionButton appearance="primary" size="sm" onClick={onClose}>
              Close
            </ActionButton>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
