import { BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;

export function setUpdateWindow(win: BrowserWindow) {
  mainWindow = win;
}

export function sendUpdateStatus(
  status:
    | "checking"
    | "available"
    | "not-available"
    | "progress"
    | "downloaded"
    | "error"
    | "installing",
  payload?: any,
) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { status, payload });
  }
}
