const path = require('path');
const fs = require('fs-extra');
const { build } = require('vite');

(async () => {
  try {
    // Nettoie uniquement le dossier du build main
    const mainDir = path.resolve(__dirname, '../.vite/build/main');
    fs.emptyDirSync(mainDir);
    console.log('🧹 Clean .vite/build/main/ avant build principal');

    // Build preload.ts avec sa config dédiée
    await build({
      configFile: path.resolve(__dirname, '../vite.preload.config.ts')
    });

    console.log('✅ preload.js buildé avec succès');
  } catch (err) {
    console.error('❌ Erreur lors du build preload :', err);
    process.exit(1);
  }
})();
