import { normalizeBearerToken, normalizeString } from "./helpers";

export const SDKWORK_TOKEN_VERSION_CURRENT = 1;

export interface SdkworkTokenVersionPolicy {
  current: number;
  minimumAccepted: number;
  maximumAccepted: number;
}

export const SDKWORK_TOKEN_VERSION_POLICY: SdkworkTokenVersionPolicy = {
  current: SDKWORK_TOKEN_VERSION_CURRENT,
  minimumAccepted: SDKWORK_TOKEN_VERSION_CURRENT,
  maximumAccepted: SDKWORK_TOKEN_VERSION_CURRENT,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTokenVersionClaim(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  }

  return undefined;
}

export function validateSdkworkTokenVersion(
  token: string,
  tokenLabel: "Access-Token" | "Authorization" | string,
  policy: SdkworkTokenVersionPolicy = SDKWORK_TOKEN_VERSION_POLICY,
): void {
  const claims = parseJwtPayload(token);
  if (!claims) {
    throw new Error(`${tokenLabel} must include a readable JWT payload for token_version validation`);
  }

  const version = parseTokenVersionClaim(claims.token_version);
  if (version === undefined) {
    throw new Error(`${tokenLabel} must include a non-negative integer token_version claim`);
  }
  if (version < policy.minimumAccepted) {
    throw new Error(
      `${tokenLabel} token_version ${version} is below the accepted minimum ${policy.minimumAccepted}`,
    );
  }
  if (version > policy.maximumAccepted) {
    throw new Error(
      `${tokenLabel} token_version ${version} exceeds the accepted maximum ${policy.maximumAccepted}`,
    );
  }
}

export function isSdkworkJwtCompactSerialization(token: string): boolean {
  const normalized = normalizeBearerToken(token);
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith("{")) {
    return false;
  }
  if (normalized.includes("=") && !normalized.includes(".")) {
    return false;
  }

  const parts = normalized.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function assertSdkworkJwtCredential(
  token: string,
  tokenLabel: "Access-Token" | "Authorization" | string,
): void {
  const normalized = normalizeBearerToken(token);
  if (!normalized) {
    throw new Error(`${tokenLabel} is required`);
  }
  if (normalized.startsWith("{")) {
    throw new Error(`${tokenLabel} must be a JWT compact serialization, not a JSON object`);
  }
  if (normalized.includes("=") && !normalized.includes(".")) {
    throw new Error(`${tokenLabel} must be a signed JWT; semicolon claim-string tokens are not accepted`);
  }

  const parts = normalized.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error(`${tokenLabel} must be a JWT compact serialization (header.payload.signature)`);
  }

  validateSdkworkTokenVersion(normalized, tokenLabel);
}

export function createTestJwt(claims: Record<string, unknown>): string {
  const payload = {
    token_version: SDKWORK_TOKEN_VERSION_CURRENT,
    ...claims,
  };
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" })).replace(/=+$/g, "");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=+$/g, "");
  return `${header}.${encodedPayload}.signature`;
}

export function parseJwtPayload(token: string): Record<string, unknown> | undefined {
  const normalizedToken = normalizeBearerToken(token);
  const parts = normalizedToken.split(".");
  if (parts.length < 2) {
    return undefined;
  }
  const payloadPart = parts[1];
  if (!payloadPart) {
    return undefined;
  }

  try {
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4 || 4)) % 4),
      "=",
    );
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function readJwtClaimString(
  claims: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = normalizeString(String(claims[key] ?? ""));
    if (value) {
      return value;
    }
  }

  return undefined;
}

export interface DualTokenIdentityClaims {
  appId?: string;
  organizationId?: string;
  tenantId?: string;
}

function normalizeOrganizationClaim(value?: string): string | undefined {
  if (!value || value === "0") {
    return undefined;
  }

  return value;
}

export function resolveDualTokenIdentityClaims(
  accessToken?: string,
  authToken?: string,
): DualTokenIdentityClaims {
  const accessClaims = accessToken ? parseJwtPayload(accessToken) : undefined;
  const authClaims = authToken ? parseJwtPayload(authToken) : undefined;

  const tenantId =
    readJwtClaimString(accessClaims ?? {}, "tenant_id")
    || readJwtClaimString(authClaims ?? {}, "tenant_id");
  const organizationId = normalizeOrganizationClaim(
    readJwtClaimString(accessClaims ?? {}, "organization_id")
      || readJwtClaimString(authClaims ?? {}, "organization_id"),
  );
  const appId =
    readJwtClaimString(accessClaims ?? {}, "app_id", "aud")
    || readJwtClaimString(authClaims ?? {}, "app_id", "aud");

  return {
    ...(tenantId ? { tenantId } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(appId ? { appId } : {}),
  };
}
