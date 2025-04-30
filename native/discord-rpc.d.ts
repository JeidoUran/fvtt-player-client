// src/types/discord-rpc.d.ts

declare module 'discord-rpc' {
    import { EventEmitter } from 'events';
  
    export type Presence = {
      state?: string;
      details?: string;
      startTimestamp?: number | Date;
      endTimestamp?: number | Date;
      largeImageKey?: string;
      largeImageText?: string;
      smallImageKey?: string;
      smallImageText?: string;
      partyId?: string;
      partySize?: number;
      partyMax?: number;
      matchSecret?: string;
      joinSecret?: string;
      spectateSecret?: string;
      instance?: boolean;
      buttons?: { label: string; url: string }[];
    };
  
    export class Client extends EventEmitter {
      constructor(options: { transport: 'ipc' | 'websocket' });
      login(options: { clientId: string }): Promise<void>;
      setActivity(presence: Presence): void;
      clearActivity(): void;
      destroy(): void;
    }
  }
  