// noinspection JSIgnoredPromiseFromCall
import * as particles from "./utils/particles";
import {
  AppConfigSchema,
  ThemeConfigSchema,
  ParticleOptions,
  GameConfig,
} from "./schemas";
import { mergeAppData, mergeThemeData } from "./utils/mergeData";
import {
  showNotification,
  initNotificationTimer,
  setNotificationTimer,
} from "./utils/notifications";
import { getContrastColor } from "./utils/getContrastColor";
import { safePrompt } from "./utils/safePrompt";
import { hexToRgba } from "./utils/hexToRgba";

let appVersion: string;
let preventMenuClose = false;
let lastParticleOptions: ParticleOptions | null = null;
let games: GameConfig[] = [];
const seenOffline = new Map<string, boolean>();

function compareSemver(a: string, b: string): number {
  const splitA = a.split(".");
  const splitB = b.split(".");

  let currentA, currentB: number;
  for (let i = 0; i < splitA.length; i++) {
    currentA = Number(splitA[i]);
    currentB = Number(splitB[i]);
    if (currentA > currentB) {
      return 1;
    } else if (currentA < currentB) {
      return -1;
    }
  }
  return 0;
}

let pingIntervalId: number | null = null;

/**
 * Sets ping interval from user config
 */
async function setupPingInterval() {
  // Read config and retrieve rate (or fallback to 30 000 ms)
  const cfg = await window.api.localAppConfig();
  const seconds = cfg.serverInfoPingRate;
  const rate = Math.max(1, seconds) * 1000;

  // If there was an interval running already, stop it
  if (pingIntervalId !== null) {
    clearInterval(pingIntervalId);
  }

  // Start a new interval
  pingIntervalId = window.setInterval(refreshAllServerInfos, rate);
}

/**
 * Dynamically inject or remove a Google Font from a <link> in <head>.
 * key is here to differentiate <link> (ex. "primary" or "secondary").
 */
function useGoogleFont(url: string, key: string) {
  const existing = document.getElementById(`gf-${key}`);
  if (existing) existing.remove();
  if (!url) return;
  const link = document.createElement("link");
  link.id = `gf-${key}`;
  link.rel = "stylesheet";
  link.href = url;
  document.head.append(link);
}

/**
 * Extracts family name from a Google Fonts URL.
 * Ex: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700" → "Roboto"
 */
function extractFamilyName(url: string): string {
  try {
    const params = new URL(url).searchParams.get("family");
    return params?.split(":")[0].replace(/_/g, " ") ?? "";
  } catch {
    return "";
  }
}

async function updateGameList(task: (appConfig: AppConfig) => void) {
  const appConfig = await window.api.localAppConfig();
  task(appConfig);
  window.api.saveAppConfig(appConfig);
}

window.api.onDownloadStarted(({ fileName }) => {
  showNotification(`Downloading update: ${fileName}`);
});

window.api.showNotification((message: string) => {
  showNotification(message);
});

window.api.onShowPrompt(({ id, message, options }) => {
  safePrompt(message, options).then((answer) => {
    window.api.sendPromptResponse(id, answer);
  });
});

document.querySelector("#add-game").addEventListener("click", async () => {
  const gameUrlField = document.querySelector("#game-url") as HTMLInputElement;
  const gameNameField = document.querySelector(
    "#game-name",
  ) as HTMLInputElement;
  const gameUrl = gameUrlField.value;
  const gameName = gameNameField.value;
  if (!gameUrl || !gameName) {
    await safePrompt("Please enter a game name and URL.", { mode: "alert" });
    return;
  }
  const newGameItem = {
    name: gameName,
    url: gameUrl,
    id: Math.round(Math.random() * 1000000),
  } as GameConfig;
  await updateGameList((appConfig) => {
    appConfig.games = appConfig?.games ?? [];
    appConfig.games.push(newGameItem);
  });
  gameUrlField.value = "";
  gameNameField.value = "";
  await createGameItem(newGameItem);
  showNotification("Game added");
});

const gameItemList = document.querySelector("#game-list");
const gameItemTemplate = document
  .querySelector("template")
  .content.querySelector("li");

document
  .querySelector("#save-app-config")
  .addEventListener("click", async (e) => {
    if (!(e.target instanceof Element)) return;

    const appConfigMenu = document.querySelector(
      ".app-configuration",
    ) as HTMLDivElement;

    if (appConfigMenu && !preventMenuClose) {
      appConfigMenu.classList.add("hidden2");

      const computedStyle = window.getComputedStyle(appConfigMenu);
      const transitionDuration =
        parseFloat(computedStyle.transitionDuration) || 0;

      if (transitionDuration > 0) {
        appConfigMenu.addEventListener("transitionend", function handler(e) {
          if (e.propertyName === "opacity") {
            appConfigMenu.classList.remove("show");
            appConfigMenu.classList.remove("flex-display");
            appConfigMenu.classList.add("hidden-display");
            appConfigMenu.removeEventListener("transitionend", handler);
          }
        });
      } else {
        appConfigMenu.classList.remove("show");
        appConfigMenu.classList.remove("flex-display");
        appConfigMenu.classList.add("hidden-display");
      }
    }

    preventMenuClose = false;

    const closeUserConfig = e.target.closest(
      ".app-configuration",
    ) as HTMLDivElement;
    const cachePath = (
      closeUserConfig.querySelector("#cache-path") as HTMLInputElement
    ).value;
    const autoCacheClear = (
      closeUserConfig.querySelector("#clear-cache-on-close") as HTMLInputElement
    ).checked;
    const ignoreCertificateErrors = (
      closeUserConfig.querySelector("#insecure-ssl") as HTMLInputElement
    ).checked;
    const discordRP = (
      closeUserConfig.querySelector("#discord-rp") as HTMLInputElement
    ).checked;
    const notificationTimer = Number(
      (closeUserConfig.querySelector("#notification-timer") as HTMLInputElement)
        .value,
    );
    const serverInfoEnabled = (
      closeUserConfig.querySelector("#server-infos-toggle") as HTMLInputElement
    ).checked;
    const statusEnabled = (
      closeUserConfig.querySelector("#server-status-toggle") as HTMLInputElement
    ).checked;
    const foundryVersionEnabled = (
      closeUserConfig.querySelector(
        "#foundry-version-toggle",
      ) as HTMLInputElement
    ).checked;
    const worldEnabled = (
      closeUserConfig.querySelector("#world-toggle") as HTMLInputElement
    ).checked;
    const gameSystemEnabled = (
      closeUserConfig.querySelector("#game-system-toggle") as HTMLInputElement
    ).checked;
    const gameSystemVersionEnabled = (
      closeUserConfig.querySelector("#game-version-toggle") as HTMLInputElement
    ).checked;
    const onlinePlayersEnabled = (
      closeUserConfig.querySelector(
        "#online-players-toggle",
      ) as HTMLInputElement
    ).checked;
    const fullScreenEnabled = (
      closeUserConfig.querySelector("#full-screen-toggle") as HTMLInputElement
    ).checked;
    const serverInfoPingRate = Number(
      (
        closeUserConfig.querySelector(
          "#server-infos-ping-rate",
        ) as HTMLInputElement
      ).value,
    );
    const config = {
      cachePath,
      autoCacheClear,
      ignoreCertificateErrors,
      discordRP,
      notificationTimer,
      serverInfoEnabled,
      serverInfoOptions: {
        statusEnabled,
        foundryVersionEnabled,
        worldEnabled,
        gameSystemEnabled,
        gameSystemVersionEnabled,
        onlinePlayersEnabled,
      },
      serverInfoPingRate,
      fullScreenEnabled,
    } as AppConfig;

    const rawConfig: unknown = {
      games: games,
      cachePath: config.cachePath,
      autoCacheClear: config.autoCacheClear,
      ignoreCertificateErrors: config.ignoreCertificateErrors,
      notificationTimer: config.notificationTimer,
      discordRP: config.discordRP,
      customCSS: config.customCSS,
      serverInfoEnabled: config.serverInfoEnabled,
      serverInfoOptions: config.serverInfoOptions,
      serverInfoPingRate: config.serverInfoPingRate,
      fullScreenEnabled: config.fullScreenEnabled,
    };

    const result = AppConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      console.error(result.error.format());
      await safePrompt(
        "Invalid client values detected. Changes were not applied.",
        { mode: "alert" },
      );
      const appConfig = await window.api.localAppConfig();
      applyAppConfig(appConfig);
      return;
    }

    console.log(config);
    const validConfig = result.data as AppConfig;

    const timer =
      typeof validConfig.notificationTimer === "number"
        ? validConfig.notificationTimer
        : 3;
    setNotificationTimer(timer);

    await window.api.saveAppConfig(validConfig);
    applyAppConfig(validConfig);
    refreshAllServerInfos();
    await setupPingInterval();
    showNotification("Changes saved");
  });

const cancelButton = document.querySelector(
  "#cancel-app-config",
) as HTMLButtonElement;

if (cancelButton) {
  cancelButton.addEventListener("click", async () => {
    const appConfig = await window.api.localAppConfig();
    applyAppConfig(appConfig);
    showNotification("Changes canceled");

    const appConfigMenu = document.querySelector(
      ".app-configuration",
    ) as HTMLDivElement;
    if (appConfigMenu) {
      appConfigMenu.classList.add("hidden2");

      const computedStyle = window.getComputedStyle(appConfigMenu);
      const transitionDuration =
        parseFloat(computedStyle.transitionDuration) || 0;

      if (transitionDuration > 0) {
        appConfigMenu.addEventListener("transitionend", function handler(e) {
          if (e.propertyName === "opacity") {
            appConfigMenu.classList.remove("show");
            appConfigMenu.classList.remove("flex-display");
            appConfigMenu.classList.add("hidden-display");
            appConfigMenu.removeEventListener("transitionend", handler);
          }
        });
      } else {
        appConfigMenu.classList.remove("show");
        appConfigMenu.classList.remove("flex-display");
        appConfigMenu.classList.add("hidden-display");
      }
    }
  });
}

document.querySelector("#clear-cache").addEventListener("click", async () => {
  const confirmed = await safePrompt(
    "Are you sure you want to clear the cache?",
  );
  if (!confirmed) return;
  window.api.clearCache();
  showNotification("Cache cleared");
});

document
  .querySelector("#save-theme-config")
  .addEventListener("click", async (e) => {
    if (!(e.target instanceof Element)) return;

    const themeConfigMenu = document.querySelector(
      ".theme-configuration",
    ) as HTMLDivElement;

    if (themeConfigMenu && !preventMenuClose) {
      themeConfigMenu.classList.add("hidden2");

      const computedStyle = window.getComputedStyle(themeConfigMenu);
      const transitionDuration =
        parseFloat(computedStyle.transitionDuration) || 0;

      if (transitionDuration > 0) {
        themeConfigMenu.addEventListener("transitionend", function handler(e) {
          if (e.propertyName === "opacity") {
            themeConfigMenu.classList.remove("show");
            themeConfigMenu.classList.remove("flex-display");
            themeConfigMenu.classList.add("hidden-display");
            themeConfigMenu.removeEventListener("transitionend", handler);
          }
        });
      } else {
        themeConfigMenu.classList.remove("show");
        themeConfigMenu.classList.remove("flex-display");
        themeConfigMenu.classList.add("hidden-display");
      }
    }

    preventMenuClose = false;
    const existingConfig = await window.api.localThemeConfig();
    const closeUserConfig = e.target.closest(
      ".theme-configuration",
    ) as HTMLDivElement;
    const themeSelector = document.querySelector(
      "#theme-selector",
    ) as HTMLSelectElement;
    const background = (
      closeUserConfig.querySelector("#background-image") as HTMLInputElement
    ).value;
    const accentColor = (
      closeUserConfig.querySelector("#accent-color") as HTMLInputElement
    ).value;
    const backgroundColor = (
      closeUserConfig.querySelector("#background-color") as HTMLInputElement
    ).value;
    const textColor = (
      closeUserConfig.querySelector("#text-color") as HTMLInputElement
    ).value;
    const buttonColorAlphaInput = closeUserConfig.querySelector(
      "#button-color-alpha",
    ) as HTMLInputElement;
    const buttonColorAlpha = buttonColorAlphaInput.valueAsNumber;
    const buttonColor = (
      closeUserConfig.querySelector("#button-color") as HTMLInputElement
    ).value;
    const buttonColorHoverAlphaInput = closeUserConfig.querySelector(
      "#button-color-hover-alpha",
    ) as HTMLInputElement;
    const buttonColorHoverAlpha = buttonColorHoverAlphaInput.valueAsNumber;
    const buttonColorHover = (
      closeUserConfig.querySelector("#button-color-hover") as HTMLInputElement
    ).value;
    const particlesEnabled = (
      closeUserConfig.querySelector("#particles-button") as HTMLInputElement
    ).checked;
    const particlesCount = Number(
      (closeUserConfig.querySelector("#particles-count") as HTMLInputElement)
        .value,
    );
    const particlesSpeed = Number(
      (closeUserConfig.querySelector("#particles-speed") as HTMLInputElement)
        .value,
    );
    const particlesColorAlphaInput = closeUserConfig.querySelector(
      "#particles-color-alpha",
    ) as HTMLInputElement;
    const particlesColorAlpha = particlesColorAlphaInput.valueAsNumber;
    const particlesColor = (
      closeUserConfig.querySelector("#particles-color") as HTMLInputElement
    ).value;
    const primaryFontSelect = document.querySelector(
      "#primary-font-selector",
    ) as HTMLSelectElement;
    const secondaryFontSelect = document.querySelector(
      "#secondary-font-selector",
    ) as HTMLSelectElement;
    const customPrimary = document.querySelector<HTMLInputElement>(
      "#primary-custom-font",
    )!;
    const customSecondary = document.querySelector<HTMLInputElement>(
      "#secondary-custom-font",
    )!;
    const selectedBase = themeSelector?.value || existingConfig.baseTheme;
    const config = {
      baseTheme: selectedBase,
      accentColor,
      backgroundColor,
      background,
      textColor,
      buttonColorAlpha,
      buttonColor,
      buttonColorHoverAlpha,
      buttonColorHover,
      particlesEnabled,
      particleOptions: {
        count: particlesCount,
        speedYMin: particlesSpeed / 2,
        speedYMax: particlesSpeed,
        color: particlesColor,
        alpha: particlesColorAlpha,
      },
    } as ThemeConfig;

    if (primaryFontSelect.value === "__custom") {
      config.fontPrimaryUrl = customPrimary.value.trim();
      config.fontPrimary = "__custom";
    } else if (primaryFontSelect.value === "__file") {
      config.fontPrimary = "__file";
      config.fontPrimaryName = existingConfig.fontPrimaryName;
      config.fontPrimaryFilePath = existingConfig.fontPrimaryFilePath;
    } else {
      config.fontPrimary = primaryFontSelect.value;
      config.fontPrimaryUrl = "";
      config.fontPrimaryFilePath = "";
      config.fontPrimaryName = "";
    }

    if (secondaryFontSelect.value === "__custom") {
      config.fontSecondaryUrl = customSecondary.value.trim();
      config.fontSecondary = "__custom";
    } else if (secondaryFontSelect.value === "__file") {
      config.fontSecondary = "__file";
      config.fontSecondaryName = existingConfig.fontSecondaryName;
      config.fontSecondaryFilePath = existingConfig.fontSecondaryFilePath;
    } else {
      config.fontSecondary = secondaryFontSelect.value;
      config.fontSecondaryUrl = "";
      config.fontSecondaryFilePath = "";
      config.fontSecondaryName = "";
    }

    const rawConfig: unknown = { ...config };

    const result = ThemeConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      console.error(result.error.format());
      await safePrompt(
        "Invalid theme values detected. Changes were not applied.",
        { mode: "alert" },
      );
      const themeConfig = await window.api.localThemeConfig();
      applyThemeConfig(themeConfig);
      return;
    }

    console.log(config);
    const validConfig = result.data as ThemeConfig;

    await window.api.saveThemeConfig(validConfig);
    applyThemeConfig(validConfig);
    showNotification("Theme saved");
  });

const cancelThemeButton = document.querySelector(
  "#cancel-theme-config",
) as HTMLButtonElement;

if (cancelThemeButton) {
  cancelThemeButton.addEventListener("click", async () => {
    const themeConfig = await window.api.localThemeConfig();
    applyThemeConfig(themeConfig);
    showNotification("Changes canceled");

    const themeConfigMenu = document.querySelector(
      ".theme-configuration",
    ) as HTMLDivElement;
    if (themeConfigMenu) {
      themeConfigMenu.classList.add("hidden2");

      const computedStyle = window.getComputedStyle(themeConfigMenu);
      const transitionDuration =
        parseFloat(computedStyle.transitionDuration) || 0;

      if (transitionDuration > 0) {
        themeConfigMenu.addEventListener("transitionend", function handler(e) {
          if (e.propertyName === "opacity") {
            themeConfigMenu.classList.remove("show");
            themeConfigMenu.classList.remove("flex-display");
            themeConfigMenu.classList.add("hidden-display");
            themeConfigMenu.removeEventListener("transitionend", handler);
          }
        });
      } else {
        themeConfigMenu.classList.remove("show");
        themeConfigMenu.classList.remove("flex-display");
        themeConfigMenu.classList.add("hidden-display");
      }
    }
  });
}

window.addEventListener("keydown", (e) => {
  if (e.key === "F1" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    window.api.showMenu();
  }
});

document.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest(
    ".toggle-password",
  ) as HTMLButtonElement | null;
  if (!target) return;

  const input = target
    .closest(".password-field")
    ?.querySelector("input") as HTMLInputElement;
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    target.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
  } else {
    input.type = "password";
    target.innerHTML = '<i class="fa-solid fa-eye"></i>';
  }
});

const openUserDataBtn = document.getElementById(
  "open-user-data",
) as HTMLButtonElement | null;

if (openUserDataBtn) {
  openUserDataBtn.addEventListener("click", async () => {
    try {
      await window.api.openUserDataFolder();
    } catch (err) {
      console.error("Impossible d’ouvrir le dossier userData :", err);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const themeStylesheet = document.getElementById(
    "theme-stylesheet",
  ) as HTMLLinkElement;
  const themeSelector = document.getElementById(
    "theme-selector",
  ) as HTMLSelectElement;

  if (!themeStylesheet || !themeSelector) {
    console.error("Theme selector or stylesheet not found.");
    return;
  }

  await initNotificationTimer();
  const appConfig: AppConfig = await window.api.localAppConfig();
  const themeConfig: ThemeConfig = await window.api.localThemeConfig();

  const primaryFontSelect = document.querySelector<HTMLSelectElement>(
    "#primary-font-selector",
  )!;
  const primaryCustomField = document.getElementById("primary-custom-font")!;
  const primaryImportField = document.getElementById("primary-import-font")!;
  if (themeConfig.fontPrimary === "__custom") {
    primaryCustomField.style.display = "flex";
  } else if (themeConfig.fontPrimary === "__file") {
    primaryImportField.style.display = "block";
  }
  primaryFontSelect.addEventListener("change", () => {
    if (primaryFontSelect.value === "__custom") {
      primaryCustomField.style.display = "flex";
      primaryImportField.style.display = "none";
    } else if (primaryFontSelect.value === "__file") {
      primaryCustomField.style.display = "none";
      primaryImportField.style.display = "block";
    } else {
      primaryCustomField.style.display = "none";
      primaryImportField.style.display = "none";
    }
  });

  const secondaryFontSelect = document.querySelector<HTMLSelectElement>(
    "#secondary-font-selector",
  )!;
  const secondaryCustomField = document.getElementById(
    "secondary-custom-font",
  )!;
  const secondaryImportField = document.getElementById(
    "secondary-import-font",
  )!;

  if (themeConfig.fontSecondary === "__custom") {
    secondaryCustomField.style.display = "flex";
  } else if (themeConfig.fontSecondary === "__file") {
    secondaryImportField.style.display = "block";
  }
  secondaryFontSelect.addEventListener("change", () => {
    if (secondaryFontSelect.value === "__custom") {
      secondaryCustomField.style.display = "flex";
      secondaryImportField.style.display = "none";
    } else if (secondaryFontSelect.value === "__file") {
      secondaryCustomField.style.display = "none";
      secondaryImportField.style.display = "block";
    } else {
      secondaryCustomField.style.display = "none";
      secondaryImportField.style.display = "none";
    }
  });

  const loadPrimaryFontFileBtn = document.getElementById(
    "primary-import-font",
  )!;

  loadPrimaryFontFileBtn.addEventListener("click", async () => {
    const fontPath = await window.api.chooseFontFile();
    if (!fontPath) return;

    // Read the raw bytes, base64-encoded
    const b64 = await window.api.readFontFile(fontPath);
    if (!b64) {
      showNotification("Failed to load font file.");
      return;
    }

    // Derive a font name and MIME type
    const filename = fontPath.split(/[\\/]/).pop()!;
    const fontName = filename.replace(/\.[^.]+$/, "");
    const ext = filename.split(".").pop()!.toLowerCase();
    const mime =
      ext === "ttf"
        ? "font/ttf"
        : ext === "otf"
          ? "font/otf"
          : ext === "woff"
            ? "font/woff"
            : ext === "woff2"
              ? "font/woff2"
              : "application/octet-stream";

    // Build the data: URI
    const dataUri = `data:${mime};base64,${b64}`;

    // Inject @font-face
    const rule = `
        @font-face {
          font-family: "${fontName}";
          src: url("${dataUri}") format("${ext}");
          font-weight: normal;
          font-style: normal;
        }
      `;
    const style = document.createElement("style");
    style.textContent = rule;
    document.head.append(style);

    // Apply immediately
    document.documentElement.style.setProperty(
      "--font-primary",
      `"${fontName}", sans-serif`,
    );

    // Persist to config
    themeConfig.fontPrimary = "__file";
    themeConfig.fontPrimaryName = fontName;
    themeConfig.fontPrimaryFilePath = dataUri;

    await window.api.saveThemeConfig(themeConfig);

    showNotification("Primary font loaded successfully");
  });

  const loadSecondaryFontFileBtn = document.getElementById(
    "secondary-import-font",
  )!;

  loadSecondaryFontFileBtn.addEventListener("click", async () => {
    const fontPath = await window.api.chooseFontFile();
    if (!fontPath) return;

    // Read the raw bytes, base64-encoded
    const b64 = await window.api.readFontFile(fontPath);
    if (!b64) {
      showNotification("Failed to load font file.");
      return;
    }

    // Derive a font name and MIME type
    const filename = fontPath.split(/[\\/]/).pop()!;
    const fontName = filename.replace(/\.[^.]+$/, "");
    const ext = filename.split(".").pop()!.toLowerCase();
    const mime =
      ext === "ttf"
        ? "font/ttf"
        : ext === "otf"
          ? "font/otf"
          : ext === "woff"
            ? "font/woff"
            : ext === "woff2"
              ? "font/woff2"
              : "application/octet-stream";

    // Build the data: URI
    const dataUri = `data:${mime};base64,${b64}`;

    // Inject @font-face
    const rule = `
        @font-face {
          font-family: "${fontName}";
          src: url("${dataUri}") format("${ext}");
          font-weight: normal;
          font-style: normal;
        }
      `;
    const style = document.createElement("style");
    style.textContent = rule;
    document.head.append(style);

    // Apply immediately
    document.documentElement.style.setProperty(
      "--font-secondary",
      `"${fontName}", sans-serif`,
    );

    // Persist to config
    themeConfig.fontSecondary = "__file";
    themeConfig.fontSecondaryName = fontName;
    themeConfig.fontSecondaryFilePath = dataUri;

    await window.api.saveThemeConfig(themeConfig);

    showNotification("Secondary font loaded successfully");
  });

  const serverInfoConfig = document.querySelector<HTMLElement>(
    ".server-infos-configuration",
  );
  const serverInfoCheckbox = document.querySelector<HTMLInputElement>(
    "#server-infos-toggle",
  );
  if (serverInfoConfig && serverInfoCheckbox) {
    const setServerUI = (enabled: boolean) => {
      // stores toggle status
      serverInfoCheckbox.checked = enabled;
      // show/hide server status block
      serverInfoConfig.style.display = enabled ? "block" : "none";
      // show/hide every "refresh" buttons
      document
        .querySelectorAll<HTMLElement>(".config-main-button.refresh")
        .forEach((btn) => {
          btn.style.display = enabled ? "flex" : "none";
          console.log("test");
        });
    };

    // initial state from loaded config
    setServerUI(appConfig.serverInfoEnabled ?? true);
    // apply logic to each toggle
    serverInfoCheckbox.addEventListener("change", () => {
      setServerUI(serverInfoCheckbox.checked);
    });
  }

  const particlesConfig =
    document.querySelector<HTMLElement>(".particles-config")!;
  const particlesCheckbox =
    document.querySelector<HTMLInputElement>("#particles-button")!;
  if (themeConfig.particlesEnabled == true) {
    particlesConfig.style.display = "block";
  }
  particlesCheckbox.addEventListener("change", () => {
    if (particlesCheckbox.checked == true) {
      particlesConfig.style.display = "block";
    } else {
      particlesConfig.style.display = "none";
    }
  });

  const selectedTheme = themeConfig.baseTheme ?? "codex";
  themeStylesheet.setAttribute("href", `styles/${selectedTheme}.css`);
  themeSelector.value = selectedTheme;

  themeSelector.addEventListener("change", async () => {
    const newTheme = themeSelector.value;
    themeStylesheet.setAttribute("href", `styles/${newTheme}.css`);
    const themeConfigMenu = document.querySelector(
      ".theme-configuration",
    ) as HTMLDivElement;
    if (themeConfigMenu) {
      themeConfigMenu.classList.add("flex-display");
      themeConfigMenu.classList.remove("hidden2");
      themeConfigMenu.classList.remove("hidden-display");
      themeConfigMenu.classList.add("show");
    }

    themeConfig.baseTheme = newTheme;
    preventMenuClose = true;
    await window.api.saveThemeConfig(themeConfig);
    showNotification("Theme changed");
    preventMenuClose = false;
  });

  const resetAppearanceButton = document.getElementById(
    "reset-appearance",
  ) as HTMLButtonElement;
  const resetClientButton = document.getElementById(
    "reset-client",
  ) as HTMLButtonElement;

  if (resetAppearanceButton) {
    resetAppearanceButton.addEventListener("click", async () => {
      const confirmed = await safePrompt(
        "Are you sure you want to reset all theme settings? This will erase your custom colors, fonts and backgrounds (games and client settings are not affected).",
      );
      if (!confirmed) return;

      themeConfig.background = "";
      themeConfig.backgrounds = [];
      themeConfig.backgroundColor = "#0e1a23";
      themeConfig.textColor = "#88c0a9";
      themeConfig.accentColor = "#98e4f7";
      themeConfig.buttonColorAlpha = 0.65;
      themeConfig.buttonColor = "#14141e";
      themeConfig.accentColor = "#98e4f7";
      themeConfig.buttonColorHoverAlpha = 0.95;
      themeConfig.buttonColorHover = "#28283c";
      themeConfig.fontPrimary = "";
      themeConfig.fontPrimaryUrl = "";
      themeConfig.fontSecondary = "";
      themeConfig.fontSecondaryUrl = "";
      themeConfig.particleOptions.color = "#63b0c4";
      themeConfig.particleOptions.alpha = 0.15;
      themeConfig.particleOptions.count = 100;
      themeConfig.particleOptions.speedYMax = 0.3;
      themeConfig.particleOptions.speedYMin = 0.1;

      document.body.style.backgroundColor = "";
      applyThemeConfig(themeConfig);

      await window.api.saveThemeConfig(themeConfig);
      showNotification("Appearance settings reset");
    });
  }

  if (resetClientButton) {
    resetClientButton.addEventListener("click", async () => {
      const confirmed = await safePrompt(
        "Are you sure you want to reset all client settings? This will erase your cache, certificate, server status and Discord settings (games and themes are not affected).",
      );
      if (!confirmed) return;

      appConfig.cachePath = undefined;
      appConfig.autoCacheClear = undefined;
      appConfig.customCSS = undefined;
      appConfig.ignoreCertificateErrors = undefined;
      appConfig.discordRP = undefined;
      appConfig.fullScreenEnabled = undefined;

      applyAppConfig(appConfig);

      await window.api.saveAppConfig(appConfig);
      showNotification("Client settings reset");
    });
  }

  const transitioningMenus: Map<string, boolean> = new Map();

  async function toggleMenu(
    selector: string,
    onOpen?: () => Promise<void> | void,
  ) {
    const menu = document.querySelector(selector) as HTMLDivElement;
    if (!menu) return;

    const currentTransition = transitioningMenus.get(selector) ?? false;
    if (currentTransition) {
      console.log(
        `[FVTT Client] Transition already in progress for ${selector}, abort toggle.`,
      );
      return;
    }

    if (menu.classList.contains("hidden2")) {
      transitioningMenus.set(selector, true);

      menu.classList.add("flex-display");
      void menu.offsetWidth;
      menu.classList.remove("hidden2");
      menu.classList.remove("hidden-display");
      menu.classList.add("show");

      if (onOpen) {
        await onOpen();
      }

      const computedStyle = window.getComputedStyle(menu);
      const transitionDuration =
        parseFloat(computedStyle.transitionDuration) || 0;

      if (transitionDuration > 0) {
        menu.addEventListener("transitionend", function handler(e) {
          if (e.propertyName === "opacity") {
            transitioningMenus.set(selector, false);
            menu.removeEventListener("transitionend", handler);
          }
        });
      } else {
        transitioningMenus.set(selector, false);
      }
    } else if (menu.classList.contains("show")) {
      transitioningMenus.set(selector, true);

      menu.classList.add("hidden2");

      const computedStyle = window.getComputedStyle(menu);
      const transitionDuration =
        parseFloat(computedStyle.transitionDuration) || 0;

      if (transitionDuration > 0) {
        menu.addEventListener("transitionend", function handler(e) {
          if (e.propertyName === "opacity") {
            menu.classList.remove("show");
            menu.classList.remove("flex-display");
            menu.classList.add("hidden-display");
            transitioningMenus.set(selector, false);
            menu.removeEventListener("transitionend", handler);
          }
        });
      } else {
        menu.classList.remove("show");
        menu.classList.remove("flex-display");
        menu.classList.add("hidden-display");
        transitioningMenus.set(selector, false);
      }
    }
  }

  function toggleConfigureGame(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const gameItem = target.closest(".game-item") as HTMLDivElement;
    if (!gameItem) return;

    const userConfig = gameItem.querySelector(
      ".user-configuration",
    ) as HTMLDivElement;
    if (!userConfig) return;

    const allUserConfigs = document.querySelectorAll(".user-configuration");

    allUserConfigs.forEach((config) => {
      if (config !== userConfig) {
        config.classList.add("hidden");
      }
    });

    if (userConfig.classList.contains("hidden")) {
      userConfig.classList.remove("hidden");
      userConfig.style.height = "0px"; // Start collapsed but visible

      requestAnimationFrame(() => {
        const scrollHeight = userConfig.scrollHeight;
        userConfig.style.height = `${scrollHeight + 15}px`; // Animate expansion
      });
    } else {
      userConfig.style.height = "0px"; // Collapse
      userConfig.addEventListener("transitionend", function handler(e) {
        if (e.propertyName === "height") {
          userConfig.classList.add("hidden");
          userConfig.removeEventListener("transitionend", handler);
        }
      });
    }
  }

  document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest(
      ".config-main-button.config",
    ) as HTMLButtonElement | null;
    if (target) {
      toggleConfigureGame(event as MouseEvent);
    }
  });

  document.addEventListener("click", (event) => {
    // was refresh button clicked?
    const btn = (event.target as HTMLElement).closest(
      ".config-main-button.refresh",
    ) as HTMLButtonElement | null;
    if (!btn) return;

    // retrieve <li class="game-item">
    const li = btn.closest(".game-item") as HTMLElement | null;
    if (!li) return;

    // extract ID and retrieve correct config
    const key = li.dataset.gameId;
    const game = games.find((g) => String(g.id) === key);
    if (!game) return;

    // animate spinner icon
    const icon = btn.querySelector("i");
    if (icon) {
      const originalClass = icon.className;
      icon.className = "fa-solid fa-spinner fa-spin";

      updateServerInfos(li, game, seenOffline)
        .catch((err) => {
          console.warn(`updateServerInfos failed for ${game.name}:`, err);
        })
        .finally(() => {
          showNotification("Server status refreshed");
          icon.className = originalClass;
        });
    } else {
      // fallback if no icon
      updateServerInfos(li, game, seenOffline).catch((err) => {
        console.warn(`updateServerInfos failed for ${game.name}:`, err);
      });
    }
  });

  document
    .getElementById("open-config")
    ?.addEventListener("click", () => toggleMenu(".app-configuration"));
  document
    .getElementById("open-theme")
    ?.addEventListener("click", () => toggleMenu(".theme-configuration"));
  document
    .getElementById("open-help")
    ?.addEventListener("click", () => toggleMenu(".help"));
  document
    .getElementById("close-help")
    ?.addEventListener("click", () => toggleMenu(".help"));
  document.getElementById("open-share")?.addEventListener("click", async () => {
    await toggleMenu("#share-menu", async () => {
      (document.getElementById("share-input")! as HTMLTextAreaElement).value =
        "";
      (document.getElementById("share-output")! as HTMLElement).textContent =
        "";
    });
  });
  document.getElementById("close-share")?.addEventListener("click", () => {
    (document.getElementById("share-input")! as HTMLTextAreaElement).value = "";
    (document.getElementById("share-output")! as HTMLElement).textContent = "";
    toggleMenu("#share-menu");
  });
  document.querySelector("#share-copy").addEventListener("click", async () => {
    const txt = document.getElementById("share-output")!.textContent;
    navigator.clipboard.writeText(txt);
    if (!txt) {
      return showNotification("Nothing to copy");
    }
    showNotification("Settings copied");
  });
  document
    .getElementById("export-settings")!
    .addEventListener("click", exportSettings);
  document
    .getElementById("export-theme")!
    .addEventListener("click", exportTheme);
  document
    .getElementById("share-apply-import")!
    .addEventListener("click", applyShareImport);
  document
    .getElementById("import-settings")!
    .addEventListener("click", importFromFile);
  document
    .getElementById("share-save-as")!
    .addEventListener("click", saveToFile);

  document.querySelectorAll<HTMLButtonElement>(".tab-button").forEach((btn) => {
    const tabId = btn.getAttribute("data-tab");
    if (!tabId) return;
    btn.addEventListener("click", (e) => switchTab(e as MouseEvent, tabId));
  });
});

// Export Settings
appVersion = await window.api.appVersion();
async function exportSettings() {
  const app = await window.api.localAppConfig();
  const rawTheme = await window.api.localThemeConfig();
  // Clean with Zod in order to apply defaults
  const parsed = ThemeConfigSchema.parse(rawTheme);
  const {
    fontPrimaryName,
    fontPrimaryFilePath,
    fontSecondaryName,
    fontSecondaryFilePath,
    ...cleanTheme
  } = parsed;
  const full = { clientVersion: appVersion, app, theme: cleanTheme };
  document.getElementById("share-output")!.textContent = JSON.stringify(
    full,
    null,
    2,
  );
}

// Export Theme
async function exportTheme() {
  const rawTheme = await window.api.localThemeConfig();
  // Clean with Zod in order to apply defaults
  const parsed = ThemeConfigSchema.parse(rawTheme);

  const {
    fontPrimaryName,
    fontPrimaryFilePath,
    fontSecondaryName,
    fontSecondaryFilePath,
    ...cleanTheme
  } = parsed;
  document.getElementById("share-output")!.textContent = JSON.stringify(
    {
      clientVersion: appVersion,
      theme: cleanTheme,
    },
    null,
    2,
  );
}

// Apply import
async function applyShareImport() {
  const themeStylesheet = document.getElementById(
    "theme-stylesheet",
  ) as HTMLLinkElement;
  const txt = (document.getElementById("share-input") as HTMLTextAreaElement)
    .value;
  let data: any;
  try {
    data = JSON.parse(txt);
  } catch {
    await safePrompt("Invalid JSON data.", { mode: "alert" });
    return;
  }

  // full settings import
  if (data.app && data.theme && typeof data.app === "object") {
    const mergedApp = await mergeAppData(data.app);
    const mergedTheme = await mergeThemeData(data.theme);
    await window.api.saveAppConfig(mergedApp);
    await window.api.saveThemeConfig(mergedTheme);
    applyAppConfig(mergedApp);
    applyThemeConfig(mergedTheme);
    themeStylesheet.href = `styles/${mergedTheme.baseTheme}.css`;
    await createGameList();
    return showNotification("Settings imported");
  }

  // theme-only import
  if (
    typeof data.backgroundColor !== "undefined" &&
    typeof data.textColor !== "undefined" &&
    typeof data.accentColor !== "undefined"
  ) {
    const mergedTheme = await mergeThemeData(data);
    await window.api.saveThemeConfig(mergedTheme);
    applyThemeConfig(mergedTheme);
    themeStylesheet.href = `styles/${mergedTheme.baseTheme}.css`;
    return showNotification("Theme imported");
  }

  await safePrompt("Could not recognise text format.", { mode: "alert" });
}

async function importFromFile() {
  const themeStylesheet = document.getElementById(
    "theme-stylesheet",
  ) as HTMLLinkElement;
  const fileInput = document.getElementById("import-file") as HTMLInputElement;
  fileInput.onchange = async () => {
    const file = fileInput.files![0];
    const txt = await file.text();
    let data: any;
    try {
      data = JSON.parse(txt);
    } catch {
      await safePrompt("Invalid JSON data.", { mode: "alert" });
      return;
    }

    // full settings import
    if (data.app && data.theme && typeof data.app === "object") {
      const mergedApp = await mergeAppData(data.app);
      const mergedTheme = await mergeThemeData(data.theme);
      await window.api.saveAppConfig(mergedApp);
      await window.api.saveThemeConfig(mergedTheme);
      applyAppConfig(mergedApp);
      applyThemeConfig(mergedTheme);
      themeStylesheet.href = `styles/${mergedTheme.baseTheme}.css`;
      await createGameList();
      return showNotification("Settings imported");
    }

    // theme-only import
    if (
      typeof data.backgroundColor !== "undefined" &&
      typeof data.textColor !== "undefined" &&
      typeof data.accentColor !== "undefined"
    ) {
      const mergedTheme = await mergeThemeData(data);
      await window.api.saveThemeConfig(mergedTheme);
      applyThemeConfig(mergedTheme);
      themeStylesheet.href = `styles/${mergedTheme.baseTheme}.css`;
      return showNotification("Theme imported");
    }

    await safePrompt("Could not recognise file format.", { mode: "alert" });
  };
  fileInput.click();
}

async function saveToFile() {
  // Gets the JSON data displayed in share-output
  const outputEl = document.getElementById("share-output") as HTMLElement;
  const text = outputEl.textContent ?? "";
  if (!text) {
    return showNotification("Nothing to save");
  }

  // Create a JSON Blob
  const blob = new Blob([text], { type: "application/json" });

  // Create temporary URL
  const url = URL.createObjectURL(blob);

  // Dynamically create a <a> to force a download
  const a = document.createElement("a");
  a.href = url;

  // Picks a file name depending on JSON content
  // Checks if it's a full export (app+theme) or theme only
  let filename = "export";
  try {
    const data = JSON.parse(text);
    if (data.app && data.theme) {
      filename = "settings";
    } else {
      filename = "theme";
    }
  } catch {
    filename = "export";
  }
  a.download = `${filename}.json`;

  // Download and clean up
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification(`Saved ${a.download}`);
}

function switchTab(event: MouseEvent, tabId: string): void {
  event.preventDefault();
  const tabs = document.querySelectorAll<HTMLButtonElement>(".tab-button");
  const contents = document.querySelectorAll<HTMLElement>(".tab-content");

  tabs.forEach((t) => t.classList.remove("active"));
  contents.forEach((c) => {
    c.classList.remove("active");
    c.style.display = "none";
  });

  (event.currentTarget as HTMLElement).classList.add("active");

  const target = document.getElementById(`tab-${tabId}`);
  if (!target) return;
  target.style.display = "flex";
  void target.offsetWidth; // force repaint
  target.classList.add("active");
}

async function createGameItem(game: GameConfig) {
  const li = document.importNode(gameItemTemplate, true);
  const loginData = (await window.api.userData(
    game.id ?? game.name,
  )) as GameUserDataDecrypted;

  li.id = game.cssId;
  li.setAttribute("data-game-id", String(game.id ?? game.name));
  (li.querySelector(".user-name") as HTMLInputElement).value = loginData.user;
  (li.querySelector(".user-password") as HTMLInputElement).value =
    loginData.password;
  (li.querySelector(".admin-password") as HTMLInputElement).value =
    loginData.adminPassword;
  (li.querySelector(".game-name-edit") as HTMLInputElement).value = game.name;
  (li.querySelector(".game-url-edit") as HTMLInputElement).value = game.url;
  li.querySelector("a").innerText = game.name;
  li.querySelector(".game-main-button").addEventListener("click", async () => {
    window.api.openGame(game.id ?? game.name, game.name);
    const appConfig: AppConfig = await window.api.localAppConfig();
    if (appConfig.discordRP) {
      if (window.richPresence?.enable) {
        window.richPresence.enable();
      }
    }
    window.location.href = game.url;
  });
  gameItemList.appendChild(li);
  await updateServerInfos(li, game, seenOffline);

  // Retrieve app config from userData
  const appConfig = await window.api.localAppConfig();
  // Hide or display each "Refresh server" button
  document
    .querySelectorAll<HTMLElement>(".config-main-button.refresh")
    .forEach((btn) => {
      btn.style.display =
        (appConfig.serverInfoEnabled ?? true) ? "flex" : "none";
    });

  renderTooltips();
  const userConfiguration = li.querySelector(
    "div.user-configuration",
  ) as HTMLDivElement;

  userConfiguration
    .querySelector(".delete-game")
    ?.addEventListener("click", async () => {
      const confirmed = await safePrompt(
        "Are you sure you want to delete this game?",
      );
      if (!confirmed) return;
      await updateGameList((appConfig) => {
        appConfig.games = appConfig.games.filter((g) => g.id !== game.id);
      });
      await createGameList();
      showNotification("Game deleted");
    });
  const gameId = game.id ?? game.name;
  const saveButton = userConfiguration.querySelector(
    ".save-user-data",
  ) as HTMLButtonElement;
  saveButton.addEventListener("click", async (e) => {
    if (!(e.target instanceof Element)) return;
    e.target.closest(".user-configuration").classList.add("hidden");
    const closeUserConfig = e.target.closest(
      ".user-configuration",
    ) as HTMLDivElement;
    const user = (
      closeUserConfig.querySelector(".user-name") as HTMLInputElement
    ).value;
    const password = (
      closeUserConfig.querySelector(".user-password") as HTMLInputElement
    ).value;
    const adminPassword = (
      closeUserConfig.querySelector(".admin-password") as HTMLInputElement
    ).value;
    const newGameName = (
      closeUserConfig.querySelector(".game-name-edit") as HTMLInputElement
    ).value;
    const newGameUrl = (
      closeUserConfig.querySelector(".game-url-edit") as HTMLInputElement
    ).value;

    console.log({
      gameId,
      user,
      password,
      adminPassword,
      newGameName,
      newGameUrl,
    });

    game.name = newGameName;
    game.url = newGameUrl;

    (li.querySelector("a") as HTMLAnchorElement).innerText = newGameName;

    await updateGameList((appConfig) => {
      const gameToUpdate = appConfig.games.find((g) => g.id === game.id);
      if (gameToUpdate) {
        gameToUpdate.name = newGameName;
        gameToUpdate.url = newGameUrl;
      }
    });

    window.api.saveUserData({
      gameId,
      user,
      password,
      adminPassword,
    } as SaveUserData);
    showNotification("Game settings saved");
  });
}

function applyAppConfig(config: AppConfig) {
  (document.querySelector("#cache-path") as HTMLInputElement).value = "";
  (document.querySelector("#insecure-ssl") as HTMLInputElement).checked = false;
  (
    document.querySelector("#clear-cache-on-close") as HTMLInputElement
  ).checked = false;
  (document.querySelector("#discord-rp") as HTMLInputElement).checked = false;
  (document.querySelector("#full-screen-toggle") as HTMLInputElement).checked =
    false;
  if (config.cachePath) {
    (document.querySelector("#cache-path") as HTMLInputElement).value =
      config.cachePath;
    window.api.setCachePath(config.cachePath);
  }
  if (config.ignoreCertificateErrors) {
    (document.querySelector("#insecure-ssl") as HTMLInputElement).checked =
      config.ignoreCertificateErrors;
  }
  if (config.autoCacheClear) {
    (
      document.querySelector("#clear-cache-on-close") as HTMLInputElement
    ).checked = config.autoCacheClear;
  }
  if (config.discordRP) {
    (document.querySelector("#discord-rp") as HTMLInputElement).checked =
      config.discordRP;
  }

  const fsToggle = document.querySelector(
    "#full-screen-toggle",
  ) as HTMLInputElement;
  fsToggle.checked = config.fullScreenEnabled ?? false;
  window.api.setFullScreen(config.fullScreenEnabled ?? false);

  if (config.notificationTimer != null) {
    const inputTimer = document.querySelector(
      "#notification-timer",
    ) as HTMLInputElement;
    inputTimer.valueAsNumber = config.notificationTimer;
  }

  const pingInput = document.querySelector(
    "#server-infos-ping-rate",
  ) as HTMLInputElement;
  pingInput.valueAsNumber = config.serverInfoPingRate;

  const opts = config.serverInfoOptions!;

  (
    document.querySelector("#server-status-toggle") as HTMLInputElement
  ).checked = opts.statusEnabled;
  (
    document.querySelector("#foundry-version-toggle") as HTMLInputElement
  ).checked = opts.foundryVersionEnabled;
  (document.querySelector("#world-toggle") as HTMLInputElement).checked =
    opts.worldEnabled;
  (document.querySelector("#game-system-toggle") as HTMLInputElement).checked =
    opts.gameSystemEnabled;
  (document.querySelector("#game-version-toggle") as HTMLInputElement).checked =
    opts.gameSystemVersionEnabled;
  (
    document.querySelector("#online-players-toggle") as HTMLInputElement
  ).checked = opts.onlinePlayersEnabled;

  // Display serverInfo and refresh button
  const serverInfoConfig = document.querySelector(
    ".server-infos-configuration",
  ) as HTMLElement | null;
  const serverInfoToggle = document.querySelector(
    "#server-infos-toggle",
  ) as HTMLInputElement | null;

  if (serverInfoConfig && serverInfoToggle) {
    const enabled = config.serverInfoEnabled ?? true;

    // checks button status
    serverInfoToggle.checked = enabled;

    // show/hide server status block
    serverInfoConfig.style.display = enabled ? "block" : "none";
  }
}

function applyThemeConfig(config: ThemeConfig) {
  const primaryFontSelect = document.querySelector<HTMLSelectElement>(
    "#primary-font-selector",
  )!;
  const customPrimaryField = document.querySelector<HTMLInputElement>(
    "#primary-custom-font",
  )!;
  const primaryImportField = document.getElementById("primary-import-font")!;
  const secondaryFontSelect = document.querySelector<HTMLSelectElement>(
    "#secondary-font-selector",
  )!;
  const customSecondaryField = document.querySelector<HTMLInputElement>(
    "#secondary-custom-font",
  )!;
  const secondaryImportField = document.getElementById(
    "secondary-import-font",
  )!;

  const particlesConfig = (document.querySelector(
    ".particles-config",
  ) as HTMLElement)!;
  const particlesCheckbox = (document.querySelector(
    "#particles-button",
  ) as HTMLInputElement)!;

  primaryFontSelect.value = config.fontPrimary ?? "";
  customPrimaryField.value = config.fontPrimaryUrl ?? "";
  secondaryFontSelect.value = config.fontSecondary ?? "";
  customSecondaryField.value = config.fontSecondaryUrl ?? "";

  const particlesCheckboxEnabled = config.particlesEnabled ?? true;
  particlesCheckbox.checked = particlesCheckboxEnabled;

  customPrimaryField.style.display =
    primaryFontSelect.value === "__custom" ? "flex" : "none";
  primaryImportField.style.display =
    primaryFontSelect.value === "__file" ? "block" : "none";
  customSecondaryField.style.display =
    secondaryFontSelect.value === "__custom" ? "flex" : "none";
  secondaryImportField.style.display =
    secondaryFontSelect.value === "__file" ? "block" : "none";

  particlesConfig.style.display = particlesCheckboxEnabled ? "block" : "none";

  // Primary font modes: Google, Local file (data URI), or built-in
  if (config.fontPrimary === "__custom" && config.fontPrimaryUrl) {
    // Google Fonts via <link>
    useGoogleFont(config.fontPrimaryUrl, "primary");
    const fam = extractFamilyName(config.fontPrimaryUrl);
    document.documentElement.style.setProperty(
      "--font-primary",
      fam ? `'${fam}',sans-serif` : "",
    );
  } else if (config.fontPrimary === "__file" && config.fontPrimaryFilePath) {
    // Local file font injected as data URI
    useGoogleFont("", "primary");
    // Assume config.fontPrimaryFilePath contains full data: URI
    // Derive a name from FontConfig or store in config.fontPrimaryName if you like
    const fontName = config.fontPrimaryName ?? "LocalFont";
    // Inject the @font-face rule if not already present
    if (!document.getElementById(`ff-${fontName}`)) {
      const style = document.createElement("style");
      style.id = `ff-${fontName}`;
      style.textContent = `
        @font-face {
          font-family: "${fontName}";
          src: url("${config.fontPrimaryFilePath}") format("truetype");
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.append(style);
    }
    // Finally set the CSS variable
    document.documentElement.style.setProperty(
      "--font-primary",
      `"${fontName}",sans-serif`,
    );
  } else {
    // Built-in font names or none
    useGoogleFont("", "primary");
    if (
      config.fontPrimary &&
      config.fontPrimary !== "__custom" &&
      config.fontPrimary !== "__file"
    ) {
      document.documentElement.style.setProperty(
        "--font-primary",
        config.fontPrimary,
      );
    } else {
      document.documentElement.style.removeProperty("--font-primary");
    }
  }

  // Secondary font modes: Google, Local file (data URI), or built-in
  if (config.fontSecondary === "__custom" && config.fontSecondaryUrl) {
    // Google Fonts via <link>
    useGoogleFont(config.fontSecondaryUrl, "secondary");
    const fam = extractFamilyName(config.fontSecondaryUrl);
    document.documentElement.style.setProperty(
      "--font-secondary",
      fam ? `'${fam}',sans-serif` : "",
    );
  } else if (
    config.fontSecondary === "__file" &&
    config.fontSecondaryFilePath
  ) {
    // Local file font injected as data URI
    useGoogleFont("", "secondary");
    // Assume config.fontSecondaryFilePath contains full data: URI
    // Derive a name from FontConfig or store in config.fontSecondaryName if you like
    const fontName = config.fontSecondaryName ?? "LocalFont";
    // Inject the @font-face rule if not already present
    if (!document.getElementById(`ff-${fontName}`)) {
      const style = document.createElement("style");
      style.id = `ff-${fontName}`;
      style.textContent = `
        @font-face {
          font-family: "${fontName}";
          src: url("${config.fontSecondaryFilePath}") format("truetype");
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.append(style);
    }
    // Finally set the CSS variable
    document.documentElement.style.setProperty(
      "--font-secondary",
      `"${fontName}",sans-serif`,
    );
  } else {
    // Built-in font names or none
    useGoogleFont("", "secondary");
    if (
      config.fontSecondary &&
      config.fontSecondary !== "__custom" &&
      config.fontSecondary !== "__file"
    ) {
      document.documentElement.style.setProperty(
        "--font-secondary",
        config.fontSecondary,
      );
    } else {
      document.documentElement.style.removeProperty("--font-secondary");
    }
  }

  (document.querySelector("#accent-color") as HTMLInputElement).value =
    "#98e4f7";
  (document.querySelector("#background-color") as HTMLInputElement).value =
    "#0e1a23";
  (document.querySelector("#text-color") as HTMLInputElement).value = "#88c0a9";
  const alphaInput = document.querySelector(
    "#button-color-alpha",
  ) as HTMLInputElement;
  alphaInput.valueAsNumber = 0.65;
  (document.querySelector("#button-color") as HTMLInputElement).value =
    "#14141e";
  const alphaHoverInput = document.querySelector(
    "#button-color-hover-alpha",
  ) as HTMLInputElement;
  alphaHoverInput.valueAsNumber = 0.95;
  (document.querySelector("#button-color-hover") as HTMLInputElement).value =
    "#28283c";

  const opts = config.particleOptions!;

  (
    document.querySelector("#particles-count") as HTMLInputElement
  ).valueAsNumber = opts.count;
  (
    document.querySelector("#particles-speed") as HTMLInputElement
  ).valueAsNumber = opts.speedYMax;
  (document.querySelector("#particles-color") as HTMLInputElement).value =
    opts.color;
  (
    document.querySelector("#particles-color-alpha") as HTMLInputElement
  ).valueAsNumber = opts.alpha;

  document.body.style.backgroundImage = "";
  const bgInput = document.querySelector(
    "#background-image",
  ) as HTMLInputElement;
  if (config.background) {
    document.body.style.backgroundImage = `url(${config.background})`;
    bgInput.value = config.background;
  } else {
    bgInput.value = "";
  }
  if (!config.background && config.backgrounds?.length) {
    const i = Math.floor(Math.random() * config.backgrounds.length);
    document.body.style.backgroundImage = `url(${config.backgrounds[i]})`;
  }
  if (config.textColor) {
    document.documentElement.style.setProperty(
      "--color-text-primary",
      config.textColor,
    );
    (document.querySelector("#text-color") as HTMLInputElement).value =
      config.textColor.substring(0, 7);
  }
  if (config.backgroundColor) {
    document.documentElement.style.setProperty(
      "--color-background",
      config.backgroundColor,
    );
    (document.querySelector("#background-color") as HTMLInputElement).value =
      config.backgroundColor.substring(0, 7);
  }
  if (config.accentColor) {
    document.documentElement.style.setProperty(
      "--color-accent",
      config.accentColor,
    );
    (document.querySelector("#accent-color") as HTMLInputElement).value =
      config.accentColor.substring(0, 7);
  }
  if (config.buttonColorAlpha != null) {
    const alphaStr = config.buttonColorAlpha.toString();

    document.documentElement.style.setProperty("--opacity-button", alphaStr);
    const inputAlpha = document.querySelector(
      "#button-color-alpha",
    ) as HTMLInputElement;
    inputAlpha.valueAsNumber = config.buttonColorAlpha;
  }
  if (config.buttonColor) {
    document.documentElement.style.setProperty(
      "--color-button",
      config.buttonColor,
    );
    (document.querySelector("#button-color") as HTMLInputElement).value =
      config.buttonColor;
  }
  const rgba = hexToRgba(config.buttonColor, config.buttonColorAlpha);
  document.documentElement.style.setProperty("--color-button-rgba", rgba);

  if (config.buttonColorHoverAlpha != null) {
    const alphaStr = config.buttonColorHoverAlpha.toString();

    document.documentElement.style.setProperty(
      "--opacity-button-hover",
      alphaStr,
    );
    const inputAlpha = document.querySelector(
      "#button-color-hover-alpha",
    ) as HTMLInputElement;
    inputAlpha.valueAsNumber = config.buttonColorHoverAlpha;
  }
  if (config.buttonColorHover) {
    document.documentElement.style.setProperty(
      "--color-button-hover",
      config.buttonColorHover,
    );
    (document.querySelector("#button-color-hover") as HTMLInputElement).value =
      config.buttonColorHover;
  }
  const rgbaHover = hexToRgba(
    config.buttonColorHover,
    config.buttonColorHoverAlpha,
  );
  document.documentElement.style.setProperty(
    "--color-button-hover-rgba",
    rgbaHover,
  );

  const enabled = config.particlesEnabled ?? true;
  const checkbox = (document.querySelector(
    "#particles-button",
  ) as HTMLInputElement)!;
  checkbox.checked = enabled;

  if (!enabled) {
    if (particles.isParticlesRunning()) {
      particles.stopParticles();
    }
    lastParticleOptions = null;
    return;
  }

  // Calculates Switch Label color from accentColor
  const accent = config.accentColor;
  const labelColor = getContrastColor(accent);
  document.documentElement.style.setProperty(
    "--switch-label-color",
    labelColor,
  );

  const sameOpts =
    lastParticleOptions !== null &&
    opts.count === lastParticleOptions.count &&
    opts.speedYMin === lastParticleOptions.speedYMin &&
    opts.speedYMax === lastParticleOptions.speedYMax &&
    opts.color === lastParticleOptions.color &&
    opts.alpha === lastParticleOptions.alpha;

  if (!particles.isParticlesRunning() || !sameOpts) {
    if (particles.isParticlesRunning()) {
      particles.stopParticles();
    }
    particles.configureParticles(opts);
    particles.startParticles();
    lastParticleOptions = { ...opts };
  }
}

function addStyle(styleString: string) {
  const style = document.createElement("style");
  style.textContent = styleString;
  document.head.append(style);
}

async function migrateConfig() {
  let localAppConfig = await window.api.localAppConfig();
  const gameList: GameConfig[] = JSON.parse(
    window.localStorage.getItem("gameList") || "[]",
  );
  if (gameList.length > 0) {
    localAppConfig.games = localAppConfig?.games ?? [];
    localAppConfig.games.push(...gameList);
    window.localStorage.removeItem("gameList");
  }
  const oldConfigJson = window.localStorage.getItem("appConfig") || "{}";
  if (oldConfigJson !== "{}") {
    const oldConfig = JSON.parse(oldConfigJson) as AppConfig;
    localAppConfig = { ...localAppConfig, ...oldConfig };
    window.localStorage.removeItem("appConfig");
  }
  window.api.saveAppConfig(localAppConfig);
}

async function getServerInfo(
  game: GameConfig,
): Promise<ServerStatusData | null> {
  // no more CORS fetch, go through main.ts
  return window.api.pingServer(game.url);
}
async function updateServerInfos(
  item: HTMLElement,
  game: GameConfig,
  seenOffline: Map<string, boolean>,
) {
  // Retrieve user config
  const { serverInfoEnabled = true, serverInfoOptions } =
    await window.api.localAppConfig();

  const serverInfos = item.querySelector(
    ".server-infos",
  ) as HTMLDivElement | null;
  if (!serverInfos) return;

  // If global toggle is off, hide everything and return
  if (!serverInfoEnabled) {
    serverInfos.style.display = "none";
    return;
  }
  serverInfos.style.display = "";

  // Individual options and their defaults
  const {
    statusEnabled = true,
    foundryVersionEnabled = true,
    worldEnabled = false,
    gameSystemEnabled = true,
    gameSystemVersionEnabled = true,
    onlinePlayersEnabled = true,
  } = serverInfoOptions;

  // Retrieve each <span> and apply show/hide
  const statusSpan = serverInfos.querySelector(".status") as HTMLSpanElement;
  const versionSpan = serverInfos.querySelector(".version") as HTMLSpanElement;
  const worldSpan = serverInfos.querySelector(".world") as HTMLSpanElement;
  const systemSpan = serverInfos.querySelector(".system") as HTMLSpanElement;
  const systemVersionSpan = serverInfos.querySelector(
    ".systemVersion",
  ) as HTMLSpanElement;
  const usersSpan = serverInfos.querySelector(".users") as HTMLSpanElement;

  const statusWrapper = statusSpan.closest(".tooltip-wrapper") as HTMLElement;
  const versionWrapper = versionSpan.closest(".tooltip-wrapper") as HTMLElement;
  const worldWrapper = worldSpan.closest(".tooltip-wrapper") as HTMLElement;
  const systemWrapper = systemSpan.closest(".tooltip-wrapper") as HTMLElement;
  const systemVersionWrapper = systemVersionSpan.closest(
    ".tooltip-wrapper",
  ) as HTMLElement;
  const usersWrapper = usersSpan.closest(".tooltip-wrapper") as HTMLElement;

  if (statusWrapper) statusWrapper.style.display = statusEnabled ? "" : "none";
  if (versionWrapper)
    versionWrapper.style.display = foundryVersionEnabled ? "" : "none";
  if (worldWrapper) worldWrapper.style.display = worldEnabled ? "" : "none";
  if (systemWrapper)
    systemWrapper.style.display = gameSystemEnabled ? "" : "none";
  if (systemVersionWrapper)
    systemVersionWrapper.style.display = gameSystemVersionEnabled ? "" : "none";
  if (usersWrapper)
    usersWrapper.style.display = onlinePlayersEnabled ? "" : "none";

  // Ping server
  const info = await getServerInfo(game);
  const idKey = String(game.id);
  const wasOffline = seenOffline.get(idKey) ?? false;
  const nowOffline = info === null;

  // log **only** when status goes up→down or down→up
  if (nowOffline && !wasOffline) {
    console.warn(`Server ${game.name} is unreachable.`);
  }
  if (!nowOffline && wasOffline) {
    console.info(`Server ${game.name} is back online.`);
  }
  seenOffline.set(idKey, nowOffline);

  // If it fails, displays "-"
  if (!info) {
    if (statusEnabled) {
      statusSpan.innerHTML = `<i class="fa-solid fa-xmark"></i> Offline`;
    }
    if (foundryVersionEnabled) {
      versionSpan.innerHTML = `<i class="fa-solid fa-dice-d20"></i> -`;
    }
    if (worldEnabled) {
      worldSpan.innerHTML = `<i class="fa-solid fa-globe"></i> -`;
    }
    if (gameSystemEnabled) {
      systemSpan.innerHTML = `<i class="fa-solid fa-dice"></i> -`;
    }
    if (gameSystemVersionEnabled) {
      systemVersionSpan.innerHTML = `<i class="fa-solid fa-screwdriver-wrench"></i> -`;
    }
    if (onlinePlayersEnabled) {
      usersSpan.innerHTML = `<i class="fa-solid fa-users"></i> -`;
    }
    return;
  }

  // Otherwise, inject real data
  if (statusEnabled) {
    statusSpan.innerHTML = info.version
      ? `<i class="fa-solid fa-signal"></i> Online`
      : `<i class="fa-solid fa-xmark"></i> Offline`;
  }
  if (foundryVersionEnabled) {
    versionSpan.innerHTML = `<i class="fa-solid fa-dice-d20"></i> v${info.version ?? "-"}`;
  }
  if (worldEnabled) {
    worldSpan.innerHTML = `<i class="fa-solid fa-globe"></i> ${info.world ?? "-"}`;
  }
  if (gameSystemEnabled) {
    systemSpan.innerHTML = `<i class="fa-solid fa-dice"></i> ${info.system?.toUpperCase() ?? "-"}`;
  }
  if (gameSystemVersionEnabled) {
    systemVersionSpan.innerHTML = `<i class="fa-solid fa-screwdriver-wrench"></i> ${info.systemVersion ?? "-"}`;
  }
  if (onlinePlayersEnabled) {
    usersSpan.innerHTML = `<i class="fa-solid fa-users"></i> ${info.users ?? "0"}`;
  }
}

function refreshAllServerInfos() {
  const seenOffline = new Map<string, boolean>();
  const gameItems = Array.from(
    document.querySelectorAll<HTMLElement>(".game-item"),
  );

  gameItems.forEach((item) => {
    // Retrieves GameConfig from dataset
    const key = item.dataset.gameId!;
    const game = games.find((g) => String(g.id) === key);
    if (!game) return;

    // Pass seenOffline as 3rd arg
    updateServerInfos(item, game, seenOffline).catch((err) => {
      console.warn(`updateServerInfos failed for ${game.name}:`, err);
    });
  });
}

function renderTooltips() {
  const layer = document.getElementById("tooltip-layer");
  if (!layer) return;

  document.querySelectorAll(".tooltip-wrapper").forEach((wrapper) => {
    const tooltip = wrapper.querySelector<HTMLElement>(".tooltip");
    if (!tooltip) return;

    // tries to find an input of type range
    const input = wrapper.querySelector<HTMLInputElement>("input[type=range]");

    wrapper.addEventListener("mouseenter", () => {
      const rect = wrapper.getBoundingClientRect();
      const clone = tooltip.cloneNode(true) as HTMLElement;
      clone.classList.add("active-tooltip");
      clone.style.display = "block";
      clone.style.position = "fixed";
      clone.style.pointerEvents = "none";
      clone.style.transform = "translateX(-50%)";
      clone.style.left = `${rect.left + rect.width / 2}px`;
      clone.style.top = `${rect.bottom + 5}px`;

      const baseText = tooltip.textContent?.trim() ?? "";

      // If input type is range, tooltip is live updated
      let onInput: (() => void) | null = null;
      if (input) {
        clone.textContent = `${baseText}: ${input.value}`;
        onInput = () => {
          clone.textContent = `${baseText}: ${input.value}`;
        };
        input.addEventListener("input", onInput);
      }

      layer.appendChild(clone);

      // On mouseleave, clean clone and listener
      wrapper.addEventListener(
        "mouseleave",
        () => {
          clone.remove();
          if (input && onInput) {
            input.removeEventListener("input", onInput);
          }
        },
        { once: true },
      );
    });
  });
}

async function createGameList() {
  await migrateConfig();
  const config: AppConfig = await window.api.appConfig();
  const appDefaults: AppConfig = {
    games: games,
    serverInfoEnabled: true,
  };
  const defaults: ThemeConfig = {
    background: "",
    backgrounds: [],
    backgroundColor: "#0e1a23ff",
    textColor: "#88c0a9ff",
    accentColor: "#98e4f7ff",
    buttonColorAlpha: 0.65,
    buttonColor: "#14141e",
    buttonColorHoverAlpha: 0.95,
    buttonColorHover: "#28283c",
    baseTheme: undefined,
    particlesEnabled: true,
  };

  const appConfig: AppConfig = {
    ...appDefaults,
    ...(await window.api.localAppConfig()),
  };
  const themeConfig: ThemeConfig = {
    ...defaults,
    ...(await window.api.localThemeConfig()),
  };

  games = config.games;

  addStyle(config.customCSS ?? "");

  appVersion = await window.api.appVersion();
  document.querySelectorAll(".current-version").forEach((el) => {
    el.textContent = appVersion;
  });

  let latestVersion: string = "Unknown";
  let latestAssetUrl: string | null = null;
  try {
    const response = await fetch(
      "https://api.github.com/repos/JeidoUran/fvtt-player-client/releases/latest",
      { mode: "cors" },
    );
    if (response.ok) {
      const data = await response.json();
      latestVersion = data["tag_name"];
      if (Array.isArray(data.assets)) {
        const plat = window.api.platform;
        let exts: string[];
        if (plat === "win32") {
          // Squirrel installer
          exts = ["-setup.exe", ".exe", ".zip"];
        } else if (plat === "darwin") {
          // dmg or zip
          exts = [".dmg", ".zip"];
        } else {
          // deb, rpm then zip
          exts = [".deb", ".rpm", ".zip"];
        }
        // Pick the first matching extension in your priority list
        let assetUrl: string | null = null;
        for (const ext of exts) {
          const found = data.assets.find((a: any) => a.name.endsWith(ext));
          if (found) {
            assetUrl = found.browser_download_url;
            break;
          }
        }
        latestAssetUrl = assetUrl;
      }
    } else {
      showNotification("Failed to fetch latest version number");
      console.warn(
        "[FVTT Client] GitHub release fetch failed:",
        response.status,
      );
    }
  } catch (e) {
    console.error("[FVTT Client] Failed to fetch latest version:", e);
  }
  document.querySelector("#latest-version").textContent = latestVersion;
  if (compareSemver(appVersion, latestVersion) < 0) {
    showNotification("An update is available !");
    document.querySelector(".update-available").classList.remove("hidden2");
    document.querySelector(".version-normal").classList.add("hidden2");

    const btn = document.querySelector<HTMLElement>(".update-available");
    if (btn && latestAssetUrl) {
      btn.addEventListener("click", () => {
        showNotification("Download starting…");
        window.api.downloadUpdate(latestAssetUrl);
      });
    }
  }

  gameItemList.querySelectorAll("li").forEach((li) => li.remove());

  config.games.forEach(createGameItem);

  applyAppConfig(appConfig);
  applyThemeConfig(themeConfig);
}
// Load UI
await createGameList();

// Refreshes servers
refreshAllServerInfos();

// Sets ping interval from user config
setupPingInterval();
