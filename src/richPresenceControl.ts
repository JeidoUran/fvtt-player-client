// src/main/richPresenceControl.ts

import { Client } from '@xhayper/discord-rpc';

const enabledWindows = new Set<number>();
let rpc: Client | null = null;
let rpcInitialized = false;
let rpcStartTime: Date | null = null;

export async function enableRichPresence(windowId: number) {
  if (enabledWindows.has(windowId)) return;

  enabledWindows.add(windowId);
  console.log(`[RPC] Activation demandée pour la fenêtre #${windowId}`);

  if (!rpc) {
    rpc = new Client({
      clientId: '1366841898693562540',
    });
  }

  if (!rpcInitialized) {
    try {
      await rpc.login(); // 👈 simple appel, pas besoin de passer clientId ici
      console.log('✅ Discord RPC connecté.');
  
      rpc.user?.setActivity({
        details: 'Level ? Imperial',
        state: 'In Armoroad',
        largeImageKey: 'logo_fvtt_rp',
        largeImageText: 'Foundry VTT Client',
        partySize: 1,
        partyMax: 99,
        startTimestamp: new Date(),
        instance: false
      });
      rpcInitialized = true;
      console.log(`[RPC] Rich Presence connecté`);
    } catch (err) {
      console.warn(`[RPC] Échec de connexion Discord :`, err);
    }
  }
}

export async function updateActivity(data: {
  actorName: string;
  hp?: { value: number; max: number };
  scene: string;
  inCombat: boolean;
}) {
  if (!rpcInitialized || !rpc || !rpc.user) return;

  if (!rpcStartTime) rpcStartTime = new Date();

  rpc.user.setActivity({
    details: data.actorName
      ? `${data.actorName} ${data.hp ? `(${data.hp.value}/${data.hp.max})` : ""}`
      : "Spectateur",
    state: data.scene,
    largeImageKey: 'logo_fvtt_rp',
    largeImageText: 'Foundry VTT Client',
    smallImageKey: data.inCombat ? 'crossed_swords' : 'shield',
    smallImageText: data.inCombat ? 'En combat' : 'Exploration',
    startTimestamp: rpcStartTime,
  });
}

export async function disableRichPresence() {
    if (rpc && rpcInitialized) {
      try {
        rpc.user?.setActivity(undefined);
        await rpc.destroy();
        console.log(`[RPC] Rich Presence désactivé`);
      } catch (err) {
        console.warn(`[RPC] Échec désactivation RPC :`, err);
      } finally {
        rpcStartTime = null;
        rpc = null;
        rpcInitialized = false;
        enabledWindows.clear();
      }
    }
  }
