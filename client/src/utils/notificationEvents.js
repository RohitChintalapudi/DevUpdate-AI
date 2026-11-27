export const NOTIFICATIONS_CHANGED_EVENT = 'devupdate:notifications-changed'

export function notifyNotificationsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
}
