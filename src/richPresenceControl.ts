// src/main/richPresenceControl.ts

import { Client } from '@xhayper/discord-rpc';

const enabledWindows = new Set<number>();
let rpc: Client | null = null;
let rpcInitialized = false;
let rpcStartTime: Date | null = null;

export async function enableRichPresence(windowId: number) {
  if (enabledWindows.has(windowId)) return;
  enabledWindows.add(windowId);

  if (!rpc) rpc = new Client({ clientId: '1366841898693562540' });

  if (!rpcInitialized) {
    try {
      await rpc.login();
      console.log('✅ Discord RPC connected.');
      rpcInitialized = true;
    } catch (err) {
      console.warn('[RPC] Could not connect to Discord :', err);
    }
  }
}


export async function updateActivity(data: {
  actorName: string;
  hp?: { value: number; max: number };
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
  if (!rpcInitialized) {
    await enableRichPresence(0);
  }
  if (!rpcInitialized || !rpc?.user) return;


  if (!rpcStartTime) rpcStartTime = new Date();

  rpc.user.setActivity({
    details: data.isGM
      ? "Game Master"
      : `${data.actorName ? `${data.actorName}` : "Spectator"} ${data.hp ? ` - HP ${data.hp.value}/${data.hp.max}` : ""}`,
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
        console.log(`[RPC] Rich Presence disabled`);
      } catch (err) {
        console.warn(`[RPC] Could not disable RPC :`, err);
      } finally {
        rpcStartTime = null;
        rpc = null;
        rpcInitialized = false;
        enabledWindows.clear();
      }
    }
  }
