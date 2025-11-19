<!-- src/App.vue -->
<template>
  <!-- votre header ou barre d’outils ici, si vous en avez un -->

  <button class="update-available" @click="checkUpdates">
    Check for updates
  </button>

  <AppConfiguration
    v-model="appConfig"
    :visible="appConfigVisible"
    @update:visible="ui.appConfigVisible = $event"
    @save="() => { /* ici tu peux appeler window.api.saveAppConfig(cfg) etc. */ }"
    @reset="() => { /* reset client settings */ }"
    @clear-cache="() => { /* window.api.clearCache() */ }"
    @open-user-data="() => { /* window.api.openUserDataFolder() */ }"
  />

  <!-- ou, sinon, votre contenu principal : -->
  <!-- <MainWindow /> -->
  <UpdaterModal />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UpdaterModal from "./components/UpdaterModal.vue";
import { useUpdaterStore } from "./stores/updater";
import { useUiStore } from "./stores/ui";
import AppConfiguration from "./components/ClientSettingsModal.vue";

const updaterStore = useUpdaterStore();
const ui = useUiStore();
const { appConfigVisible } = storeToRefs(ui);

import type { AppConfigurationForm } from "./components/ClientSettingsModal.vue";
import { ref } from "vue";

function checkUpdates() {
  window.api.checkForUpdates();
}
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
</script>

<style>
/* styles globaux éventuels */
</style>
