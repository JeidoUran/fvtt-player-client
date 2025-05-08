// noinspection ES6MissingAwait,JSIgnoredPromiseFromCall

import { app, BrowserWindow, ipcMain, safeStorage, session, nativeImage } from 'electron';
import { enableRichPresence, disableRichPresence } from './richPresenceControl';
import { startRichPresenceSocket, closeRichPresenceSocket } from './richPresenceSocket';
import { UserDataSchema } from './schemas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

if (require('electron-squirrel-startup')) app.quit();

app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

/* Remove the comment (//) from the line below to ignore certificate errors (useful for self-signed certificates) */

getAppConfig();
getThemeConfig();
//app.commandLine.appendSwitch("ignore-certificate-errors");

export function getUserData(): UserData {
    const userDataPath = path.join(app.getPath("userData"), "userData.json");
    let rawData: unknown = {};
  
    // 1️⃣ Lire en toute sécurité
    try {
      rawData = JSON.parse(fs.readFileSync(userDataPath, "utf-8"));
    } catch {
      rawData = {};
    }
  
    // 2️⃣ Migration
    try {
      const themeKeys = [
        'background','backgrounds','backgroundColor',
        'textColor','accentColor','buttonColorAlpha',
        'buttonColor','theme','particlesEnabled'
      ] as const;
  
      const dataObj = (typeof rawData === "object" && rawData !== null)
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
      if (migrated) {
        fs.writeFileSync(userDataPath, JSON.stringify(dataObj, null, 2));
      }
      rawData = dataObj;
    } catch (e) {
      console.warn("[getUserData] Migration échouée :", e);
    }
  
    // 3️⃣ Validation + backup + nettoyage à chaque appel
    try {
      const validation = UserDataSchema.safeParse(rawData);
      if (!validation.success) {
        // 3a) Backup
        try {
          const bakPath = userDataPath.replace(/\.json$/, ".bak.json");
          fs.copyFileSync(userDataPath, bakPath);
        } catch { /**/ }
  
        // 3b) Supprimer seulement les clés fautives
        const dataObj = { ...(rawData as Record<string, any>) };
        for (const err of validation.error.errors) {
          if (!err.path.length) continue;
          let obj: any = dataObj;
          for (let i = 0; i < err.path.length - 1; i++) {
            const p = err.path[i];
            if (obj && typeof obj[p] === "object") obj = obj[p];
            else { obj = null; break; }
          }
          const last = err.path.at(-1);
          if (obj && typeof last === "string") {
            delete obj[last];
          }
        }
  
        // 3c) Écrire le JSON corrigé
        try {
          fs.writeFileSync(userDataPath, JSON.stringify(dataObj, null, 2));
          rawData = dataObj;
        } catch {
          console.warn("[getUserData] Impossible d’écrire userData nettoyé");
        }
      }
    } catch (e) {
      console.warn("[getUserData] Validation Zod impossible :", e);
    }
  
    // 4️⃣ Dernier parse (sans réécriture) ou fallback en mémoire
    try {
      return UserDataSchema.parse(rawData) as UserData;
    } catch (e) {
      console.error("[getUserData] Parsing final a échoué, on renvoie un UserData vide :", e);
      return {} as UserData;
    }
  }




{
    const userData = getUserData();
    if (userData.cachePath) {
        app.setPath("sessionData", userData.cachePath);
    }
}

const windows = new Set<BrowserWindow>();

/** Check if single instance, if not, simply quit new instance */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
    app.quit()
} else {
    app.on('second-instance', () => {
        createWindow();
    });
}


const windowsData = {} as WindowsData;

let partitionId: number = 0;

function getSession(): Electron.Session {
    const partitionIdTemp = partitionId;
    partitionId++
    if (partitionIdTemp == 0)
        return session.defaultSession;
    return session.fromPartition(`persist:${partitionIdTemp}`, {cache: true});
}

// let win: BrowserWindow;

function createWindow(): BrowserWindow {
    const localSession = getSession();
    let window = new BrowserWindow({
        show: false, width: 800, height: 600, webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            webgl: true,
            session: localSession
        },

    });

    window.webContents.on('page-favicon-updated', (_event, favicons) => {
        if (!favicons.length) return;
        const faviconUrl = favicons[0];
    
        if (faviconUrl.startsWith('file://')) {

          try {
            const filePath = fileURLToPath(faviconUrl);
            const icon = nativeImage.createFromPath(filePath);
            if (!icon.isEmpty()) {
              window.setIcon(icon);
              console.log('[Favicon] Restored from local file :', filePath);
            } else {
              console.warn('[Favicon] nativeImage empty for:', filePath);
            }
          } catch (err) {
            console.warn('[Favicon] Could not resolve local URL:', faviconUrl, err);
          }
        } else {

          fetch(faviconUrl)
            .then(res => res.arrayBuffer())
            .then(buf => {
              const icon = nativeImage.createFromBuffer(Buffer.from(buf));
              if (!icon.isEmpty()) {
                window.setIcon(icon);
                console.log('[Favicon] Restored from external URL :', faviconUrl);
              }
            })
            .catch(err => console.warn('[Favicon] Fetch error :', err));
        }
      });

    // Fix Popouts
    window.webContents.setUserAgent(window.webContents.getUserAgent().replace("Electron", ""));
    window.webContents.on('did-start-loading', () => {
        const wd = windowsData[window.webContents.id];
        if (wd?.selectedServerName) {
            window.setTitle(wd.selectedServerName + ' * Loading...');
        } else {
            window.setTitle(window.webContents.getTitle() + ' * Loading...');
        }
        
        window.setProgressBar(2, {mode: 'indeterminate'}) // second parameter optional
    });

    window.webContents.on('did-finish-load', () => {
        const wd = windowsData[window.webContents.id];
        if (wd?.selectedServerName) {
            window.setTitle(wd.selectedServerName);
        } else {
            window.setTitle(window.webContents.getTitle());
        }
        window.setProgressBar(-1);
    });
    window.webContents.on('did-stop-loading', () => {
        const wd = windowsData[window.webContents.id];
        if (wd?.selectedServerName) {
            window.setTitle(wd.selectedServerName);
        } else {
            window.setTitle(window.webContents.getTitle());
        }
        window.setProgressBar(-1);
    });
    window.webContents.setWindowOpenHandler(() => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                parent: window,
                autoHideMenuBar: true,
            }
        }
    });

    window.menuBarVisible = false;
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    window.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
            window.webContents.toggleDevTools();
            event.preventDefault();
        } else if (input.key === 'F5' && input.control) {
            window.webContents.reloadIgnoringCache()
            event.preventDefault();
        } else if (input.key === 'F5') {
            window.webContents.reload()
            event.preventDefault();
        }
    });
    
    // Inject Server button on /game page
    window.webContents.on("did-start-navigation", (e) => {
        if (e.isSameDocument) return;
        if (e.url.startsWith("about")) return;
    
        if (e.url.endsWith("/game")) {
            console.log("[FVTT Client] Navigation detected: /game");
    
            window.webContents.executeJavaScript(`
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
    
    
    window.webContents.on("did-finish-load", () => {
        const url = window.webContents.getURL();
        if (!url.endsWith("/join") && !url.endsWith("/auth") && !url.endsWith("/setup"))
            return;
        if (url.endsWith("/setup")) {
            window.webContents.executeJavaScript(`
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
            window.webContents.executeJavaScript(`
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
            window.webContents.executeJavaScript(`
                if ($('#server-button').length === 0) {
                    const serverSelectButton = $('<button type="button" class="bright" id="server-button"> <i class="fa-solid fa-server"></i>Return to Server Select</button>');
                    serverSelectButton.on('click', () => window.api.returnToServerSelect());
                    setTimeout(() => {
                        $('.form-footer').append(serverSelectButton)
                    }, 200);
                }
            `);
        }

        if (!url.endsWith("/join") && !url.endsWith("/auth"))
            return;
        const userData = getLoginDetails(windowsData[window.webContents.id].gameId);
        if (!userData.user) return;
        window.webContents.executeJavaScript(`
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
                if (${windowsData[window.webContents.id].autoLogin}) {
                    ui.join._onSubmit(fakeEvent);
                } else {
                    document.querySelector(".form-footer button[name=join]").addEventListener("click", () => {
                        ui.join._onSubmit(fakeEvent);
                    });
                }
            }

            waitForLoad();

        `);
        windowsData[window.webContents.id].autoLogin = false;

    });

    window.once('ready-to-show', () => {
        window.maximize();
        window.show();
    });
    window.on('closed', () => {
        windows.delete(window);
        window = null;
    });
    windows.add(window);
    windowsData[window.webContents.id] = {autoLogin: true} as WindowData;
    return window;
}

app.whenReady().then(() => {
    createWindow();
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
    const {gameId, password, user, adminPassword} = data;
    saveUserData(gameId, {
        password: password.length !== 0 ? Array.from(safeStorage.encryptString(password)) : [],
        user,
        adminPassword: password.length !== 0 ? Array.from(safeStorage.encryptString(adminPassword)) : []
    });
});
ipcMain.handle("get-user-data", (_, gameId: GameId) => getLoginDetails(gameId))

ipcMain.handle("app-version", () => app.getVersion())

function getAppConfig(): AppConfig {
    try {
        const json = fs.readFileSync(path.join(app.getAppPath(), "config.json")).toString();
        console.log(json);
        let appConfig = JSON.parse(json) as AppConfig;
        const userData = getUserData();
        appConfig = {...appConfig, ...userData.app, games: [...appConfig.games, ...userData.app.games]};
        if (appConfig.ignoreCertificateErrors) {
            app.commandLine.appendSwitch("ignore-certificate-errors");
        }
        return appConfig;
    } catch (e) {
        return {} as AppConfig;
    }
}

function getThemeConfig(): ThemeConfig {
    try {
        const json = fs.readFileSync(path.join(app.getAppPath(), "config.json")).toString();
        console.log(json);
        let themeConfig = JSON.parse(json) as ThemeConfig;
        return themeConfig;
    } catch (e) {
        return {} as ThemeConfig;
    }
}

ipcMain.on("save-app-config", (_e, data: AppConfig) => {
    const currentData = getUserData();
    currentData.app = {...currentData.app, ...data};
    fs.writeFileSync(path.join(app.getPath("userData"), "userData.json"), JSON.stringify(currentData));
});
ipcMain.handle("app-config", getAppConfig);
ipcMain.handle("local-app-config", () => {
    try {
        const userData = getUserData();
        return userData.app ?? {} as AppConfig;
    } catch (e) {
        return {} as AppConfig;
    }
});

ipcMain.on("save-theme-config", (_e, data: ThemeConfig) => {
    const currentData = getUserData();
    currentData.theme = {...currentData.theme, ...data};
    fs.writeFileSync(path.join(app.getPath("userData"), "userData.json"), JSON.stringify(currentData));
});
ipcMain.handle("theme-config", getThemeConfig);
ipcMain.handle("local-theme-config", () => {
    try {
        const userData = getUserData();
        return userData.theme ?? {} as ThemeConfig;
    } catch (e) {
        return {} as ThemeConfig;
    }
});

ipcMain.handle("select-path", (e) => {
    windowsData[e.sender.id].autoLogin = true;
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        return MAIN_WINDOW_VITE_DEV_SERVER_URL;
    } else {
        return path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    }
});
ipcMain.handle("cache-path", () => app.getPath("sessionData"))
ipcMain.on("cache-path", (_, cachePath: string) => {
    const currentData = getUserData();
    currentData.cachePath = cachePath;
    fs.writeFileSync(path.join(app.getPath("userData"), "userData.json"), JSON.stringify(currentData));
});

ipcMain.on("return-select", (e) => {
    windowsData[e.sender.id].autoLogin = true;
    delete windowsData[e.sender.id].selectedServerName;
    disableRichPresence();
    closeRichPresenceSocket();

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        e.sender.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        e.sender.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
});


app.on('activate', (_, hasVisibleWindows) => {
    if (!hasVisibleWindows) {
        createWindow();
    }
});

function getLoginDetails(gameId: GameId): GameUserDataDecrypted {
    const userData = getUserData()[gameId];
    if (!userData) return {user: "", password: "", adminPassword: ""};
    const password = new Uint8Array(userData.password);
    const adminPassword = new Uint8Array(userData.adminPassword);

    return {
        user: userData.user,
        password: password.length !== 0 ? (safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(password)) : "") : "",
        adminPassword: password.length !== 0 ? (safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(adminPassword)) : "") : "",
    };
}

function writeUserDataFile(data: unknown) {
    const result = UserDataSchema.safeParse(data);
    if (!result.success) {
      console.error("Invalid write attempt :", result.error.format());
      return false;
    }
    fs.writeFileSync(path.join(app.getPath("userData"), "userData.json"),
                       JSON.stringify(result.data, null, 2));
    return true;
}
  
  function saveUserData(gameId: GameId, data: GameUserData) {
    const current = getUserData();
    // … ton merge habituel …
    const newData: UserData = { ...current, [gameId]: data };
    if (!writeUserDataFile(newData)) {
      // ici tu peux choisir de rollback ou d’alerter l’utilisateur
      console.warn("Could not write userData. Data was not saved.");
    }
}

