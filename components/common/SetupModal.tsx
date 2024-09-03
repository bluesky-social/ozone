import Image from 'next/image'
import { ComponentProps, ReactNode } from 'react'

import { Loading } from './Loader'
import { classNames } from '@/lib/util'

export type Props = {
  title?: ReactNode
  children?: ReactNode
} & ComponentProps<'div'>

export function SetupModal({
  title,
  children = <Loading />,
  className,
  ...props
}: Props) {
  return (
    <div
      {...props}
      className={classNames('fixed inset-0 z-20 overflow-y-auto', className)}
    >
      <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-rose-600 to-rose-800 dark:from-slate-700 dark:to-slate-900">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-700 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 m-6 md:m-0">
          <div>
            <Image
              className="mx-auto h-20 w-auto"
              title="Icon from Flaticon: https://www.flaticon.com/free-icons/lifeguard-tower"
              src="/img/logo-colorful.png"
              alt="Ozone - Bluesky Admin"
              width={200}
              height={200}
            />
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200">
              Bluesky Admin Tools
            </h2>
            {title && (
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-100">
                {title}
              </p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
