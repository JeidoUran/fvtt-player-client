import * as RPC from 'discord-rpc';

const clientId = '1366841898693562540';
const rpc = new RPC.Client({ transport: 'ipc' });

export async function initDiscordRPC() {
  try {
    await rpc.login({ clientId });
    console.log('✅ Discord RPC connecté.');

    rpc.setActivity({
        details: 'Level ? Imperial',
        state: 'In Armoroad',
        largeImageKey: 'logo_fvtt_rp',
        largeImageText: 'Foundry VTT Client',
        partySize: 1,
        partyMax: 99,
        startTimestamp: new Date(),
        instance: false,
    });
  } catch (err) {
    console.warn('[RPC] Échec connexion Discord RPC :', err);
    throw err;
  }
}
