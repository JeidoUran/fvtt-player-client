// src/notifications.ts
let hideTimeoutId: number | null = null;

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
    }, 3000);
}