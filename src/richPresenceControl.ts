// src/main/richPresenceControl.ts

import { initDiscordRPC } from '../native/discord';

const enabledWindows = new Set<number>();
let rpcInitialized = false;

export function enableRichPresenceForWindow(windowId: number) {
  if (enabledWindows.has(windowId)) return;

  enabledWindows.add(windowId);
  console.log(`[RPC] Activation demandée pour la fenêtre #${windowId}`);

  if (!rpcInitialized) {
    initDiscordRPC()
      .then(() => {
        console.log(`[RPC] Initialisé avec succès`);
        rpcInitialized = true;
      })
      .catch((err) => {
        console.warn(`[RPC] Échec d'initialisation :`, err);
      });
  }
}
