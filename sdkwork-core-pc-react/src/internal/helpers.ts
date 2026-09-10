import type { PcReactAuthMode, PcReactRuntimeEnv } from "./contracts";
import { getApiHostForEnvironment, getBrand } from '@sdkwork/sdk-common';

const DEFAULT_TIMEOUT = 30_000;

export function firstNonEmptyValue(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

export function normalizeString(value?: string): string {
  return (value || "").trim();
}

export function normalizeBearerToken(value?: string): string {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  return normalized.replace(/^Bearer\s+/i, "").trim();
}

export function normalizeUrl(value?: string): string {
  return normalizeString(value).replace(/\/+$/g, "");
}

export function parsePositiveNumber(value?: string, fallback: number = DEFAULT_TIMEOUT): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function parseOptionalNumber(value?: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function parseBoolean(value: string | boolean | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeString(typeof value === "string" ? value : String(fallback)).toLowerCase();
  return normalized === "true" || normalized === "1";
}

export function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function safeParseJson<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function safeStringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Reads the dev:cloud local platform gateway anchor
 * (APP_RUNTIME_TOPOLOGY_SPEC section 4.2, SDK_SPEC section 5.1 step 2).
 * Browser builds receive it as a VITE_-prefixed variable; dev servers and
 * node-side callers receive the server-side key. Absent means "not running
 * dev:cloud", so callers fall back to the environment domain family.
 */
function readLocalGatewayAnchor(): string {
  const browserEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return (
    normalizeUrl(browserEnv?.VITE_SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL)
    || normalizeUrl(processEnv?.VITE_SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL)
    || normalizeUrl(processEnv?.SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL)
    || ""
  );
}

export function resolveDefaultBaseUrl(env: PcReactRuntimeEnv): string {
  // APP_RUNTIME_TOPOLOGY_SPEC section 4.2 / SDK_SPEC section 5.1 step 2:
  // dev:cloud binds the local platform gateway (ip:port); the environment
  // domain families stay build/deploy defaults.
  if (env === "development") {
    const localGateway = readLocalGatewayAnchor();
    if (localGateway) {
      return localGateway;
    }
  }

  // ENVIRONMENT_SPEC.md §6.3: the api[-<env>].<brand> family host is derived
  // from the current page brand through the shared @sdkwork/sdk-common
  // helpers instead of a local domain table (built pages: same brand family
  // as the serving edge; pnpm dev without a local gateway anchor falls back
  // to the dev family of the configured brand domain).
  const brand = getBrand(
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "sdkwork.com",
  );
  return `https://${getApiHostForEnvironment(env === "development" ? "dev" : env, brand)}`;
}

export function resolveDefaultImWsUrl(baseUrl: string): string {
  const normalizedBaseUrl = normalizeUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return "";
  }

  try {
    const url = new URL(normalizedBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/g, "");
  } catch {
    return "";
  }
}

export function resolveRuntimeEnv(...values: Array<string | undefined>): PcReactRuntimeEnv {
  const normalized = firstNonEmptyValue(...values)?.toLowerCase();

  if (normalized === "production" || normalized === "prod") {
    return "production";
  }

  if (normalized === "test") {
    return "test";
  }

  if (normalized === "staging" || normalized === "stage") {
    return "staging";
  }

  return "development";
}

export function resolveAuthMode(
  apiKey?: string,
  accessToken?: string,
  authToken?: string,
  explicitMode?: PcReactAuthMode
): PcReactAuthMode {
  if (explicitMode) {
    return explicitMode;
  }

  if (normalizeString(apiKey) && !normalizeString(accessToken) && !normalizeString(authToken)) {
    return "apikey";
  }

  return "dual-token";
}
