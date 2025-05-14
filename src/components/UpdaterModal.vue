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
<template>
  <el-dialog :visible.sync="store.visible" title="Update">
    <div v-if="store.status === 'checking'">Checking for updates…</div>
    <div v-else-if="store.status === 'available'">
      New version {{ payload.version }} is available!
    </div>
    <div v-else-if="store.status === 'progress'">
      <el-progress :percentage="store.payload.percent" />
    </div>
    <div v-else-if="store.status === 'downloaded'">Ready to install!</div>
    <div v-else-if="store.status === 'error'">
      Error : {{ store.payload.message }}
    </div>
    <span slot="footer" class="dialog-footer">
      <el-button v-if="store.status === 'available'" @click="download"
        >Download</el-button
      >
      <el-button v-if="store.status === 'downloaded'" @click="install"
        >Install</el-button
      >
      <el-button @click="store.close">Close</el-button>
    </span>
  </el-dialog>
</template>

<style scoped>
.modal-backdrop {
  background: rgba(255, 0, 0, 0.25); /* bright red overlay */
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999; /* ensure it’s above everything */
}
.modal-window {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}
/* … rest of your styles … */
</style>
