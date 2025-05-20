import { app } from "electron";
import path from "path";
import os from "os";
import fs from "fs-extra";
import { spawn, spawnSync } from "child_process";
import sudo from "sudo-prompt";

const pkgPath = path.join(app.getAppPath(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
  description?: string;
};

/**
 * Install DEB via DPKG, using pkexec
 */
export function installDebUpdate(version: string) {
  const rawName = pkg.description ?? app.getName();
  const SLUG_NAME = rawName.replace(/\s+/g, "-");
  const cacheDir =
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  const pendingDir = path.join(cacheDir, `${app.getName()}-updater`, "pending");
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  const debName = `${SLUG_NAME}_${version}_linux-${arch}.deb`;
  const debPath = path.resolve(pendingDir, debName);

  const installCmd = `dpkg -i "${debPath}" || apt-get install -f -y`;

  sudo.exec(installCmd, { name: pkg.description }, (error, stdout, stderr) => {
    if (error) {
      console.error("Sudo-prompt error:", error);
      return;
    }
    console.log("Sudo-prompt output:", stdout, stderr);
    app.relaunch();
    app.quit();
  });
}

/**
 * Install RPM via DNF or YUM, using pkexec
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
