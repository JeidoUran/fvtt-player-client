export async function mergeAppData(
  imported: Partial<AppConfig>,
): Promise<AppConfig> {
  // Load existing config
  const existing: AppConfig = await window.api.localAppConfig();

  // rebuild appConfig manually
  const merged: AppConfig = {
    games: imported.games ?? existing.games,
    cachePath: imported.cachePath ?? existing.cachePath,
    autoCacheClear: imported.autoCacheClear ?? existing.autoCacheClear,
    customCSS: imported.customCSS ?? existing.customCSS,
    ignoreCertificateErrors:
      imported.ignoreCertificateErrors ?? existing.ignoreCertificateErrors,
    discordRP: imported.discordRP ?? existing.discordRP,
    serverInfoEnabled: imported.serverInfoEnabled ?? existing.serverInfoEnabled,
    serverInfoOptions: {
      statusEnabled:
        imported.serverInfoOptions?.statusEnabled ??
        existing.serverInfoOptions.statusEnabled,
      foundryVersionEnabled:
        imported.serverInfoOptions?.foundryVersionEnabled ??
        existing.serverInfoOptions.foundryVersionEnabled,
      worldEnabled:
        imported.serverInfoOptions?.worldEnabled ??
        existing.serverInfoOptions.worldEnabled,
      gameSystemEnabled:
        imported.serverInfoOptions?.gameSystemEnabled ??
        existing.serverInfoOptions.gameSystemEnabled,
      gameSystemVersionEnabled:
        imported.serverInfoOptions?.gameSystemVersionEnabled ??
        existing.serverInfoOptions.gameSystemVersionEnabled,
      onlinePlayersEnabled:
        imported.serverInfoOptions?.onlinePlayersEnabled ??
        existing.serverInfoOptions.onlinePlayersEnabled,
    },
    serverInfoPingRate:
      imported.serverInfoPingRate ?? existing.serverInfoPingRate,
  };

  return merged;
}

export async function mergeThemeData(
  imported: Partial<ThemeConfig>,
): Promise<ThemeConfig> {
  // Load existing config
  const existing: ThemeConfig = await window.api.localThemeConfig();

  // delete local config
  delete imported.fontPrimaryName;
  delete imported.fontPrimaryFilePath;
  delete imported.fontSecondaryName;
  delete imported.fontSecondaryFilePath;

  // rebuild themeConfig manually
  const merged: ThemeConfig = {
    background: imported.background ?? existing.background,
    backgrounds: imported.backgrounds ?? existing.backgrounds,
    backgroundColor: imported.backgroundColor ?? existing.backgroundColor,
    textColor: imported.textColor ?? existing.textColor,
    accentColor: imported.accentColor ?? existing.accentColor,

    buttonColorAlpha: imported.buttonColorAlpha ?? existing.buttonColorAlpha,
    buttonColor: imported.buttonColor ?? existing.buttonColor,
    buttonColorHoverAlpha:
      imported.buttonColorHoverAlpha ?? existing.buttonColorHoverAlpha,
    buttonColorHover: imported.buttonColorHover ?? existing.buttonColorHover,

    particlesEnabled: imported.particlesEnabled ?? existing.particlesEnabled,
    particleOptions: {
      count: imported.particleOptions?.count ?? existing.particleOptions.count,
      speedYMin:
        imported.particleOptions?.speedYMin ??
        existing.particleOptions.speedYMin,
      speedYMax:
        imported.particleOptions?.speedYMax ??
        existing.particleOptions.speedYMax,
      color: imported.particleOptions?.color ?? existing.particleOptions.color,
      alpha: imported.particleOptions?.alpha ?? existing.particleOptions.alpha,
    },

    baseTheme: imported.baseTheme ?? existing.baseTheme,

    fontPrimary: imported.fontPrimary ?? existing.fontPrimary,
    fontPrimaryUrl: imported.fontPrimaryUrl ?? existing.fontPrimaryUrl,
    fontPrimaryName: existing.fontPrimaryName,
    fontPrimaryFilePath: existing.fontPrimaryFilePath,

    fontSecondary: imported.fontSecondary ?? existing.fontSecondary,
    fontSecondaryUrl: imported.fontSecondaryUrl ?? existing.fontSecondaryUrl,
    fontSecondaryName: existing.fontSecondaryName,
    fontSecondaryFilePath: existing.fontSecondaryFilePath,
  };

  return merged;
}
