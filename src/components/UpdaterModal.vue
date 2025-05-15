<template>
  <transition name="fade">
    <div v-if="store.visible" class="updater-backdrop">
      <div class="updater-window">
        <div v-if="store.status === 'checking'">Checking for updates…</div>
        <div v-else-if="store.status === 'not-available'" class="updater-text">
          You are up-to-date.
        </div>
        <div
          v-else-if="store.status === 'available' && store.payload?.version"
          class="updater-text"
        >
          Update <strong>{{ store.payload.version }}</strong> is available!
        </div>
        <div v-else-if="store.status === 'available'" class="updater-text">
          An update is available!
        </div>
        <div v-else-if="store.status === 'progress'" class="updater-text">
          <el-progress />
          {{ store.payload.percent.toFixed(1) }}%
        </div>
        <div v-else-if="store.status === 'downloaded'" class="updater-text">
          Download complete.
        </div>
        <div v-else-if="store.status === 'error'" class="updater-text">
          Error : {{ store.payload.message }}
        </div>
        <div class="updater-current-version">
          Current Version: {{ currentVersion }}
        </div>
        <span slot="footer" class="dialog-footer">
          <div class="updater-buttons">
            <button
              class="updater-button"
              v-if="store.status === 'available'"
              @click="download"
            >
              Download
            </button>
            <button
              class="updater-button"
              v-if="store.status === 'downloaded'"
              @click="install"
            >
              Install
            </button>
            <button class="updater-button" @click="openLatest">
              Open GitHub
            </button>
            <button class="updater-button" @click="store.close">Close</button>
          </div>
        </span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useUpdaterStore } from "../stores/updater";
import { ref, onMounted } from "vue";

const currentVersion = ref<string>("");

// Fetch the version when the modal mounts
onMounted(async () => {
  try {
    currentVersion.value = await window.api.appVersion();
  } catch (e) {
    console.warn("Could not fetch app version:", e);
  }
});

const store = useUpdaterStore();

function download() {
  window.api.downloadUpdate();
}

function install() {
  window.api.installUpdate();
}

function openLatest() {
  window.api.openExternal(
    "https://github.com/JeidoUran/fvtt-player-client/releases/latest",
  );
}
</script>
