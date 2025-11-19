// src/stores/ui.ts
import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", {
  state: () => ({
    appConfigVisible: false,
  }),
  actions: {
    openAppConfig() {
      this.appConfigVisible = true;
    },
    closeAppConfig() {
      this.appConfigVisible = false;
    },
    toggleAppConfig() {
      this.appConfigVisible = !this.appConfigVisible;
    },
  },
});
