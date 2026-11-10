// Minimized conversation summary (D32). Mirrors ai-concierge-handoff/templates/conversation-summary.schema.json.
export const TOPICS = [
  'pricing',
  'availability',
  'booking',
  'service_info',
  'prep_aftercare',
  'downtime',
  'results_expectations',
  'providers',
  'policies',
  'promotions',
  'location_hours',
  'financing',
  'products',
  'gift_cards',
  'memberships_packages',
  'reschedule_cancel',
  'medical_question',
  'complaint',
  'off_topic',
  'other',
] as const;
export type Topic = (typeof TOPICS)[number];

export type Outcome = 'booked' | 'request' | 'link_provided' | 'handoff' | 'urgent_redirect' | 'answered' | 'abandoned';

export interface Summary {
  conversation_id: string;
  client_id: string;
  month: string; // YYYY-MM
  day_of_week: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  local_hour: number;
  after_hours: boolean;
  language: 'en' | 'es' | 'other';
  display_mode: 'inline' | 'fullscreen' | 'launcher' | 'askbar';
  booking_mode: 'in_chat' | 'link_handoff';
  topics: Topic[];
  service_categories_discussed: string[];
  outcome: Outcome;
  abandon_point: 'after_recommendation' | 'after_availability_shown' | 'during_contact_details' | 'after_booking_error' | null;
  unanswered_questions: string[];
  requested_services_not_offered: string[];
  promotions_mentioned: string[];
  upsell_offered: boolean;
  upsell_accepted: boolean;
  handoff_reason_category: 'medical_question' | 'reschedule' | 'cancel' | 'complaint' | 'other' | null;
  output_check_fallbacks: number;
  feedback_up: number;
  feedback_down: number;
  feedback_reasons: ('wrong_info' | 'didnt_understand' | 'other')[]; // one per thumbs-down that gave a reason
  free_text_dropped: boolean;
  message_count: number;
  tokens_in: number;
  tokens_out: number;
  duration_seconds: number; // first to last activity, rounded to 10 seconds
  scores: Scores | null; // end-of-chat grade (D69); null if grading failed
  review_flags: ReviewFlag[]; // why a person should look at this chat; flagged chats are kept 90 days (D31)
}

// End-of-chat rubric (D69). Each is 1 (poor) to 5 (excellent), or null when it didn't come up.
export const SCORE_KEYS = ['answered', 'next_step', 'objections', 'tone', 'safety'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];
export type Scores = Record<ScoreKey, number | null> & { overall: number };

export const REVIEW_FLAGS = ['safety_concern', 'low_score', 'thumbs_down', 'fallback', 'handoff', 'unanswered', 'urgent'] as const;
export type ReviewFlag = (typeof REVIEW_FLAGS)[number];
