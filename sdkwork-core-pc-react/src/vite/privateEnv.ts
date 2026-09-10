// base-url-check: exempt (Node-side Vite define-key constants for private
// SSR/server build env injection; not a browser base-url resolution point,
// see ENVIRONMENT_SPEC §5.1.4.1)
export const SDKWORK_VITE_PRIVATE_ENV_DEFINE_KEYS = {
  accessToken: "process.env.SDKWORK_ACCESS_TOKEN",
  apiBaseUrl: "process.env.SDKWORK_API_BASE_URL", // base-url-check: exempt (Node-side Vite private define key, §5.1.4.1)
  timeout: "process.env.SDKWORK_TIMEOUT",
  platform: "process.env.SDKWORK_PLATFORM",
} as const;

export function buildSdkworkVitePrivateEnvDefine(
  env: Record<string, string | undefined>,
): Record<string, string> {
  return {
    [SDKWORK_VITE_PRIVATE_ENV_DEFINE_KEYS.accessToken]: JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ""),
    // base-url-check: exempt (Node-side Vite private define mapping, §5.1.4.1)
    [SDKWORK_VITE_PRIVATE_ENV_DEFINE_KEYS.apiBaseUrl]: JSON.stringify(env.SDKWORK_API_BASE_URL ?? ""),
    [SDKWORK_VITE_PRIVATE_ENV_DEFINE_KEYS.timeout]: JSON.stringify(env.SDKWORK_TIMEOUT ?? ""),
    [SDKWORK_VITE_PRIVATE_ENV_DEFINE_KEYS.platform]: JSON.stringify(env.SDKWORK_PLATFORM ?? ""),
  };
}

export function stripForbiddenCredentialEnvEntries<T extends Record<string, unknown>>(
  env: T,
): T {
  const forbiddenKeyPattern =
    /^(?:SDKWORK_[A-Z0-9_]+_ACCESS_TOKEN|SDKWORK_(?:AUTH|REFRESH)_TOKEN|SDKWORK(?:_[A-Z0-9_]+)?_API_KEY|VITE_(?:[A-Z0-9_]*_)?(?:ACCESS|AUTH|REFRESH|API)_TOKEN|VITE_(?:[A-Z0-9_]+_)?API_KEY|VITE_[A-Z0-9_]*SECRET[A-Z0-9_]*|PORTAL_PUBLIC_.*(?:TOKEN|API_KEY))$/iu;

  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !forbiddenKeyPattern.test(key)),
  ) as T;
}
