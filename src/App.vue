<!-- src/App.vue -->
<template>
  <!-- header or toolbox here -->

  <button class="update-available" @click="checkUpdates">
    Check for updates
  </button>

  <AppConfiguration
    v-model="appConfig"
    :visible="appConfigVisible"
    @update:visible="ui.appConfigVisible = $event"
    @cancel="handleCancel"
    @save="handleSave"
    @reset="handleReset"
    @clear-cache="handleClearCache"
    @open-user-data="handleOpenUserData"
  />

  <!-- main content : -->
  <!-- <MainWindow /> -->
  <UpdaterModal />
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  showNotification,
  initNotificationTimer,
  setNotificationTimer,
} from "./utils/notifications";
import { safePrompt } from "./utils/safePrompt";
import { storeToRefs } from "pinia";
import UpdaterModal from "./components/UpdaterModal.vue";
import { useUpdaterStore } from "./stores/updater";
import { useUiStore } from "./stores/ui";
import { applyAppConfig, saveAppConfigFromForm } from "./utils/appConfigHelpers";
import AppConfiguration from "./components/AppConfigurationModal.vue";

const updaterStore = useUpdaterStore();
const ui = useUiStore();
const { appConfigVisible } = storeToRefs(ui);

import type { AppConfigurationForm } from "./components/AppConfigurationModal.vue";

const appConfig = ref<AppConfigurationForm>({
  cachePath: "",
  clearCacheOnClose: false,
  insecureSsl: false,
  notificationTimer: 3,
  enableServerStatus: true,
  showServerStatusOnline: true,
  showFoundryVersion: true,
  showWorldName: true,
  showGameSystem: true,
  showGameVersion: true,
  showOnlinePlayers: true,
  serverInfosPingRate: 30,
  forceFullScreen: false,
  shareSessionBetweenWindows: false,
  enableDiscordRp: true,
});

// 🔹 helper commun : lit userData.json et remplit le form Vue
async function loadAppConfigIntoForm() {
  const cfg = await window.api.localAppConfig();

  appConfig.value = {
    cachePath: cfg.cachePath ?? "",
    clearCacheOnClose: cfg.autoCacheClear ?? false,
    insecureSsl: cfg.ignoreCertificateErrors ?? false,
    notificationTimer: cfg.notificationTimer ?? 3,

    enableServerStatus: cfg.serverInfoEnabled ?? true,
    showServerStatusOnline:
      cfg.serverInfoOptions?.statusEnabled ?? true,
    showFoundryVersion:
      cfg.serverInfoOptions?.foundryVersionEnabled ?? true,
    showWorldName:
      cfg.serverInfoOptions?.worldEnabled ?? true,
    showGameSystem:
      cfg.serverInfoOptions?.gameSystemEnabled ?? true,
    showGameVersion:
      cfg.serverInfoOptions?.gameSystemVersionEnabled ?? true,
    showOnlinePlayers:
      cfg.serverInfoOptions?.onlinePlayersEnabled ?? true,

    serverInfosPingRate: cfg.serverInfoPingRate ?? 30,
    forceFullScreen: cfg.fullScreenEnabled ?? false,
    shareSessionBetweenWindows: cfg.shareSessionWindows ?? false,
    enableDiscordRp: cfg.discordRP ?? true,
  };
}

onMounted(async () => {
  await loadAppConfigIntoForm();
});

function checkUpdates() {
  window.api.checkForUpdates();
}

// Cancel
async function handleCancel() {
    await loadAppConfigIntoForm();
    showNotification("Changes canceled");
}

// Clear Cache
async function handleClearCache() {
  const confirmed = await safePrompt(
    "Are you sure you want to clear the cache?",
  );
  if (!confirmed) return;
  window.api.clearCache();
  showNotification("Cache cleared");
}

// Open user data
async function handleOpenUserData() {
  try {
    await window.api.openUserDataFolder();
  } catch (err) {
    console.error("Failed to open user data folder:", err);
    showNotification("Failed to open user data folder");
  }
}

// Save Settings
async function handleSave(form: AppConfigurationForm) {

  ui.appConfigVisible = false;
  await saveAppConfigFromForm(form);
  
}

// Reset Settings
async function handleReset() {
  const confirmed = await safePrompt(
    "Are you sure you want to reset all client settings? This will reset your cache, certificate, fullscreen, session and Discord options (games and themes are not affected).",
  );
  if (!confirmed) return;

  // 1) Reset form (what the user sees)
  appConfig.value = {
    cachePath: "",
    clearCacheOnClose: false,
    insecureSsl: false,
    notificationTimer: 3,
    enableServerStatus: true,
    showServerStatusOnline: true,
    showFoundryVersion: true,
    showWorldName: true,
    showGameSystem: true,
    showGameVersion: true,
    showOnlinePlayers: true,
    serverInfosPingRate: 30,
    forceFullScreen: false,
    shareSessionBetweenWindows: false,
    enableDiscordRp: true,
  };

  // 2) Reset actual config
  const current = await window.api.localAppConfig();

  current.cachePath = undefined;
  current.autoCacheClear = undefined;
  current.customCSS = undefined;
  current.ignoreCertificateErrors = undefined;
  current.discordRP = undefined;
  current.fullScreenEnabled = undefined;
  current.shareSessionWindows = undefined;

  window.api.setFullScreen(false);
  const closeButton = document.querySelector(
    ".tooltip-wrapper.close-app",
  ) as HTMLElement | null;
  if (closeButton) {
    const fs = await window.api.isFullScreen();
    closeButton.style.display = fs ? "block" : "none";
  }

  await window.api.saveAppConfig(current);

  showNotification("Client settings reset");
}

</script>

<style>
/* global styles */
</style>
