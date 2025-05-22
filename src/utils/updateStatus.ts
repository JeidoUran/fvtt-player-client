import { BrowserWindow } from "electron";

let fallbackWindow: BrowserWindow | null = null;

export function setUpdateWindow(win: BrowserWindow) {
  fallbackWindow = win;
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
  win?: BrowserWindow,
) {
  const target = win ?? fallbackWindow;
  if (target && !target.isDestroyed()) {
    target.webContents.send("update-status", { status, payload });
  }
}
