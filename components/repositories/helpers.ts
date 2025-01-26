import { ComAtprotoAdminDefs } from '@atproto/api'

export function obscureIp(ip: string) {
  const parts = ip.split('.')
  if (parts.length !== 4) return '***.***.***.***'
  return `${parts[0]}.${parts[1]}.***.***`
}

export function parseThreatSigs(sigs?: ComAtprotoAdminDefs.ThreatSignature[]) {
  const hcapDetail: ComAtprotoAdminDefs.ThreatSignature[] = []
  let registrationIp,
    lastSigninIp,
    lastSigninTime,
    lastSigninCountry,
    ipCountry: string | undefined

  if (sigs) {
    for (const sig of sigs) {
      switch (sig.property) {
        case 'registrationIp':
          registrationIp = sig.value
          break
        case 'lastSigninIp':
          lastSigninIp = sig.value
          break
        case 'lastSigninTime':
          lastSigninTime = sig.value
          break
        case 'lastSigninCountry':
          lastSigninCountry = sig.value
          break
        case 'ipCountry':
          ipCountry = sig.value
          break
        default:
          hcapDetail.push(sig)
      }
    }
  }

  return {
    registrationIp,
    lastSigninIp,
    lastSigninTime,
    lastSigninCountry,
    ipCountry,
    hcapDetail,
  }
}
