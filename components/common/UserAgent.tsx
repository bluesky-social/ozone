import { CopyButton } from './CopyButton'
import { LabelChip } from './labels/List'

const parseUserAgent = (userAgent) => {
  let browser = 'Unknown'
  let version = ''

  if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
    browser = 'Chrome'
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || ''
  } else if (userAgent.includes('Firefox/')) {
    browser = 'Firefox'
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || ''
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    browser = 'Safari'
    version = userAgent.match(/Version\/(\d+)/)?.[1] || ''
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge'
    version = userAgent.match(/Edg\/(\d+)/)?.[1] || ''
  }

  let os = 'Unknown'
  if (userAgent.includes('Windows NT')) {
    const ntVersion = userAgent.match(/Windows NT (\d+\.\d+)/)?.[1]
    const windowsVersions = {
      '10.0': 'Windows 10/11',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7',
    }
    os = windowsVersions[ntVersion] || 'Windows'
  } else if (userAgent.includes('Mac OS X')) {
    const macVersion = userAgent.match(/Mac OS X (\d+_\d+)/)?.[1]
    if (macVersion) {
      const version = macVersion.replace(/_/g, '.')
      os = `macOS ${version}`
    } else {
      os = 'macOS'
    }
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  } else if (userAgent.includes('Android')) {
    const androidVersion = userAgent.match(/Android (\d+)/)?.[1]
    os = androidVersion ? `Android ${androidVersion}` : 'Android'
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const iosVersion = userAgent.match(/OS (\d+_\d+)/)?.[1]
    const device = userAgent.includes('iPhone') ? 'iPhone' : 'iPad'
    os = iosVersion
      ? `iOS ${iosVersion.replace('_', '.')} (${device})`
      : `iOS (${device})`
  }

  return { browser, version, os }
}

const formatUserAgentOneLine = (userAgent) => {
  const { browser, version, os } = parseUserAgent(userAgent)
  return `${browser} ${version} on ${os}`
}

export const UserAgent = ({ userAgent }: { userAgent: string }) => {
  return (
    <div className="flex items-center gap-0.5">
      <code title={userAgent}>
        {formatUserAgentOneLine(userAgent)}
      </code>
      <CopyButton text={userAgent} label="Copy user agent" />
    </div>
  )
}
