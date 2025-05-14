<template>
  <transition name="fade">
    <div v-if="store.visible" class="modal-backdrop">
      <div class="modal-window">
        <div v-if="store.status === 'checking'">Checking for updates…</div>
        <div
          v-else-if="store.status === 'available' && store.payload?.version"
          class="modal-text"
        >
          Update <strong>{{ store.payload.version }}</strong> is available!
        </div>
        <div v-else-if="store.status === 'available'" class="modal-text">
          An update is available!
        </div>
        <div v-else-if="store.status === 'progress'" class="modal-text">
          <el-progress :percentage="store.payload.percent" />
        </div>
        <div v-else-if="store.status === 'downloaded'" class="modal-text">
          Download complete.
        </div>
        <div v-else-if="store.status === 'error'" class="modal-text">
          Error : {{ store.payload.message }}
        </div>
        <span slot="footer" class="dialog-footer">
          <div class="modal-buttons">
            <button
              class="modal-button"
              v-if="store.status === 'available'"
              @click="download"
            >
              Download
            </button>
            <button
              class="modal-button"
              v-if="store.status === 'downloaded'"
              @click="install"
            >
              Install
            </button>
            <button class="modal-button" @click="openLatest">
              Open GitHub
            </button>
            <button class="modal-button" @click="store.close">Close</button>
          </div>
        </span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useUpdaterStore } from "../stores/updater";

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
