// src/notifications.ts
export function showNotification(message: string): void {
    const notificationArea = document.getElementById("notification-area");
    if (!notificationArea) return;
  
    notificationArea.textContent = message;
    notificationArea.style.opacity = "1";
  
    setTimeout(() => {
      notificationArea.style.opacity = "0";
    }, 3000);
}