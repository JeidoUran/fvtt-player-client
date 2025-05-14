<!-- src/App.vue -->
<template>
  <!-- votre header ou barre d’outils ici, si vous en avez un -->

  <button @click="checkUpdates">Check for updates</button>
  <!-- ou, sinon, votre contenu principal : -->
  <!-- <MainWindow /> -->
  <UpdaterModal />
</template>

<script setup lang="ts">
import UpdaterModal from "./components/UpdaterModal.vue";

function checkUpdates() {
  window.api.checkForUpdates();
}
// si vous avez un composant AppHeader ou MainWindow :
// import AppHeader from "./components/AppHeader.vue";
// import MainWindow from "./components/MainWindow.vue";
</script>

<style>
/* styles globaux éventuels */
</style>
