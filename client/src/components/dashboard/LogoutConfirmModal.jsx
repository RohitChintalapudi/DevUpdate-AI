import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuLogOut } from 'react-icons/lu'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { useAuth } from '../../context/AuthContext'

export default function LogoutConfirmModal({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const initials = (user?.name || 'DU')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'DU'

  const handleConfirm = async () => {
    setLoggingOut(true)
    try {
      await logout()
      onClose?.()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Failed to log out:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loggingOut ? undefined : onClose}
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loggingOut}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loggingOut}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 text-[13px] font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing out…
              </>
            ) : (
              <>
                <LuLogOut className="h-4 w-4" />
                Log out
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        {/* Visual Icon Badge */}
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200/90 bg-rose-50 text-rose-600 shadow-xs">
          <LuLogOut className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] text-white">
            !
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-950">Confirm Sign Out</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Are you sure you want to end your current session? You will need to sign in again to access your connected repositories and update intelligence.
        </p>

        {/* Current User Pill */}
        {user ? (
          <div className="mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white shadow-2xs">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-950">
                {user.name || 'Developer'}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {user.email || 'Signed in workspace'}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
              Active
            </span>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
