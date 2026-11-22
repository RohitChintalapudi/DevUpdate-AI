import crypto from 'node:crypto'
import { AppError, asyncHandler } from '../utils/errors.js'
import { csrfCookieOptions } from '../services/authService.js'

/**
 * Double-submit cookie CSRF protection.
 * GET /api/auth/csrf issues a readable cookie; state-changing requests must
 * echo the same value in the X-CSRF-Token header.
 */
export const issueCsrfToken = asyncHandler(async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex')
  res.cookie('csrfToken', token, csrfCookieOptions())
  res.json({ csrfToken: token })
})

export const verifyCsrf = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  const cookieToken = req.cookies?.csrfToken
  const headerToken = req.get('X-CSRF-Token')

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError('CSRF token missing or invalid. Refresh the page and try again.', 403))
  }
  return next()
}
