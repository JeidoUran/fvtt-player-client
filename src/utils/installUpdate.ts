import { app } from "electron";
import path from "path";
import os from "os";
import fs from "fs-extra";
import { spawn } from "child_process";
import { sendUpdateStatus } from "./updateStatus";

const pkgPath = path.join(app.getAppPath(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
  description?: string;
};

/**
 * Install DEB via DPKG, using a terminal
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

  const shellCmd = `sudo dpkg -i "${debPath}" || sudo apt-get install -f -y`;

  // use a graphical terminal instead of pkexec
  const terminalCommand = [
    "x-terminal-emulator",
    "-e",
    `bash -c '${shellCmd}; read -p "Press Enter to close..."'`,
  ];

  const child = spawn(terminalCommand[0], terminalCommand.slice(1), {
    stdio: "inherit",
  });

  child.on("error", (err) => {
    console.error("Could not launch terminal to install update:", err);
    sendUpdateStatus("error");
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`Could not install .deb file (exit code ${code})`);
      sendUpdateStatus("error");
      return;
    }
    app.relaunch();
    app.quit();
  });
}
