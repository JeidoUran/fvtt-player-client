// noinspection JSIgnoredPromiseFromCall
import './particles';

let appVersion: string;
let preventMenuClose = false;
let games: GameConfig[] = [];

function compareSemver(a: string, b: string): number {
    const splitA = a.split(".");
    const splitB = b.split(".");

    let currentA, currentB: number;
    for (let i = 0; i < splitA.length; i++) {
        currentA = Number(splitA[i]);
        currentB = Number(splitB[i]);
        if (currentA > currentB) {
            return 1;
        } else if (currentA < currentB) {
            return -1;
        }
    }
    return 0
}

async function updateGameList(task: (appConfig: AppConfig) => void) {
    const appConfig = await window.api.localAppConfig();
    task(appConfig);
    window.api.saveAppConfig(appConfig);
}

function showNotification(message: string) {
    const notificationArea = document.getElementById("notification-area");
    if (!notificationArea) return;
  
    notificationArea.textContent = message;
    notificationArea.style.opacity = "1";
  
    setTimeout(() => {
      notificationArea.style.opacity = "0";
    }, 3000);
}

document.querySelector("#add-game").addEventListener("click", async () => {
    const gameUrlField = document.querySelector("#game-url") as HTMLInputElement;
    const gameNameField = document.querySelector("#game-name") as HTMLInputElement;
    const gameUrl = gameUrlField.value;
    const gameName = gameNameField.value;
    if (!gameUrl || !gameName) {
        await safePrompt("Please enter a game name and URL", { mode: 'alert' });
        return;
    }
    const newGameItem = {name: gameName, url: gameUrl, id: Math.round(Math.random() * 1000000)} as GameConfig;
    await updateGameList((appConfig) => {
        appConfig.games = appConfig?.games ?? [];
        appConfig.games.push(newGameItem);
    });
    gameUrlField.value = "";
    gameNameField.value = "";
    await createGameItem(newGameItem);
    showNotification("Game added");
});

document.querySelector("#copy-button").addEventListener("click", async () => {
    const config = await window.api.localAppConfig();
    const text = JSON.stringify(config, null, 4);
    navigator.clipboard.writeText(text);
    showNotification("Settings copied");
});


const gameItemList = document.querySelector("#game-list");
const gameItemTemplate = document.querySelector("template").content.querySelector("li");


document.querySelector("#save-app-config").addEventListener("click", (e) => {
    if (!(e.target instanceof Element))
        return;
    
    const appConfigMenu = document.querySelector(".app-configuration") as HTMLDivElement;
    
    if (appConfigMenu && !preventMenuClose) {
        appConfigMenu.classList.add('hidden2');

        const computedStyle = window.getComputedStyle(appConfigMenu);
        const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0;

        if (transitionDuration > 0) {
            appConfigMenu.addEventListener('transitionend', function handler(e) {
                if (e.propertyName === 'opacity') {
                    appConfigMenu.classList.remove('show');
                    appConfigMenu.classList.remove('flex-display');
                    appConfigMenu.classList.add('hidden-display');
                    appConfigMenu.removeEventListener('transitionend', handler);
                }
            });
        } else {
            appConfigMenu.classList.remove('show');
            appConfigMenu.classList.remove('flex-display');
            appConfigMenu.classList.add('hidden-display');
        }
    }

    preventMenuClose = false;

    const closeUserConfig = e.target.closest(".app-configuration") as HTMLDivElement;
    const background = (closeUserConfig.querySelector("#background-image") as HTMLInputElement).value;
    const accentColor = (closeUserConfig.querySelector("#accent-color") as HTMLInputElement).value;
    const backgroundColor = (closeUserConfig.querySelector("#background-color") as HTMLInputElement).value;
    const textColor = (closeUserConfig.querySelector("#text-color") as HTMLInputElement).value;
    const cachePath = (closeUserConfig.querySelector("#cache-path") as HTMLInputElement).value;
    const autoCacheClear = (closeUserConfig.querySelector("#clear-cache-on-close") as HTMLInputElement).checked;
    const ignoreCertificateErrors = (closeUserConfig.querySelector("#insecure-ssl") as HTMLInputElement).checked;
    const config = {
        accentColor,
        backgroundColor,
        background,
        textColor,
        cachePath,
        autoCacheClear,
        ignoreCertificateErrors
    } as AppConfig;
    console.log(config);
    window.api.saveAppConfig(config);
    applyAppConfig(config);
    showNotification("Changes saved");
});

const cancelButton = document.querySelector("#cancel-app-config") as HTMLButtonElement;

if (cancelButton) {
    cancelButton.addEventListener("click", async () => {
        const appConfig = await window.api.localAppConfig();
        applyAppConfig(appConfig);
        showNotification("Changes canceled");
    
        const appConfigMenu = document.querySelector(".app-configuration") as HTMLDivElement;
        if (appConfigMenu) {
            appConfigMenu.classList.add('hidden2');

            const computedStyle = window.getComputedStyle(appConfigMenu);
            const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0;
    
            if (transitionDuration > 0) {
                appConfigMenu.addEventListener('transitionend', function handler(e) {
                    if (e.propertyName === 'opacity') {
                        appConfigMenu.classList.remove('show');
                        appConfigMenu.classList.remove('flex-display');
                        appConfigMenu.classList.add('hidden-display');
                        appConfigMenu.removeEventListener('transitionend', handler);
                    }
                });
            } else {
                appConfigMenu.classList.remove('show');
                appConfigMenu.classList.remove('flex-display');
                appConfigMenu.classList.add('hidden-display');
            }
        }
    });
}

document.querySelector("#clear-cache").addEventListener("click", async () => {
    const confirmed = await safePrompt("Are you sure you want to clear the cache?");
    if (!confirmed) return;
    window.api.clearCache();
    showNotification("Cache cleared");
});

document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest(".toggle-password") as HTMLButtonElement | null;
    if (!target) return;

    const input = target.closest(".password-field")?.querySelector("input") as HTMLInputElement;
    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        target.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        input.type = "password";
        target.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    const themeStylesheet = document.getElementById("theme-stylesheet") as HTMLLinkElement;
    const themeSelector = document.getElementById("theme-selector") as HTMLSelectElement;
  
    if (!themeStylesheet || !themeSelector) {
      console.error("Theme selector or stylesheet not found.");
      return;
    }
  
    const appConfig: AppConfig = await window.api.localAppConfig();
  
    const selectedTheme = appConfig.theme ?? "codex";
    themeStylesheet.setAttribute("href", `styles/${selectedTheme}.css`);
    themeSelector.value = selectedTheme;
  
    themeSelector.addEventListener("change", async () => {
      const newTheme = themeSelector.value;
      themeStylesheet.setAttribute("href", `styles/${newTheme}.css`);
      const appConfigMenu = document.querySelector('.app-configuration') as HTMLDivElement;
        if (appConfigMenu) {
            appConfigMenu.classList.add('flex-display');
            appConfigMenu.classList.remove('hidden2');
            appConfigMenu.classList.remove('hidden-display');
            appConfigMenu.classList.add('show');
        }

      appConfig.theme = newTheme;
      preventMenuClose = true;
      await window.api.saveAppConfig(appConfig);
      showNotification("Theme changed");
      preventMenuClose = false;
    });

    const resetAppearanceButton = document.getElementById("reset-appearance") as HTMLButtonElement;
    const resetAllButton = document.getElementById("reset-all") as HTMLButtonElement;

    if (resetAppearanceButton) {
    resetAppearanceButton.addEventListener("click", async () => {
        const confirmed = await safePrompt("Are you sure you want to reset the appearance settings? This will erase your custom colors and backgrounds.");
        if (!confirmed) return;

        appConfig.background = "";
        appConfig.backgrounds = [];
        appConfig.backgroundColor = "#0e1a23ff";
        appConfig.textColor = "#88c0a9ff";
        appConfig.accentColor = "#98e4f7ff";

        document.body.style.backgroundColor = "";
        applyAppConfig(appConfig);

        await window.api.saveAppConfig(appConfig);
        showNotification("Appearance settings reset");
    });
    }

    if (resetAllButton) {
    resetAllButton.addEventListener("click", async () => {
        const confirmed = await safePrompt("Are you sure you want to reset all settings? This will erase your background, custom CSS, and revert your theme to Codex (games are not affected).");
        if (!confirmed) return;

        appConfig.background = "";
        appConfig.backgrounds = [];
        appConfig.backgroundColor = "#0e1a23ff";
        appConfig.textColor = "#88c0a9ff";
        appConfig.accentColor = "#98e4f7ff";
        appConfig.cachePath = undefined;
        appConfig.autoCacheClear = undefined;
        appConfig.customCSS = undefined;
        appConfig.ignoreCertificateErrors = undefined;
        appConfig.theme = "codex";

        themeStylesheet.setAttribute("href", "styles/codex.css");
        themeSelector.value = "codex";
        document.body.style.backgroundColor = "";
        applyAppConfig(appConfig);

        await window.api.saveAppConfig(appConfig);
        showNotification("All settings reset");
    });
  }

  const transitioningMenus: Map<string, boolean> = new Map();

  async function toggleMenu(selector: string, onOpen?: () => Promise<void> | void) {
    const menu = document.querySelector(selector) as HTMLDivElement;
    if (!menu) return;

    const currentTransition = transitioningMenus.get(selector) ?? false;
    if (currentTransition) {
        console.log(`[FVTT Client] Transition already in progress for ${selector}, abort toggle.`);
        return;
    }

    if (menu.classList.contains('hidden2')) {
        transitioningMenus.set(selector, true);
    
        menu.classList.add('flex-display');
        void menu.offsetWidth;
        menu.classList.remove('hidden2');
        menu.classList.remove('hidden-display');
        menu.classList.add('show');
    
        if (onOpen) {
            await onOpen();
        }
    
        const computedStyle = window.getComputedStyle(menu);
        const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0;
    
        if (transitionDuration > 0) {
            menu.addEventListener('transitionend', function handler(e) {
                if (e.propertyName === 'opacity') {
                    transitioningMenus.set(selector, false);
                    menu.removeEventListener('transitionend', handler);
                }
            });
        } else {
            transitioningMenus.set(selector, false);
        }
    } else if (menu.classList.contains('show')) {
        transitioningMenus.set(selector, true);

        menu.classList.add('hidden2');

        const computedStyle = window.getComputedStyle(menu);
        const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0;

        if (transitionDuration > 0) {
            menu.addEventListener('transitionend', function handler(e) {
                if (e.propertyName === 'opacity') {
                    menu.classList.remove('show');
                    menu.classList.remove('flex-display');
                    menu.classList.add('hidden-display');
                    transitioningMenus.set(selector, false);
                    menu.removeEventListener('transitionend', handler);
                }
            });
        } else {
            menu.classList.remove('show');
            menu.classList.remove('flex-display');
            menu.classList.add('hidden-display');
            transitioningMenus.set(selector, false);
        }
    }
}

function toggleConfigureGame(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const gameItem = target.closest('.game-item') as HTMLDivElement;
    if (!gameItem) return;

    const userConfig = gameItem.querySelector('.user-configuration') as HTMLDivElement;
    if (!userConfig) return;

    const allUserConfigs = document.querySelectorAll('.user-configuration');

    allUserConfigs.forEach(config => {
        if (config !== userConfig) {
            config.classList.add('hidden');
        }
    });

    if (userConfig.classList.contains('hidden')) {
        userConfig.classList.remove('hidden');
        userConfig.style.height = "0px"; // Start collapsed but visible

        requestAnimationFrame(() => {
            const scrollHeight = userConfig.scrollHeight;
            userConfig.style.height = `${scrollHeight + 15}px`; // Animate expansion
        });
    } else {
        userConfig.style.height = "0px"; // Collapse
        userConfig.addEventListener('transitionend', function handler(e) {
            if (e.propertyName === 'height') {
                userConfig.classList.add('hidden');
                userConfig.removeEventListener('transitionend', handler);
            }
        });
    }
}

    document.addEventListener("click", (event) => {
        const target = (event.target as HTMLElement).closest(".config-main-button") as HTMLButtonElement | null;
        if (target) {
            toggleConfigureGame(event as MouseEvent);
        }
    });

    document.getElementById("open-config")?.addEventListener("click", () => toggleMenu(".app-configuration"));
    document.getElementById("open-help")?.addEventListener("click", () => toggleMenu(".help"));
    document.getElementById("open-export")?.addEventListener("click", async () => {
        await toggleMenu(".config-export", async () => {
            const code = document.getElementById("export-text");
            const config = await window.api.localAppConfig();
            const text = JSON.stringify(config, null, 4);
            if (code) code.textContent = text;
        });
    });
    document.getElementById("close-export")?.addEventListener("click", () => toggleMenu(".config-export"));

});
  
function safePrompt(message: string, options?: { mode?: 'confirm' | 'alert' }): Promise<boolean> {
    return new Promise((resolve) => {
        const confirmBox = document.getElementById("custom-confirm") as HTMLDivElement;
        const confirmText = document.getElementById("confirm-text")!;
        const yesButton = document.getElementById("confirm-yes")!;
        const noButton = document.getElementById("confirm-no")!;

        const mode = options?.mode ?? 'confirm';

        confirmText.textContent = message;
        confirmBox.classList.add('flex-display');
        void confirmBox.offsetWidth;
        confirmBox.classList.remove('hidden2');
        confirmBox.classList.remove('hidden-display');
        confirmBox.classList.add('show');

        if (mode === 'alert') {
            noButton.classList.add('hidden2');
            noButton.classList.add('hidden-display');
            yesButton.textContent = "OK";
        } else {
            noButton.classList.remove('hidden2');
            noButton.classList.remove('hidden-display');
            yesButton.textContent = "Yes";
        }

        function cleanup() {

            confirmBox.classList.add('hidden2');

            const computedStyle = window.getComputedStyle(confirmBox);
            const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0;

            if (transitionDuration > 0) {
                confirmBox.addEventListener('transitionend', function handler(e) {
                    if (e.propertyName === 'opacity') {
                        confirmBox.classList.remove('show');
                        confirmBox.classList.remove('flex-display');
                        confirmBox.classList.add('hidden-display');
                        confirmBox.removeEventListener('transitionend', handler);
                    }
                });
            } else {
                confirmBox.classList.remove('show');
                confirmBox.classList.remove('flex-display');
                confirmBox.classList.add('hidden-display');
            }
            yesButton.removeEventListener('click', onYes);
            noButton.removeEventListener('click', onNo);
        }

        function onYes() {
            cleanup();
            resolve(true);
        }

        function onNo() {
            cleanup();
            resolve(false);
        }

        yesButton.addEventListener('click', onYes);
        noButton.addEventListener('click', onNo);
    });
}

async function createGameItem(game: GameConfig) {
    const li = document.importNode(gameItemTemplate, true);
    const loginData = await window.api.userData(game.id ?? game.name) as GameUserDataDecrypted;
    let discordRP = !!game.discordRP;

    li.id = game.cssId;
    li.setAttribute("data-game-id", String(game.id ?? game.name));

    (li.querySelector(".user-name") as HTMLInputElement).value = loginData.user;
    (li.querySelector(".user-password") as HTMLInputElement).value = loginData.password;
    (li.querySelector(".admin-password") as HTMLInputElement).value = loginData.adminPassword;
    (li.querySelector(".game-name-edit") as HTMLInputElement).value = game.name;
    (li.querySelector(".game-url-edit") as HTMLInputElement).value = game.url;
    li.querySelector("a").innerText = game.name;
    li.querySelector(".game-button").addEventListener("click", async () => {
        window.api.openGame(game.id ?? game.name);
      
        if (game.discordRP) {
            if (window.richPresence?.enable) {
                window.richPresence.enable();
              }
        }
      
        window.location.href = game.url;
      });
    gameItemList.appendChild(li);
    await updateServerInfos(li, game);
    renderTooltips()
    const userConfiguration = li.querySelector("div.user-configuration") as HTMLDivElement;
    const discordRPCheckbox = userConfiguration.querySelector(".discord-rp-toggle") as HTMLInputElement;
    discordRPCheckbox.checked = discordRP;

    discordRPCheckbox.addEventListener("change", () => {
        discordRP = discordRPCheckbox.checked;
        game.discordRP = discordRP;
    });

    userConfiguration.querySelector(".delete-game")?.addEventListener("click", async () => {
        const confirmed = await safePrompt("Are you sure you want to delete this game?");
        if (!confirmed) return;
        await updateGameList((appConfig) => {
            appConfig.games = appConfig.games.filter((g) => g.id !== game.id);
        });
        await createGameList();
        showNotification("Game deleted");
    });
    const gameId = game.id ?? game.name;
    const saveButton = userConfiguration.querySelector(".save-user-data") as HTMLButtonElement;
    saveButton.addEventListener("click", async (e) => {
        if (!(e.target instanceof Element))
            return;
        e.target.closest(".user-configuration").classList.add("hidden");
        const closeUserConfig = e.target.closest(".user-configuration") as HTMLDivElement;
        const user = (closeUserConfig.querySelector(".user-name") as HTMLInputElement).value;
        const password = (closeUserConfig.querySelector(".user-password") as HTMLInputElement).value;
        const adminPassword = (closeUserConfig.querySelector(".admin-password") as HTMLInputElement).value;
        const newGameName = (closeUserConfig.querySelector(".game-name-edit") as HTMLInputElement).value;
        const newGameUrl = (closeUserConfig.querySelector(".game-url-edit") as HTMLInputElement).value;

        console.log({gameId, user, password, adminPassword, newGameName, newGameUrl});
    
        game.name = newGameName;
        game.url = newGameUrl;

        (li.querySelector("a") as HTMLAnchorElement).innerText = newGameName;
    
        await updateGameList((appConfig) => {
            const gameToUpdate = appConfig.games.find((g) => g.id === game.id);
            if (gameToUpdate) {
                gameToUpdate.name = newGameName;
                gameToUpdate.url = newGameUrl;
                gameToUpdate.discordRP = discordRP;
            }
        });
    
        window.api.saveUserData({gameId, user, password, adminPassword} as SaveUserData);
        showNotification("Game settings saved");
    });    
}

function applyAppConfig(config: AppConfig) {
    (document.querySelector("#accent-color") as HTMLInputElement).value = "#98e4f7";
    (document.querySelector("#background-color") as HTMLInputElement).value = "#0e1a23";
    (document.querySelector("#text-color") as HTMLInputElement).value = "#88c0a9";
    if (config.background) {
        document.body.style.backgroundImage = `url(${config.background})`;
        (document.querySelector("#background-image") as HTMLInputElement).value = config.background;
    }
    if (config.backgrounds && config.backgrounds.length > 0) {
        const i = Math.floor(Math.random() * config.backgrounds.length);
        document.body.style.backgroundImage = `url(${config.backgrounds[i]})`;
    }
    if (config.textColor) {
        document.documentElement.style.setProperty("--color-text-primary", config.textColor);
        (document.querySelector("#text-color") as HTMLInputElement).value = config.textColor.substring(0, 7);
    }
    if (config.backgroundColor) {
        document.documentElement.style.setProperty("--color-background", config.backgroundColor);
        (document.querySelector("#background-color") as HTMLInputElement).value = config.backgroundColor.substring(0, 7);
    }
    if (config.accentColor) {
        document.documentElement.style.setProperty("--color-accent", config.accentColor);
        (document.querySelector("#accent-color") as HTMLInputElement).value = config.accentColor.substring(0, 7);
    }
    if (config.cachePath) {
        (document.querySelector("#cache-path") as HTMLInputElement).value = config.cachePath;
        window.api.setCachePath(config.cachePath);
    }
    if (config.ignoreCertificateErrors) {
        (document.querySelector("#insecure-ssl") as HTMLInputElement).checked = config.ignoreCertificateErrors;
    }
    if (config.autoCacheClear) {
        (document.querySelector("#clear-cache-on-close") as HTMLInputElement).checked = config.autoCacheClear;
    }
}


function addStyle(styleString: string) {
    const style = document.createElement('style');
    style.textContent = styleString;
    document.head.append(style);
}

async function migrateConfig() {
    let localAppConfig = await window.api.localAppConfig();
    const gameList: GameConfig[] = JSON.parse(window.localStorage.getItem("gameList") || "[]");
    if (gameList.length > 0) {
        localAppConfig.games = localAppConfig?.games ?? [];
        localAppConfig.games.push(...gameList);
        window.localStorage.removeItem("gameList");
    }
    const oldConfigJson = window.localStorage.getItem("appConfig") || "{}";
    if (oldConfigJson !== "{}") {
        const oldConfig = (JSON.parse(oldConfigJson) as AppConfig);
        localAppConfig = {...localAppConfig, ...oldConfig};
        window.localStorage.removeItem("appConfig");
    }
    window.api.saveAppConfig(localAppConfig);
}

function cleanBaseUrl(inputUrl: string): string {
    try {
        const url = new URL(inputUrl);

        let baseUrl = `${url.protocol}//${url.hostname}`;
        if (url.port) {
            baseUrl += `:${url.port}`;
        }
        return baseUrl;
    } catch (error) {
        console.error("Invalid URL provided:", inputUrl);
        return inputUrl;
    }
}

async function getServerInfo(game: GameConfig): Promise<ServerStatusData | null> {
    try {
        const gameUrl = cleanBaseUrl(game.url);
        const response = await fetch(`${gameUrl}/api/status`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

        if (!response.ok) {
            console.warn(`Failed to fetch server info for ${game.name}`);
            return null;
        }

        const data = await response.json();
        return {
            active: data.active,
            version: data.version,
            world: data.world,
            system: data.system,
            systemVersion: data.systemVersion,
            users: data.users,
            uptime: data.uptime
        };
    } catch (error) {
        console.error(`Error fetching server info for ${game.name}:`, error);
        return null;
    }
}

function renderTooltips() {
    // Attach tooltip listeners dynamically
    document.querySelectorAll(".tooltip-wrapper").forEach(wrapper => {
        const tooltip = wrapper.querySelector(".tooltip") as HTMLElement;
        wrapper.addEventListener("mouseenter", (e) => {
            const rect = wrapper.getBoundingClientRect();
            const clonedTooltip = tooltip.cloneNode(true) as HTMLElement;
            clonedTooltip.style.display = "block";
            clonedTooltip.style.position = "fixed";
            clonedTooltip.style.left = `${rect.left + rect.width/2}px`;
            clonedTooltip.style.top = `${rect.bottom + 5}px`;
            clonedTooltip.style.transform = "translateX(-50%)";
            clonedTooltip.style.pointerEvents = "none";
            clonedTooltip.classList.add("active-tooltip");
            document.getElementById("tooltip-layer")?.appendChild(clonedTooltip);
        });
        wrapper.addEventListener("mouseleave", (e) => {
            document.querySelectorAll("#tooltip-layer .active-tooltip").forEach(t => t.remove());
        });
    });
}

async function updateServerInfos(gameItem: HTMLElement, game: GameConfig) {
    const serverInfo = await getServerInfo(game);

    const serverInfos = gameItem.querySelector(".server-infos");
    if (!serverInfos) return;

    const statusSpan = serverInfos.querySelector(".status") as HTMLSpanElement;
    const versionSpan = serverInfos.querySelector(".version") as HTMLSpanElement;
    const systemSpan = serverInfos.querySelector(".system") as HTMLSpanElement;
    const systemVersionSpan = serverInfos.querySelector(".systemVersion") as HTMLSpanElement;
    const usersSpan = serverInfos.querySelector(".users") as HTMLSpanElement;

    if (!serverInfo) {
        statusSpan.innerHTML = `<i class="fa-solid fa-xmark"></i> Offline`;
        versionSpan.innerHTML = `<i class="fa-solid fa-dice-d20"></i> -`;
        systemSpan.innerHTML = `<i class="fa-solid fa-dice"></i> -`;
        systemVersionSpan.innerHTML = `<i class="fa-solid fa-screwdriver-wrench"></i> -`;
        usersSpan.innerHTML = `<i class="fa-solid fa-users"></i> -`;
        return;
    }

    if (serverInfo.version) {
        statusSpan.innerHTML = `<i class="fa-solid fa-signal"></i> Online`;
    } else {
        statusSpan.innerHTML = `<i class="fa-solid fa-xmark"></i> Offline`;
    }

    versionSpan.innerHTML = `<i class="fa-solid fa-dice-d20"></i> v${serverInfo.version ?? "-"}`;
    systemSpan.innerHTML = `<i class="fa-solid fa-dice"></i> ${serverInfo.system?.toUpperCase() ?? "-"}`;
    systemVersionSpan.innerHTML = `<i class="fa-solid fa-screwdriver-wrench"></i> ${serverInfo.systemVersion ?? "-"}`;
    usersSpan.innerHTML = `<i class="fa-solid fa-users"></i> ${serverInfo.users ?? "0"}`;
}

async function refreshAllServerInfos() {

    const gameItems = document.querySelectorAll(".game-item");
    
    for (const item of gameItems) {
        const gameId = Number(item.getAttribute("data-game-id"));
        if (!gameId) continue;
        
        const game = games.find(g => g.id === gameId);
        if (!game) continue; 
    
      try {
        await updateServerInfos(item as HTMLElement, game);
      } catch (err) {
        console.error("Error in updateServerInfos:", err);
      }
    }
}

async function createGameList() {
    await migrateConfig();
    let config: AppConfig;
    try {
        config = await window.api.appConfig();
        games = config.games;
    } catch (e) {
        console.log("Failed to load config.json");
    }

    addStyle(config.customCSS ?? "");

    appVersion = await window.api.appVersion();
    document.querySelectorAll(".current-version").forEach(el => {
        el.textContent = appVersion;
    });

    let latestVersion: string = "Unknown";

    try {
        const response = await fetch("https://api.github.com/repos/JeidoUran/fvtt-player-client/releases/latest", { mode: "cors" });
        if (response.ok) {
            const data = await response.json();
            latestVersion = data["tag_name"];
        } else {
            showNotification("Failed to fetch latest version number");
            console.warn("[FVTT Client] GitHub release fetch failed:", response.status);
        }
    } catch (e) {
        console.error("[FVTT Client] Failed to fetch latest version:", e);
    }
    document.querySelector("#latest-version").textContent = latestVersion;
    if (compareSemver(appVersion, latestVersion) < 0) {
        showNotification("An update is available !")
        document.querySelector(".update-available").classList.remove("hidden2");
        document.querySelector(".version-normal").classList.add("hidden2");

    }

    applyAppConfig(config);

    gameItemList.querySelectorAll("li").forEach((li) => li.remove());

    config.games.forEach(createGameItem);
}

await createGameList();
setInterval(refreshAllServerInfos, 30000);