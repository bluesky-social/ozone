import Link from 'next/link'
import { ComponentProps } from 'react'

type Props = Omit<
  {
    subject: string
    className?: string
  } & ComponentProps<typeof Link>,
  'href'
>

export const AllReportsLinkForSubject = ({
  subject,
  className,
  ...rest
}: Props) => {
  const url = `/reports?term=${subject}`
  return (
    <Link className={className} href={url} {...rest}>
      See all reports for this subject
    </Link>
  )
}
