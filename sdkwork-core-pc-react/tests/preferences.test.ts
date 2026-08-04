import { beforeEach, describe, expect, it } from "vitest";

const PREFERENCES_STORAGE_KEY = "sdkwork.core.pc-react.preferences";

function createStorage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("shell preferences", () => {
  beforeEach(async () => {
    const { resetPcReactRuntime } = await import("../src");
    resetPcReactRuntime();
    document.documentElement.lang = "";
  });

  it("persists and reloads shell preferences from the active storage adapter", async () => {
    const {
      configurePcReactRuntime,
      persistPcReactShellPreferences,
      readPcReactShellPreferences,
      resetPcReactRuntime,
    } = await import("../src");

    resetPcReactRuntime();

    configurePcReactRuntime({
      preferences: {
        defaults: {
          locale: "en-US",
          themeColor: "zinc",
          themeSelection: "system",
        },
      },
      storage: createStorage(),
    });

    expect(
      persistPcReactShellPreferences({
        locale: "zh-CN",
        themeColor: "rose",
        themeSelection: "dark",
      }),
    ).toEqual({
      locale: "zh-CN",
      localePreference: "zh-CN",
      themeColor: "rose",
      themeSelection: "dark",
    });

    expect(readPcReactShellPreferences()).toEqual({
      locale: "zh-CN",
      localePreference: "zh-CN",
      themeColor: "rose",
      themeSelection: "dark",
    });

    configurePcReactRuntime({
      storage: createStorage({
        [PREFERENCES_STORAGE_KEY]: JSON.stringify({
          locale: "fr-FR",
          themeColor: "violet",
          themeSelection: "light",
        }),
      }),
    });

    expect(readPcReactShellPreferences()).toEqual({
      locale: "fr-FR",
      localePreference: "fr-FR",
      themeColor: "violet",
      themeSelection: "light",
    });
  });

  it("normalizes invalid stored values back to configured and document defaults", async () => {
    const {
      configurePcReactRuntime,
      readPcReactShellPreferences,
    } = await import("../src");

    document.documentElement.lang = "ja-JP";

    configurePcReactRuntime({
      preferences: {
        defaults: {
          themeColor: "lobster",
          themeSelection: "system",
        },
      },
      storage: createStorage({
        [PREFERENCES_STORAGE_KEY]: JSON.stringify({
          locale: "",
          themeColor: "aurora",
          themeSelection: "sunrise",
        }),
      }),
    });

    expect(readPcReactShellPreferences()).toEqual({
      locale: "ja-JP",
      localePreference: "system",
      themeColor: "lobster",
      themeSelection: "system",
    });
  });

  it("keeps shell preferences independent from runtime session clearing", async () => {
    const {
      clearPcReactRuntimeSession,
      clearPcReactShellPreferences,
      configurePcReactRuntime,
      persistPcReactRuntimeSession,
      persistPcReactShellPreferences,
      readPcReactRuntimeSession,
      readPcReactShellPreferences,
    } = await import("../src");

    configurePcReactRuntime({
      preferences: {
        defaults: {
          locale: "en-US",
          themeColor: "zinc",
          themeSelection: "system",
        },
      },
      storage: createStorage(),
    });

    persistPcReactRuntimeSession({
      accessToken: "access-1",
      authToken: "auth-1",
      refreshToken: "refresh-1",
    });
    persistPcReactShellPreferences({
      locale: "zh-CN",
      themeColor: "green-tech",
      themeSelection: "dark",
    });

    await clearPcReactRuntimeSession();

    expect(readPcReactRuntimeSession()).toEqual({
      accessToken: undefined,
      authToken: undefined,
      im: undefined,
      refreshToken: undefined,
    });
    expect(readPcReactShellPreferences()).toEqual({
      locale: "zh-CN",
      localePreference: "zh-CN",
      themeColor: "green-tech",
      themeSelection: "dark",
    });

    persistPcReactRuntimeSession({
      accessToken: "access-2",
      authToken: "auth-2",
      refreshToken: "refresh-2",
    });

    clearPcReactShellPreferences();

    expect(readPcReactShellPreferences()).toEqual({
      locale: "en-US",
      localePreference: "en-US",
      themeColor: "zinc",
      themeSelection: "system",
    });
    expect(readPcReactRuntimeSession()).toEqual({
      accessToken: "access-2",
      authToken: "auth-2",
      im: undefined,
      refreshToken: "refresh-2",
    });
  });

  it("resolves system theme selection into a concrete color mode", async () => {
    const {
      configurePcReactRuntime,
      resolvePcReactShellPreferences,
    } = await import("../src");

    configurePcReactRuntime({
      preferences: {
        defaults: {
          locale: "en-US",
          themeColor: "zinc",
          themeSelection: "system",
        },
      },
      storage: createStorage(),
    });

    expect(
      resolvePcReactShellPreferences({
        prefersDark: true,
      }),
    ).toEqual({
      colorMode: "dark",
      locale: "en-US",
      localePreference: "en-US",
      themeColor: "zinc",
      themeSelection: "system",
    });

    expect(
      resolvePcReactShellPreferences({
        prefersDark: false,
      }),
    ).toEqual({
      colorMode: "light",
      locale: "en-US",
      localePreference: "en-US",
      themeColor: "zinc",
      themeSelection: "system",
    });
  });

  it("defaults to cloud-aligned lobster theme color and preserves a system locale preference", async () => {
    const {
      configurePcReactRuntime,
      readPcReactShellPreferences,
    } = await import("../src");

    document.documentElement.lang = "zh-CN";

    configurePcReactRuntime({
      storage: createStorage(),
    });

    expect(readPcReactShellPreferences()).toEqual({
      locale: "zh-CN",
      localePreference: "system",
      themeColor: "lobster",
      themeSelection: "system",
    });
  });

  it("accepts cloud tech-blue as a valid shell theme color", async () => {
    const {
      configurePcReactRuntime,
      readPcReactShellPreferences,
    } = await import("../src");

    configurePcReactRuntime({
      storage: createStorage({
        [PREFERENCES_STORAGE_KEY]: JSON.stringify({
          locale: "en-US",
          localePreference: "system",
          themeColor: "tech-blue",
          themeSelection: "dark",
        }),
      }),
    });

    expect(readPcReactShellPreferences()).toEqual({
      locale: "en-US",
      localePreference: "system",
      themeColor: "tech-blue",
      themeSelection: "dark",
    });
  });
});
