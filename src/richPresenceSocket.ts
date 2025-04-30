// src/main/richPresenceSocket.ts
import WebSocket, { WebSocketServer } from 'ws';
import { updateActivity } from './richPresenceControl';

export function startRichPresenceSocket() {
    if (process.type !== 'browser') {
        console.warn("[RPC] Tentative d'instancier un WebSocket hors du main process !");
        return;
    }
  const wss = new WebSocketServer({ port: 35601 });

  wss.on('connection', (ws) => {
    console.log('[WS] Client Foundry connecté à la RichPresence');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        updateActivity({
          actorName: data.actorName ?? null,
          hp: data.hp ?? null,
          scene: data.scene ?? "Inconnu",
          inCombat: data.inCombat ?? false
        });
      } catch (err) {
        console.warn('[WS] Erreur traitement message RichPresence :', err);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Déconnexion du module Foundry');
    });
  });
}
