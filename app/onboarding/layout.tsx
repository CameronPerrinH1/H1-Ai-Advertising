import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/onboarding/ob-base.css'
import '@/onboarding/onboarding.css'

/*
 * The spa onboarding wizard. Outside the marketing chrome on purpose: its own
 * focused header, and no analytics, prerendering, or forms script — a private
 * page reached from a link in an email must not report its address to anyone.
 * Never indexed, and not in the sitemap.
 */
export const metadata: Metadata = {
  title: 'Personality Protocol & Sales Playbook — H1 AI Advertising',
  description: 'Design how your AI Treatment Coordinator sounds and sells.',
  alternates: { canonical: null },
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="ob-root">{children}</div>
}
