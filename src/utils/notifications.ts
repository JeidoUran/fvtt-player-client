// src/notifications.ts
let hideTimeoutId: number | null = null;

const defaultOpts = { notificationTimer: 3 };

let opts = { ...defaultOpts };
export function setNotificationTimer(sec: number): void {
  if (typeof sec === "number" && sec > 0) {
    opts.notificationTimer = sec;
  }
}

export async function initNotificationTimer(): Promise<void> {
  try {
    const cfg: AppConfig = await window.api.localAppConfig();
    if (typeof cfg.notificationTimer === "number") {
      opts.notificationTimer = cfg.notificationTimer;
    }
  } catch {}
}

export function showNotification(message: string): void {
  const notificationArea = document.getElementById("notification-area");
  if (!notificationArea) return;

  notificationArea.textContent = message;
  notificationArea.style.opacity = "1";

  if (hideTimeoutId !== null) {
    clearTimeout(hideTimeoutId);
  }

  hideTimeoutId = window.setTimeout(() => {
    notificationArea.style.opacity = "0";
    hideTimeoutId = null;
  }, opts.notificationTimer * 1000);
}
