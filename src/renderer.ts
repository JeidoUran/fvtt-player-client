// noinspection JSIgnoredPromiseFromCall
import * as particles from './particles';

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

/**
 * Injecte ou retire dynamiquement une Google Font via un <link> dans le <head>.
 * key sert juste à différencier le <link> (par ex. "primary" ou "secondary").
 */
function useGoogleFont(url: string, key: string) {
    const existing = document.getElementById(`gf-${key}`);
    if (existing) existing.remove();
    if (!url) return;
    const link = document.createElement("link");
    link.id   = `gf-${key}`;
    link.rel  = "stylesheet";
    link.href = url;
    document.head.append(link);
  }
  
  /**
   * Extrait le family name depuis une URL Google Fonts.
   * Ex: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700" → "Roboto"
   */
  function extractFamilyName(url: string): string {
    try {
      const params = new URL(url).searchParams.get("family");
      return params?.split(":")[0].replace(/_/g, " ") ?? "";
    } catch {
      return "";
    }
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
    const cachePath = (closeUserConfig.querySelector("#cache-path") as HTMLInputElement).value;
    const autoCacheClear = (closeUserConfig.querySelector("#clear-cache-on-close") as HTMLInputElement).checked;
    const ignoreCertificateErrors = (closeUserConfig.querySelector("#insecure-ssl") as HTMLInputElement).checked;
    const discordRP = (closeUserConfig.querySelector("#discord-rp") as HTMLInputElement).checked;
    const config = {
        cachePath,
        autoCacheClear,
        ignoreCertificateErrors,
        discordRP,
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

document.querySelector("#save-theme-config").addEventListener("click", (e) => {
    if (!(e.target instanceof Element))
        return;
    
    const themeConfigMenu = document.querySelector(".theme-configuration") as HTMLDivElement;
    
    if (themeConfigMenu && !preventMenuClose) {
        themeConfigMenu.classList.add('hidden2');

        const computedStyle = window.getComputedStyle(themeConfigMenu);
        const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0;

        if (transitionDuration > 0) {
            themeConfigMenu.addEventListener('transitionend', function handler(e) {
                if (e.propertyName === 'opacity') {
                    themeConfigMenu.classList.remove('show');
                    themeConfigMenu.classList.remove('flex-display');
                    themeConfigMenu.classList.add('hidden-display');
                    themeConfigMenu.removeEventListener('transitionend', handler);
                }
            });
        } else {
            themeConfigMenu.classList.remove('show');
            themeConfigMenu.classList.remove('flex-display');
            themeConfigMenu.classList.add('hidden-display');
        }
    }

    preventMenuClose = false;

    const closeUserConfig = e.target.closest(".theme-configuration") as HTMLDivElement;
    const background = (closeUserConfig.querySelector("#background-image") as HTMLInputElement).value;
    const accentColor = (closeUserConfig.querySelector("#accent-color") as HTMLInputElement).value;
    const backgroundColor = (closeUserConfig.querySelector("#background-color") as HTMLInputElement).value;
    const textColor = (closeUserConfig.querySelector("#text-color") as HTMLInputElement).value;
    const buttonColorAlphaInput = closeUserConfig.querySelector("#button-color-alpha") as HTMLInputElement;
    const buttonColorAlpha = buttonColorAlphaInput.valueAsNumber;
    const buttonColor = (closeUserConfig.querySelector("#button-color") as HTMLInputElement).value;
    const buttonColorHoverAlphaInput = closeUserConfig.querySelector("#button-color-hover-alpha") as HTMLInputElement;
    const buttonColorHoverAlpha = buttonColorHoverAlphaInput.valueAsNumber;
    const buttonColorHover = (closeUserConfig.querySelector("#button-color-hover") as HTMLInputElement).value;
    const particlesEnabled = (closeUserConfig.querySelector("#particles-button") as HTMLInputElement).checked;
    const particlesCount = Number((closeUserConfig.querySelector("#particles-count") as HTMLInputElement).value);
    const particlesSpeed = Number((closeUserConfig.querySelector("#particles-speed") as HTMLInputElement).value);
    const particlesColorAlphaInput = closeUserConfig.querySelector("#particles-color-alpha") as HTMLInputElement;
    const particlesColorAlpha = particlesColorAlphaInput.valueAsNumber;
    const particlesColor = (closeUserConfig.querySelector("#particles-color") as HTMLInputElement).value;
    const primaryFontSelect = document.querySelector("#primary-font-selector") as HTMLSelectElement;
    const secondaryFontSelect = document.querySelector("#secondary-font-selector") as HTMLSelectElement;
    const customPrimary = document.querySelector<HTMLInputElement>("#primary-custom-font")!;
    const customSecondary = document.querySelector<HTMLInputElement>("#secondary-custom-font")!;
    const config = {
        accentColor,
        backgroundColor,
        background,
        textColor,
        buttonColorAlpha,
        buttonColor,
        buttonColorHoverAlpha,
        buttonColorHover,
        particlesEnabled,
        particleOptions: {
            count: particlesCount,
            speedYMin: particlesSpeed / 2,
            speedYMax: particlesSpeed,
            colorHex: particlesColor,
            alpha:   particlesColorAlpha
        }
    } as ThemeConfig;

    if (primaryFontSelect.value === "__custom") {
        config.fontPrimaryUrl = customPrimary.value.trim();
        config.fontPrimary    = "__custom";
      } else {
        config.fontPrimary    = primaryFontSelect.value;  
        config.fontPrimaryUrl = "";
      }

      if (secondaryFontSelect.value === "__custom") {
        config.fontSecondaryUrl = customSecondary.value.trim();
        config.fontSecondary    = "__custom";
      } else {
        config.fontSecondary    = secondaryFontSelect.value;  
        config.fontSecondaryUrl = "";
      }
    
    console.log(config);
    window.api.saveThemeConfig(config);
    applyThemeConfig(config);
    showNotification("Changes saved");
});

const cancelThemeButton = document.querySelector("#cancel-theme-config") as HTMLButtonElement;

if (cancelThemeButton) {
    cancelThemeButton.addEventListener("click", async () => {
        const themeConfig = await window.api.localThemeConfig();
        applyThemeConfig(themeConfig);
        showNotification("Changes canceled");
    
        const themeConfigMenu = document.querySelector(".theme-configuration") as HTMLDivElement;
        if (themeConfigMenu) {
            themeConfigMenu.classList.add('hidden2');

            const computedStyle = window.getComputedStyle(themeConfigMenu);
            const transitionDuration = parseFloat(computedStyle.transitionDuration) || 0;
    
            if (transitionDuration > 0) {
                themeConfigMenu.addEventListener('transitionend', function handler(e) {
                    if (e.propertyName === 'opacity') {
                        themeConfigMenu.classList.remove('show');
                        themeConfigMenu.classList.remove('flex-display');
                        themeConfigMenu.classList.add('hidden-display');
                        themeConfigMenu.removeEventListener('transitionend', handler);
                    }
                });
            } else {
                themeConfigMenu.classList.remove('show');
                themeConfigMenu.classList.remove('flex-display');
                themeConfigMenu.classList.add('hidden-display');
            }
        }
    });
}

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
    const themeConfig: ThemeConfig = await window.api.localThemeConfig();
    
    const primaryFontSelect = document.querySelector<HTMLSelectElement>("#primary-font-selector")!;
    const primaryCustomField = document.getElementById("primary-custom-font")!;
    if (themeConfig.fontPrimary === "__custom") {
        primaryCustomField.style.display = "flex";  // ou "block" selon ton layout
    }
    primaryFontSelect.addEventListener("change", () => {
      if (primaryFontSelect.value === "__custom") {
        primaryCustomField.style.display = "flex";  // ou "block" selon ton layout
      } else {
        primaryCustomField.style.display = "none";
      }
    });

    const secondaryFontSelect = document.querySelector<HTMLSelectElement>("#secondary-font-selector")!;
    const secondaryCustomField = document.getElementById("secondary-custom-font")!;
    if (themeConfig.fontSecondary === "__custom") {
        secondaryCustomField.style.display = "flex";  // ou "block" selon ton layout
    }
    secondaryFontSelect.addEventListener("change", () => {
      if (secondaryFontSelect.value === "__custom") {
        secondaryCustomField.style.display = "flex";  // ou "block" selon ton layout
      } else {
        secondaryCustomField.style.display = "none";
      }
    });

    const particlesConfig = document.querySelector('.particles-config') as HTMLDivElement;

    if (!themeConfig.particlesEnabled) {
        particlesConfig.style.height = "0px";
        particlesConfig.classList.add('hidden');
    }

    const particlesCheckbox = document.getElementById("particles-button") as HTMLInputElement;
    particlesCheckbox.addEventListener("change", async () => {
            const enabled = particlesCheckbox.checked;
            if (enabled) {
                particlesConfig.classList.remove('hidden');
                particlesConfig.style.height = "0px"; // Start collapsed but visible
        
                requestAnimationFrame(() => {
                    const scrollHeight = particlesConfig.scrollHeight;
                    particlesConfig.style.height = `${scrollHeight + 15}px`; // Animate expansion
                });
            } else {
                particlesConfig.style.height = "0px"; // Collapse
                particlesConfig.addEventListener('transitionend', function handler(e) {
                    if (e.propertyName === 'height') {
                        particlesConfig.classList.add('hidden');
                        particlesConfig.removeEventListener('transitionend', handler);
                    }
                });
            }
        });

    const selectedTheme = themeConfig.theme ?? "codex";
    themeStylesheet.setAttribute("href", `styles/${selectedTheme}.css`);
    themeSelector.value = selectedTheme;

    themeSelector.addEventListener("change", async () => {
      const newTheme = themeSelector.value;
      themeStylesheet.setAttribute("href", `styles/${newTheme}.css`);
      const themeConfigMenu = document.querySelector('.theme-configuration') as HTMLDivElement;
        if (themeConfigMenu) {
            themeConfigMenu.classList.add('flex-display');
            themeConfigMenu.classList.remove('hidden2');
            themeConfigMenu.classList.remove('hidden-display');
            themeConfigMenu.classList.add('show');
        }

      themeConfig.theme = newTheme;
      preventMenuClose = true;
      await window.api.saveThemeConfig(themeConfig);
      showNotification("Theme changed");
      preventMenuClose = false;
    });

    const resetAppearanceButton = document.getElementById("reset-appearance") as HTMLButtonElement;
    const resetClientButton = document.getElementById("reset-client") as HTMLButtonElement;

    if (resetAppearanceButton) {
    resetAppearanceButton.addEventListener("click", async () => {
        const confirmed = await safePrompt("Are you sure you want to reset the appearance settings? This will erase your custom colors and backgrounds (games and client settings are not affected).");
        if (!confirmed) return;

        themeConfig.background = "";
        themeConfig.backgrounds = [];
        themeConfig.backgroundColor = "#0e1a23ff";
        themeConfig.textColor = "#88c0a9ff";
        themeConfig.accentColor = "#98e4f7ff";
        themeConfig.buttonColorAlpha = 0.65;
        themeConfig.buttonColor = "#14141e";
        themeConfig.accentColor = "#98e4f7ff";
        themeConfig.buttonColorHoverAlpha = 0.95;
        themeConfig.buttonColorHover = "#28283c";
        themeConfig.fontPrimary = "";
        themeConfig.fontPrimaryUrl = "";
        themeConfig.fontSecondary = "";
        themeConfig.fontSecondaryUrl = "";
        
        document.body.style.backgroundColor = "";
        applyThemeConfig(themeConfig);

        await window.api.saveThemeConfig(themeConfig);
        showNotification("Appearance settings reset");
    });
    }

    if (resetClientButton) {
        resetClientButton.addEventListener("click", async () => {
        const confirmed = await safePrompt("Are you sure you want to reset the client settings? This will erase your cache, certificate and Discord settings (games and themes are not affected).");
        if (!confirmed) return;

        appConfig.cachePath = undefined;
        appConfig.autoCacheClear = undefined;
        appConfig.customCSS = undefined;
        appConfig.ignoreCertificateErrors = undefined;
        appConfig.discordRP = undefined;

        applyAppConfig(appConfig);

        await window.api.saveAppConfig(appConfig);
        showNotification("Client settings reset");
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
    document.getElementById("open-theme")?.addEventListener("click", () => toggleMenu(".theme-configuration"));
    document.getElementById("open-help")?.addEventListener("click", () => toggleMenu(".help"));
    document.getElementById("open-share")?.addEventListener("click", async () => {
        await toggleMenu("#share-menu", async () => {
            // Export Settings
            document.getElementById("export-settings")!.addEventListener("click", async () => {
                const saveAsBtn = document.getElementById("share-save-as") as HTMLButtonElement;
                saveAsBtn.style.display = "block";
                const copyBtn = document.getElementById("share-copy") as HTMLButtonElement;
                copyBtn.style.display = "block";
                const app = await window.api.localAppConfig();
                const theme = await window.api.localThemeConfig();
                const full = { app, theme };
                document.getElementById("share-output")!.textContent = JSON.stringify(full, null, 2);
            });
            
            // Export Theme
            document.getElementById("export-theme")!.addEventListener("click", async () => {
                const saveAsBtn = document.getElementById("share-save-as") as HTMLButtonElement;
                saveAsBtn.style.display = "block";
                const copyBtn = document.getElementById("share-copy") as HTMLButtonElement;
                copyBtn.style.display = "block";
                const themeConfig = await window.api.localThemeConfig();
                document.getElementById("share-output")!.textContent = JSON.stringify(themeConfig, null, 2);
            });
            // Appliquer l’import (paramétrable selon ce qu’on colle)
            document.getElementById("share-apply-import")!.addEventListener("click", async () => {
                const txt = (document.getElementById("share-input") as HTMLTextAreaElement).value;
                let data: any;
                try {
                  data = JSON.parse(txt);
                } catch {
                  await safePrompt("Invalid JSON data", { mode: 'alert' });
                  return;
                }
              
                // full settings import
                if (data.app && data.theme) {
                  await window.api.saveAppConfig(data.app);
                  await window.api.saveThemeConfig(data.theme);
                  applyAppConfig(data.app);
                  applyThemeConfig(data.theme);
                  await createGameList();
                  return showNotification("Settings imported");
                }
              
                // theme-only import
                if (data.theme) {
                  await window.api.saveThemeConfig(data.theme);
                  applyThemeConfig(data.theme);
                  return showNotification("Theme imported");
                }
              
                await safePrompt("Format non reconnu (Settings ou Theme attendu)", { mode: 'alert' });
              });              
            
              const fileInput = document.getElementById("import-file") as HTMLInputElement;

              document.getElementById("import-settings")!.addEventListener("click", () => {
                fileInput.onchange = async () => {
                  const file = fileInput.files![0];
                  const txt  = await file.text();
                  let data: any;
                  try {
                    data = JSON.parse(txt);
                  } catch {
                    await safePrompt("Invalid JSON data", { mode: 'alert' });
                    return;
                  }
                
                  // full settings import
                  if (data.app && data.theme) {
                    await window.api.saveAppConfig(data.app);
                    await window.api.saveThemeConfig(data.theme);
                    applyAppConfig(data.app);
                    applyThemeConfig(data.theme);
                    await createGameList();
                    return showNotification("Settings imported");
                  }
                
                  // theme-only import
                  if (data.theme) {
                    await window.api.saveThemeConfig(data.theme);
                    applyThemeConfig(data.theme);
                    return showNotification("Theme imported");
                  }
                
                  await safePrompt("Format non reconnu (Settings ou Theme attendu)", { mode: 'alert' });
                };
                fileInput.click();
              });
                // Récupère le bouton
                const saveAsBtn = document.getElementById("share-save-as") as HTMLButtonElement;

                // Quand on clique dessus…
                saveAsBtn.addEventListener("click", () => {
                // 1) Récupère le JSON déjà affiché dans <pre id="share-output">
                const outputEl = document.getElementById("share-output") as HTMLElement;
                const text = outputEl.textContent ?? "";
                if (!text) {
                    return showNotification("Nothing to save");
                }

                // 2) Crée un Blob JSON
                const blob = new Blob([text], { type: "application/json" });

                // 3) Crée un URL temporaire
                const url = URL.createObjectURL(blob);

                // 4) Crée dynamiquement un <a> pour forcer le download
                const a = document.createElement("a");
                a.href = url;

                // Choisis un nom de fichier selon le contenu du JSON
                // On teste si c'est un export complet (app+theme) ou un thème seul
                let filename = "export";
                try {
                    const data = JSON.parse(text);
                    if (data.app && data.theme) {
                    filename = "settings";
                    } else {
                    filename = "theme";
                    }
                } catch {
                    filename = "export";
                }
                a.download = `${filename}.json`;

                // 5) Lance le download et nettoie
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showNotification(`Saved ${a.download}`);
                });
                document.querySelectorAll<HTMLButtonElement>('.tab-button').forEach(btn => {
                    const tabId = btn.getAttribute('data-tab')
                    if (!tabId) return
                    btn.addEventListener('click', e => switchTab(e as MouseEvent, tabId))
                })
            });
        }); 
    document.getElementById("close-share")?.addEventListener("click", () => toggleMenu("#share-menu"));
    document.querySelector("#share-copy").addEventListener("click", async () => {
        const txt = document.getElementById("share-output")!.textContent;
        navigator.clipboard.writeText(txt);
        showNotification("Settings copied");
    });
});
  
function switchTab(event: MouseEvent, tabId: string): void {
    event.preventDefault()
    const tabs = document.querySelectorAll<HTMLButtonElement>('.tab-button')
    const contents = document.querySelectorAll<HTMLElement>('.tab-content')
  
    tabs.forEach(t => t.classList.remove('active'))
    contents.forEach(c => {
      c.classList.remove('active');
      c.style.display = 'none';
    });
  
    (event.currentTarget as HTMLElement).classList.add('active')
  
    const target = document.getElementById(`tab-${tabId}`)
    if (!target) return
    target.style.display = 'block'
    void target.offsetWidth // force repaint
    target.classList.add('active')
  }

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

    li.id = game.cssId;
    li.setAttribute("data-game-id", String(game.id ?? game.name));
    (li.querySelector(".user-name") as HTMLInputElement).value = loginData.user;
    (li.querySelector(".user-password") as HTMLInputElement).value = loginData.password;
    (li.querySelector(".admin-password") as HTMLInputElement).value = loginData.adminPassword;
    (li.querySelector(".game-name-edit") as HTMLInputElement).value = game.name;
    (li.querySelector(".game-url-edit") as HTMLInputElement).value = game.url;
    li.querySelector("a").innerText = game.name;
    li.querySelector(".game-main-button").addEventListener("click", async () => {
        window.api.openGame(game.id ?? game.name, game.name);
        const appConfig: AppConfig = await window.api.localAppConfig();
        if (appConfig.discordRP) {
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
            }
        });
    
        window.api.saveUserData({gameId, user, password, adminPassword} as SaveUserData);
        showNotification("Game settings saved");
    });    
}

function applyAppConfig(config: AppConfig) {
    (document.querySelector("#cache-path") as HTMLInputElement).value = "";
    (document.querySelector("#insecure-ssl") as HTMLInputElement).checked = false;
    (document.querySelector("#clear-cache-on-close") as HTMLInputElement).checked = false;
    (document.querySelector("#discord-rp") as HTMLInputElement).checked = false;
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
    if (config.discordRP) {
        (document.querySelector("#discord-rp") as HTMLInputElement).checked = config.discordRP;
    }
}

function applyThemeConfig(config: ThemeConfig) {

  // ——— CUSTOM FONTS ——————————————————————————————————
  const primaryFontSelect = document.querySelector<HTMLSelectElement>("#primary-font-selector")!;
  const customPrimaryField   = document.querySelector<HTMLInputElement>("#primary-custom-font")!;
  const secondaryFontSelect  = document.querySelector<HTMLSelectElement>("#secondary-font-selector")!;
  const customSecondaryField = document.querySelector<HTMLInputElement>("#secondary-custom-font")!;

  // 1) On initialise la valeur du <select> et de l'input custom depuis le config
  primaryFontSelect.value     = config.fontPrimary    ?? "";
  customPrimaryField.value    = config.fontPrimaryUrl ?? "";
  secondaryFontSelect.value   = config.fontSecondary ?? "";
  customSecondaryField.value  = config.fontSecondaryUrl ?? "";

  // 2) On affiche/masque le champ custom en fonction du select
  customPrimaryField.style.display   = primaryFontSelect.value   === "__custom" ? "flex" : "none";
  customSecondaryField.style.display = secondaryFontSelect.value === "__custom" ? "flex" : "none";

  // 3) On injecte la font Google ou on remet par défaut
  if (config.fontPrimary === "__custom" && config.fontPrimaryUrl) {
    useGoogleFont(config.fontPrimaryUrl, "primary");
    const fam = extractFamilyName(config.fontPrimaryUrl);
    document.documentElement.style.setProperty("--font-primary", fam ? `'${fam}',sans-serif` : "");
  } else {
    useGoogleFont("", "primary");
    if (config.fontPrimary && config.fontPrimary !== "__custom") {
      document.documentElement.style.setProperty("--font-primary", config.fontPrimary);
    } else {
      document.documentElement.style.removeProperty("--font-primary");
    }
  }

  if (config.fontSecondary === "__custom" && config.fontSecondaryUrl) {
    useGoogleFont(config.fontSecondaryUrl, "secondary");
    const fam = extractFamilyName(config.fontSecondaryUrl);
    document.documentElement.style.setProperty("--font-secondary", fam ? `'${fam}',sans-serif` : "");
  } else {
    useGoogleFont("", "secondary");
    if (config.fontSecondary && config.fontSecondary !== "__custom") {
      document.documentElement.style.setProperty("--font-secondary", config.fontSecondary);
    } else {
      document.documentElement.style.removeProperty("--font-secondary");
    }
  }

    (document.querySelector("#accent-color") as HTMLInputElement).value = "#98e4f7";
    (document.querySelector("#background-color") as HTMLInputElement).value = "#0e1a23";
    (document.querySelector("#text-color") as HTMLInputElement).value = "#88c0a9";
    const alphaInput = document.querySelector("#button-color-alpha") as HTMLInputElement;
    alphaInput.valueAsNumber = 0.65;
    (document.querySelector("#button-color") as HTMLInputElement).value = "#14141e";
    const alphaHoverInput = document.querySelector("#button-color-hover-alpha") as HTMLInputElement;
    alphaHoverInput.valueAsNumber = 0.95;
    (document.querySelector("#button-color-hover") as HTMLInputElement).value = "#28283c";

    const defaults = {
        count: 100,
        speedYMin: 0.1,
        speedYMax: 0.3,
        colorHex: '#63b0c4',
        alpha: 0.15
    };

    const opts = { ...defaults, ...config.particleOptions };
    
    (document.querySelector("#particles-count") as HTMLInputElement).valueAsNumber = opts.count;
    (document.querySelector("#particles-speed") as HTMLInputElement).valueAsNumber = opts.speedYMax;
    (document.querySelector("#particles-color") as HTMLInputElement).value = opts.colorHex;
    (document.querySelector("#particles-color-alpha") as HTMLInputElement).valueAsNumber = opts.alpha;

    const rgbaParticles = hexToRgba(opts.colorHex, opts.alpha);

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
    if (config.buttonColorAlpha != null) {  
        const alphaStr = config.buttonColorAlpha.toString();  
    
        document.documentElement.style.setProperty("--opacity-button", alphaStr);  
        const inputAlpha = document.querySelector("#button-color-alpha") as HTMLInputElement;
        inputAlpha.valueAsNumber = config.buttonColorAlpha;
    }
    if (config.buttonColor) {  
        document.documentElement.style.setProperty("--color-button", config.buttonColor);  
        (document.querySelector("#button-color") as HTMLInputElement).value = config.buttonColor;  
    }  
    const rgba = hexToRgba(config.buttonColor, config.buttonColorAlpha);
    document.documentElement.style.setProperty('--color-button-rgba', rgba);
    
    if (config.buttonColorHoverAlpha != null) {  
        const alphaStr = config.buttonColorHoverAlpha.toString();  
    
        document.documentElement.style.setProperty("--opacity-button-hover", alphaStr);  
        const inputAlpha = document.querySelector("#button-color-hover-alpha") as HTMLInputElement;
        inputAlpha.valueAsNumber = config.buttonColorHoverAlpha;
    }
    if (config.buttonColorHover) {  
        document.documentElement.style.setProperty("--color-button-hover", config.buttonColorHover);  
        (document.querySelector("#button-color-hover") as HTMLInputElement).value = config.buttonColorHover;  
    }  
    const rgbaHover = hexToRgba(config.buttonColorHover, config.buttonColorHoverAlpha);
    document.documentElement.style.setProperty('--color-button-hover-rgba', rgbaHover);
    
    particles.configureParticles({
        count: opts.count,
        speedYMin: opts.speedYMin,
        speedYMax: opts.speedYMax,
        color: rgbaParticles,
    });
    
    const enabled = config.particlesEnabled ?? true;
    const checkbox = (document.querySelector("#particles-button") as HTMLInputElement);
    checkbox.checked = enabled;
    if (enabled) {
        particles.startParticles();
    } else {
        particles.stopParticles();
    }
}

function hexToRgba(hex: string, alpha: number): string {
    // removes ‘#’ and handles #RGB
    let h = hex.replace(/^#/, '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbaToHex(rgba: string): string {
    const match = rgba.match(/rgba?\(\s*([0-9]+)[ ,]+([0-9]+)[ ,]+([0-9]+)(?:[ ,]+([0-9.]+))?\s*\)/);
    if (!match) {
      console.warn(`rgbaToHex: format invalide (“${rgba}”), on retourne "#000000"`);
      return "#000000";
    }
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
  
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
  
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
    const layer = document.getElementById("tooltip-layer");
    if (!layer) return;
    
    document.querySelectorAll(".tooltip-wrapper").forEach(wrapper => {
        const tooltip = wrapper.querySelector<HTMLElement>(".tooltip");
        if (!tooltip) return;
    
        // tente de repérer un input range à l'intérieur
        const input = wrapper.querySelector<HTMLInputElement>("input[type=range]");
    
        wrapper.addEventListener("mouseenter", () => {
        const rect = wrapper.getBoundingClientRect();
        const clone = tooltip.cloneNode(true) as HTMLElement;
        clone.classList.add("active-tooltip");
        clone.style.display       = "block";
        clone.style.position      = "fixed";
        clone.style.pointerEvents = "none";
        clone.style.transform      = "translateX(-50%)";
        clone.style.left          = `${rect.left + rect.width/2}px`;
        clone.style.top           = `${rect.bottom + 5}px`;
    
        const baseText = tooltip.textContent?.trim() ?? "";

        // Si c'est un range, on met à jour la valeur live
        let onInput: (() => void) | null = null;
        if (input) {
            clone.textContent = `${baseText}: ${input.value}`;
            onInput = () => { clone.textContent = `${baseText}: ${input.value}`; };
            input.addEventListener("input", onInput);
        }
    
        layer.appendChild(clone);
    
        // Au mouseleave, on nettoie clone et listener
        wrapper.addEventListener("mouseleave", () => {
            clone.remove();
            if (input && onInput) {
            input.removeEventListener("input", onInput);
            }
        }, { once: true });
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
    const config: AppConfig = await window.api.appConfig();
    const defaults: ThemeConfig = {
        background: "",
        backgrounds: [],
        backgroundColor: "#0e1a23ff",
        textColor: "#88c0a9ff",
        accentColor: "#98e4f7ff",
        buttonColorAlpha: 0.65,
        buttonColor: "#14141e",
        buttonColorHoverAlpha: 0.95,
        buttonColorHover: "#28283c",
        theme: undefined,
        particlesEnabled: true,
      };
      
      const themeConfig: ThemeConfig = {
        ...defaults,
        ...(await window.api.localThemeConfig())
      };
      
    games = config.games;

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
    applyThemeConfig(themeConfig);

    gameItemList.querySelectorAll("li").forEach((li) => li.remove());

    config.games.forEach(createGameItem);
}

await createGameList();
setInterval(refreshAllServerInfos, 15000);