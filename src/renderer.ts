// noinspection JSIgnoredPromiseFromCall

import './particles';

let appVersion: string;
let preventMenuClose = false;

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
    if (!gameUrl || !gameName) return alert("Please enter a game name and URL");
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
    showNotification("Text copied");
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

document.querySelector("#clear-cache").addEventListener("click", () => {
    window.api.clearCache();
    showNotification("Cache cleared");
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
        const confirmed = window.confirm("Are you sure you want to reset the appearance settings? This will erase your custom colors and backgrounds.");
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
        const confirmed = window.confirm("Are you sure you want to reset all settings? This will erase your background, custom CSS, and revert your theme to Codex (games are not affected).");
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

});
  
async function createGameItem(game: GameConfig) {
    const li = document.importNode(gameItemTemplate, true);
    const loginData = await window.api.userData(game.id ?? game.name) as GameUserDataDecrypted;

    li.id = game.cssId;

    (li.querySelector(".user-name") as HTMLInputElement).value = loginData.user;
    (li.querySelector(".user-password") as HTMLInputElement).value = loginData.password;
    (li.querySelector(".admin-password") as HTMLInputElement).value = loginData.adminPassword;
    (li.querySelector(".game-name-edit") as HTMLInputElement).value = game.name;
    (li.querySelector(".game-url-edit") as HTMLInputElement).value = game.url;
    li.querySelector("a").innerText = game.name;
    li.querySelector(".game-button").addEventListener("click", () => {
        window.api.openGame(game.id ?? game.name);
        window.location.href = game.url;
    });
    gameItemList.appendChild(li);
    const userConfiguration = li.querySelector("div.user-configuration") as HTMLDivElement;
    userConfiguration.style.height = `${userConfiguration.scrollHeight + 11}px`;
    userConfiguration.querySelector(".delete-game")?.addEventListener("click", async () => {
        await updateGameList((appConfig) => {
            appConfig.games = appConfig.games.filter((g) => g.id !== game.id);
        });
        await createGameList();
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
            }
        });
    
        window.api.saveUserData({gameId, user, password, adminPassword} as SaveUserData);
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

async function createGameList() {
    await migrateConfig();
    let config: AppConfig;
    try {
        config = await window.api.appConfig();
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

    gameItemList.childNodes.forEach((value) => {
            if (value.nodeName === "template")
                return;
            value.remove();
        }
    );

    config.games.forEach(createGameItem);
}

while (!window) {
    //
}
createGameList();
