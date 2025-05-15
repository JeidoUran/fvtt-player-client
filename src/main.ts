// noinspection ES6MissingAwait,JSIgnoredPromiseFromCall

import {
  app,
  net,
  BrowserWindow,
  ipcMain,
  safeStorage,
  session,
  nativeImage,
  dialog,
  shell,
  Menu,
  MenuItemConstructorOptions,
} from "electron";
import {
  UserDataSchema,
  ThemeConfigSchema,
  AppConfigSchema,
  UserData,
  AppConfig,
  ThemeConfig,
  CURRENT_SCHEMA_VERSION,
} from "./schemas";
import {
  enableRichPresence,
  disableRichPresence,
} from "./richPresence/richPresenceControl";
import {
  startRichPresenceSocket,
  closeRichPresenceSocket,
} from "./richPresence/richPresenceSocket";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import log from "electron-log";
import { autoUpdater } from "electron-updater";

const fileTransport = log.transports.file;
(fileTransport as any).getFile = () =>
  path.join(app.getPath("userData"), "main.log");
fileTransport.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

// TODO: TESTING ONLY, REMOVE THESE LINES BEFORE RELEASE
autoUpdater.forceDevUpdateConfig = true;
autoUpdater.allowPrerelease = true;

const MAIN_WINDOW_VITE_DEV_SERVER_URL = !app.isPackaged
  ? "http://localhost:5173"
  : "";
const MAIN_WINDOW_VITE_NAME = "main_window";

let initialCheckInProgress = true;

if (require("electron-squirrel-startup")) app.quit();

app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

/* Remove the comment (//) from the line below to ignore certificate errors (useful for self-signed certificates) */

//app.commandLine.appendSwitch("ignore-certificate-errors");

let mainWindow: BrowserWindow;

function sendUpdateStatus(
  status:
    | "checking"
    | "available"
    | "not-available"
    | "progress"
    | "downloaded"
    | "error",
  payload?: any,
) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { status, payload });
  }
}

type MigrationStatus = "skipped" | "success" | "failure";
async function migrateUserData(): Promise<MigrationStatus> {
  const userDataPath = path.join(app.getPath("userData"), "userData.json");
  let rawData: any = {};
  try {
    rawData = JSON.parse(fs.readFileSync(userDataPath, "utf-8"));
  } catch {
    rawData = {};
  }
  try {
    const themeKeys = [
      "background",
      "backgrounds",
      "backgroundColor",
      "textColor",
      "accentColor",
      "buttonColorAlpha",
      "buttonColor",
      "theme",
      "particlesEnabled",
    ] as const;

    const dataObj =
      typeof rawData === "object" && rawData !== null
        ? { ...(rawData as Record<string, any>) }
        : {};

    let migrated = false;
    dataObj.theme = dataObj.theme ?? {};
    if (dataObj.app) {
      for (const key of themeKeys) {
        if ((dataObj.app as any)[key] !== undefined) {
          (dataObj.theme as any)[key] = (dataObj.app as any)[key];
          delete (dataObj.app as any)[key];
          migrated = true;
        }
      }
    }
    // If theme is detected on old schema
    if (dataObj.theme && (dataObj.theme as any).theme !== undefined) {
      // Rename theme → baseTheme in dataObj.theme
      (dataObj.theme as any).baseTheme = (dataObj.theme as any).theme;
      delete (dataObj.theme as any).theme;
      migrated = true;
    }
    if (migrated) {
      fs.writeFileSync(userDataPath, JSON.stringify(dataObj, null, 2));
      rawData = dataObj;
      return "success";
    } else {
      return "skipped";
    }
  } catch (e) {
    console.warn("[getUserData] Migration failed :", e);
    return "failure";
  }
}

export function getUserData(): UserData {
  if (require("electron-squirrel-startup")) return;
  const userDataPath = path.join(app.getPath("userData"), "userData.json");
  let rawData: unknown = {};

  // Secure read
  try {
    rawData = JSON.parse(
      fs.readFileSync(
        userDataPath,
        "userData.json" in fs.readFileSync ? "utf-8" : "utf-8",
      ),
    );
  } catch {
    rawData = {};
  }

  // Check if file exists and create it if not
  const fileExists = fs.existsSync(userDataPath);
  const isEmpty =
    typeof rawData === "object" &&
    rawData !== null &&
    Object.keys(rawData).length === 0;
  if (!fileExists || isEmpty) {
    // let Zod (i hate him) generate a valid userData
    const defaultApp = AppConfigSchema.parse({ games: [] });
    const defaultTheme = ThemeConfigSchema.parse({});
    const defaultData = UserDataSchema.parse({
      app: defaultApp,
      theme: defaultTheme,
    });

    fs.writeFileSync(
      userDataPath,
      JSON.stringify(defaultData, null, 2),
      "utf-8",
    );
    return defaultData;
  }

  // Validate + clean + backup on each call
  try {
    const validation = UserDataSchema.safeParse(rawData);
    if (!validation.success) {
      askPrompt(
        `Invalid configuration detected: a backup of your previous settings has been created, and any invalid values have been reset to their defaults.`,
        { mode: "alert" },
      );
      // Backup
      try {
        const bakPath = userDataPath.replace(/\.json$/, ".bak.json");
        fs.copyFileSync(userDataPath, bakPath);
      } catch {
        /**/
      }

      // Only delete erroneous keys
      const dataObj = { ...(rawData as Record<string, any>) };
      for (const err of validation.error.errors) {
        if (!err.path.length) continue;
        let obj: any = dataObj;
        for (let i = 0; i < err.path.length - 1; i++) {
          const p = err.path[i];
          if (obj && typeof obj[p] === "object") obj = obj[p];
          else {
            obj = null;
            break;
          }
        }
        const last = err.path.at(-1);
        if (obj && typeof last === "string") {
          delete obj[last];
        }
      }

      // Write corrected JSON
      try {
        fs.writeFileSync(userDataPath, JSON.stringify(dataObj, null, 2));
        rawData = dataObj;
      } catch {
        console.warn("[getUserData] Could not write cleaned userData");
      }
    }
  } catch (e) {
    console.warn("[getUserData] Zod Validation Failed :", e);
  }

  // ── Final parse, then update schemaVersion & lastRunAppVersion ──
  try {
    const data = UserDataSchema.parse(rawData) as UserData;
    const appVer = app.getVersion();
    let dirty = false;

    // Migrate schemaVersion if needed
    if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
      // TODO: run your migration routines here…
      data.schemaVersion = CURRENT_SCHEMA_VERSION;
      dirty = true;
    }

    // Update lastRunAppVersion
    if (data.lastRunAppVersion !== appVer) {
      data.lastRunAppVersion = appVer;
      dirty = true;
    }

    // If one or the other was increased, rewrite userData.json
    if (dirty) {
      try {
        fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {
        console.warn("[getUserData] Could not persist updated version:", e);
      }
    }

    return data;
  } catch (e) {
    console.error(
      "[getUserData] Final parsing failed, regenerating a clean userData :",
      e,
    );
    // As last resort, return an empty userData
    return UserDataSchema.parse({ app: { games: [] }, theme: {} });
  }
}

function returnToServerSelect(win: BrowserWindow) {
  const id = win.webContents.id;
  windowsData[id].autoLogin = true;
  delete windowsData[id].selectedServerName;
  disableRichPresence();
  closeRichPresenceSocket();

  if (!app.isPackaged && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // ► in production, load the file we just packed into /renderer/…
    const indexHtml = path.join(
      __dirname,
      "../../renderer",
      MAIN_WINDOW_VITE_NAME,
      "index.html",
    );
    win.loadFile(indexHtml);
  }
}

function notifyMainWindow(message: string, winOverride?: BrowserWindow) {
  const win = winOverride ?? mainWindow;
  if (win && !win.isDestroyed()) {
    win.webContents.send("show-notification", message);
  }
}

/**
 * Displays safePrompt in renderer in a given window and retrieve answer
 */
function askPrompt(
  message: string,
  options?: { mode: "confirm" | "alert" },
  winOverride?: BrowserWindow,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const id = Date.now();
    // Listen to renderer (good guy i like him unlike zod)
    ipcMain.once(`prompt-response-${id}`, (_e, answer: boolean) => {
      resolve(answer);
    });
    // Ask renderer to display prompt in target window
    const win = winOverride ?? mainWindow;
    win.webContents.send("show-prompt", { id, message, options });
  });
}

function hookFullScreenEvents(win: BrowserWindow) {
  win.on("enter-full-screen", () => {
    win.webContents.send("fullscreen-changed", true);
  });
  win.on("leave-full-screen", () => {
    win.webContents.send("fullscreen-changed", false);
  });
}

const windows = new Set<BrowserWindow>();

/** Check if single instance, if not, simply quit new instance */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    createWindow();
  });
}

const windowsData = {} as WindowsData;

let partitionId: number = 0;

function getSession(): Electron.Session {
  const partitionIdTemp = partitionId;
  partitionId++;
  if (partitionIdTemp == 0) return session.defaultSession;
  return session.fromPartition(`persist:${partitionIdTemp}`, { cache: true });
}

// let win: BrowserWindow;

function createWindow(): BrowserWindow {
  const localSession = getSession();
  let win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true,
      session: localSession,
    },
  });

  hookFullScreenEvents(win);

  // ── Applies fullscreen according to user config ──
  try {
    const cfg = getAppConfig();
    win.setFullScreen(cfg.fullScreenEnabled ?? false);
  } catch (e) {
    console.warn("[createWindow] Impossible d’appliquer le plein écran :", e);
  }

  win.webContents.on("page-favicon-updated", (_event, favicons) => {
    if (!favicons.length) return;
    const faviconUrl = favicons[0];

    if (faviconUrl.startsWith("file://")) {
      try {
        const filePath = fileURLToPath(faviconUrl);
        const icon = nativeImage.createFromPath(filePath);
        if (!icon.isEmpty()) {
          win.setIcon(icon);
          console.log("[Favicon] Restored from local file :", filePath);
        } else {
          console.warn("[Favicon] nativeImage empty for:", filePath);
        }
      } catch (err) {
        console.warn("[Favicon] Could not resolve local URL:", faviconUrl, err);
      }
    } else {
      const request = net.request(faviconUrl);
      const chunks: Buffer[] = [];
      request.on("response", (response) => {
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const icon = nativeImage.createFromBuffer(buffer);
          if (!icon.isEmpty()) {
            win.setIcon(icon);
            console.log("[Favicon] Restored from external URL:", faviconUrl);
          }
        });
      });
      request.on("error", (err) =>
        console.warn("[Favicon] net.request error:", err),
      );
      request.end();
    }
  });

  // Fix Popouts
  win.webContents.setUserAgent(
    win.webContents.getUserAgent().replace("Electron", ""),
  );
  win.webContents.on("did-start-loading", () => {
    const wd = windowsData[win.webContents.id];
    if (wd?.selectedServerName) {
      win.setTitle(
        wd.selectedServerName +
          " - " +
          win.webContents.getTitle() +
          " * Loading...",
      );
    } else {
      win.setTitle(win.webContents.getTitle() + " * Loading...");
    }

    win.setProgressBar(2, { mode: "indeterminate" }); // second parameter optional
  });

  win.webContents.on("did-finish-load", () => {
    const wd = windowsData[win.webContents.id];
    if (wd?.selectedServerName) {
      win.setTitle(wd.selectedServerName + " - " + win.webContents.getTitle());
    } else {
      win.setTitle(win.webContents.getTitle());
    }
    win.setProgressBar(-1);
  });
  win.webContents.on("did-stop-loading", () => {
    const wd = windowsData[win.webContents.id];
    if (wd?.selectedServerName) {
      win.setTitle(wd.selectedServerName + " - " + win.webContents.getTitle());
    } else {
      win.setTitle(win.webContents.getTitle());
    }
    win.setProgressBar(-1);
  });
  win.webContents.setWindowOpenHandler(() => {
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        parent: win,
        autoHideMenuBar: true,
      },
    };
  });

  win.menuBarVisible = false;
  if (!app.isPackaged && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // EN PROD on pointe vers /renderer/<name>/index.html
    const indexHtml = path.join(
      __dirname,
      "../../renderer",
      MAIN_WINDOW_VITE_NAME,
      "index.html",
    );
    win.loadFile(indexHtml);
  }

  // ── Fallback on HTTP error (502, 503…) when loading /join ──
  const { session } = win.webContents;

  // Catch network errors (ERR_CONNECTION_REFUSED, etc.)
  session.webRequest.onErrorOccurred(
    { urls: ["*://*/join", "*://*/setup", "*://*/auth", "*://*/game"] },
    (details) => {
      if (
        details.resourceType === "mainFrame" &&
        !details.error.includes("ERR_ABORTED")
      ) {
        // on passe maintenant la fenêtre concernée
        handleServerError(win, details.url, details.error);
      }
    },
  );

  // Catch HTTP responses (502, 503, etc.)
  session.webRequest.onCompleted({ urls: ["*://*/*"] }, (details) => {
    if (details.resourceType === "mainFrame" && details.statusCode >= 400) {
      handleServerError(win, details.url, `HTTP ${details.statusCode}`);
    }
  });

  // Fallback + prompt function
  function handleServerError(
    targetWin: BrowserWindow,
    failedUrl: string,
    reason: string,
  ) {
    console.warn(`[App] Could not load ${failedUrl}: ${reason}`);
    // Return to index **dans la fenêtre concernée**
    returnToServerSelect(targetWin);
    // Affiche le prompt dans la bonne fenêtre
    targetWin.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        askPrompt(
          `The game you attempted to join could not be reached (${reason}).`,
          { mode: "alert" },
          targetWin,
        ).catch(console.error);
      }, 250);
    });
  }

  // Inject Server button on /game page
  win.webContents.on("did-start-navigation", (e) => {
    if (e.isSameDocument) return;
    if (e.url.startsWith("about")) return;

    if (e.url.endsWith("/game")) {
      console.log("[FVTT Client] Navigation detected: /game");

      win.webContents.executeJavaScript(`
                console.log("[FVTT Client] Injecting script for /game...");
    
                async function waitForFoundryReady() {
                    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                    while (typeof Hooks === "undefined" || typeof ui === "undefined") {
                        console.log("[FVTT Client] Waiting for Foundry...");
                        await wait(100);
                    }
    
                    console.log("[FVTT Client] Foundry ready, setting up Return button.");
                        Hooks.on('renderSettings', (settings, htmlElement) => {
                            const html = $(htmlElement);
                            const majorVersion = Number(game.version?.split(".")[0] ?? 0);
  
                            if (majorVersion >= 13) {
                                const serverSelectButton = $(\`
                                <a class="button">
                                <i class="fas fa-server" inert></i> Return to Server Select</a>
                                \`);
                                serverSelectButton.on('click', () => window.api.returnToServerSelect());
                                html.find("section.access.flexcol").append(serverSelectButton);
                                
                            } else {

                            if (html.find('#server-button').length > 0) return;
    
                            const serverSelectButton = $(\`
                                <button id="server-button" data-action="home">
                                    <i class="fas fa-server"></i> Return to Server Select
                                </button>
                            \`);
                            serverSelectButton.on('click', () => window.api.returnToServerSelect());
                            html.find('#settings-access').append(serverSelectButton);
                            }
                        });
                    }  
                waitForFoundryReady();
            `);
    }
  });

  win.webContents.on("did-finish-load", () => {
    const url = win.webContents.getURL();
    if (
      !url.endsWith("/join") &&
      !url.endsWith("/auth") &&
      !url.endsWith("/setup")
    )
      return;
    if (url.endsWith("/setup")) {
      win.webContents.executeJavaScript(`
                if ($('#server-button').length === 0) {
                    const serverSelectButton = $('<button type="button" class="icon" data-action="returnServerSelect" id="server-button" data-tooltip="Return to Server Select"><i class="fas fa-server"></i></button>');
                    serverSelectButton.on('click', () => window.api.returnToServerSelect());
                    setTimeout(() => {
                        $('div#setup-menu-buttons').append(serverSelectButton)
                    }, 1000);
                }
            `);
    }
    if (url.endsWith("/auth")) {
      win.webContents.executeJavaScript(`
                if ($('#server-button').length === 0) {
                    const serverSelectButton = $('<button type="button" class="bright" id="server-button"> <i class="fa-solid fa-server"></i>Return to Server Select</button>');
                    serverSelectButton.on('click', () => window.api.returnToServerSelect());
                    setTimeout(() => {
                        $('.form-footer').append(serverSelectButton)
                    }, 200);
                }
            `);
    }
    if (url.endsWith("/join")) {
      win.webContents.executeJavaScript(`
                if ($('#server-button').length === 0) {
                    const serverSelectButton = $('<button type="button" class="bright" id="server-button"> <i class="fa-solid fa-server"></i>Return to Server Select</button>');
                    serverSelectButton.on('click', () => window.api.returnToServerSelect());
                    setTimeout(() => {
                        $('.form-footer').append(serverSelectButton)
                    }, 200);
                }
            `);
    }

    if (!url.endsWith("/join") && !url.endsWith("/auth")) return;
    const userData = getLoginDetails(windowsData[win.webContents.id].gameId);
    if (!userData.user) return;
    win.webContents.executeJavaScript(`
            async function waitForLoad() {
                const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                while (!document.querySelector('select[name="userid"]') && !document.querySelector('input[name="adminPassword"]')) {
                    await wait(100);
                }
                console.log("logging in");
                login();
            }

            function login() {
                const adminPassword = document.querySelector('input[name="adminPassword"]');
                if (adminPassword)
                    adminPassword.value = "${userData.adminPassword}";
                const select = document.querySelector('select[name="userid"]');
                if (select)
                    select.querySelectorAll("option").forEach(opt => {
                        opt.selected = opt.innerText === "${userData.user}";
                    });
                const password = document.querySelector('input[name="password"]');
                if (password)
                    password.value = "${userData.password}";
                const fakeEvent = {
                    preventDefault: () => {
                    }, target: document.getElementById("join-game")
                }
                if (${windowsData[win.webContents.id].autoLogin}) {
                    ui.join._onSubmit(fakeEvent);
                } else {
                    document.querySelector(".form-footer button[name=join]").addEventListener("click", () => {
                        ui.join._onSubmit(fakeEvent);
                    });
                }
            }

            waitForLoad();

        `);
    windowsData[win.webContents.id].autoLogin = false;
  });

  win.once("ready-to-show", () => {
    if (!win.isFullScreen()) win.maximize();
    win.show();
  });
  win.on("closed", () => {
    windows.delete(win);
    win = null;
  });
  windows.add(win);
  windowsData[win.webContents.id] = { autoLogin: true } as WindowData;
  return win;
}

autoUpdater.on("checking-for-update", () => {
  if (initialCheckInProgress) {
    // silence the first “checking”
    return;
  }
  // any later “checking” should open the modal
  sendUpdateStatus("checking");
});

autoUpdater.on("update-available", (info) => {
  if (initialCheckInProgress) {
    // silence the first “available”
    return;
  }
  sendUpdateStatus("available", info);
});

autoUpdater.on("update-not-available", (info) => {
  if (initialCheckInProgress) {
    // silence the “no update” that always fires at the end of the startup check
    return;
  }
  sendUpdateStatus("not-available");
});
autoUpdater.on("download-progress", (progress) => {
  sendUpdateStatus("progress", progress);
});

autoUpdater.on("update-downloaded", (info) => {
  sendUpdateStatus("downloaded", info);
});

autoUpdater.on("error", (err) => {
  if (initialCheckInProgress) {
    // silence the first “available”
    return;
  }
  sendUpdateStatus("error", {
    message: err == null ? "" : (err.stack || err).toString(),
  });
});

app.whenReady().then(async () => {
  if (require("electron-squirrel-startup")) return;
  // File menu
  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu: [
      {
        label: "New Window",
        accelerator: "F8",
        click: () => {
          createWindow();
        },
      },
      { role: "quit" },
    ],
  };

  // View menu
  const viewMenu: MenuItemConstructorOptions = {
    label: "View",
    submenu: [
      { type: "separator" },
      {
        role: "resetZoom",
        accelerator: "CmdOrCtrl+Num0",
      },
      {
        role: "zoomIn",
        accelerator: "CmdOrCtrl+NumAdd",
      },
      {
        role: "zoomOut",
        accelerator: "CmdOrCtrl+NumSub",
      },
      {
        role: "resetZoom",
        visible: false,
      },
      {
        role: "zoomIn",
        visible: false,
      },
      {
        role: "zoomOut",
        visible: false,
      },
      { type: "separator" },
      {
        role: "togglefullscreen",
        accelerator: "F11",
      },
      { type: "separator" },

      // ── Reload & DevTools ──
      {
        role: "reload",
        visible: false,
      },
      {
        role: "reload",
        accelerator: "F5",
      },
      {
        role: "forceReload",
        visible: false,
      },
      {
        role: "forceReload",
        accelerator: "Ctrl+F5",
      },
      { type: "separator" },
      {
        role: "toggleDevTools",
        visible: false,
      },
      {
        role: "toggleDevTools",
        accelerator: "F12",
      },
    ],
  };

  // build and apply menu
  const menu = Menu.buildFromTemplate([fileMenu, viewMenu]);
  Menu.setApplicationMenu(menu);

  const migrationResult = await migrateUserData();

  // ── Detects first launch : userData.json missing ──
  const userDataPath = path.join(app.getPath("userData"), "userData.json");
  const isFirstUser = !fs.existsSync(userDataPath);

  mainWindow = createWindow();

  // Configure cache/session
  const userData = getUserData();
  if (userData.cachePath) {
    // make sure it’s absolute, e.g. under app.getPath('userData')
    const absoluteCachePath = path.isAbsolute(userData.cachePath)
      ? userData.cachePath
      : path.join(app.getPath("userData"), userData.cachePath);

    app.setPath("sessionData", absoluteCachePath);
  }

  // After rendering index, we notify on migration status
  mainWindow.webContents.once("did-finish-load", async () => {
    // only check once, right after launch
    autoUpdater
      .checkForUpdates()
      .then((result) => {
        // result has a .updateInfo object
        const latest = result.updateInfo?.version;
        const current = app.getVersion();

        if (latest && latest !== current) {
          notifyMainWindow(`An update is available!`);
        }
      })
      .catch((err) => {
        console.error("Update‐check failed:", err);
        notifyMainWindow("Could not check for updates");
      })
      .finally(() => {
        // only once the promise settles do we turn off the “initial check” guard
        initialCheckInProgress = false;
      });

    if (migrationResult === "success") {
      notifyMainWindow(`Your user data has been successfully migrated`);
      console.log("Migration successful");
    } else if (migrationResult === "failure") {
      await askPrompt("Could not migrate your user data.", { mode: "alert" });
    }
    // Welcome, new users!
    if (isFirstUser) {
      notifyMainWindow(`Welcome!`);
    }
  });
});

ipcMain.handle("show-menu", () => {
  const w = BrowserWindow.getFocusedWindow();
  if (w) {
    Menu.getApplicationMenu()?.popup({ window: w });
  }
});

ipcMain.on("enable-discord-rpc", (event) => {
  startRichPresenceSocket();
  enableRichPresence(event.sender.id);
});

ipcMain.on("open-game", (e, gId, gameName: string) => {
  windowsData[e.sender.id].gameId = gId;
  windowsData[e.sender.id].selectedServerName = gameName;
});
ipcMain.on("clear-cache", async (event) => event.sender.session.clearCache());

ipcMain.on("save-user-data", (_e, data: SaveUserData) => {
  const { gameId, password, user, adminPassword } = data;
  saveUserData(gameId, {
    password:
      password.length !== 0
        ? Array.from(safeStorage.encryptString(password))
        : [],
    user,
    adminPassword:
      password.length !== 0
        ? Array.from(safeStorage.encryptString(adminPassword))
        : [],
  });
});
ipcMain.handle("get-user-data", (_, gameId: GameId) => getLoginDetails(gameId));

ipcMain.handle("app-version", () => app.getVersion());

ipcMain.handle("is-fullscreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isFullScreen() : false;
});

ipcMain.on("close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

ipcMain.handle("dialog:choose-font", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select a font file",
    filters: [{ name: "Fonts", extensions: ["ttf", "otf", "woff", "woff2"] }],
    properties: ["openFile"],
  });
  return canceled || filePaths.length === 0 ? null : filePaths[0];
});

ipcMain.handle("read-font-file", async (_e, fontPath: string) => {
  try {
    const buffer = fs.readFileSync(fontPath);
    return buffer.toString("base64");
  } catch (err) {
    console.error("read-font-file failed:", err);
    return null;
  }
});

function getAppConfig(): AppConfig {
  // Charge l’app config uniquement depuis userData.json
  try {
    const userData = getUserData();
    return userData.app ?? ({} as AppConfig);
  } catch {
    return {} as AppConfig;
  }
}

function getThemeConfig(): ThemeConfig {
  // Charge le theme uniquement depuis userData.json
  try {
    const userData = getUserData();
    return userData.theme ?? ({} as ThemeConfig);
  } catch {
    return {} as ThemeConfig;
  }
}

ipcMain.on("check-for-updates", () => autoUpdater.checkForUpdates());
ipcMain.on("download-update", () => autoUpdater.downloadUpdate());
ipcMain.on("install-update", () => autoUpdater.quitAndInstall(true, true));

ipcMain.on("save-app-config", (_e, data: AppConfig) => {
  const currentData = getUserData();
  currentData.app = { ...currentData.app, ...data };
  fs.writeFileSync(
    path.join(app.getPath("userData"), "userData.json"),
    JSON.stringify(currentData, null, 2),
    "utf-8",
  );
});
ipcMain.handle("app-config", getAppConfig);
ipcMain.handle("local-app-config", () => {
  try {
    const userData = getUserData();
    return userData.app ?? ({} as AppConfig);
  } catch (e) {
    return {} as AppConfig;
  }
});

ipcMain.on("save-theme-config", (_e, data: ThemeConfig) => {
  const currentData = getUserData();
  currentData.theme = { ...currentData.theme, ...data };
  fs.writeFileSync(
    path.join(app.getPath("userData"), "userData.json"),
    JSON.stringify(currentData, null, 2),
    "utf-8",
  );
});
ipcMain.handle("theme-config", getThemeConfig);
ipcMain.handle("local-theme-config", () => {
  try {
    const userData = getUserData();
    return userData.theme ?? ({} as ThemeConfig);
  } catch (e) {
    return {} as ThemeConfig;
  }
});

// TODO: Seems unused
/* ipcMain.handle("select-path", (e) => {
  windowsData[e.sender.id].autoLogin = true;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    return MAIN_WINDOW_VITE_DEV_SERVER_URL;
  } else {
    return path.join(
      __dirname,
      `../../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
    );
  }
}); */

ipcMain.on("open-external", (_event, url: string) => {
  shell.openExternal(url).catch((err) => {
    console.error("Failed to open external URL", url, err);
  });
});

ipcMain.handle("cache-path", () => app.getPath("sessionData"));

ipcMain.handle("open-user-data-folder", () => {
  const userDataDir = app.getPath("userData");
  return shell.openPath(userDataDir);
});

ipcMain.on("cache-path", (_, cachePath: string) => {
  const currentData = getUserData();
  currentData.cachePath = cachePath;
  fs.writeFileSync(
    path.join(app.getPath("userData"), "userData.json"),
    JSON.stringify(currentData, null, 2),
    "utf-8",
  );
});

ipcMain.handle("ping-server", (_e, rawUrl: string) => {
  return new Promise<ServerStatusData | null>((resolve) => {
    const pingUrl = new URL("/api/status", rawUrl).toString();

    // fire the request
    const req = net.request(pingUrl);

    // enforce a 5s timeout
    const timer = setTimeout(() => {
      req.abort();
      resolve(null);
    }, 5000);

    const chunks: Buffer[] = [];
    req.on("response", (response) => {
      clearTimeout(timer);

      // accumulate all data
      response.on("data", (b) => chunks.push(b));
      response.on("end", () => {
        // only parse on 2xx
        if (
          response.statusCode &&
          response.statusCode >= 200 &&
          response.statusCode < 300
        ) {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString());
            resolve(json);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });

    req.end();
  });
});

ipcMain.on("return-select", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) returnToServerSelect(win);
});

app.on("activate", (_, hasVisibleWindows) => {
  if (!hasVisibleWindows) {
    createWindow();
  }
});

ipcMain.on("set-fullscreen", (event, fullscreen: boolean) => {
  const w = BrowserWindow.fromWebContents(event.sender);
  if (w) w.setFullScreen(fullscreen);
  if ((fullscreen = true)) w.maximize();
});

ipcMain.on("check-for-updates", () => {
  autoUpdater.checkForUpdates();
});

app.on("window-all-closed", () => {
  app.quit();
});

function getLoginDetails(gameId: GameId): GameUserDataDecrypted {
  const userData = getUserData()[gameId];
  if (!userData) return { user: "", password: "", adminPassword: "" };
  const password = new Uint8Array(userData.password);
  const adminPassword = new Uint8Array(userData.adminPassword);

  return {
    user: userData.user,
    password:
      password.length !== 0
        ? safeStorage.isEncryptionAvailable()
          ? safeStorage.decryptString(Buffer.from(password))
          : ""
        : "",
    adminPassword:
      password.length !== 0
        ? safeStorage.isEncryptionAvailable()
          ? safeStorage.decryptString(Buffer.from(adminPassword))
          : ""
        : "",
  };
}

function writeUserDataFile(data: unknown) {
  const result = UserDataSchema.safeParse(data);
  if (!result.success) {
    console.error("Invalid write attempt :", result.error.format());
    return false;
  }
  fs.writeFileSync(
    path.join(app.getPath("userData"), "userData.json"),
    JSON.stringify(result.data, null, 2),
    "utf-8",
  );
  return true;
}

function saveUserData(gameId: GameId, data: GameUserData) {
  const current = getUserData();
  const newData: UserData = { ...current, [gameId]: data };
  if (!writeUserDataFile(newData)) {
    askPrompt(`Unable to write userData. Data could not be saved.`, {
      mode: "alert",
    });
    console.warn("Unable to write userData. Data could not be saved.");
  }
}
