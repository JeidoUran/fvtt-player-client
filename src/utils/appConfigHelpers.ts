// src/utils/appConfigHelpers.ts
import { AppConfigSchema } from "../schemas";
import { safePrompt } from "./safePrompt";
import {
  showNotification,
  setNotificationTimer,
} from "./notifications";
import { refreshAllServerInfos } from "./serverInfoHelpers";
import type { AppConfigurationForm } from "../components/AppConfigurationModal.vue";

let pingIntervalId: number | null = null;

/**
 * Fonction util appelée depuis Vue (App.vue)
 * Reprend l'ancienne logique du listener "#save-app-config" :
 * - validation Zod
 * - save config
 * - applyAppConfig
 * - refreshAllServerInfos
 * - setupPingInterval
 * - notifications
 */
export async function saveAppConfigFromForm(form: AppConfigurationForm) {
  // On récupère la config actuelle pour récupérer notamment les jeux déjà enregistrés
  const existing = await window.api.localAppConfig();

  const rawConfig: unknown = {
    // on garde les jeux existants
    games: existing.games ?? [],
    cachePath: form.cachePath || "",
    autoCacheClear: form.clearCacheOnClose,
    ignoreCertificateErrors: form.insecureSsl,
    discordRP: form.enableDiscordRp,
    notificationTimer: form.notificationTimer,
    serverInfoEnabled: form.enableServerStatus,
    serverInfoOptions: {
      statusEnabled: form.showServerStatusOnline,
      foundryVersionEnabled: form.showFoundryVersion,
      worldEnabled: form.showWorldName,
      gameSystemEnabled: form.showGameSystem,
      gameSystemVersionEnabled: form.showGameVersion,
      onlinePlayersEnabled: form.showOnlinePlayers,
    },
    serverInfoPingRate: form.serverInfosPingRate,
    fullScreenEnabled: form.forceFullScreen,
    shareSessionWindows: form.shareSessionBetweenWindows,
    // customCSS etc. restent comme dans existing si tu en as besoin
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

  const validConfig = result.data as AppConfig;

  // Notification timer
  const timer =
    typeof validConfig.notificationTimer === "number"
      ? validConfig.notificationTimer
      : 3;
  setNotificationTimer(timer);

  // Fullscreen
  window.api.setFullScreen(validConfig.fullScreenEnabled ?? false);
  const closeButton = document.querySelector(
    ".tooltip-wrapper.close-app",
  ) as HTMLElement | null;
  if (closeButton) {
    const fs = await window.api.isFullScreen();
    closeButton.style.display = fs ? "block" : "none";
  }

  await window.api.saveAppConfig(validConfig);
  applyAppConfig(validConfig);
  refreshAllServerInfos();
  await setupPingInterval();

  showNotification("Changes saved");
}

/**
 * 🔧 Copie/colle ici ton ancienne fonction applyAppConfig(config: AppConfig)
 * depuis renderer.ts, sans rien changer, puis exporte-la.
 */
export function applyAppConfig(config: AppConfig) {
  (document.querySelector("#cache-path") as HTMLInputElement).value = "";
  (document.querySelector("#insecure-ssl") as HTMLInputElement).checked = false;
  (
    document.querySelector("#clear-cache-on-close") as HTMLInputElement
  ).checked = false;
  (document.querySelector("#discord-rp") as HTMLInputElement).checked = false;
  (document.querySelector("#full-screen-toggle") as HTMLInputElement).checked =
    false;
  (
    document.querySelector("#share-session-toggle") as HTMLInputElement
  ).checked = false;
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
  const closeButton = document.querySelector(
    ".tooltip-wrapper.close-app",
  ) as HTMLElement;
  window.api.isFullScreen().then((fs) => {
    closeButton.style.display = fs ? "block" : "none";
  });

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

  const shareSessionToggle = document.querySelector(
    "#share-session-toggle",
  ) as HTMLInputElement;
  shareSessionToggle.checked = config.shareSessionWindows ?? false;

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

/**
 * Sets ping interval from user config
 */
export async function setupPingInterval() {
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
