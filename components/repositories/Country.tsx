import { LabelChip } from '@/common/labels/List'
import { countriesDataByCode } from '@/lib/locale/countries'
import Link from 'next/link'

export const Country = ({ code }: { code: string }) => {
  const countryData = countriesDataByCode[code]

  if (countryData) {
    const title = `${countryData.countryNameEn}, ${countryData.region}, Country Code: ${code}`
    return (
      <Link
        title={title}
        aria-label={title}
        prefetch={false}
        href={`/repositories?term=sig:${encodeURIComponent(code)}`}
      >
        {countryData.flag}
      </Link>
    )
  }

  return (
    <Link
      prefetch={false}
      href={`/repositories?term=sig:${encodeURIComponent(code)}`}
    >
      <LabelChip>{code}</LabelChip>
    </Link>
  )
}
