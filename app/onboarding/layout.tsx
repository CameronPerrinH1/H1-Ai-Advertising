import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Instrument_Sans, Public_Sans } from 'next/font/google'
import '@/onboarding/ob-base.css'
import '@/onboarding/onboarding.css'

/* The form keeps the type it had on the H1 AI Consulting site, where it was built: the
   display and body faces that site's root layout loaded. Here they're loaded for this
   segment only, so the marketing pages don't download them. */
const display = Instrument_Sans({ subsets: ['latin'], variable: '--font-display-src', display: 'swap' })
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body-src', display: 'swap' })

/*
 * The spa onboarding wizard. Outside the marketing chrome on purpose: its own
 * focused header, and no analytics, prerendering, or forms script — a private
 * page reached from a link in an email must not report its address to anyone.
 * Never indexed, and not in the sitemap.
 */
export const metadata: Metadata = {
  title: 'Personality Protocol & Sales Playbook — H1 AI Consulting',
  description: 'Design how your AI Treatment Coordinator sounds and sells.',
  alternates: { canonical: null },
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className={`ob-root ${display.variable} ${body.variable}`}>{children}</div>
}
