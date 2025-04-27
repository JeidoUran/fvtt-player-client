// noinspection JSUnusedGlobalSymbols

import type {ForgeConfig} from '@electron-forge/shared-types';
import {MakerSquirrel} from '@electron-forge/maker-squirrel';
import {MakerZIP} from '@electron-forge/maker-zip';
import {MakerDeb} from '@electron-forge/maker-deb';
import {MakerRpm} from '@electron-forge/maker-rpm';
import {MakerDMG} from '@electron-forge/maker-dmg';
import {VitePlugin} from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
    packagerConfig: {
        asar: true,
        prune: true, // enlève les devDependencies dans le package final
        ignore: [
            /^\/src/,               // ignore le code source
            /^\/out/,               // si jamais il existe
            /^\/\.vscode/,          // ignore les fichiers d'éditeur
            /^\/\.git/,             // ignore Git
            /^\/forge\.config\.ts/, // ignore ce fichier lui-même
            /^\/tsconfig\.json/,    // ignore config TypeScript
            /^\/vite\..*\.ts/       // ignore les configs Vite
            // ⚡ NE PAS exclure node_modules/electron-squirrel-startup !
        ],
    },
    rebuildConfig: {},
    makers: [
        new MakerSquirrel({}),
        new MakerZIP({}),
        new MakerRpm({}),
        new MakerDeb({}),
        // new MakerFlatpak({
        //     options: {
        //         categories: ['Game', 'Network'],
        //         description: "VTT Desktop Client",
        //         productName: "VTT Desktop Client",
        //         id: "com.theripper93.vtt-desktop-client",
        //         files: []
        //     }
        // }),
        new MakerDMG({}),
    ],
    plugins: [
        new VitePlugin({
            build: [
                {
                    entry: 'src/main.ts',
                    config: 'vite.main.config.ts',
                },
                {
                    entry: 'src/preload.ts',
                    config: 'vite.preload.config.ts',
                },
            ],
            renderer: [
                {
                    name: 'main_window',
                    config: 'vite.renderer.config.ts',
                },
            ],
        }),
    ]
};

export default config;
