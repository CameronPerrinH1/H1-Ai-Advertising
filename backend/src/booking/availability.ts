// Live openings from the spa's booking platform (D20, D21: availability is always live). Read only:
// a search sends the platform a service and a date, never anything about the guest (D29). Every
// failure is the caller's cue to fall back to the booking link (D23).

export interface OpeningDay {
  date: string; // YYYY-MM-DD, the spa's local date
  times: string[]; // HH:mm, the spa's local time
  provider?: string;
  providerId?: string; // the platform's id for the provider, for a hold
  durationMinutes?: number; // the platform's booking block (treatment plus clean-up)
}

// Holds (Cameron, Nov 11): a block on the provider's calendar for a time the guest picked and
// confirmed, which the spa turns into a real appointment. On Vagaro a hold is a "personal task";
// it takes the time out of online booking (tested Nov 11, though Vagaro reports the flag as off).
export interface Hold {
  id: string;
  date: string; // YYYY-MM-DD, local
  start: string; // HH:mm, local
  end: string;
  name: string;
  comment: string;
}
export interface HoldWriter {
  createHold(h: { providerId: string; date: string; start: string; end: string; name: string; comment: string }): Promise<string>;
  deleteHold(id: string): Promise<void>;
  listHolds(providerId: string, from: string, to: string): Promise<Hold[]>;
}

export interface AvailabilitySource {
  // Openings for one platform service on `date`, or from the first day with any when the date is
  // left out (or has none). May return several days.
  search(platformServiceId: string, date?: string): Promise<OpeningDay[]>;
}

// ---------- Vagaro (docs.vagaro.com/public/reference: generate-access-token, search-availability) ----------

export interface VagaroCredentials {
  clientId: string;
  clientSecretKey: string;
  region: string; // the subdomain of the spa's Vagaro login, for example "us02"
}

const TIMEOUT_MS = 4000;

export class VagaroAvailability implements AvailabilitySource, HoldWriter {
  private token?: { value: string; expires: number };

  constructor(
    private readonly businessId: string,
    private readonly credentials: () => Promise<VagaroCredentials>,
    private readonly fetchImpl: typeof fetch = fetch,
    // "write employee" is asked for only where holds are on: it's the scope personal tasks need.
    private readonly scope = 'read access',
  ) {}

  private async post(path: string, body: unknown, token?: string, method = 'POST'): Promise<{ responseCode?: number; message?: string; data?: unknown }> {
    const { region } = await this.credentials();
    const res = await this.fetchImpl(`https://api.vagaro.com/${encodeURIComponent(region)}/api/v2${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { accessToken: token } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => ({}))) as { responseCode?: number; message?: string; data?: unknown };
    if (!res.ok || json.responseCode !== 1000) throw new Error(`VagaroError ${res.status} ${json.responseCode ?? ''}`.trim());
    return json;
  }

  // Tokens last an hour; one is reused until a minute before it expires.
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expires) return this.token.value;
    const c = await this.credentials();
    const r = await this.post('/merchants/generate-access-token', { clientId: c.clientId, clientSecretKey: c.clientSecretKey, scope: this.scope });
    const d = r.data as { access_token?: string; expires_in?: number } | undefined;
    if (!d?.access_token) throw new Error('VagaroError no token');
    this.token = { value: d.access_token, expires: Date.now() + Math.max(60, (d.expires_in ?? 3600) - 60) * 1000 };
    return d.access_token;
  }

  async search(platformServiceId: string, date?: string): Promise<OpeningDay[]> {
    const token = await this.accessToken();
    const r = await this.post(
      '/appointments/availability',
      { businessId: this.businessId, ...(date ? { appointmentDate: date } : {}), bookingItems: [{ serviceId: platformServiceId }] },
      token,
    );
    const days = (Array.isArray(r.data) ? r.data : []) as { appointmentDate?: string; timeSlot?: string[]; items?: { serviceProvider?: string; serviceProviderId?: string; duration?: number }[] }[];
    return days
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.appointmentDate ?? '') && Array.isArray(d.timeSlot))
      .map((d) => ({
        date: d.appointmentDate!,
        times: d.timeSlot!.filter((t) => /^\d{2}:\d{2}$/.test(t)),
        provider: d.items?.[0]?.serviceProvider,
        providerId: d.items?.[0]?.serviceProviderId,
        durationMinutes: d.items?.[0]?.duration,
      }));
  }

  async createHold(h: { providerId: string; date: string; start: string; end: string; name: string; comment: string }): Promise<string> {
    const token = await this.accessToken();
    const r = await this.post(
      '/personal-tasks/create',
      {
        businessId: this.businessId,
        serviceProviderId: h.providerId,
        personalTaskName: h.name.slice(0, 100),
        personalTaskComment: h.comment.slice(0, 500),
        blockOnlineBooking: true,
        startTime: `${h.date}T${h.start}:00`,
        endTime: `${h.date}T${h.end}:00`,
      },
      token,
    );
    const id = (r.data as { personalTaskIds?: string[] } | undefined)?.personalTaskIds?.[0];
    if (!id) throw new Error('VagaroError no hold id');
    return id;
  }

  // The business id must be in the body, or Vagaro answers "validation errors" (tested Nov 11).
  async deleteHold(id: string): Promise<void> {
    const token = await this.accessToken();
    await this.post(`/personal-tasks/delete/${encodeURIComponent(id)}`, { businessId: this.businessId }, token);
  }

  // `to` must be after `from`: a search that starts and ends on one day finds nothing.
  async listHolds(providerId: string, from: string, to: string): Promise<Hold[]> {
    const token = await this.accessToken();
    const r = await this.post('/personal-tasks/retrieve', { businessId: this.businessId, serviceProviderId: providerId, startTime: from, endTime: to }, token);
    const list = (Array.isArray(r.data) ? r.data : ((r.data as { personalTasks?: unknown[] } | undefined)?.personalTasks ?? [])) as {
      personalTaskId?: string; personalTaskName?: string; personalTaskComment?: string; startTime?: string; endTime?: string;
    }[];
    return list
      .filter((x) => x.personalTaskId && x.startTime && x.endTime)
      .map((x) => ({
        id: x.personalTaskId!,
        date: x.startTime!.slice(0, 10),
        start: x.startTime!.slice(11, 16),
        end: x.endTime!.slice(11, 16),
        name: x.personalTaskName ?? '',
        comment: x.personalTaskComment ?? '',
      }));
  }
}

// ---------- Fixed openings for tests and the eval suite (D41) ----------

// Every day from `from`: openings at the given times, except on the listed closed weekdays (0 = Sunday).
// Holds live in memory and take their times out of the openings, as on Vagaro.
export class FixedAvailability implements AvailabilitySource, HoldWriter {
  readonly calls: { serviceId: string; date?: string }[] = [];
  readonly holds = new Map<string, Hold & { providerId: string }>();
  private nextId = 1;
  constructor(
    private readonly from: () => string,
    private readonly times = ['10:00', '10:30', '13:30', '15:00'],
    private readonly closedWeekdays = [0, 1],
    private readonly provider = 'Jen Jeffers',
  ) {}
  async search(serviceId: string, date?: string): Promise<OpeningDay[]> {
    this.calls.push({ serviceId, date });
    let d = new Date(`${date ?? this.from()}T12:00:00Z`);
    for (let i = 0; i < 14; i++, d = new Date(d.getTime() + 86_400_000)) {
      const date = d.toISOString().slice(0, 10);
      const times = this.times.filter((t) => ![...this.holds.values()].some((h) => h.date === date && t >= h.start && t < h.end));
      if (!this.closedWeekdays.includes(d.getUTCDay()) && times.length) return [{ date, times, provider: this.provider, providerId: 'jen-vagaro-id' }];
    }
    return [];
  }
  async createHold(h: { providerId: string; date: string; start: string; end: string; name: string; comment: string }): Promise<string> {
    const id = `hold-${this.nextId++}`;
    this.holds.set(id, { id, ...h });
    return id;
  }
  async deleteHold(id: string): Promise<void> {
    this.holds.delete(id);
  }
  async listHolds(providerId: string, from: string, to: string): Promise<Hold[]> {
    return [...this.holds.values()].filter((h) => h.providerId === providerId && h.date >= from && h.date < to);
  }
}

// ---------- Time zones (D26) ----------

// The UTC instant of a wall-clock time in an IANA time zone, for example 13:30 in America/Los_Angeles.
export function zonedToUtc(date: string, time: string, timeZone: string): number {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (at: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(new Date(at))
        .map((p) => [p.type, p.value]),
    );
    return Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!) - at;
  };
  const first = wall - offset(wall);
  return wall - offset(first);
}
