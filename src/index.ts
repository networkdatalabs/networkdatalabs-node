/** Official client for the Network Data Labs API. Zero dependencies; uses global fetch. */

export interface Location {
  continent_code: string;
  country_code: string | null;
  country: string | null;
  is_eu?: boolean;
  region?: string | null;
  region_code?: string | null;
  city?: string | null;
  postal?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  accuracy_radius_km: number | null;
  confidence: "high" | "medium" | "low" | "unknown";
}

export interface Network {
  asn?: number | null;
  as_org?: string | null;
  isp?: string | null;
  organization?: string | null;
  network?: string | null;
  rir?: string | null;
}

/** Risk flags (is_tor, is_vpn, is_relay, is_proxy, is_hosting) are only present on paid plans. */
export interface Traits {
  is_bogon: boolean;
  is_mobile: boolean;
  is_satellite: boolean;
  is_anycast?: boolean;
  is_hosting?: boolean;
  is_proxy?: boolean;
  is_vpn?: boolean;
  is_tor?: boolean;
  is_relay?: boolean;
}

export interface IpLookup {
  ip: string;
  location: Location;
  network: Network;
  traits: Traits;
}

export interface Me {
  ip: string;
  plan: string;
  usage?: { used: number; limit: number | null; remaining: number | null; period: string; reset_at: string };
  limits?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BulkResult {
  results: Record<string, IpLookup>;
  errors: Record<string, { error?: { code?: string; message?: string }; [k: string]: unknown }>;
}

export interface ClientOptions {
  /** Defaults to process.env.NDL_API_KEY when available. */
  apiKey?: string;
  baseUrl?: string;
  /** Request timeout in ms (default 10000). */
  timeout?: number;
  fetch?: typeof fetch;
}

export class NetworkDataLabsError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    super(err?.message ? `${err.code ?? "HTTP_" + status}: ${err.message}` : `HTTP ${status}`);
    this.name = "NetworkDataLabsError";
    this.status = status;
    this.code = err?.code;
    this.body = body;
  }
}

const DEFAULT_BASE = "https://api.networkdatalabs.com";

export class NetworkDataLabs {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions = {}) {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const envKey = proc?.env?.NDL_API_KEY;
    const apiKey = options.apiKey ?? envKey;
    if (!apiKey) throw new Error("Missing API key: pass { apiKey } or set NDL_API_KEY");
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, "");
    this.timeout = options.timeout ?? 10000;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Look up an IPv4/IPv6 address. Omit `ip` to look up the caller's own IP. */
  lookup(ip?: string): Promise<IpLookup> {
    return this.request<IpLookup>("GET", ip ? `/v0/ip/${encodeURIComponent(ip)}` : "/v0/ip");
  }

  /** Caller IP, plan, current-period usage and limits. */
  me(): Promise<Me> {
    return this.request<Me>("GET", "/v0/me");
  }

  /** Look up up to 100 IPs in one request (paid plans). */
  bulk(ips: string[]): Promise<BulkResult> {
    if (!Array.isArray(ips) || ips.length === 0) throw new Error("bulk() needs at least one IP");
    if (ips.length > 100) throw new Error("bulk() accepts at most 100 IPs per request");
    return this.request<BulkResult>("POST", "/v0/bulk", { ips });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await this.fetchImpl(this.baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) throw new NetworkDataLabsError(res.status, data);
    return data as T;
  }
}

export default NetworkDataLabs;
