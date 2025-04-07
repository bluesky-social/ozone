import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline'

import type { JSX } from "react";

export const EmptyFeed = () => {
  return (
    <EmptyDataset message="No posts yet!">
      <ChatBubbleLeftIcon className="h-10 w-10" />
    </EmptyDataset>
  )
}

export const EmptyDataset = ({
  message,
  children,
}: {
  message: string
  children?: JSX.Element
}) => {
  return (
    <div className="flex flex-col items-center py-10">
      {children}
      <p className="text-gray-500 dark:text-gray-50 text-base">{message}</p>
    </div>
  )
}
