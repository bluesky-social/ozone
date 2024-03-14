import { useTitle } from 'react-use'
import { Card } from '@/common/Card'
import { useSession } from '@/lib/useSession'

export default function ConfigurePageContent() {
  useTitle('Configure')
  return (
    <div>
      <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
        <ConfigureDetails />
      </div>
    </div>
  )
}

function ConfigureDetails() {
  const session = useSession()
  return (
    <div>
      <h3 className="font-medium text-lg text-gray-700 dark:text-gray-100">
        Configure
      </h3>
      <Card className="mt-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Service Record
        </h4>
        <p className="mt-2">
          The existence of a service record makes you available in the Bluesky
          application, allowing users to choose to use your labeling service. It
          contains a labeling policy with two parts:
          <ul className="list-disc list-inside mt-2">
            <li>
              A list of{' '}
              <b>
                <code>labelValues</code>
              </b>
              : all label values that you intend to produce from your labeler.
            </li>
            <li>
              A list of{' '}
              <b>
                <code>labelDefinitions</code>
              </b>
              : details about how each custom label should be respected by the
              Bluesky application and presented to users.
            </li>
          </ul>
        </p>
      </Card>
    </div>
  )
}
