/** Matches social-app's recognized support sites and account-page rules. */
const SUPPORT_PROVIDERS: { name: string; domain: string; pathPrefix?: string }[] = [
  { name: 'Big Cartel', domain: 'bigcartel.com' },
  { name: 'Boosty', domain: 'boosty.to' },
  { name: 'Buy Me a Coffee', domain: 'buymeacoffee.com' },
  { name: 'Cash App', domain: 'cash.app' },
  { name: 'Chuffed', domain: 'chuffed.org', pathPrefix: '/campaign/' },
  { name: 'Chuffed', domain: 'chuffed.org', pathPrefix: '/project/' },
  { name: 'Crowdfundr', domain: 'crowdfundr.com' },
  { name: 'Donorbox', domain: 'donorbox.org' },
  { name: 'Etsy', domain: 'etsy.com' },
  { name: 'Fourthwall', domain: 'fourthwall.com' },
  { name: 'Givebutter', domain: 'givebutter.com' },
  { name: 'GoFundMe', domain: 'gofundme.com' },
  { name: 'Gumroad', domain: 'gumroad.com' },
  { name: 'Indiegogo', domain: 'indiegogo.com' },
  { name: 'INPRNT', domain: 'inprnt.com', pathPrefix: '/gallery/' },
  { name: 'itch.io', domain: 'itch.io' },
  { name: 'JustGiving', domain: 'justgiving.com' },
  { name: 'Kickstarter', domain: 'kickstarter.com' },
  { name: 'Ko-fi', domain: 'ko-fi.com' },
  { name: 'Liberapay', domain: 'liberapay.com' },
  { name: 'Open Collective', domain: 'opencollective.com' },
  { name: 'Patreon', domain: 'patreon.com' },
  { name: 'PayPal', domain: 'paypal.com', pathPrefix: '/paypalme/' },
  { name: 'PayPal', domain: 'paypal.me' },
  { name: 'Redbubble', domain: 'redbubble.com' },
  { name: 'Stripe', domain: 'buy.stripe.com' },
  { name: 'Stripe', domain: 'donate.stripe.com' },
  { name: 'Substack', domain: 'substack.com' },
  { name: 'Throne', domain: 'throne.com' },
  { name: 'Venmo', domain: 'venmo.com' },
  { name: 'VGen', domain: 'vgen.co' },
  { name: 'Zeffy', domain: 'zeffy.com' },
]

export function getSupportProvider(url: URL): string | undefined {
  const host = url.hostname.toLowerCase()
  const path = url.pathname.toLowerCase().replace(/\/+$/, '')
  return SUPPORT_PROVIDERS.find(({ domain, pathPrefix }) => {
    if (host !== domain && !host.endsWith(`.${domain}`)) return false
    if (pathPrefix) {
      return path.startsWith(`${pathPrefix.replace(/\/+$/, '')}/`)
    }
    return (host !== domain && host !== `www.${domain}`) || path.length > 0
  })?.name
}
