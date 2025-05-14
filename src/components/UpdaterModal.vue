<template>
  <div v-if="store.visible" class="modal-backdrop">
    <div class="modal-window">
      <div v-if="store.status === 'checking'">Checking for updates…</div>
      <div v-else-if="store.status === 'available' && store.payload?.version">
        Update <strong>{{ store.payload.version }}</strong> is available!
      </div>
      <div v-else-if="store.status === 'available'">
        An update is available!
      </div>
      <div v-else-if="store.status === 'progress'">
        <el-progress :percentage="store.payload.percent" />
      </div>
      <div v-else-if="store.status === 'downloaded'">Ready to install!</div>
      <div v-else-if="store.status === 'error'">
        Error : {{ store.payload.message }}
      </div>
      <span slot="footer" class="dialog-footer">
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
        <button class="modal-button" @click="store.close">Close</button>
      </span>
    </div>
  </div>
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
</script>
