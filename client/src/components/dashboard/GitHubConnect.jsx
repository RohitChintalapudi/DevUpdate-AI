import { motion } from 'framer-motion'
import { LuExternalLink, LuGithub, LuRefreshCw, LuTriangleAlert, LuUnplug } from 'react-icons/lu'
import Badge from '../common/Badge'
import Button from '../common/Button'

const phaseCopy = {
  connecting: 'Opening GitHub authorization…',
  reconnecting: 'Reconnecting to GitHub…',
}

export default function GitHubConnect({
  status,
  phase = 'idle',
  error = '',
  checking = false,
  onConnect,
  onDisconnect,
  onSync,
}) {
  const connected = status?.connected && phase !== 'connecting'
  const busy = phase === 'connecting' || phase === 'reconnecting' || checking
  const failed = !checking && (phase === 'failed' || status?.status === 'FAILED' || status?.status === 'EXPIRED')

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
            <LuGithub className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-950">GitHub connection</h2>
              {checking ? (
                <Badge tone="cyan" dot>Verifying connection…</Badge>
              ) : connected ? (
                <Badge tone="success" dot>Connected</Badge>
              ) : failed ? (
                <Badge tone="danger" dot>Connection failed</Badge>
              ) : (
                <Badge tone="neutral" dot>Not connected</Badge>
              )}
            </div>

            {checking ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 flex items-center gap-2">
                <LuRefreshCw className="h-3.5 w-3.5 animate-spin text-sky-600" />
                Establishing GitHub connection and checking accessible repositories…
              </p>
            ) : connected ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {status.profile?.avatarUrl ? (
                  <img
                    src={status.profile.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full border border-white/10 object-cover"
                  />
                ) : null}
                <span className="text-sm font-medium text-ink">
                  {status.profile?.username || 'GitHub account'}
                </span>
                <span className="text-xs text-muted">•</span>
                <span className="text-xs text-subtle">
                  {status.repositoryCount || 0} accessible repositories
                </span>
              </div>
            ) : (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-subtle">
                Connect your GitHub account to discover your project dependencies.
              </p>
            )}

            {!checking && (busy || failed || error) && (
              <p className={`mt-3 flex items-center gap-2 text-xs ${failed || error ? 'text-danger' : 'text-accent'}`}>
                {failed || error ? <LuTriangleAlert className="h-3.5 w-3.5" /> : <LuRefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {error || phaseCopy[phase] || 'Connection failed. Please try again.'}
              </p>
            )}

            {status?.configured === false ? (
              <p className="mt-3 text-xs leading-relaxed text-warning">
                GitHub App credentials are not configured on the server. Ask the administrator to
                set the GitHub environment variables.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {checking ? (
            <Button size="sm" leftIcon={LuRefreshCw} loading disabled>
              Establishing connection…
            </Button>
          ) : connected ? (
            <>
              <Button variant="secondary" size="sm" leftIcon={LuRefreshCw} onClick={onSync}>
                Sync repositories
              </Button>
              <Button variant="ghost" size="sm" leftIcon={LuUnplug} onClick={onDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              leftIcon={LuGithub}
              loading={busy}
              onClick={onConnect}
              disabled={status?.configured === false}
            >
              {failed ? 'Reconnect GitHub' : 'Connect GitHub'}
            </Button>
          )}
          {connected ? (
            <a
              href="https://github.com/settings/applications"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brandlight transition hover:text-ink"
            >
              Manage <LuExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
