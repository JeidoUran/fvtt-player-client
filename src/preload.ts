/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: no nodejs in preload
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});

// type SendChannels = "toMain" | "open-game" | "save-user-data" | "app-version" | "cache-path" | "clear-cache";
// type ReceiveChannels = "fromMain" | "save-user-data" | "app-version" | "cache-path";
// type RequestChannels = "app-version" | "cache-path" | "get-user-data" | "select-path";
// type SendOnChannel = (channel: SendChannels, data?: number | string | SaveUserData) => void;
// type ReceiveOnChannel = ((channel: ReceiveChannels, func: (...args: unknown[]) => void) => void)
// type RequestOnChannel = ((channel: RequestChannels, ...args: unknown[]) => Promise<unknown>)

export type ContextBridgeApi = {
  // send: SendOnChannel;
  // receive: ReceiveOnChannel;
  // request: RequestOnChannel;
  userData: (gameId: string | number) => Promise<GameUserDataDecrypted>;
  appVersion: () => Promise<string>;
  appConfig: () => Promise<AppConfig>;
  localAppConfig: () => Promise<AppConfig>;
  themeConfig: () => Promise<ThemeConfig>;
  localThemeConfig: () => Promise<ThemeConfig>;
  cachePath: () => Promise<string>;
  setCachePath: (cachePath: string) => void;
  returnToServerSelect: () => void;
  saveUserData: (data: SaveUserData) => void;
  openGame: (id: number | string, serverName: string) => void;
  clearCache: () => void;
  saveAppConfig: (data: AppConfig) => void;
  saveThemeConfig: (data: ThemeConfig) => void;
  showNotification(callback: (message: string) => void): void;
  safePrompt(
    message: string,
    options?: { mode: "confirm" | "alert" },
  ): Promise<boolean>;
  onShowPrompt: (
    handler: (event: {
      id: number;
      message: string;
      options?: { mode: "confirm" | "alert" };
    }) => void,
  ) => void;
  sendPromptResponse: (id: number, answer: boolean) => void;
  chooseFontFile(): Promise<string | null>;
  readFontFile(path: string): Promise<string | null>;
  openUserDataFolder: () => Promise<string>;
  showMenu: () => Promise<string>;
  pingServer: (url: string) => Promise<ServerStatusData | null>;
  setFullScreen: (fullscreen: boolean) => void;
  /** ask main “are we full-screen right now?” */
  isFullScreen: () => Promise<boolean>;
  /** subscribe to live full-screen changes */
  onFullScreenChange: (cb: (isFullscreen: boolean) => void) => void;
  platform: NodeJS.Platform;
  closeWindow: () => void;
  onUpdaterStatus: (
    cb: (
      event: IpcRendererEvent,
      data: { status: string; payload?: any },
    ) => void,
  ) => void;
  /** Manually ask the main process to check for updates */
  checkForUpdates: () => void;
  /** Tell the main process to download the update (after “available”) */
  downloadUpdate: () => void;
  /** Tell the main process to install & restart (after “downloaded”) */
  installUpdate: () => void;
};

const exposedApi: ContextBridgeApi = {
  // request(channel: RequestChannels, ...args: unknown[]): Promise<unknown> {
  //     return ipcRenderer.invoke(channel, ...args);
  // },
  // receive(channel: ReceiveChannels, func: (...args: unknown[]) => void) {
  //     // Deliberately strip event as it includes `sender`
  //     ipcRenderer.on(channel, (event, ...args) => func(...args));
  // },
  // send(channel: SendChannels, data?: number | string | SaveUserData) {
  //     ipcRenderer.send(channel, data);
  // },
  userData(gameId: string | number) {
    return ipcRenderer.invoke(
      "get-user-data",
      gameId,
    ) as Promise<GameUserDataDecrypted>;
  },
  appConfig() {
    return ipcRenderer.invoke("app-config") as Promise<AppConfig>;
  },
  localAppConfig() {
    return ipcRenderer.invoke("local-app-config") as Promise<AppConfig>;
  },
  themeConfig() {
    return ipcRenderer.invoke("theme-config") as Promise<ThemeConfig>;
  },
  localThemeConfig() {
    return ipcRenderer.invoke("local-theme-config") as Promise<ThemeConfig>;
  },
  appVersion() {
    return ipcRenderer.invoke("app-version") as Promise<string>;
  },
  cachePath() {
    return ipcRenderer.invoke("cache-path") as Promise<string>;
  },
  returnToServerSelect() {
    ipcRenderer.send("return-select");
  },
  saveUserData(data: SaveUserData) {
    ipcRenderer.send("save-user-data", data);
  },
  openGame(id: number | string, serverName: string) {
    ipcRenderer.send("open-game", id, serverName);
  },
  clearCache() {
    ipcRenderer.send("clear-cache");
  },
  setCachePath(cachePath: string) {
    ipcRenderer.send("cache-path", cachePath);
  },
  saveAppConfig(data: AppConfig) {
    ipcRenderer.send("save-app-config", data);
  },
  saveThemeConfig(data: ThemeConfig) {
    ipcRenderer.send("save-theme-config", data);
  },
  showNotification(callback: (message: string) => void): void {
    ipcRenderer.on(
      "show-notification",
      (_event: IpcRendererEvent, message: string) => {
        callback(message);
      },
    );
  },
  safePrompt: (message, options) => {
    return ipcRenderer.invoke(
      "safe-prompt",
      message,
      options,
    ) as Promise<boolean>;
  },
  onShowPrompt: (handler) => {
    ipcRenderer.on(
      "show-prompt",
      (
        _e: IpcRendererEvent,
        event: {
          id: number;
          message: string;
          options?: { mode: "confirm" | "alert" };
        },
      ) => {
        handler(event);
      },
    );
  },
  sendPromptResponse: (id, answer) => {
    ipcRenderer.send(`prompt-response-${id}`, answer);
  },
  chooseFontFile: () =>
    ipcRenderer.invoke("dialog:choose-font") as Promise<string | null>,
  readFontFile: (path: string) =>
    ipcRenderer.invoke("read-font-file", path) as Promise<string | null>,
  openUserDataFolder: () =>
    ipcRenderer.invoke("open-user-data-folder") as Promise<string>,
  showMenu: () => ipcRenderer.invoke("show-menu") as Promise<string>,
  pingServer: (url: string) =>
    ipcRenderer.invoke("ping-server", url) as Promise<ServerStatusData | null>,
  platform: process.platform,
  closeWindow: () => {
    ipcRenderer.send("close-window");
  },
  setFullScreen: (fs) => ipcRenderer.send("set-fullscreen", fs),
  isFullScreen: () => ipcRenderer.invoke("is-fullscreen"),
  onFullScreenChange: (cb) =>
    ipcRenderer.on(
      "fullscreen-changed",
      (_e: IpcRendererEvent, isFs: boolean) => cb(isFs),
    ),
  onUpdaterStatus: (cb) =>
    ipcRenderer.on(
      "update-status",
      (_e: IpcRendererEvent, data: { status: string; payload?: any }) =>
        cb(_e, data),
    ),
  checkForUpdates: () => {
    ipcRenderer.send("check-for-updates");
  },
  downloadUpdate: () => {
    ipcRenderer.send("download-update");
  },
  installUpdate: () => {
    ipcRenderer.send("install-update");
  },
};

contextBridge.exposeInMainWorld("api", exposedApi);

contextBridge.exposeInMainWorld("richPresence", {
  update: (payload: {
    details?: string;
    state?: string;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
  }) => ipcRenderer.send("update-rich-presence", payload),
  enable: () => ipcRenderer.send("enable-discord-rpc"),
});
contextBridge.exposeInMainWorld("dialogApi", {
  chooseFontFile: () => ipcRenderer.invoke("dialog:choose-font"),
  openUserDataFolder: () => ipcRenderer.invoke("open-user-data-folder"),
  showMenu: () => ipcRenderer.invoke("show-menu"),
  pingServer: (url: string) => ipcRenderer.invoke("ping-server", url),
});

contextBridge.exposeInMainWorld("updater", {
  /**
   * Subscribe to status updates:
   *   {status: 'checking'|'available'|... , payload?: any}
   */
  onStatus: (
    cb: (
      event: IpcRendererEvent,
      data: { status: string; payload?: any },
    ) => void,
  ) => {
    ipcRenderer.on("update-status", cb);
  },
  /** Trigger a manual check-for-updates */
  checkForUpdates: () => {
    ipcRenderer.send("check-for-updates");
  },
  /** After “available” you call this to start download */
  downloadUpdate: () => {
    ipcRenderer.send("download-update");
  },
  /** After “downloaded” you call this to install & restart */
  installUpdate: () => {
    ipcRenderer.send("install-update");
  },
});
