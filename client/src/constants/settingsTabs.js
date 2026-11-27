import { LuBell, LuLockKeyhole, LuPalette, LuShield, LuUserRound } from 'react-icons/lu'

export const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: LuUserRound, hint: 'Identity and display details' },
  { id: 'account', label: 'Account', icon: LuShield, hint: 'Workspace and session information' },
  { id: 'appearance', label: 'Appearance', icon: LuPalette, hint: 'Display and motion preferences' },
  { id: 'notifications', label: 'Notifications', icon: LuBell, hint: 'Inbox delivery and event types' },
  { id: 'security', label: 'Security', icon: LuLockKeyhole, hint: 'Session and connected services' },
]

export function isSettingsTab(value) {
  return SETTINGS_TABS.some((tab) => tab.id === value)
}
