// src/utils/serverInfoHelpers.ts
import type { GameConfig, ServerStatusData } from "../schemas";

const seenOffline = new Map<string, boolean>();

async function getServerInfo(
  game: GameConfig,
): Promise<ServerStatusData | null> {
  // plus de CORS, on passe par main.ts
  return window.api.pingServer(game.url);
}

export async function updateServerInfos(
  item: HTMLElement,
  game: GameConfig,
) {
  // Retrieve user config
  const { serverInfoEnabled = true, serverInfoOptions } =
    await window.api.localAppConfig();

  const serverInfos = item.querySelector(
    ".server-infos",
  ) as HTMLDivElement | null;
  if (!serverInfos) return;

  // If global toggle is off, hide everything and return
  if (!serverInfoEnabled) {
    serverInfos.style.display = "none";
    return;
  }
  serverInfos.style.display = "";

  // Individual options and their defaults
  const {
    statusEnabled = true,
    foundryVersionEnabled = true,
    worldEnabled = false,
    gameSystemEnabled = true,
    gameSystemVersionEnabled = true,
    onlinePlayersEnabled = true,
  } = serverInfoOptions ?? {};

  // Retrieve each <span> and apply show/hide
  const statusSpan = serverInfos.querySelector(".status") as HTMLSpanElement;
  const versionSpan = serverInfos.querySelector(".version") as HTMLSpanElement;
  const worldSpan = serverInfos.querySelector(".world") as HTMLSpanElement;
  const systemSpan = serverInfos.querySelector(".system") as HTMLSpanElement;
  const systemVersionSpan = serverInfos.querySelector(
    ".systemVersion",
  ) as HTMLSpanElement;
  const usersSpan = serverInfos.querySelector(".users") as HTMLSpanElement;

  const statusWrapper = statusSpan.closest(".tooltip-wrapper") as HTMLElement;
  const versionWrapper = versionSpan.closest(".tooltip-wrapper") as HTMLElement;
  const worldWrapper = worldSpan.closest(".tooltip-wrapper") as HTMLElement;
  const systemWrapper = systemSpan.closest(".tooltip-wrapper") as HTMLElement;
  const systemVersionWrapper = systemVersionSpan.closest(
    ".tooltip-wrapper",
  ) as HTMLElement;
  const usersWrapper = usersSpan.closest(".tooltip-wrapper") as HTMLElement;

  if (statusWrapper) statusWrapper.style.display = statusEnabled ? "" : "none";
  if (versionWrapper)
    versionWrapper.style.display = foundryVersionEnabled ? "" : "none";
  if (worldWrapper) worldWrapper.style.display = worldEnabled ? "" : "none";
  if (systemWrapper)
    systemWrapper.style.display = gameSystemEnabled ? "" : "none";
  if (systemVersionWrapper)
    systemVersionWrapper.style.display = gameSystemVersionEnabled ? "" : "none";
  if (usersWrapper)
    usersWrapper.style.display = onlinePlayersEnabled ? "" : "none";

  // Ping server
  let info: ServerStatusData | null = null;
  let errorReason: string | null = null;
  try {
    info = await getServerInfo(game);
  } catch (err: any) {
    errorReason = err?.message ?? String(err);
    info = null;
  }

  const idKey = String(game.id ?? game.name);
  const wasOffline = seenOffline.get(idKey) ?? false;
  const nowOffline = info === null;

  if (nowOffline && !wasOffline) {
    console.warn(
      `Server ${game.name} is unreachable.` +
        (errorReason ? ` Reason: ${errorReason}` : ""),
    );
  }
  if (!nowOffline && wasOffline) {
    console.info(`Server ${game.name} is back online.`);
  }
  seenOffline.set(idKey, nowOffline);

  // If it fails, displays "-"
  if (!info) {
    if (statusEnabled) {
      statusSpan.innerHTML = `<i class="fa-solid fa-xmark"></i> Offline`;
    }
    if (foundryVersionEnabled) {
      versionSpan.innerHTML = `<i class="fa-solid fa-dice-d20"></i> -`;
    }
    if (worldEnabled) {
      worldSpan.innerHTML = `<i class="fa-solid fa-globe"></i> -`;
    }
    if (gameSystemEnabled) {
      systemSpan.innerHTML = `<i class="fa-solid fa-dice"></i> -`;
    }
    if (gameSystemVersionEnabled) {
      systemVersionSpan.innerHTML = `<i class="fa-solid fa-screwdriver-wrench"></i> -`;
    }
    if (onlinePlayersEnabled) {
      usersSpan.innerHTML = `<i class="fa-solid fa-users"></i> -`;
    }
    return;
  }

  // Otherwise, inject real data
  if (statusEnabled) {
    statusSpan.innerHTML = info.version
      ? `<i class="fa-solid fa-signal"></i> Online`
      : `<i class="fa-solid fa-xmark"></i> Offline`;
  }
  if (foundryVersionEnabled) {
    versionSpan.innerHTML = `<i class="fa-solid fa-dice-d20"></i> v${info.version ?? "-"}`;
  }
  if (worldEnabled) {
    worldSpan.innerHTML = `<i class="fa-solid fa-globe"></i> ${info.world ?? "-"}`;
  }
  if (gameSystemEnabled) {
    systemSpan.innerHTML = `<i class="fa-solid fa-dice"></i> ${info.system?.toUpperCase() ?? "-"}`;
  }
  if (gameSystemVersionEnabled) {
    systemVersionSpan.innerHTML = `<i class="fa-solid fa-screwdriver-wrench"></i> ${info.systemVersion ?? "-"}`;
  }
  if (onlinePlayersEnabled) {
    usersSpan.innerHTML = `<i class="fa-solid fa-users"></i> ${info.users ?? "0"}`;
  }
}

export async function refreshAllServerInfos() {
  // On relit la config pour obtenir la liste des jeux à jour
  const { games = [] } = await window.api.localAppConfig();

  const gameItems = Array.from(
    document.querySelectorAll<HTMLElement>(".game-item"),
  );

  await Promise.all(
    gameItems.map(async (item) => {
      const key = item.dataset.gameId!;
      const game = games.find(
        (g) => String(g.id) === key || String(g.name) === key,
      );
      if (!game) return;

      try {
        await updateServerInfos(item, game);
      } catch (err) {
        console.warn(`updateServerInfos failed for ${game.name}:`, err);
      }
    }),
  );
}
