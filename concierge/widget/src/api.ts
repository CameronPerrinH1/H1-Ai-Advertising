import type {
  ConfirmResponse,
  FeedbackReason,
  DisplayMode,
  Lang,
  MessageResponse,
  PublicConfig,
  SessionState,
  StartSessionResponse,
} from '@concierge/shared';

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { code?: string }).code ?? 'error');
  return data as T;
}

export const getConfig = () => call<PublicConfig>('/config');
export const getSession = () => call<SessionState>('/session');
export const startSession = (lang: Lang, noticeVersion: string, page?: string, mode?: DisplayMode) =>
  call<StartSessionResponse>('/session', { lang, noticeVersion, page, mode });
export const startStaffSession = (code: string, lang: Lang) => call<StartSessionResponse>('/staff/session', { code, lang });
export const sendMessage = (id: string, text: string, lang: Lang, page?: string) =>
  call<MessageResponse>('/message', { id, text, lang, page });
export const confirmAction = (actionId: string) => call<ConfirmResponse>('/confirm', { actionId });
export const endSession = () => call<{ ok: true }>('/end', {});
export const sendFeedback = (replyId: string, rating: 'up' | 'down', reason?: FeedbackReason) =>
  call<{ ok: true }>('/feedback', { replyId, rating, reason });

export interface Fallback {
  businessName: string;
  phone: string;
  bookingUrl: string;
}

// Written next to the widget at deploy time, so the unavailable view still has the phone number
// and booking link when the API itself can't be reached (D43).
export async function getFallback(): Promise<Fallback | null> {
  try {
    const res = await fetch('/client-fallback.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<Fallback>;
    return data.phone && data.bookingUrl ? { businessName: data.businessName ?? '', phone: data.phone, bookingUrl: data.bookingUrl } : null;
  } catch {
    return null;
  }
}

export const isUnavailable = (err: unknown) => err instanceof ApiError && err.code === 'unavailable';
