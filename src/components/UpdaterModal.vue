<template>
  <transition name="fade">
    <div v-if="store.visible" class="updater-backdrop">
      <div class="updater-window">
        <div class="updater-overflow">
          <div v-loading="loading" element-loading-background="transparent" element-loading-text="Checking for updates…"
            element-loading-custom-class="loading-update-check" v-if="store.status === 'checking'" class="updater-text">
          </div>
          <div v-else-if="store.status === 'not-available'" class="updater-text">
            You are up-to-date.
          </div>
          <div v-else-if="store.status === 'available' && store.payload?.version" class="updater-text">
            Update
            <strong class="current-version-inline">{{
              store.payload.version
            }}</strong>
            is available!
          </div>
          <div v-else-if="store.status === 'available'" class="updater-text">
            An update is available!
          </div>
          <div v-else-if="store.status === 'progress'" class="updater-text">
            Download in progress…
            <el-progress :text-inside="true" :stroke-width="24" :percentage="store.payload.percent.toFixed(1)"
              :color="colorset">
            </el-progress>
          </div>
          <div v-else-if="store.status === 'downloaded'" class="updater-text">
            Download complete.
          </div>
          <div v-loading="loading" element-loading-background="transparent" element-loading-text="Installing update…"
            element-loading-custom-class="loading-update-check" v-if="store.status === 'installing'"
            class="updater-text"></div>
          <div v-else-if="store.status === 'error'" class="updater-text">
            Error : {{ store.payload.message }}
          </div>
        </div>
        <span slot="footer" class="dialog-footer">
          <div class="updater-current-version">
            FVTT Desktop Client {{ currentVersion }}
            <div class="updater-process-versions">
              Node.js {{ versions.node }}, Chromium {{ versions.chrome }},
              Electron
              {{ versions.electron }}
            </div>
          </div>
          <div class="updater-buttons">
            <button class="updater-button" v-if="store.status === 'available'" @click="download">
              Download
            </button>
            <button class="updater-button" v-if="store.status === 'downloaded'" @click="install">
              Install
            </button>
            <button class="updater-button" @click="openLatest">
              Open GitHub
            </button>
            <button v-if="store.status !== 'installing'" class="updater-button" @click="store.close">Close</button>
          </div>
        </span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useUpdaterStore } from "../stores/updater";
import { ref, onMounted, reactive } from "vue";

const currentVersion = ref<string>("");
interface Versions {
  chrome: string;
  node: string;
  electron: string;
}

const versions = reactive<Partial<Versions>>({});
const loading = ref(true);
const colorset = ref("var(--color-accent)");

// Fetch the version when the modal mounts
onMounted(async () => {
  try {
    currentVersion.value = await window.api.appVersion();
    Object.assign(versions, window.api.versions);
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
