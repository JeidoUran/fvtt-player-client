import { app } from "electron";
import path from "path";
import os from "os";
import fs from "fs-extra";
import { spawn, spawnSync } from "child_process";

const pkgPath = path.join(app.getAppPath(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
  description?: string;
};

/**
 * Install DEB via DPKG, using pkexec as policy kit
 */
export function installDebUpdate(version: string) {
  const rawName = pkg.description ?? app.getName(); // "FVTT Desktop Client"
  const SLUG_NAME = rawName.replace(/\s+/g, "-"); // "FVTT-Desktop-Client"
  const cacheDir =
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  const pendingDir = path.join(cacheDir, `${app.getName()}-updater`, "pending");
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  const debName = `${SLUG_NAME}_${version}_linux-${arch}.deb`;
  const debPath = path.join(pendingDir, debName);

  // pkexec command
  const userEnv = process.env;
  const shellCmd = `
  export DISPLAY=${userEnv.DISPLAY}
  export XAUTHORITY=${userEnv.XAUTHORITY}
  export DBUS_SESSION_BUS_ADDRESS=${userEnv.DBUS_SESSION_BUS_ADDRESS}
  dpkg -i "${debPath}"
  STATUS=$?
  if [ $STATUS -ne 0 ]; then
    if dpkg --audit | grep -q 'packages have'; then
      apt-get install -f -y
    fi
  fi
  exit $STATUS
  `;

  const child = spawn(
    "/usr/bin/pkexec",
    ["--disable-internal-agent", "/bin/sh", "-c", shellCmd],
    { stdio: "inherit" },
  );

  console.log("[Updater] pkexec lancé avec :", shellCmd);

  child.on("error", (err) => {
    console.error("Could not run pkexec", err);
  });

  child.on("close", (code) => {
    // Once installed, relaunch and quit to load new version
    console.log(`[Updater] pkexec terminé avec le code: ${code}`);
    if (code !== 0) {
      console.error(`DEB install failed (exit code ${code})`);
      return;
    }
    app.relaunch();
    app.quit();
  });
}

/**
 * Install RPM via DNF or YUM, using pkexec as policy kit
 */
export function installRpmUpdate(version: string) {
  const rawName = pkg.description ?? app.getName();
  const SLUG_NAME = rawName.replace(/\s+/g, "-");
  const cacheDir =
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  const pendingDir = path.join(cacheDir, `${app.getName()}-updater`, "pending");
  const arch = process.arch === "x64" ? "x86_64" : process.arch;
  const rpmName = `${SLUG_NAME}_${version}_linux-${arch}.rpm`;
  const rpmPath = path.join(pendingDir, rpmName);

  // Detect which package manager is used
  const detect = spawnSync(
    "bash",
    ["-lc", "command -v dnf || command -v yum"],
    { encoding: "utf8" },
  );
  const pm = detect.stdout.trim();
  let shellCmd: string;

  if (pm) {
    // Use DNF or YUM
    shellCmd = `${pm} install -y "${rpmPath}"`;
  } else {
    // Fallback to rpm -Uvh if neither
    shellCmd = `rpm -Uvh "${rpmPath}"`;
  }

  // spawn command using pkexec
  const child = spawn(
    "/usr/bin/pkexec",
    ["--disable-internal-agent", "/bin/sh", "-c", shellCmd],
    { stdio: "inherit" },
  );

  child.on("error", (err) => {
    console.error("Could not run pkexec", err);
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`RPM install failed (exit code ${code})`);
      return;
    }
    app.relaunch();
    app.quit();
  });
}
