import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline'

export const EmptyFeed = () => {
  return (
    <div className="flex flex-col items-center py-10">
      <ChatBubbleLeftIcon className="h-10 w-10" />
      <p className="text-gray-500 text-base">No posts yet!</p>
    </div>
  )
}
