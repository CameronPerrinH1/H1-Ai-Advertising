import { Wizard } from '@/onboarding/Wizard'
import { DEMO_SPA } from '@/onboarding/spa'

/* The page is the same for every spa: the session from the spa's private link
   decides whose form loads (D83, 09 §2). With no database configured it runs
   as an in-browser demo of DEMO_SPA. */
export default function OnboardingPage() {
  return <Wizard demo={DEMO_SPA} />
}
