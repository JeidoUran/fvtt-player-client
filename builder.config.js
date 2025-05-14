// builder.config.js

require("dotenv").config(); // if you still need your .env

module.exports = {
  appId: "com.theripper93.fvtt-player-client",
  productName: "FVTT Desktop Client",

  directories: {
    output: "dist",
    buildResources: "src/icons",
  },

  files: [
    // 1) main + preload:
    { from: ".vite/build", to: ".vite/build", filter: ["**/*"] },
    // 2) renderer → resources/renderer
    { from: ".vite/renderer", to: "renderer", filter: ["**/*"] },
    "node_modules/**/*",
    "package.json",
  ],

  extraMetadata: {
    main: ".vite/build/main.js",
  },

  win: {
    target: [{ target: "nsis", arch: ["x64", "ia32"] }, "zip"],
    icon: "src/icons/win/icon.ico",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    include: "build/installer.nsh",
  },

  mac: {
    target: "dmg",
    icon: "src/icons/mac/icon.icns",
  },

  linux: {
    target: ["deb", "rpm"],
    icon: "src/icons/png",
    maintainer: "JeidoUran <jeido.uran@hotmail.fr>",
  },

  publish: [
    {
      provider: "github",
      releaseType: "draft",
    },
    // {
    //   provider: "s3",
    //   bucket: process.env.R2_BUCKET,
    //   endpoint: process.env.R2_ENDPOINT,
    // },
  ],
};
