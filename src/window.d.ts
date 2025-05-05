// noinspection JSUnusedGlobalSymbols

import type {ContextBridgeApi} from './preload'

declare global {
    interface Window {
      api: ContextBridgeApi;
      richPresence: {
        update: (payload: {
            details?: string;
            state?: string;
            largeImageKey?: string;
            largeImageText?: string;
            smallImageKey?: string;
            smallImageText?: string;
        }) => void;
        enable: () => void;
      };
    }
  }
