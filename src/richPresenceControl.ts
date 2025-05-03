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
      await rpc.login();
      console.log('✅ Discord RPC connecté.');
  
      rpc.user?.setActivity({
        details: 'Browsing Game Worlds',
        state: 'In Setup Page',
        largeImageKey: 'logo_fvtt_rp',
        largeImageText: 'Foundry VTT Client',
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
  onlineUsers: number;
  totalUsers: number;
  isGM: boolean;
  worldName: string;
  className: string;
  classLevel: number;
  worldId: string;
  sceneId: string;
}) {
  if (!rpcInitialized || !rpc || !rpc.user) return;

  if (!rpcStartTime) rpcStartTime = new Date();

  rpc.user.setActivity({
    details: data.isGM
      ? "Game Master" : `${data.actorName ? `${data.actorName}` : "Spectator"} ${data.hp ? ` - HP ${data.hp.value}/${data.hp.max}` : ""}`,
      state: data.inCombat
        ? `In Battle`
        : `Exploring`,    
    largeImageKey: 'logo_fvtt_rp',
    largeImageText: data.worldName,
    partyId: data.worldId ?? data.sceneId ?? "unknown-session",
    partySize: data.onlineUsers,
    partyMax: data.totalUsers,
    smallImageKey: data.inCombat ? 'in_battle' : 'exploring',
    smallImageText: data.isGM
    ? "Game Master - Level ??"
    : data.className
      ? `${data.className}${data.classLevel ? ` - Level ${data.classLevel}` : ""}`
      : "Spectator",
    startTimestamp: rpcStartTime,
    instance: true
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
