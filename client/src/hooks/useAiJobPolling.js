import { useCallback, useEffect, useRef, useState } from 'react'
import { aiApi, getErrorMessage } from '../services/api'

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED']

/** Polls one AI job while it is active and reports terminal states exactly once. */
export default function useAiJobPolling({ jobId = null, intervalMs = 4000, onTerminal } = {}) {
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const onTerminalRef = useRef(onTerminal)
  const completedRef = useRef(null)

  useEffect(() => {
    onTerminalRef.current = onTerminal
  }, [onTerminal])

  const reload = useCallback(async () => {
    if (!jobId) {
      setJob(null)
      setError('')
      return null
    }
    try {
      const data = await aiApi.job(jobId)
      setJob(data.job)
      setError('')
      if (
        data.job
        && TERMINAL_STATUSES.includes(data.job.status)
        && completedRef.current !== data.job._id
      ) {
        completedRef.current = data.job._id
        if (onTerminalRef.current) onTerminalRef.current(data.job)
      }
      return data.job
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load AI job status.'))
      return null
    }
  }, [jobId])

  useEffect(() => {
    completedRef.current = null

    let active = true
    let timer
    const run = async () => {
      const result = await reload()
      if (!active || !result) return
      if (!TERMINAL_STATUSES.includes(result.status)) {
        timer = setTimeout(run, intervalMs)
      }
    }
    timer = setTimeout(run, 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [jobId, intervalMs, reload])

  return { job, error, reload, setJob }
}
