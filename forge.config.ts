// noinspection JSUnusedGlobalSymbols

import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    prune: true,
    ignore: [
      /^\/src/,
      /^\/out/,
      /^\/\.vscode/,
      /^\/\.git/,
      /^\/forge\.config\.ts/,
      /^\/tsconfig\.json/,
      /^\/vite\..*\.ts/,
    ],
    // name: 'FVTT Desktop Client',
    // executableName: 'vtt-desktop-client',
    icon: "src/icons/win/icon.ico",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: "src/icons/win/icon.ico",
    }),
    new MakerZIP({}),
    new MakerRpm({}),
    new MakerDeb({
      options: {
        icon: "src/icons/png/512x512.png",
      },
    }),
    // new MakerFlatpak({
    //     options: {
    //         categories: ['Game', 'Network'],
    //         description: "VTT Desktop Client",
    //         productName: "VTT Desktop Client",
    //         id: "com.theripper93.vtt-desktop-client",
    //         files: []
    //     }
    // }),
    new MakerDMG({
      icon: "src/icons/mac/icon.icns",
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "JeidoUran",
          name: "fvtt-player-client",
        },
        prerelease: false,
      },
    },
    {
      name: "@electron-forge/publisher-s3",
      // Par défaut cela publie toutes les plateformes,
      // vous pouvez préciser `platforms: ["linux","darwin","win32"]` si besoin
      config: {
        bucket: process.env.R2_BUCKET!, // nom de ton bucket R2
        endpoint: process.env.R2_ENDPOINT!, // ex. https://<account>.r2.cloudflarestorage.com
        region: process.env.AWS_REGION || "auto",
        accessKeyId: process.env.R2_KEY_ID!, // ta clé d’accès R2
        secretAccessKey: process.env.R2_SECRET_KEY!, // ton secret R2
        signatureVersion: "v4",
        s3ForcePathStyle: true, // requis pour R2
        public: true, // rend les assets publics
        // folder:         "my-app-updates"               // (optionnel) préfixe dans le bucket
      },
    },
  ],
};

export default config;
