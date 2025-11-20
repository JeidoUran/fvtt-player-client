<template>
  <transition name="fade">
    <div v-if="visible" class="backdrop">
    <div class="app-configuration" v-if="visible">
      <div class="overflow">
        <!-- Cache Path -->
        <div class="cache-path-field">
          <el-input
          v-model="form.cachePath"
          placeholder="Cache Path"
          id="cache-path" clearable />
        </div>

        <!-- Clear Cache on Close -->
        <div class="clear-cache-on-close-field field">
          <label class="switch-label">Clear Cache on Close</label>
          <el-switch
          v-model="form.clearCacheOnClose"
          class="mt-2"
          size="large"
          style="margin-left: 24px; --el-switch-on-color: var(--color-accent); --el-switch-off-color: #000000; --el-switch-border-color: #000000;"
          inline-prompt
          :active-icon="Check"
          :inactive-icon="Close"
          id="clear-cache-on-close" />
        </div>

        <!-- Ignore Certificate Errors -->
        <div class="insecure-ssl-field field">
          <label class="switch-label">Ignore Certificate Errors</label>
          <el-switch
          v-model="form.insecureSsl"
          class="mt-2"
          size="large"
          style="margin-left: 24px; --el-switch-on-color: var(--color-accent); --el-switch-off-color: #000000; --el-switch-border-color: #000000;"
          inline-prompt
          :active-icon="Check"
          :inactive-icon="Close"
          id="insecure-ssl" />
        </div>

        <!-- Notifications Timer -->
        <div class="notification-timer-field field">
          <label for="notification-timer">Notifications Timer (in Seconds)</label>
            <el-slider v-model="form.notificationTimer" :min="3" :max="10" :step="1" :show-tooltip="true"
              id="notification-timer" />
        </div>

        <!-- Enable Server Status -->
        <div class="server-infos-toggle-field field">
          <label class="switch-label">Enable Server Status</label>
          <el-switch
          v-model="form.enableServerStatus"
          class="mt-2"
          size="large"
          style="margin-left: 24px; --el-switch-on-color: var(--color-accent); --el-switch-off-color: #000000; --el-switch-border-color: #000000;"
          inline-prompt
          :active-icon="Check"
          :inactive-icon="Close"
          id="server-infos-toggle" />
        </div>

        <!-- Server Infos Configuration -->
        <div class="server-infos-configuration" v-show="form.enableServerStatus">
          <div class="individual-server-infos-options">
            <div class="switch-wrapper-grid">
              <label class="switch-label" for="server-status-toggle">Online Status</label>
              <el-switch
              v-model="form.showServerStatusOnline"
              class="mt-2"
              style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
              inline-prompt
              :active-icon="Check"
              :inactive-icon="Close"
              id="server-status-toggle"
              />
            </div>
            <div class="switch-wrapper-grid">
              <label class="switch-label" for="foundry-version-toggle">Foundry Version</label>
              <el-switch
              v-model="form.showFoundryVersion"
              class="mt-2"
              style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
              inline-prompt
              :active-icon="Check"
              :inactive-icon="Close"
              id="foundry-version-toggle"
              />
            </div>
            <div class="switch-wrapper-grid">
              <label class="switch-label" for="world-toggle">World Name</label>
              <el-switch
              v-model="form.showWorldName"
              class="mt-2"
              style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
              inline-prompt
              :active-icon="Check"
              :inactive-icon="Close"
              id="world-toggle"
              />
            </div>
            <div class="switch-wrapper-grid">
              <label class="switch-label" for="game-system-toggle">Game System</label>
              <el-switch
              v-model="form.showGameSystem"
              class="mt-2"
              style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
              inline-prompt
              :active-icon="Check"
              :inactive-icon="Close"
              id="game-system-toggle" />
            </div>
            <div class="switch-wrapper-grid">
              <label class="switch-label" for="game-version-toggle">Game System Version</label>
              <el-switch
              v-model="form.showGameVersion"
              class="mt-2"
              style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
              inline-prompt
              :active-icon="Check"
              :inactive-icon="Close"
              id="game-version-toggle" />
            </div>
            <div class="switch-wrapper-grid">
              <label class="switch-label" for="online-players-toggle">Online Players</label>
              <el-switch
              v-model="form.showOnlinePlayers"
              class="mt-2"
              style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
              inline-prompt
              :active-icon="Check"
              :inactive-icon="Close"
              id="online-players-toggle" />
            </div>
          </div>

          <div class="server-infos-ping-rate-field field">
            <label for="server-infos-ping-rate">
              Server Status Automatic Refresh Rate (in Seconds)
            </label>
              <el-slider v-model="form.serverInfosPingRate" :min="15" :max="60" :step="1" :show-tooltip="true"
                id="server-infos-ping-rate" />
          </div>
        </div>

        <!-- Force Full Screen -->
        <div class="full-screen-toggle-field field">
          <label class="switch-label">Force Full Screen</label>
          <el-switch
          v-model="form.forceFullScreen"
          class="mt-2"
          size="large"
          style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
          inline-prompt
          :active-icon="Check"
          :inactive-icon="Close"
          id="full-screen-toggle" />
        </div>

        <!-- Share Session between Windows -->
        <div class="share-session-toggle-field field">
          <label class="switch-label">Share Session between Windows</label>
          <div class="tooltip-wrapper" style="display: initial; position: initial;">
            <el-switch
            v-model="form.shareSessionBetweenWindows"
            class="mt-2"
            size="large"
            style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
            inline-prompt
            :active-icon="Check"
            :inactive-icon="Close"
            id="share-session-toggle" />
            <div class="tooltip">
              Does not affect already opened windows
            </div>
          </div>
        </div>

        <!-- Discord Rich Presence -->
        <div class="discord-rp-field field">
          <label class="switch-label">
            <i class="fa-brands fa-discord"></i>
            Enable Discord Rich Presence
          </label>
          <div class="tooltip-wrapper" style="display: initial; position: initial;">
            <el-switch
            v-model="form.enableDiscordRp"
            class="mt-2"
            size="large"
            style="margin-left: 24px; --el-switch-on-color: #98e4f7; --el-switch-off-color: #000000;"
            inline-prompt
            :active-icon="Check"
            :inactive-icon="Close"
            id="discord-rp" />
            <div class="tooltip">
              Requires Foundry VTT Rich Presence module installed per server<br>
              Turning this option off disables Discord Rich Presence globally,
              regardless of each server's module settings
            </div>
          </div>
        </div>

        <div class="download-link">
          Download the required module
          <a href="https://github.com/JeidoUran/fvtt-rich-presence" target="_blank">
            here
          </a>!
        </div>
      </div>

      <!-- Boutons -->
      <div class="button-group">
        <div class="button-row">
          <el-button id="save-app-config" type="primary" @click="onSave">
            Save
          </el-button>
          <el-button id="reset-client" type="warning" @click="onReset">
            Reset Settings
          </el-button>
          <el-button id="clear-cache" type="danger" @click="onClearCache">
            Clear Cache
          </el-button>
        </div>
        <div class="button-row">
          <el-button id="open-user-data" @click="onOpenUserData">
            Open User Data Folder
          </el-button>
        </div>
        <el-button id="cancel-app-config" @click="onCancel">
          Cancel
        </el-button>
      </div>
    </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { reactive, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'

export interface AppConfigurationForm {
  cachePath: string
  clearCacheOnClose: boolean
  insecureSsl: boolean
  notificationTimer: number
  enableServerStatus: boolean
  showServerStatusOnline: boolean
  showFoundryVersion: boolean
  showWorldName: boolean
  showGameSystem: boolean
  showGameVersion: boolean
  showOnlinePlayers: boolean
  serverInfosPingRate: number
  forceFullScreen: boolean
  shareSessionBetweenWindows: boolean
  enableDiscordRp: boolean
}

const props = defineProps<{
  modelValue: AppConfigurationForm
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AppConfigurationForm): void
  (e: 'update:visible', value: boolean): void
  (e: 'cancel'): void
  (e: 'save', value: AppConfigurationForm): void
  (e: 'reset'): void
  (e: 'clear-cache'): void
  (e: 'open-user-data'): void
}>()

// Copie locale éditable du formulaire
const form = reactive<AppConfigurationForm>({
  cachePath: '',
  clearCacheOnClose: false,
  insecureSsl: false,
  notificationTimer: 3,
  enableServerStatus: false,
  showServerStatusOnline: false,
  showFoundryVersion: false,
  showWorldName: false,
  showGameSystem: false,
  showGameVersion: false,
  showOnlinePlayers: false,
  serverInfosPingRate: 30,
  forceFullScreen: false,
  shareSessionBetweenWindows: false,
  enableDiscordRp: false,
})

// Sync entrée -> copie locale
watch(
  () => props.modelValue,
  (value) => {
    if (!value) return
    Object.assign(form, value)
  },
  { immediate: true, deep: true },
)

function onSave() {
  emit('update:modelValue', { ...form })
  emit('save', { ...form })
  emit('update:visible', false)
}

function onReset() {
  emit('reset')
}

function onClearCache() {
  emit('clear-cache')
}

function onOpenUserData() {
  emit('open-user-data')
}

function onCancel() {
  emit('cancel')
  emit('update:visible', false)
}
</script>