// Types shared by the backend and the widget: the API contract and the cards.
// Cards are rendered by code from catalog data; the model only picks what to show (D59).

export type Lang = 'en' | 'es';
export type DisplayMode = 'inline' | 'fullscreen' | 'launcher';

export interface Price {
  amount: number;
  unit: 'session' | 'unit' | 'syringe' | 'area';
  from: boolean;
  // Priced at consultation (the spa's choice, D72): the amount is 0 and never reaches the guest.
  consult?: boolean;
}

export interface ServiceView {
  id: string;
  name: string;
  category: string;
  price: Price;
  promo?: { id: string; label: string; price: number; ends: string };
  durationMinutes: number;
  downtime: string;
  results?: string;
  summary: string;
  image?: string;
  requiresAssessment: boolean;
  // 'consult' means the button books the consultation instead of the treatment (D15).
  action: { kind: 'book' | 'consult'; url: string; consultName?: string };
}

export interface ProviderView {
  id: string;
  name: string;
  credentials?: string;
  title: string;
  bio: string;
  specialties: string[];
  languages: Lang[];
  initials: string;
  serviceNames: string[];
  bookUrl: string;
}

export type ConfirmField = 'treatment' | 'provider' | 'times' | 'name' | 'phone' | 'email' | 'reason' | 'callback_time';

// A rough estimate computed by code, never a quote (D62). Per-unit treatments stay out of the total
// because the provider decides the amount (D15).
export interface EstimateView {
  lines: { name: string; price: Price; promoPrice?: number; counted: boolean; addOn?: boolean }[];
  total: number;
  totalIsFrom: boolean;
  perUnit: string[];
}

// How long chats run and how well the concierge answered (D69). Averages are null with no data.
export interface QualityView {
  avgMinutes: number | null;
  avgMessages: number | null;
  scored: number; // chats with an end-of-chat grade
  avgScore: number | null; // overall, 1 to 5
  scores: { text: string; avg: number }[]; // each rubric item that came up
  flagged: number;
  flagReasons: CountedItem[];
  helpful: number; // thumbs up
  notHelpful: number; // thumbs down
  notHelpfulReasons: CountedItem[];
}

export interface CountedItem {
  text: string;
  count: number;
}

export type Card =
  | { type: 'treatment_options'; headline?: string; items: { service: ServiceView; reason: string }[] }
  | { type: 'service'; service: ServiceView }
  | { type: 'compare'; services: ServiceView[] }
  | { type: 'provider'; provider: ProviderView }
  | { type: 'booking_link'; purpose: 'book' | 'manage' | 'rsvp'; url: string; serviceName?: string; providerName?: string; consult?: boolean; eventName?: string }
  | {
      type: 'confirm';
      actionId: string;
      kind: 'appointment' | 'callback';
      fields: { key: ConfirmField; value: string }[];
      note: string;
      status: 'pending' | 'confirmed' | 'expired';
    }
  | {
      type: 'urgent';
      kind: 'post_treatment' | 'emergency' | 'crisis';
      title: string;
      body: string;
      actions: { label: string; href: string }[];
    }
  | { type: 'estimate'; estimate: EstimateView }
  | {
      type: 'event_plan';
      label: string;
      eventDate: string; // YYYY-MM-DD
      daysToGo: number;
      items: { service: ServiceView; date: string; daysBefore: number; tight: boolean }[];
      skipped: { service: ServiceView; minDays: number }[];
      estimate: EstimateView;
    }
  | { type: 'care_guide'; service: ServiceView; before: string[]; dayOf: string[]; after: string[]; focus: 'before' | 'after' | 'all' }
  | {
      type: 'membership';
      name: string;
      monthlyPrice: number;
      includedService: string;
      perMonth: number;
      discountPercent?: number;
      visitsPerYear: number;
      payAsYouGo: number;
      member: number;
      savings: number;
      terms?: string;
    }
  | { type: 'first_visit'; arriveMinutes: number; parking?: string; bring: string[]; notes: string[]; formUrl?: string }
  | { type: 'insights'; period: string; conversations: number; unanswered: CountedItem[]; notOffered: CountedItem[]; topics: CountedItem[]; quality: QualityView };

// Thumbs up or down on a reply (build plan 9.5). A thumbs-down can carry one reason from a fixed
// list, never free text, and flags the chat for review (D69).
export type FeedbackReason = 'wrong_info' | 'didnt_understand' | 'other';
export interface Feedback {
  rating: 'up' | 'down';
  reason?: FeedbackReason;
}

export interface Reply {
  replyId?: string; // set on answers the guest can rate
  text: string;
  cards: Card[];
  quickReplies: string[];
  feedback?: Feedback;
}

export interface DisplayMessage {
  role: 'guest' | 'assistant';
  replyId?: string;
  text: string;
  cards?: Card[];
  quickReplies?: string[];
  feedback?: Feedback;
}

export interface PublicConfig {
  clientId: string;
  available: boolean; // false while the kill switch is on (D43)
  demo: boolean;
  businessName: string;
  phone: string;
  bookingUrl: string; // shown if the chat itself fails (D23)
  concierge: {
    name: string;
    initials: string;
    avatarMode: 'portrait' | 'illustrated' | 'brand_mark' | 'none';
    // A portrait from H1's set, served with the widget (/avatars/look-N.jpg; D45). Without one the
    // avatar shows the initial. The AI label shows either way.
    avatarUrl?: string;
    disclosureLabel: Record<Lang, string>;
  };
  notice: { version: string; text: Record<Lang, string>; privacyUrl: string };
  branding: {
    colors: { primary: string; secondary: string; accent: string };
    fonts: { heading: string; body: string };
  };
  languages: Lang[];
  suggested: { default: Record<Lang, string[]>; pages: Record<string, Record<Lang, string[]>> };
  display: { modes: DisplayMode[]; nudgeDelaySeconds?: number };
  promotions: { id: string; label: string; ends: string }[]; // active today
  hours: Record<string, string>; // e.g. { tue: '09:00-18:00' }
  timezone: string;
  staff?: { enabled: boolean; suggested: Record<Lang, string[]> };
}

// API bodies
export interface StartSessionRequest { lang: Lang; noticeVersion: string; page?: string; mode?: DisplayMode }
export interface StaffSessionRequest { code: string; lang: Lang }
export interface MessageRequest { id: string; text: string; lang: Lang; page?: string }
export interface ConfirmRequest { actionId: string }

export interface SessionState { active: boolean; lang: Lang; history: DisplayMessage[]; audience?: 'guest' | 'staff' }
export interface StartSessionResponse { active: true; lang: Lang; greeting: Reply }
export interface MessageResponse { reply: Reply; limitReached?: boolean }
export interface FeedbackRequest { replyId: string; rating: 'up' | 'down'; reason?: FeedbackReason }
export interface ConfirmResponse { reply: Reply; actionId: string; status: 'confirmed' | 'expired' }
export interface ApiError { error: string; code: string }
