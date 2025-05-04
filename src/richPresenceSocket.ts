import WebSocket, { Server as WebSocketServer } from 'ws';
import { disableRichPresence, updateActivity } from './richPresenceControl';

// Stores WebSocketInstance to be called later
let wss: WebSocketServer | undefined;

/**
 * Starts WebSocket Server and handles Discord updates
 */
export function startRichPresenceSocket() {
  if (wss) return;  // already started, avoids duplicates
  wss = new WebSocketServer({ port: 35601 });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client Foundry connecté à la RichPresence');

    let lastRpcCall = 0;            // last discord update timestamp
    const RPC_COOLDOWN = 20_000;    // 20 000 ms = 20 s

    ws.on('message', (message: WebSocket.Data) => {
      let data: any;
      try {
        data = JSON.parse(message.toString());
      } catch {
        console.warn('[WS] Payload invalide');
        return;
      }

      const now = Date.now();
      // While in the same cooldown, ignore
      if (now - lastRpcCall < RPC_COOLDOWN) return;
      lastRpcCall = now;

      // Trigger Discord update
      updateActivity({
        actorName:   data.actorName   ?? null,
        hp:          data.hp          ?? null,
        scene:       data.scene       ?? 'Unknown',
        inCombat:    data.inCombat    ?? false,
        onlineUsers: data.onlineUsers ?? 0,
        totalUsers:  data.totalUsers  ?? 0,
        isGM:        data.isGM        ?? false,
        worldName:   data.worldName   ?? 'Unknown',
        className:   data.className   ?? null,
        classLevel:  data.classLevel  ?? 0,
        worldId:     data.worldId     ?? '',
        sceneId:     data.sceneId     ?? ''
      });
    });

    ws.on('close', () => {
      console.log('[WS] Déconnexion du module Foundry');
      disableRichPresence();
    });
  });
}
